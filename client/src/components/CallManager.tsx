
import { useEffect, useRef, useState, useCallback } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useMyIdentity } from "@/hooks/use-identity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, Video, Mic, MicOff, VideoOff, X, PhoneIncoming } from "lucide-react";
import { cn } from "@/lib/utils";

const rtcConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

export function CallManager() {
    const { socket, sendMessage } = useWebSocket();
    const { data: me } = useMyIdentity();
    
    // State
    const [callState, setCallState] = useState<'idle' | 'incoming' | 'outgoing' | 'connected'>('idle');
    const [callType, setCallType] = useState<'audio' | 'video'>('audio');
    const [remoteIdentityId, setRemoteIdentityId] = useState<number | null>(null);
    const [remoteName, setRemoteName] = useState<string>("Unknown");
    
    // Media State
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    
    // Refs
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const localStream = useRef<MediaStream | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    
    // --- Signaling Handlers ---

    const createPeerConnection = useCallback(() => {
        if (peerConnection.current) return peerConnection.current;
        
        const pc = new RTCPeerConnection(rtcConfig);
        
        pc.onicecandidate = (event) => {
            if (event.candidate && remoteIdentityId) {
                sendMessage("call_signal", {
                    targetIdentityId: remoteIdentityId,
                    signal: { type: 'candidate', candidate: event.candidate }
                });
            }
        };
        
        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                endCall(false);
            }
        };
        
        peerConnection.current = pc;
        return pc;
    }, [remoteIdentityId, sendMessage]);

    const handleSignal = useCallback(async (data: any) => {
        // Only process signals if we are in a relevant state
        if (callState === 'idle') return;

        const pc = peerConnection.current || createPeerConnection();

        if (data.signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            if (data.senderIdentityId) {
                sendMessage("call_signal", {
                    targetIdentityId: data.senderIdentityId,
                    signal: answer
                });
            }
        } else if (data.signal.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
        } else if (data.signal.type === 'candidate') {
            await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
        }
    }, [createPeerConnection, callState, sendMessage]);

    const startCallNegotiation = async () => {
        const stream = await startLocalStream(callType);
        if (!stream) return;

        const pc = createPeerConnection();
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        sendMessage("call_signal", {
            targetIdentityId: remoteIdentityId,
            signal: offer
        });
    };

    useEffect(() => {
        if (!socket) return;

        const onMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'call_incoming') {
                    if (callState !== 'idle') return; // Busy
                    setCallState('incoming');
                    setRemoteIdentityId(data.callerIdentityId);
                    setCallType(data.callType);
                    setRemoteName(`User ${data.callerIdentityId}`); 
                }
                
                if (data.type === 'call_accepted') {
                    // Caller receives this when Callee picks up
                    setCallState('connected');
                    startCallNegotiation();
                }

                if (data.type === 'call_signal') {
                    handleSignal(data);
                }
                
                if (data.type === 'call_ended') {
                    endCall(false);
                }

            } catch (err) {
                console.error("Call Signal Error", err);
            }
        };

        socket.addEventListener('message', onMessage);
        return () => socket.removeEventListener('message', onMessage);
    }, [socket, callState, handleSignal, callType, remoteIdentityId]);

    // --- Actions ---

    const startLocalStream = async (type: 'audio' | 'video') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video'
            });
            localStream.current = stream;
            if (localVideoRef.current && type === 'video') {
                localVideoRef.current.srcObject = stream;
            }
            return stream;
        } catch (err) {
            console.error("Failed to get media", err);
            alert("Could not access camera/microphone");
            return null;
        }
    };

    // Global Initiator
    useEffect(() => {
        // @ts-ignore
        window.initiateCall = async (targetId: number, type: 'audio' | 'video', name: string) => {
            setCallState('outgoing');
            setRemoteIdentityId(targetId);
            setCallType(type);
            setRemoteName(name);
            // Send Invite
            sendMessage("call_request", { targetIdentityId: targetId, callType: type });
        };
    }, [sendMessage]);


    const acceptCall = async () => {
        setCallState('connected');
        const stream = await startLocalStream(callType);
        
        // Notify Caller we accepted
        if (remoteIdentityId) {
            sendMessage("call_accepted", { targetIdentityId: remoteIdentityId });
        }
        
        // We wait for their Offer now
        if (stream) {
             const pc = createPeerConnection();
             stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }
    };

    // Ringtone
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (callState === 'incoming') {
            const audio = new Audio("https://cdn.freesound.org/previews/385/385315_7294779-lq.mp3"); // Generic phone ring
            audio.loop = true;
            audio.play().catch(() => {}); // Autoplay might block
            ringtoneRef.current = audio;
        } else {
            if (ringtoneRef.current) {
                ringtoneRef.current.pause();
                ringtoneRef.current = null;
            }
        }
    }, [callState]);

    const endCall = (notify = true) => {
        if (notify && remoteIdentityId) {
             sendMessage("call_ended", { targetIdentityId: remoteIdentityId });
        }
        
        if (localStream.current) {
            localStream.current.getTracks().forEach(t => t.stop());
            localStream.current = null;
        }
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setCallState('idle');
        setRemoteIdentityId(null);
    };
    
    // Toggle Media
    const toggleMic = () => {
        if (localStream.current) {
            localStream.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream.current) {
            localStream.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
            setIsVideoOff(!isVideoOff);
        }
    };


    if (callState === 'idle') return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-white">
            {/* Incoming Call Screen */}
            {callState === 'incoming' && (
                <div className="flex flex-col items-center animate-pulse">
                    <Avatar className="h-32 w-32 border-4 border-primary mb-6">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${remoteName}`} />
                        <AvatarFallback className="text-4xl text-black">{remoteName.substring(0,2)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-3xl font-bold mb-2">{remoteName}</h2>
                    <p className="text-white/60 mb-12">Incoming {callType} Call...</p>
                    
                    <div className="flex items-center gap-12">
                        <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-16 w-16 rounded-full"
                            onClick={() => endCall(true)}
                        >
                            <X className="h-8 w-8" />
                        </Button>
                        <Button 
                            variant="default" 
                            size="icon" 
                            className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
                            onClick={acceptCall}
                        >
                            <Phone className="h-8 w-8" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Active Call Screen */}
            {(callState === 'outgoing' || callState === 'connected') && (
                <div className="w-full h-full flex flex-col relative">
                    {/* Remote Video (Full Screen) */}
                    <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
                        {callType === 'video' ? (
                            <video 
                                ref={remoteVideoRef} 
                                autoPlay 
                                playsInline 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center">
                                <Avatar className="h-32 w-32 mb-4">
                                    <AvatarFallback className="text-4xl text-black">{remoteName.substring(0,2)}</AvatarFallback>
                                </Avatar>
                                <h2 className="text-2xl font-bold">{remoteName}</h2>
                                <p className="text-white/60">{callState === 'outgoing' ? 'Calling...' : 'Connected'}</p>
                            </div>
                        )}
                        
                        {/* Local Video (PIP) */}
                        {callType === 'video' && (
                            <div className="absolute bottom-24 right-4 w-32 h-48 bg-black border border-white/20 rounded-lg overflow-hidden shadow-2xl">
                                <video 
                                    ref={localVideoRef} 
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="h-20 bg-black/80 backdrop-blur flex items-center justify-center gap-6 pb-4">
                        <Button 
                            variant="secondary" 
                            size="icon" 
                            className={cn("h-12 w-12 rounded-full", isMuted && "bg-destructive text-white")}
                            onClick={toggleMic}
                        >
                            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </Button>
                        
                        {callType === 'video' && (
                             <Button 
                                variant="secondary" 
                                size="icon" 
                                className={cn("h-12 w-12 rounded-full", isVideoOff && "bg-destructive text-white")}
                                onClick={toggleVideo}
                            >
                                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                            </Button>
                        )}

                        <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-14 w-14 rounded-full"
                            onClick={() => endCall(true)}
                        >
                            <PhoneIncoming className="h-6 w-6 rotate-[135deg]" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
