import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, errorSchemas } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL, getAuthHeaders } from "@/lib/api-config";

// GET /api/conversations/:id/messages
export function useMessages(conversationId: number | null) {
  return useQuery({
    queryKey: [api.messages.list.path, conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const url = buildUrl(api.messages.list.path, { id: conversationId });
      const res = await fetch(`${BASE_URL}${url}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch messages");
      // Reverse to show newest at bottom if backend sends newest first
      const data = api.messages.list.responses[200].parse(await res.json());
      return data;
    },
    enabled: !!conversationId,
    refetchInterval: 2000, // Faster polling for chat
  });
}

// DELETE /api/messages/:id
export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ messageId }: { messageId: number }) => {
      const res = await fetch(`${BASE_URL}/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete message");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
      toast({ title: "Message Deleted", description: "The message has been removed." });
    },
    onError: (err) => {
      toast({
        title: "Delete Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });
}

// PATCH /api/messages/:id
export function useEditMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number, content: string }) => {
      const res = await fetch(`${BASE_URL}/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to edit message");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path] });
      toast({ title: "Message Updated", description: "Changes saved." });
    },
    onError: (err) => {
      toast({
        title: "Edit Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  });
}

// POST /api/conversations/:id/messages
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ conversationId, content, type = 'text', metadata }: { conversationId: number, content: string, type?: 'text' | 'file' | 'audio' | 'video' | 'image' | 'voice_note', metadata?: any }) => {
      const url = buildUrl(api.messages.create.path, { id: conversationId });
      const res = await fetch(`${BASE_URL}${url}`, {
        method: api.messages.create.method,
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ content, type, metadata }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          const error = errorSchemas.forbidden.parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to send message");
      }
      return api.messages.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path, variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] }); // Update last message snippet
    },
    onError: (err) => {
      toast({
        title: "Failed to send",
        description: err.message,
        variant: "destructive",
      });
    }
  });
}
