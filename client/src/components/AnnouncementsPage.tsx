
import { useAnnouncements, useCreateAnnouncement } from "@/hooks/use-announcements";
import { useMyIdentity } from "@/hooks/use-identity";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Loader2, Megaphone, Pin, BellRing } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

export function AnnouncementsPage() {
    const { data: announcements, isLoading } = useAnnouncements();
    const { data: identity } = useMyIdentity();
    const createAnnouncement = useCreateAnnouncement();
    
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isFeatured, setIsFeatured] = useState(false);

    const isAdmin = ['SUPER_ADMIN', 'VC', 'DEAN', 'HOD', 'ADMIN'].includes(identity?.role || "");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identity) return;
        
        createAnnouncement.mutate({
            title,
            content,
            authorIdentityId: identity.id,
            isFeatured
        }, {
            onSuccess: () => {
                setOpen(false);
                setTitle("");
                setContent("");
                setIsFeatured(false);
            }
        });
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    const featured = announcements?.filter(a => a.isFeatured) || [];
    const regular = announcements?.filter(a => !a.isFeatured) || [];

    return (
        <div className="flex-1 h-full overflow-y-auto bg-background p-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Campus Announcements</h1>
                        <p className="text-muted-foreground mt-2">Latest updates from Management, Faculty, and Departments.</p>
                    </div>
                    
                    {isAdmin && (
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Megaphone className="mr-2 h-4 w-4" />
                                    Post Announcement
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>New Announcement</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Title</label>
                                        <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Exam Schedule Update" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Content</label>
                                        <Textarea value={content} onChange={e => setContent(e.target.value)} required rows={5} placeholder="Details..." />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="featured" checked={isFeatured} onCheckedChange={(c) => setIsFeatured(!!c)} />
                                        <label htmlFor="featured" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Pin as Featured (Urgent/Important)
                                        </label>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={createAnnouncement.isPending}>
                                        {createAnnouncement.isPending ? "Posting..." : "Post Announcement"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Featured Section */}
                {featured.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-600 font-semibold">
                            <Pin className="h-4 w-4" />
                            <span>Featured & Urgent</span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {featured.map(item => (
                                <Card key={item.id} className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 mb-2">Important</Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(item.createdAt || new Date()), "MMM d, yyyy")}
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg">{item.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Regular Stream */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                        <BellRing className="h-4 w-4" />
                        <span>Recent Updates</span>
                    </div>
                    
                    {regular.length === 0 && (
                        <div className="text-center py-12 border rounded-lg bg-muted/20">
                            <p className="text-muted-foreground">No recent announcements.</p>
                        </div>
                    )}

                    <div className="grid gap-4">
                        {regular.map(item => (
                            <Card key={item.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{item.title}</CardTitle>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(item.createdAt || new Date()), "MMM d, HH:mm")}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.content}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
