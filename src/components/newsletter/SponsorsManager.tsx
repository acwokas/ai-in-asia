import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";

interface Sponsor {
  id: string;
  name: string;
  logo_url?: string;
  banner_image_url?: string;
  website_url: string;
  cta_text: string;
  is_collective_site: boolean;
  is_active: boolean;
  priority: number;
}

export function SponsorsManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Sponsor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    banner_image_url: "",
    website_url: "",
    cta_text: "Learn More",
    is_collective_site: false,
    priority: 0,
  });

  const { data: sponsors, isLoading } = useQuery({
    queryKey: ["newsletter-sponsors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_sponsors")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Sponsor[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("newsletter_sponsors")
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-sponsors"] });
      toast.success("Sponsor created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create sponsor");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from("newsletter_sponsors")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-sponsors"] });
      toast.success("Sponsor updated successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update sponsor");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("newsletter_sponsors")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-sponsors"] });
      toast.success("Sponsor deleted");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("newsletter_sponsors")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-sponsors"] });
      toast.success("Status updated");
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: number }) => {
      const { error } = await supabase
        .from("newsletter_sponsors")
        .update({ priority })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-sponsors"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      logo_url: "",
      banner_image_url: "",
      website_url: "",
      cta_text: "Learn More",
      is_collective_site: false,
      priority: 0,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: Sponsor) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      logo_url: item.logo_url || "",
      banner_image_url: item.banner_image_url || "",
      website_url: item.website_url,
      cta_text: item.cta_text,
      is_collective_site: item.is_collective_site,
      priority: item.priority,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Newsletter Sponsors</h3>
          <p className="text-sm text-muted-foreground">
            Manage sponsor rotation (higher priority = more frequent appearance)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sponsor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Sponsor" : "Add New Sponsor"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Website URL</label>
                <Input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Logo URL (optional)</label>
                <Input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Banner Image URL (optional)</label>
                <Input
                  type="url"
                  value={formData.banner_image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, banner_image_url: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">CTA Text</label>
                <Input
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priority (0-100)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="is_collective"
                    checked={formData.is_collective_site}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_collective_site: checked as boolean })
                    }
                  />
                  <label htmlFor="is_collective" className="text-sm">
                    Part of You.WithThePowerOf.AI
                  </label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {sponsors && sponsors.length > 0 ? (
          sponsors.map((sponsor) => (
            <Card key={sponsor.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  {sponsor.logo_url && (
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      className="w-20 h-20 object-contain bg-white rounded p-2"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{sponsor.name}</h4>
                      {sponsor.is_collective_site && (
                        <Badge variant="secondary">Collective Site</Badge>
                      )}
                      <Badge variant={sponsor.is_active ? "default" : "outline"}>
                        {sponsor.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">Priority: {sponsor.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>CTA: {sponsor.cta_text}</span>
                      <a
                        href={sponsor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Website →
                      </a>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updatePriorityMutation.mutate({
                          id: sponsor.id,
                          priority: sponsor.priority + 1,
                        })
                      }
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updatePriorityMutation.mutate({
                          id: sponsor.id,
                          priority: Math.max(0, sponsor.priority - 1),
                        })
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: sponsor.id,
                        is_active: !sponsor.is_active,
                      })
                    }
                  >
                    {sponsor.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(sponsor)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this sponsor?")) {
                        deleteMutation.mutate(sponsor.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center text-muted-foreground">
            No sponsors yet. Add your first one!
          </Card>
        )}
      </div>
    </div>
  );
}
