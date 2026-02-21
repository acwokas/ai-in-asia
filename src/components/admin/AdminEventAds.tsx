import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Eye, MousePointerClick, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SLOT_TYPES = [
  { value: "sponsored_featured", label: "Sponsored Featured Event" },
  { value: "mid_list_banner", label: "Mid-List Banner" },
  { value: "sidebar_skyscraper", label: "Sidebar Skyscraper" },
  { value: "sidebar_square", label: "Sidebar Square" },
  { value: "post_filter", label: "Post-Filter Recommendation" },
  { value: "alerts_sponsor", label: "Event Alerts Sponsor" },
];

interface AdForm {
  name: string;
  slot_type: string;
  image_url: string;
  click_url: string;
  alt_text: string;
  sponsor_name: string;
  sponsor_logo_url: string;
  position_index: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  filter_region: string;
  filter_type: string;
}

const emptyForm: AdForm = {
  name: "",
  slot_type: "mid_list_banner",
  image_url: "",
  click_url: "",
  alt_text: "",
  sponsor_name: "",
  sponsor_logo_url: "",
  position_index: 1,
  is_active: true,
  start_date: "",
  end_date: "",
  filter_region: "",
  filter_type: "",
};

export default function AdminEventAds() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: ads, isLoading } = useQuery({
    queryKey: ["admin-event-ad-slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_ad_slots")
        .select("*")
        .order("slot_type")
        .order("position_index");
      if (error) throw error;
      return data || [];
    },
  });

  const handleNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (ad: any) => {
    setEditingId(ad.id);
    setForm({
      name: ad.name || "",
      slot_type: ad.slot_type || "mid_list_banner",
      image_url: ad.image_url || "",
      click_url: ad.click_url || "",
      alt_text: ad.alt_text || "",
      sponsor_name: ad.sponsor_name || "",
      sponsor_logo_url: ad.sponsor_logo_url || "",
      position_index: ad.position_index || 1,
      is_active: ad.is_active ?? true,
      start_date: ad.start_date || "",
      end_date: ad.end_date || "",
      filter_region: ad.filter_region || "",
      filter_type: ad.filter_type || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        filter_region: form.filter_region || null,
        filter_type: form.filter_type || null,
        image_url: form.image_url || null,
        click_url: form.click_url || null,
        sponsor_name: form.sponsor_name || null,
        sponsor_logo_url: form.sponsor_logo_url || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("event_ad_slots")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Ad slot updated");
      } else {
        const { error } = await supabase.from("event_ad_slots").insert(payload);
        if (error) throw error;
        toast.success("Ad slot created");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-event-ad-slots"] });
      queryClient.invalidateQueries({ queryKey: ["event-ad-slots"] });
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ad slot?")) return;
    const { error } = await supabase.from("event_ad_slots").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Ad slot deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-event-ad-slots"] });
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("event_ad_slots").update({ is_active: active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-event-ad-slots"] });
  };

  const getTypeLabel = (type: string) =>
    SLOT_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Event Ad Slots</h3>
          <p className="text-sm text-muted-foreground">Manage ad placements across the Events page</p>
        </div>
        <Button onClick={handleNew} size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Ad Slot
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !ads || ads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No ad slots configured yet. Click "Add Ad Slot" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ads.map((ad: any) => (
            <Card key={ad.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {ad.image_url && (
                    <img
                      src={ad.image_url}
                      alt={ad.alt_text || ad.name}
                      className="w-16 h-12 object-contain rounded border border-border bg-muted/30"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{ad.name}</p>
                      <Badge variant={ad.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                        {ad.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{getTypeLabel(ad.slot_type)}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {ad.impression_count}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MousePointerClick className="w-3 h-3" /> {ad.click_count}
                      </span>
                      {ad.click_url && ad.impression_count > 0 && (
                        <span>
                          CTR: {((ad.click_count / ad.impression_count) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={ad.is_active}
                      onCheckedChange={(checked) => handleToggleActive(ad.id, checked)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(ad)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(ad.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Ad Slot" : "New Ad Slot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Main Banner Q1" />
            </div>
            <div>
              <Label>Slot Type</Label>
              <Select value={form.slot_type} onValueChange={(v) => setForm({ ...form, slot_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLOT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Click-Through URL</Label>
              <Input value={form.click_url} onChange={(e) => setForm({ ...form, click_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Alt Text</Label>
              <Input value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sponsor Name</Label>
                <Input value={form.sponsor_name} onChange={(e) => setForm({ ...form, sponsor_name: e.target.value })} />
              </div>
              <div>
                <Label>Sponsor Logo URL</Label>
                <Input value={form.sponsor_logo_url} onChange={(e) => setForm({ ...form, sponsor_logo_url: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Position Index</Label>
                <Input type="number" value={form.position_index} onChange={(e) => setForm({ ...form, position_index: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Filter Region (optional)</Label>
                <Input value={form.filter_region} onChange={(e) => setForm({ ...form, filter_region: e.target.value })} placeholder="e.g., APAC" />
              </div>
              <div>
                <Label>Filter Type (optional)</Label>
                <Input value={form.filter_type} onChange={(e) => setForm({ ...form, filter_type: e.target.value })} placeholder="e.g., Conference" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
