import { useConversations } from "@/hooks/use-conversations";
import { getAuthHeaders, buildUrl } from "@/lib/api-config";
import { useMyIdentity, useSwitchIdentity } from "@/hooks/use-identity";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LogOut, 
  MessageSquarePlus, 
  Search, 
  University, 
  User, 
  Shield, 
  Settings2,
  Bell,
  Users,
  MessageCircle
} from "lucide-react";
import { format, formatDistanceToNow, isSameDay, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { NewChatDialog } from "./NewChatDialog";
import { NewGroupDialog } from "./NewGroupDialog";
import { StatusDialog } from "./StatusDialog";
import { CreateStatusDialog } from "./CreateStatusDialog";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useState } from "react";
import { Link } from "wouter";

interface SidebarProps {
  activeConversationId?: number | null;
  onSelectConversation: (id: number) => void;
  isMobileOpen?: boolean;
  onShowAnnouncements?: () => void;
}

export function Sidebar({ activeConversationId, onSelectConversation, isMobileOpen = false, onShowAnnouncements }: SidebarProps) {
  const { data: conversations, isLoading } = useConversations();
  const { data: myIdentity } = useMyIdentity();
  const { data: notifications } = useNotifications();
  const { user, logout } = useAuth();
  
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;
  const switchIdentity = useSwitchIdentity();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);

  // Status State
  const [activeTab, setActiveTab] = useState<'chats' | 'status'>('chats');
  
  // Chat Filter State
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatFilterTab, setChatFilterTab] = useState<'all' | 'people' | 'groups'>('all');
  const [viewStatusOpen, setViewStatusOpen] = useState(false);
  const [createStatusOpen, setCreateStatusOpen] = useState(false);
  const [selectedStatusUser, setSelectedStatusUser] = useState<any[]>([]);

  // Fetch Statuses
  const { data: statusUpdates } = useQuery({
      queryKey: [api.status.list.path],
      queryFn: async () => {
          const res = await fetch(buildUrl(api.status.list.path), { headers: getAuthHeaders() });
          return await res.json();
      }
  });

  // Group statuses by user
  const groupedStatuses = (statusUpdates || []).reduce((acc: any, status: any) => {
      const id = String(status.identityId);
      if (!acc[id]) {
          acc[id] = {
              identity: status.identity,
              updates: []
          };
      }
      acc[id].updates.push(status);
      return acc;
  }, {});

  const myStatus = groupedStatuses[String(myIdentity?.id || 0)];
  const otherStatuses = Object.values(groupedStatuses).filter((g: any) => String(g.identity.id) !== String(myIdentity?.id));

  // Filter and search conversations
  const filteredConversations = conversations?.filter((conv) => {
    // Apply type filter
    if (chatFilterTab === 'people' && conv.type !== 'DIRECT') return false;
    if (chatFilterTab === 'groups' && conv.type !== 'GROUP') return false;
    
    // Apply search filter
    if (chatSearchQuery.trim()) {
      const query = chatSearchQuery.toLowerCase();
      const display = getDisplayInfo(conv);
      const nameMatch = display.name.toLowerCase().includes(query);
      const lastMessageMatch = conv.lastMessage?.content?.toLowerCase().includes(query);
      return nameMatch || lastMessageMatch;
    }
    
    return true;
  }) || [];

  // Helper to get conversation display info
  const getDisplayInfo = (conv: any) => {
    if (conv.type === 'DIRECT') {
      // Logic: Find the participant that is NOT me.
      // 1. Filter out my identity ID.
      // 2. If filtering leaves 0 (chat with self?), fallback to self or unknown.
      // 3. Ensure conv.participants is populated.
      const other = conv.participants?.find((p: any) => p.identityId !== myIdentity?.id);
      
      // Fallback if participants not loaded or glitch
      if (!other) {
          // Check if it's a self-chat (i.e. only me is in participants list)
          // or if backend returned both participants as me
          if (conv.participants?.length > 0) {
              return {
                  name: "Me (You)",
                  initials: "ME",
                  isOnline: true,
                  entityId: myIdentity?.entityId,
                  entityType: myIdentity?.entityType
              };
          }
          return { name: "Unknown User", initials: "??" };
      }

      return {
        name: conv.name || other.identity?.displayName || other.displayName || "Unknown",
        initials: (conv.name || other.identity?.displayName || other.displayName || "??").substring(0, 2).toUpperCase(),
        isOnline: other.identity?.isOnline || false,
        entityId: other.identity?.entityId,
        entityType: other.identity?.entityType
      };
    }
    return {
      name: conv.name || "Group Chat",
      initials: (conv.name || "GP").substring(0,2).toUpperCase(),
      isOnline: false,
      entityId: null,
      entityType: null
    };
  };
  
  return (
    <div className={cn(
      "flex flex-col h-full bg-sidebar border-r transition-all duration-300",
      isMobileOpen ? "w-full absolute inset-0 z-50 bg-background" : "hidden md:flex md:w-80 lg:w-96"
    )}>
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={onShowAnnouncements}>
             <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center group-hover:bg-primary/90 transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="29" y2="8"/><line x1="22" y1="11" x2="26" y2="11"/></svg>
             </div>
             <h1 className="font-display font-bold text-lg tracking-tight group-hover:text-primary transition-colors">Veritas Connect</h1>
          </div>
        </div>
      </div>

      <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-sidebar/95 backdrop-blur z-10">
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
          <Button 
            variant={activeTab === 'chats' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('chats')}
            className="rounded-md h-8 text-xs font-medium"
          >
            Chats
          </Button>
          <Button 
            variant={activeTab === 'status' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('status')}
            className="rounded-md h-8 text-xs font-medium relative"
          >
            Status
            {otherStatuses.some((s: any) => s.updates.length > 0) && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
            )}
          </Button>
        </div>

        <div className="flex gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setNewGroupOpen(true)}>
                <User className="h-4 w-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setNewChatOpen(true)}>
                <MessageSquarePlus className="h-4 w-4" />
             </Button>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account ({myIdentity?.displayName})</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <div className="flex items-center gap-2 p-2 px-3 text-xs text-muted-foreground bg-muted/30 rounded-md mb-1 mx-1">
                        <User className="h-3 w-3" />
                         Logged in as {myIdentity?.role}
                    </div>
                  </DropdownMenuItem>
                  {['SUPER_ADMIN', 'VC'].includes(myIdentity?.role || '') && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2 cursor-pointer w-full">
                           <Shield className="h-4 w-4" /> Admin Panel
                        </Link>
                      </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                      const id = prompt("Enter Identity ID:");
                      if (id) switchIdentity.mutate(Number(id));
                  }}>
                    <University className="mr-2 h-4 w-4" />
                    Switch Identity
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
        </div>
      </div>
      
      {/* STATUS TAB CONTENT */}
        {activeTab === 'status' && (
            <div className="p-4 space-y-6">
                {/* My Status */}
                <div 
                    className="flex items-center gap-3 cursor-pointer group hover:bg-secondary/50 p-2 rounded-lg transition-colors"
                    onClick={() => {
                        if (myStatus) {
                            setSelectedStatusUser(myStatus.updates);
                            setViewStatusOpen(true);
                        } else {
                            setCreateStatusOpen(true);
                        }
                    }}
                >
                    <div className="relative">
                        <Avatar className={cn("h-12 w-12 border-2 underline-offset-4 ring-offset-2 transition-all", myStatus ? "border-primary ring-2 ring-primary/20 scale-105" : "border-dashed border-muted-foreground")}>
                            <AvatarImage src={myStatus?.updates[0]?.mediaUrl ? buildUrl(myStatus.updates[0].mediaUrl) : buildUrl(`/api/users/${myIdentity?.entityType}/${myIdentity?.entityId}/avatar`)} className="object-cover" />
                            <AvatarFallback>{myIdentity?.displayName?.substring(0,2)}</AvatarFallback>
                        </Avatar>
                        {!myStatus && (
                            <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-0.5 shadow-sm">
                                <MessageSquarePlus className="h-3 w-3" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-sm">My Status</h3>
                        <p className="text-xs text-primary font-medium">
                            {myStatus ? (myStatus.updates.length === 1 ? "1 active update" : `${myStatus.updates.length} updates`) : "Tap to add status update"}
                        </p>
                    </div>
                    {myStatus && (
                         <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setCreateStatusOpen(true); }}>
                             <MessageSquarePlus className="h-4 w-4 text-primary" />
                         </Button>
                    )}
                </div>
                
                <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Updates</h4>
                    
                    {otherStatuses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-xs">
                            No recent updates from friends.
                        </div>
                    ) : (
                        // @ts-ignore
                        otherStatuses.map((group: any) => (
                            <div 
                                key={group.identity.id}
                                className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 p-2 rounded-lg transition-colors"
                                onClick={() => {
                                    setSelectedStatusUser(group.updates);
                                    setViewStatusOpen(true);
                                }}
                            >
                                <Avatar className="h-10 w-10 border-2 border-primary ring-2 ring-background">
                                    <AvatarImage src={buildUrl(`/api/users/${group.identity.entityType}/${group.identity.entityId}/avatar`)} />
                                    <AvatarFallback>{group.identity.displayName.substring(0,2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-semibold text-sm">{group.identity.displayName}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(group.updates[0].createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

      {/* Dialogs */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <NewChatDialog onClose={() => setNewChatOpen(false)} />
      </Dialog>
      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <NewGroupDialog onClose={() => setNewGroupOpen(false)} />
      </Dialog>
      <StatusDialog 
        open={viewStatusOpen} 
        onOpenChange={setViewStatusOpen} 
        statuses={selectedStatusUser} 
      />
      <CreateStatusDialog 
        open={createStatusOpen} 
        onOpenChange={setCreateStatusOpen} 
      />
      
      {/* Content Area - Chat List */}
      <ScrollArea className="flex-1">
        {activeTab === 'chats' && (
            <div className="p-2 space-y-3">
              {/* Search Input */}
              <div className="relative px-2">
                <Search className="absolute left-5 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 px-2">
                <Button
                  variant={chatFilterTab === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChatFilterTab('all')}
                  className="flex-1 h-8 text-xs"
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                  All
                </Button>
                <Button
                  variant={chatFilterTab === 'people' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChatFilterTab('people')}
                  className="flex-1 h-8 text-xs"
                >
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  People
                </Button>
                <Button
                  variant={chatFilterTab === 'groups' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChatFilterTab('groups')}
                  className="flex-1 h-8 text-xs"
                >
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  Groups
                </Button>
              </div>

              {/* Chat List */}
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                   <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))
              ) : filteredConversations.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground text-sm">
                  {chatSearchQuery || chatFilterTab !== 'all' ? (
                    <>
                      <p>No conversations found.</p>
                      <p className="mt-1">Try a different search or filter.</p>
                    </>
                  ) : (
                    <>
                      <p>No conversations yet.</p>
                      <p className="mt-1">Start a new chat!</p>
                    </>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const display = getDisplayInfo(conv);
                  const isActive = activeConversationId === conv.id;
                  
                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 group relative",
                        isActive 
                          ? "bg-primary/10 hover:bg-primary/15" 
                          : "hover:bg-sidebar-accent"
                      )}
                    >
                      <div className="relative">
                         <Avatar className="h-12 w-12 border-2 border-background shadow-sm transition-transform group-hover:scale-105">
                            {display.entityId && display.entityType ? (
                                <AvatarImage src={buildUrl(`/api/users/${display.entityType}/${display.entityId}/avatar`)} />
                            ) : null}
                            <AvatarFallback className={cn("text-white font-bold", isActive ? "bg-primary" : "bg-muted-foreground")}>
                                {display.initials}
                            </AvatarFallback>
                         </Avatar>
                         {display.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                         )}
                      </div>
    
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className={cn("font-semibold truncate text-sm", isActive ? "text-primary" : "text-foreground")}>
                            {display.name}
                          </h3>
                          {conv.lastMessage?.createdAt && (
                            <span className="text-[10px] text-muted-foreground shrink-0 font-medium opacity-70">
                              {(() => {
                                const d = new Date(conv.lastMessage.createdAt);
                                if (isSameDay(d, new Date())) {
                                  return format(d, 'HH:mm');
                                }
                                if (isYesterday(d)) {
                                  return 'Yesterday';
                                }
                                return format(d, 'MMM d');
                              })()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <p className={cn("text-xs truncate max-w-[160px]", isActive ? "text-primary/80 font-medium" : "text-muted-foreground")}>
                              {conv.lastMessage?.type === 'image' ? '📷 Image' : 
                               conv.lastMessage?.type === 'video' ? '🎥 Video' :
                               conv.lastMessage?.type === 'audio' ? '🎤 Voice Message' :
                               conv.lastMessage?.content || "No messages"}
                            </p>
                            
                            {conv.unreadCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-300">
                                    {conv.unreadCount}
                                </span>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
        )}
      </ScrollArea>
    </div>
  );
}
