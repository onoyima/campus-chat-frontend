
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Announcement } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements");
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
        headers: { "Content-Type": "application/json" },
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
