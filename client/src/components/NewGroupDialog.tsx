
import { useState } from "react";
import { useIdentities } from "@/hooks/use-identity";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, errorSchemas } from "@shared/routes";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Users, Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { buildUrl, getAuthHeaders } from "@/lib/api-config";

interface NewGroupDialogProps {
  onClose: () => void;
}

export function NewGroupDialog({ onClose }: NewGroupDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const { data: identities, isLoading } = useIdentities({ search: searchTerm });
  const createGroup = useCreateGroupChat();

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    createGroup.mutate({ name: groupName, participantIds: selectedIds }, {
      onSuccess: () => onClose()
    });
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-xl font-display font-bold text-primary">New Group Chat</DialogTitle>
        <DialogDescription>
          Create a group for your department, faculty, or project team.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="space-y-2">
           <label className="text-sm font-medium">Group Subject</label>
           <Input 
             placeholder="e.g. Computer Science 400L" 
             value={groupName}
             onChange={(e) => setGroupName(e.target.value)}
           />
        </div>

        <div className="space-y-2">
           <label className="text-sm font-medium">Add Participants ({selectedIds.length})</label>
           <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search people..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <ScrollArea className="h-[250px] pr-4 -mr-4 border rounded-md p-2">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
        ) : identities?.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No users found</div>
        ) : (
          <div className="space-y-1">
            {identities?.map((user) => (
              <div 
                key={user.id} 
                className="flex items-center space-x-3 p-2 hover:bg-secondary/50 rounded-lg cursor-pointer"
                onClick={() => toggleSelection(user.id)}
              >
                <Checkbox checked={selectedIds.includes(user.id)} />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} />
                  <AvatarFallback>{user.displayName.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                   <div className="font-medium text-sm truncate">{user.displayName}</div>
                   <div className="text-xs text-muted-foreground">{user.role}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} disabled={!groupName || selectedIds.length === 0 || createGroup.isPending}>
          {createGroup.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
          Create Group
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function useCreateGroupChat() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string, participantIds: number[] }) => {
      const res = await fetch(buildUrl("/api/conversations/group"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error("Failed to create group");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
      toast({ title: "Group Created", description: "You can now start messaging." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}
