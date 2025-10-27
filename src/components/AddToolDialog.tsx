import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AddToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddToolDialog = ({ open, onOpenChange }: AddToolDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    category: "",
    logo_url: ""
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('ai_tools')
        .insert({
          name: data.name,
          description: data.description,
          url: data.url,
          category: data.category || null,
          logo_url: data.logo_url || null,
          source_urls: ['manual']
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-tools-admin'] });
      toast({
        title: "Tool added",
        description: "The tool has been added successfully"
      });
      setFormData({
        name: "",
        description: "",
        url: "",
        category: "",
        logo_url: ""
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add AI Tool Manually</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. ChatGPT"
            />
          </div>

          <div>
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the tool..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g. Machine Learning, NLP, Computer Vision"
            />
          </div>

          <div>
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => addMutation.mutate(formData)}
            disabled={!formData.name || !formData.url || !formData.description || addMutation.isPending}
          >
            {addMutation.isPending ? "Adding..." : "Add Tool"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};