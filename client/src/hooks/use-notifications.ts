
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Notification {
  id: number;
  identityId: number;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  referenceId?: number;
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchInterval: 30000 // Poll every 30s as backup to WS
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
}
