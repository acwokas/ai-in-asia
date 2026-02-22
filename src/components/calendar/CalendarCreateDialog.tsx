import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

interface CalendarCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  authors: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}

export const CalendarCreateDialog = ({ open, onOpenChange, date, authors, categories }: CalendarCreateDialogProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"draft" | "scheduled">("draft");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data, error } = await supabase
        .from("articles")
        .insert({
          title: title.trim(),
          slug: `${slug}-${Date.now()}`,
          author_id: authorId || null,
          primary_category_id: categoryId || null,
          status: status as "draft" | "scheduled",
          scheduled_for: status === "scheduled" && date ? date.toISOString() : null,
        })
        .select("id")
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["calendar-articles"] });
      toast.success("Article created");
      onOpenChange(false);
      setTitle("");
      setAuthorId("");
      setCategoryId("");
      setStatus("draft");
      navigate(`/editor?id=${data.id}`);
    } catch (err: any) {
      toast.error("Failed to create article: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[100dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            New Article — {date?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cal-title">Title *</Label>
            <Input
              id="cal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Author</Label>
            <Select value={authorId} onValueChange={setAuthorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select author" />
              </SelectTrigger>
              <SelectContent>
                {authors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <RadioGroup value={status} onValueChange={(v) => setStatus(v as "draft" | "scheduled")} className="flex gap-6 mt-1">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="draft" id="cal-draft" />
                <Label htmlFor="cal-draft" className="font-normal">Draft</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="scheduled" id="cal-scheduled" />
                <Label htmlFor="cal-scheduled" className="font-normal">Scheduled</Label>
              </div>
            </RadioGroup>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Creating…" : "Create & Edit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
