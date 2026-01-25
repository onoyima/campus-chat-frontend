import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatusDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    statuses: any[];
    initialIndex?: number;
}

export function StatusDialog({ open, onOpenChange, statuses, initialIndex = 0 }: StatusDialogProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (open) {
            setCurrentIndex(initialIndex);
            setProgress(0);
        }
    }, [open, initialIndex]);

    useEffect(() => {
        if (!open || statuses.length === 0) return;

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    if (currentIndex < statuses.length - 1) {
                        setCurrentIndex(c => c + 1);
                        return 0;
                    } else {
                        onOpenChange(false);
                        return 100;
                    }
                }
                return prev + 2; // 50ms * 50 = 2500ms duration roughly
            });
        }, 50);

        return () => clearInterval(timer);
    }, [open, currentIndex, statuses.length, onOpenChange]);

    if (!statuses || statuses.length === 0) return null;

    const currentStatus = statuses[currentIndex];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 border-none bg-black/90 text-white h-[90vh] max-w-md flex flex-col overflow-hidden">
                {/* Progress Bar */}
                <div className="flex gap-1 p-2 absolute top-0 left-0 right-0 z-50">
                    {statuses.map((_, idx) => (
                        <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-white transition-all duration-100 ease-linear"
                                style={{ 
                                    width: idx < currentIndex ? '100%' : 
                                           idx === currentIndex ? `${progress}%` : '0%' 
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-4 left-0 right-0 z-40 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary">
                            <AvatarImage src={`/api/users/${currentStatus.identity.entityType}/${currentStatus.identity.entityId}/avatar`} />
                            <AvatarFallback>{currentStatus.identity.displayName.substring(0,2)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm">{currentStatus.identity.displayName}</p>
                            <p className="text-xs text-white/70">
                                {formatDistanceToNow(new Date(currentStatus.createdAt), { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => onOpenChange(false)}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 flex items-center justify-center relative bg-black">
                    {currentStatus.mediaUrl ? (
                        <img 
                            src={currentStatus.mediaUrl} 
                            className="max-h-full max-w-full object-contain" 
                            alt="Status"
                        />
                    ) : (
                        <div className="p-8 text-center text-2xl font-bold">
                            {currentStatus.content}
                        </div>
                    )}
                </div>

                {/* Navigation (Invisible overlays) */}
                <div className="absolute inset-y-0 left-0 w-1/3 z-30" onClick={() => {
                    if (currentIndex > 0) {
                        setCurrentIndex(c => c - 1);
                        setProgress(0);
                    }
                }} />
                <div className="absolute inset-y-0 right-0 w-1/3 z-30" onClick={() => {
                    if (currentIndex < statuses.length - 1) {
                        setCurrentIndex(c => c + 1);
                        setProgress(0);
                    } else {
                        onOpenChange(false);
                    }
                }} />

                {/* Caption */}
                {currentStatus.mediaUrl && currentStatus.content && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-center z-40 pb-8">
                        <p className="text-sm">{currentStatus.content}</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
