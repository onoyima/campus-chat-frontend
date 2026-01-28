import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, errorSchemas } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { BASE_URL, getAuthHeaders } from "@/lib/api-config";

// GET /api/conversations
export function useConversations() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [api.conversations.list.path],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}${api.conversations.list.path}`, { headers: getAuthHeaders() });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return api.conversations.list.responses[200].parse(await res.json());
    },
    enabled: !!isAuthenticated,
    refetchInterval: 5000, // Simple polling for MVP
  });
}

// GET /api/conversations/:id
export function useConversation(id: number | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [api.conversations.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.conversations.get.path, { id });
      const res = await fetch(`${BASE_URL}${url}`, { headers: getAuthHeaders() });
      if (res.status === 404) return null;
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return api.conversations.get.responses[200].parse(await res.json());
    },
    enabled: !!id && !!isAuthenticated,
    refetchInterval: 5000, // Keep participant status fresh
  });
}

// POST /api/conversations/direct
export function useCreateDirectChat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (targetIdentityId: number) => {
      const res = await fetch(`${BASE_URL}${api.conversations.createDirect.path}`, {
        method: api.conversations.createDirect.method,
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ targetIdentityId }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          const error = errorSchemas.forbidden.parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 400) {
          const error = errorSchemas.validation.parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create chat");
      }
      return api.conversations.createDirect.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    },
    onError: (err) => {
      toast({
        title: "Permission Denied",
        description: err.message,
        variant: "destructive",
      });
    }
  });
}
