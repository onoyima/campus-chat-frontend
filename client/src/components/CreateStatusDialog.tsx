import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, Image as ImageIcon, Send } from "lucide-react";
import { api } from "@shared/routes";
import { getAuthHeaders } from "@/lib/api-config";

interface CreateStatusDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateStatusDialog({ open, onOpenChange }: CreateStatusDialogProps) {
    const [content, setContent] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const uploadMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const authHeaders = getAuthHeaders() as any;
            delete authHeaders['Content-Type']; // Let browser set boundary for FormData

            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: authHeaders,
                body: formData
            });
            if (!res.ok) throw new Error("Upload failed");
            return await res.json();
        }
    });

    const createStatusMutation = useMutation({
        mutationFn: async (data: { content: string, mediaUrl?: string }) => {
            const res = await fetch(api.status.create.path, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error("Failed to post status");
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.status.list.path] });
            toast({ title: "Status Updated", description: "Your status is now visible to friends." });
            onOpenChange(false);
            setContent("");
            setFile(null);
            setPreview(null);
        }
    });

    const handleSubmit = async () => {
        if (!content && !file) return;

        try {
            let mediaUrl = undefined;
            if (file) {
                const formData = new FormData();
                formData.append('file', file);
                const { url } = await uploadMutation.mutateAsync(formData);
                mediaUrl = url;
            }

            await createStatusMutation.mutateAsync({
                content,
                mediaUrl
            });
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to post status", variant: "destructive" });
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            const url = URL.createObjectURL(f);
            setPreview(url);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add to Status</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {preview ? (
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center group">
                            <img src={preview} className="max-h-full max-w-full" />
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                    setFile(null);
                                    setPreview(null);
                                }}
                            >
                                Remove
                            </Button>
                        </div>
                    ) : (
                        <div 
                            className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50 transition-colors"
                            onClick={() => document.getElementById('status-file')?.click()}
                        >
                            <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Click to upload image</p>
                        </div>
                    )}
                    <input 
                        id="status-file" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleFileSelect}
                    />

                    <textarea
                        placeholder="Add a caption..."
                        className="w-full bg-secondary/50 rounded-lg p-3 text-sm focus:outline-none min-h-[80px] resize-none"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />

                    <div className="flex justify-end">
                        <Button 
                            onClick={handleSubmit} 
                            disabled={createStatusMutation.isPending || uploadMutation.isPending || (!content && !file)}
                            className="gap-2"
                        >
                            {(createStatusMutation.isPending || uploadMutation.isPending) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            Share
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
