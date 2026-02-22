import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, ExternalLink, Trash2, Eye } from "lucide-react";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  author: string;
  authorId: string;
  categoryName: string;
  categoryColor: string;
  status: string;
  slug: string;
  viewCount: number;
}

interface CalendarEventDetailProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusVariant = (status: string) => {
  switch (status) {
    case "published": return "default" as const;
    case "scheduled": return "secondary" as const;
    default: return "outline" as const;
  }
};

export const CalendarEventDetail = ({ event, open, onOpenChange }: CalendarEventDetailProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!event) return null;

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.from("articles").delete().eq("id", event.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["calendar-articles"] });
      toast.success("Article deleted");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); setConfirming(false); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug pr-6">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={statusVariant(event.status)} className="capitalize">
              {event.status}
            </Badge>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{event.categoryName}</span>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <div>By <span className="text-foreground font-medium">{event.author}</span></div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              {event.viewCount.toLocaleString()} views
            </div>
            <div>{event.start.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => { onOpenChange(false); navigate(`/editor?id=${event.id}`); }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            {event.status === "published" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => window.open(`/article/${event.slug}`, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </Button>
            )}
            <Button
              size="sm"
              variant={confirming ? "destructive" : "outline"}
              className="gap-1.5"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirming ? "Confirm" : "Delete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
