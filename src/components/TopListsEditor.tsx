import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Upload } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageCompression";

interface TopListItem {
  id: string;
  title: string;
  description_top?: string;
  prompt: string;
  description_bottom?: string;
  image_url?: string;
}

interface TopListsEditorProps {
  items: TopListItem[];
  onChange: (items: TopListItem[]) => void;
}

export const TopListsEditor = ({ items, onChange }: TopListsEditorProps) => {
  const { toast } = useToast();
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);

  const addItem = () => {
    const newItem: TopListItem = {
      id: `item-${Date.now()}`,
      title: "",
      prompt: "",
    };
    onChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof TopListItem, value: string) => {
    onChange(
      items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    setUploadingImageFor(itemId);
    try {
      const compressedFile = await compressImage(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `article-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      updateItem(itemId, 'image_url', publicUrl);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImageFor(null);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= items.length) return;
    
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    onChange(newItems);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Top List Items</h3>
        <Button onClick={addItem} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No items yet. Click "Add Item" to create your first list item.
            </p>
          </CardContent>
        </Card>
      )}

      {items.map((item, index) => (
        <Card key={item.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Item {index + 1}</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor={`title-${item.id}`}>Title *</Label>
              <Input
                id={`title-${item.id}`}
                value={item.title}
                onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                placeholder="e.g., Astronaut Mascot Design"
              />
            </div>

            <div>
              <Label htmlFor={`desc-top-${item.id}`}>Description (Top) - Optional</Label>
              <Textarea
                id={`desc-top-${item.id}`}
                value={item.description_top || ''}
                onChange={(e) => updateItem(item.id, 'description_top', e.target.value)}
                placeholder="Optional description text above the prompt..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor={`prompt-${item.id}`}>Copyable Prompt *</Label>
              <Textarea
                id={`prompt-${item.id}`}
                value={item.prompt}
                onChange={(e) => updateItem(item.id, 'prompt', e.target.value)}
                placeholder="Enter the AI prompt that users will copy..."
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor={`desc-bottom-${item.id}`}>Description (Bottom) - Optional</Label>
              <Textarea
                id={`desc-bottom-${item.id}`}
                value={item.description_bottom || ''}
                onChange={(e) => updateItem(item.id, 'description_bottom', e.target.value)}
                placeholder="Optional description text below the prompt..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor={`image-${item.id}`}>Image - Optional</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id={`image-${item.id}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(item.id, file);
                  }}
                  disabled={uploadingImageFor === item.id}
                />
                {uploadingImageFor === item.id && (
                  <span className="text-sm text-muted-foreground">Uploading...</span>
                )}
              </div>
              {item.image_url && (
                <div className="mt-2">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="max-w-xs rounded-md"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => updateItem(item.id, 'image_url', '')}
                  >
                    Remove Image
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
