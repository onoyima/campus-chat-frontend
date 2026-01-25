
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/routes';
import { useToast } from './use-toast';
import { soundManager } from '@/lib/sounds';

type WebSocketContextType = {
  isConnected: boolean;
  sendMessage: (type: string, payload: any) => void;
  socket: WebSocket | null;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null); // Use state for socket to trigger updates
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Connect to WS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    console.log("Connecting to WS:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    setSocket(ws);

    ws.onopen = () => {
      console.log('WS Connected');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('WS Disconnected');
      setIsConnected(false);
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('WS Error', error);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WS Message:', data);

        // Handle Events
        switch (data.type) {
          case 'new_message':
            // 1. Invalidate message list for this conversation
            queryClient.invalidateQueries({ 
                queryKey: [api.messages.list.path, data.message.conversationId] 
            });
            // 2. Invalidate conversation list (to update last message/unread)
            queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
            
            // 3. Sound & Toast
            // Check if message is NOT from me
            // We can't easily check "me" here without context, but usually we don't receive our own messages back via WS unless echo is on.
            // Our backend `notifyList` includes recipientIds. If I am in the list, I get it.
            // Assuming the sender is passed in data.message.sender
            
            // Play sound
            if (data.message.type === 'announcement') {
                 soundManager.play('announcement');
            } else if (data.message.conversationType === 'GROUP') {
                 soundManager.play('group');
            } else {
                 soundManager.play('message');
            }
            
            break;
            
          case 'typing':
            // Dispatch custom event or use a store to handle typing indicators UI
            // For now, we'll just log it. A more advanced implementation would use a global store.
            window.dispatchEvent(new CustomEvent('chat:typing', { detail: data }));
            break;

          case 'read_receipt':
             queryClient.invalidateQueries({ 
                queryKey: [api.messages.list.path, data.conversationId] 
            });
            break;
        }

      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [isAuthenticated, queryClient]);

  const sendMessage = (type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage, socket }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
