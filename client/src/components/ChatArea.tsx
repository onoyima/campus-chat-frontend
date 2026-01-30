import { useEffect, useRef, useState } from "react";
import { BASE_URL } from "@/lib/api-config";
import { useMessages, useSendMessage, useDeleteMessage, useEditMessage } from "@/hooks/use-messages";
import { useConversation } from "@/hooks/use-conversations";
import { useMyIdentity } from "@/hooks/use-identity";
import { useWebSocket } from "@/hooks/use-websocket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, MoreVertical, Phone, Video, Loader2, ArrowLeft, Info, Mic, StopCircle, Trash2, Edit2, Check, X, Shield, CheckCheck, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildUrl, getAuthHeaders } from "@/lib/api-config";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatAreaProps {
  conversationId: number | null;
  onBack?: () => void;
}

export function ChatArea({ conversationId, onBack }: ChatAreaProps) {
  // --- 1. HOOKS (Must be unconditional) ---
  const { data: messages, isLoading: messagesLoading } = useMessages(conversationId);
  const { data: conversationData, isLoading: metaLoading } = useConversation(conversationId || 0); 
  const { data: myIdentity } = useMyIdentity();
  
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const { sendMessage: sendWs } = useWebSocket();
  
  const [inputValue, setInputValue] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef<HTMLDivElement>(null);
  const [hasScrolledInitial, setHasScrolledInitial] = useState(false);

  // Mark Read Logic
  useEffect(() => {
    if (conversationId && myIdentity) {
        const markRead = async () => {
            try {
                await fetch(buildUrl(`/api/conversations/${conversationId}/read`), {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
            } catch (err) {
                console.error("Failed to mark read", err);
            }
        };
        markRead();
    }
  }, [conversationId, myIdentity]);

  // Find first unread message
  const firstUnreadIndex = messages?.findIndex(msg => 
    msg.senderIdentityId !== myIdentity?.id && 
    !(msg as any).statuses?.some((s: any) => s.identityId === myIdentity?.id && s.status === 'read')
  );

  // Initial Scroll Logic
  useEffect(() => {
    if (!messagesLoading && messages && messages.length > 0 && !hasScrolledInitial) {
        setTimeout(() => {
            if (firstUnreadIndex !== undefined && firstUnreadIndex !== -1 && unreadRef.current) {
                unreadRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
            } else if (bottomRef.current) {
                bottomRef.current.scrollIntoView({ behavior: 'auto' });
            }
            setHasScrolledInitial(true);
        }, 100);
    }
  }, [messagesLoading, conversationId, hasScrolledInitial, firstUnreadIndex, messages]);

  // Reset initial scroll on conversation change
  useEffect(() => {
      setHasScrolledInitial(false);
  }, [conversationId]);

  // Auto-scroll for new messages
  useEffect(() => {
    if (hasScrolledInitial && messages && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.senderIdentityId === myIdentity?.id) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Only auto-scroll if user is already near bottom? 
            // For now, let's keep it simple and just scroll if it's my message.
        }
    }
  }, [messages?.length]);
  
  // Edit State
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- 2. DERIVED STATE ---
  const conversation = conversationData?.conversation;
  const participants = conversationData?.participants || [];
  const otherParticipant = participants.find(p => p.id !== myIdentity?.id);
  const canCall = conversation?.type === 'DIRECT' && otherParticipant;
  
  // Determine header title
  const title = conversation?.name || "Chat";
  const subtitle = conversation?.type === 'DIRECT' 
    ? (participants.find(p => p.id !== myIdentity?.id)?.role || "Direct Message")
    : `${participants.length} members`;

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HOD', 'DEAN', 'VC'].includes(myIdentity?.role || "");

  // --- 3. HANDLERS ---
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || !conversationId) return;
    
    sendMessage.mutate({
      conversationId,
      content: inputValue
    }, {
      onSuccess: () => {
        setInputValue("");
        sendWs('typing', { conversationId, isTyping: false });
      }
    });
  };

  const handleEditSave = (messageId: number) => {
      if (!editContent.trim()) return;
      editMessage.mutate({ messageId, content: editContent }, {
          onSuccess: () => {
              setEditingMessageId(null);
              setEditContent("");
          }
      });
  };

  const handleDelete = (messageId: number) => {
      if (confirm("Are you sure you want to delete this message?")) {
          deleteMessage.mutate({ messageId });
      }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Check for MP4 support (better for Safari/Mobile)
      let mimeType = 'audio/webm';
      let extension = 'webm';
      
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
          extension = 'mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        
        const formData = new FormData();
        formData.append('file', blob, `voice-note.${extension}`);
        
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || "Upload failed");
            }

            const { url } = await res.json();
            if (conversationId) {
                sendMessage.mutate({
                    conversationId: conversationId,
                    content: "Voice Message",
                    type: 'audio',
                    metadata: { url, duration: 5 } // Mock duration
                });
            }
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to send voice note. Please try again.");
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone access is required for voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        setIsRecording(false);
        setMediaRecorder(null);
    }
  };

  const handlePlayAudio = (url: string, id: number) => {
      if (playingAudioId === id) {
          // Pause/Stop
          if (audioRef.current) {
              audioRef.current.pause();
              setPlayingAudioId(null);
          }
          return;
      }

      // Stop previous
      if (audioRef.current) {
          audioRef.current.pause();
      }

      const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
      const audio = new Audio(fullUrl);
      audioRef.current = audio;
      
      audio.play().catch(e => console.error("Playback failed", e));
      setPlayingAudioId(id);

      audio.onended = () => {
          setPlayingAudioId(null);
      };
  };

  const handleCall = (type: 'audio' | 'video') => {
      if (!canCall || !otherParticipant) {
          alert("Group calling is not supported yet.");
          return;
      }
      
      // @ts-ignore
      if (window.initiateCall) {
          // @ts-ignore
          window.initiateCall(otherParticipant.id, type, otherParticipant.displayName || "User");
      }
  };

  // --- 4. CONDITIONAL RENDER (After hooks) ---
  if (!conversationId) {
      return (
          <div className="flex-1 flex flex-col h-full items-center justify-center bg-[#efeae2] dark:bg-background text-muted-foreground">
              <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Select a Conversation</h3>
                  <p className="max-w-xs mx-auto">Choose a chat from the sidebar or start a new one to begin messaging.</p>
              </div>
          </div>
      );
  }

  // --- 5. MAIN RENDER ---
  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-background relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

      {/* Header */}
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          <Avatar 
            className="h-10 w-10 border cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setInfoOpen(true)}
          >
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${title}`} />
            <AvatarFallback>{title.substring(0, 2)}</AvatarFallback>
          </Avatar>
          
          <div className="flex flex-col" onClick={() => setInfoOpen(true)}>
            <h2 className="font-bold text-sm leading-none cursor-pointer hover:underline decoration-primary/30 underline-offset-4">
              {metaLoading ? "Loading..." : title}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {subtitle}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => handleCall('video')}>
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => handleCall('audio')}>
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setInfoOpen(true)}>
            <Info className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 custom-scrollbar">
        <div className="flex flex-col gap-4 pb-4 max-w-4xl mx-auto">
          {messagesLoading ? (
             <div className="flex justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
             </div>
          ) : (
            messages?.map((msg, index) => {
              const isMe = msg.senderIdentityId === myIdentity?.id;
              const sender = participants.find(p => p.id === msg.senderIdentityId);
              const showAvatar = !isMe && (index === 0 || messages[index - 1].senderIdentityId !== msg.senderIdentityId);
              const isEditing = editingMessageId === msg.id;

              return (
                <div 
                  key={msg.id} 
                  ref={index === firstUnreadIndex ? unreadRef : null}
                  className={cn(
                    "flex gap-2 max-w-[85%] md:max-w-[70%]",
                    isMe ? "self-end flex-row-reverse" : "self-start"
                  )}
                >
                  {!isMe && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <Avatar className="h-8 w-8 shadow-sm">
                           <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                             {sender?.displayName?.substring(0,2) || "??"}
                           </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                  
                  <div className={cn(
                    "relative px-4 py-2 rounded-2xl shadow-sm text-sm leading-relaxed group",
                    isMe 
                      ? "bg-[hsl(var(--chat-bubble-me))] text-foreground rounded-tr-none" 
                      : "bg-[hsl(var(--chat-bubble-other))] text-foreground rounded-tl-none"
                  )}>
                    {/* Tail */}
                    <div className={isMe ? "bubble-tail-me" : "bubble-tail-other"}></div>
                    
                    {/* Admin Controls (Hover) */}
                    {isAdmin && !isEditing && (
                        <div className="absolute top-0 right-0 -mt-2 -mr-2 hidden group-hover:flex bg-background shadow-sm rounded-md border p-1 z-20">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setEditContent(msg.content);
                                }}
                            >
                                <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(msg.id)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    )}

                    {!isMe && showAvatar && (
                      <p className={cn(
                        "text-[10px] font-bold mb-1",
                        sender?.role === 'VC' ? 'text-purple-600' :
                        sender?.role === 'DEAN' ? 'text-blue-600' :
                        sender?.role === 'HOD' ? 'text-orange-600' :
                        sender?.role === 'LECTURER' ? 'text-cyan-600' :
                        'text-green-600'
                      )}>
                        {sender?.displayName} • {sender?.role}
                      </p>
                    )}
                    
                    {isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <textarea 
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full bg-background/50 border rounded p-1 text-xs focus:outline-none"
                                rows={3}
                            />
                            <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setEditingMessageId(null)}>Cancel</Button>
                                <Button size="sm" className="h-6 px-2" onClick={() => handleEditSave(msg.id)}>Save</Button>
                            </div>
                        </div>
                    ) : (
                        msg.type === 'audio' && (msg.metadata as any)?.url ? (
                            <div 
                                className="flex items-center gap-3 min-w-[200px] p-2 cursor-pointer hover:brightness-95 transition-all select-none"
                                onClick={() => handlePlayAudio((msg.metadata as any).url, msg.id)}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                                    isMe ? "bg-black/10 border-black/5" : "bg-white/20 border-white/10"
                                )}>
                                    {playingAudioId === msg.id ? (
                                        <Pause className="h-4 w-4 fill-current" />
                                    ) : (
                                        <Play className="h-4 w-4 ml-0.5 fill-current" />
                                    )}
                                </div>
                                
                                {/* Waveform Visualizer */}
                                <div className="flex items-center gap-0.5 h-6">
                                    {[3, 5, 8, 5, 3, 4, 7, 5, 2, 4, 6, 3, 5, 4, 6].map((h, i) => (
                                        <div 
                                            key={i} 
                                            className={cn(
                                                "w-1 rounded-full opacity-60",
                                                isMe ? "bg-foreground" : "bg-foreground"
                                            )}
                                            style={{ 
                                                height: playingAudioId === msg.id ? `${Math.random() * 14 + 6}px` : `${h * 2}px`,
                                                transition: 'height 0.15s ease' 
                                            }} 
                                        />
                                    ))}
                                </div>
                                
                                <span className="text-[10px] opacity-70 ml-2 whitespace-nowrap font-medium tabular-nums">
                                    {(msg.metadata as any).duration ? `${Math.floor((msg.metadata as any).duration)}s` : 'Voice'}
                                </span>
                            </div>
                        ) : (
                            <p className="whitespace-pre-wrap break-words relative z-10">{msg.content}</p>
                        )
                    )}
                    
                    <div className={cn(
                      "text-[10px] mt-1 flex items-center justify-end gap-1 opacity-60",
                      isMe ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {msg.isEdited && <span className="italic mr-1">(edited)</span>}
                      {msg.createdAt && (
                        (() => {
                            const d = new Date(msg.createdAt);
                            const isToday = d.toDateString() === new Date().toDateString();
                            return isToday ? format(d, 'HH:mm') : format(d, 'MMM d, HH:mm');
                        })()
                      )}
                      {isMe && (
                        <div className="flex items-center">
                            {(() => {
                                const readByRecipients = (msg as any).statuses?.some((s: any) => s.identityId !== myIdentity?.id && s.status === 'read');
                                if (readByRecipients) {
                                    return <CheckCheck className="h-3 w-3 text-blue-500" />;
                                }
                                return <Check className="h-3 w-3" />;
                            })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} className="h-2" />
        </div>
      </ScrollArea>
      
      {/* Input */}
      <div className="p-4 bg-background border-t">
        <form 
          onSubmit={handleSend}
          className="flex items-end gap-2 max-w-4xl mx-auto bg-secondary/50 p-2 rounded-3xl border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-inner"
        >
           <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-background text-muted-foreground shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <input
            className="flex-1 bg-transparent border-none focus:outline-none py-3 px-2 min-h-[44px] max-h-32 resize-none text-sm"
            placeholder={isRecording ? "Recording audio..." : "Type a message..."}
            value={inputValue}
            onChange={(e) => {
                setInputValue(e.target.value);
                if (conversationId) sendWs('typing', { conversationId, isTyping: true });
            }}
            disabled={sendMessage.isPending || isRecording}
          />
          
          {/* Voice Record Button */}
          {!inputValue.trim() && (
             <Button 
                type="button"
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                   "h-10 w-10 rounded-full shrink-0 transition-all duration-300",
                   isRecording ? "bg-destructive animate-pulse text-white" : "bg-muted text-muted-foreground hover:bg-background"
                )}
             >
                {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
             </Button>
          )}

          {/* Send Button */}
          {inputValue.trim() && (
            <Button 
                type="submit" 
                size="icon" 
                disabled={sendMessage.isPending}
                className="h-10 w-10 rounded-full shrink-0 bg-primary hover:bg-primary/90 text-white shadow-md transform hover:scale-105 transition-all duration-300"
            >
                {sendMessage.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          )}
        </form>
      </div>

      {/* Group Info Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Participants</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {participants.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 group">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{p.displayName?.substring(0,2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-medium">{p.displayName} {p.id === myIdentity?.id && "(You)"}</p>
                                    <p className="text-xs text-muted-foreground">{p.role}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{p.entityType}</Badge>
                                {/* Admin Removal Button */}
                                {isAdmin && p.id !== myIdentity?.id && (
                                    <>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                        title={p.role === 'admin' ? 'Already Admin' : "Make Co-Admin"}
                                        onClick={async () => {
                                            if (confirm(`Promote ${p.displayName} to Co-Admin?`)) {
                                                await fetch(`/api/conversations/${conversationId}/participants/${p.id}/role`, {
                                                    method: 'PATCH',
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ role: 'co-admin' })
                                                });
                                            }
                                        }}
                                    >
                                        <Shield className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={async () => {
                                            if (confirm(`Remove ${p.displayName} from group?`)) {
                                                await fetch(`/api/conversations/${conversationId}/participants/${p.id}`, {
                                                    method: 'DELETE'
                                                });
                                            }
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
