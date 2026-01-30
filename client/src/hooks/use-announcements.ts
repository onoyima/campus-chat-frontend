
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Announcement } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/api-config";

export function useAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch announcements");
      return await res.json();
    }
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { title: string, content: string, authorIdentityId: number, isFeatured?: boolean }) => {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create announcement");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Announcement Posted" });
    },
    onError: () => {
      toast({ title: "Failed to post announcement", variant: "destructive" });
    }
  });
}
