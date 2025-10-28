import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CategorySponsor {
  id: string;
  category_id: string;
  sponsor_name: string;
  sponsor_logo_url: string;
  sponsor_website_url: string;
  sponsor_tagline: string | null;
  is_active: boolean;
  categories?: {
    name: string;
    slug: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function CategorySponsorsManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CategorySponsor | null>(null);
  const [formData, setFormData] = useState({
    category_id: "",
    sponsor_name: "",
    sponsor_logo_url: "",
    sponsor_website_url: "",
    sponsor_tagline: "",
    is_active: true,
  });

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");
      
      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch sponsors
  const { data: sponsors, isLoading } = useQuery({
    queryKey: ["category-sponsors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_sponsors")
        .select(`
          *,
          categories:category_id (
            name,
            slug
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as CategorySponsor[];
    },
  });

  // Create sponsor
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("category_sponsors")
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-sponsors"] });
      toast.success("Sponsor added successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add sponsor");
    },
  });

  // Update sponsor
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("category_sponsors")
        .update(data)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-sponsors"] });
      toast.success("Sponsor updated successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update sponsor");
    },
  });

  // Delete sponsor
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("category_sponsors")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-sponsors"] });
      toast.success("Sponsor deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete sponsor");
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("category_sponsors")
        .update({ is_active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-sponsors"] });
      toast.success("Sponsor status updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const resetForm = () => {
    setFormData({
      category_id: "",
      sponsor_name: "",
      sponsor_logo_url: "",
      sponsor_website_url: "",
      sponsor_tagline: "",
      is_active: true,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: CategorySponsor) => {
    setEditingItem(item);
    setFormData({
      category_id: item.category_id,
      sponsor_name: item.sponsor_name,
      sponsor_logo_url: item.sponsor_logo_url,
      sponsor_website_url: item.sponsor_website_url,
      sponsor_tagline: item.sponsor_tagline || "",
      is_active: item.is_active,
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
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Category Sponsors</h1>
          <p className="text-muted-foreground mt-2">
            Manage sponsorships for category pages
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Sponsor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Sponsor" : "Add Sponsor"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sponsor_name">Sponsor Name</Label>
                <Input
                  id="sponsor_name"
                  value={formData.sponsor_name}
                  onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="sponsor_logo_url">Logo URL</Label>
                <Input
                  id="sponsor_logo_url"
                  value={formData.sponsor_logo_url}
                  onChange={(e) => setFormData({ ...formData, sponsor_logo_url: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="sponsor_website_url">Website URL</Label>
                <Input
                  id="sponsor_website_url"
                  type="url"
                  value={formData.sponsor_website_url}
                  onChange={(e) => setFormData({ ...formData, sponsor_website_url: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="sponsor_tagline">Tagline (Optional)</Label>
                <Input
                  id="sponsor_tagline"
                  value={formData.sponsor_tagline}
                  onChange={(e) => setFormData({ ...formData, sponsor_tagline: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <Button type="submit" className="w-full">
                {editingItem ? "Update Sponsor" : "Add Sponsor"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {sponsors?.map((sponsor) => (
          <Card key={sponsor.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <img
                  src={sponsor.sponsor_logo_url}
                  alt={sponsor.sponsor_name}
                  className="w-16 h-16 object-contain"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{sponsor.sponsor_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Category: {sponsor.categories?.name || "Unknown"}
                  </p>
                  {sponsor.sponsor_tagline && (
                    <p className="text-sm text-muted-foreground italic mt-1">
                      {sponsor.sponsor_tagline}
                    </p>
                  )}
                  <a
                    href={sponsor.sponsor_website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline mt-1 inline-block"
                  >
                    {sponsor.sponsor_website_url}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={sponsor.is_active}
                  onCheckedChange={(checked) =>
                    toggleActiveMutation.mutate({ id: sponsor.id, is_active: checked })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(sponsor)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this sponsor?")) {
                      deleteMutation.mutate(sponsor.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {!sponsors?.length && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No sponsors found. Add your first sponsor!</p>
          </Card>
        )}
      </div>
    </div>
  );
}
