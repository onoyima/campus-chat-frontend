import { useState } from "react";
import { useIdentities, useMyIdentity } from "@/hooks/use-identity";
import { useCreateDirectChat } from "@/hooks/use-conversations";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus, ShieldAlert, Loader2 } from "lucide-react";

interface NewChatDialogProps {
  onClose: () => void;
}

export function NewChatDialog({ onClose }: NewChatDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: myIdentity } = useMyIdentity();
  const { data: identities, isLoading } = useIdentities({ search: searchTerm });
  const createChat = useCreateDirectChat();

  const handleStartChat = (identityId: number) => {
    createChat.mutate(identityId, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-xl font-display font-bold text-primary">New Conversation</DialogTitle>
        <DialogDescription>
          Search for students, lecturers, or staff to start chatting.
        </DialogDescription>
      </DialogHeader>

      <div className="relative mt-2">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, role, or department..."
          className="pl-9 py-6 text-base bg-secondary/30 border-secondary-foreground/10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <ScrollArea className="h-[300px] mt-4 pr-4 -mr-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Searching directory...</span>
          </div>
        ) : identities?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <ShieldAlert className="h-8 w-8 opacity-20" />
            <span className="text-sm">No users found. Try a different search.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {identities?.map((user) => (
              <div 
                key={user.id} 
                className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:bg-secondary/50 hover:border-border transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} />
                    <AvatarFallback>{user.displayName.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-sm">
                        {user.displayName} {user.id === myIdentity?.id && "(You)"}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {user.role}
                      </span>
                      {user.entityType === 'student' && (
                        <span className="text-xs text-muted-foreground">Student</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleStartChat(user.id)}
                  disabled={createChat.isPending}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Chat
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </DialogContent>
  );
}
