import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, Copy, FileJson, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageCompression";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TopListsPreview } from "./TopListsPreview";

export interface TopListItem {
  id: string;
  title: string;
  description_top?: string;
  prompt: string;
  description_bottom?: string;
  image_urls?: string[]; // Support multiple images
  // New metadata fields
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  ai_models?: string[]; // ['chatgpt', 'gemini', 'claude', 'all']
  use_cases?: string[]; // ['business', 'creative', 'technical', 'education']
  tags?: string[];
  variations?: Array<{
    model: string;
    prompt: string;
  }>;
}

interface TopListsEditorProps {
  items: TopListItem[];
  onChange: (items: TopListItem[]) => void;
}

interface SortableItemProps {
  item: TopListItem;
  index: number;
  onUpdate: (id: string, field: keyof TopListItem, value: any) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onImageUpload: (id: string, file: File) => void;
  uploadingImageFor: string | null;
}

const SortableItem = ({ item, index, onUpdate, onRemove, onDuplicate, onImageUpload, uploadingImageFor }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const aiModelOptions = [
    { value: 'chatgpt', label: 'ChatGPT' },
    { value: 'gemini', label: 'Gemini' },
    { value: 'claude', label: 'Claude' },
    { value: 'all', label: 'All Models' },
  ];

  const useCaseOptions = [
    { value: 'business', label: 'Business' },
    { value: 'creative', label: 'Creative' },
    { value: 'technical', label: 'Technical' },
    { value: 'education', label: 'Education' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'productivity', label: 'Productivity' },
  ];

  const toggleAIModel = (model: string) => {
    const current = item.ai_models || [];
    const updated = current.includes(model)
      ? current.filter(m => m !== model)
      : [...current, model];
    onUpdate(item.id, 'ai_models', updated);
  };

  const toggleUseCase = (useCase: string) => {
    const current = item.use_cases || [];
    const updated = current.includes(useCase)
      ? current.filter(uc => uc !== useCase)
      : [...current, useCase];
    onUpdate(item.id, 'use_cases', updated);
  };

  const addTag = (tag: string) => {
    if (!tag.trim()) return;
    const current = item.tags || [];
    if (!current.includes(tag.trim())) {
      onUpdate(item.id, 'tags', [...current, tag.trim()]);
    }
  };

  const removeTag = (tag: string) => {
    const current = item.tags || [];
    onUpdate(item.id, 'tags', current.filter(t => t !== tag));
  };

  const addVariation = () => {
    const current = item.variations || [];
    onUpdate(item.id, 'variations', [...current, { model: '', prompt: '' }]);
  };

  const updateVariation = (varIndex: number, field: 'model' | 'prompt', value: string) => {
    const current = item.variations || [];
    const updated = [...current];
    updated[varIndex] = { ...updated[varIndex], [field]: value };
    onUpdate(item.id, 'variations', updated);
  };

  const removeVariation = (varIndex: number) => {
    const current = item.variations || [];
    onUpdate(item.id, 'variations', current.filter((_, i) => i !== varIndex));
  };

  const autoGenerateTags = () => {
    // Auto-generate tags from title if empty
    if (!item.tags || item.tags.length === 0) {
      const words = item.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
      const uniqueWords = [...new Set(words)].slice(0, 5);
      if (uniqueWords.length > 0) {
        onUpdate(item.id, 'tags', uniqueWords);
      }
    }
  };

  const autoSuggestMetadata = () => {
    const titleLower = item.title.toLowerCase();
    const promptLower = item.prompt.toLowerCase();
    const combined = `${titleLower} ${promptLower}`;

    // Auto-suggest difficulty if not set
    if (!item.difficulty) {
      if (combined.includes('basic') || combined.includes('simple') || combined.includes('easy') || combined.includes('beginner')) {
        onUpdate(item.id, 'difficulty', 'beginner');
      } else if (combined.includes('advanced') || combined.includes('complex') || combined.includes('expert') || combined.includes('professional')) {
        onUpdate(item.id, 'difficulty', 'advanced');
      } else {
        onUpdate(item.id, 'difficulty', 'intermediate');
      }
    }

    // Auto-suggest use cases if empty
    if (!item.use_cases || item.use_cases.length === 0) {
      const suggestedCases: string[] = [];
      
      if (combined.includes('business') || combined.includes('company') || combined.includes('corporate') || combined.includes('strategy')) {
        suggestedCases.push('business');
      }
      if (combined.includes('creative') || combined.includes('design') || combined.includes('art') || combined.includes('writing') || combined.includes('content')) {
        suggestedCases.push('creative');
      }
      if (combined.includes('code') || combined.includes('programming') || combined.includes('technical') || combined.includes('developer') || combined.includes('software')) {
        suggestedCases.push('technical');
      }
      if (combined.includes('education') || combined.includes('learning') || combined.includes('teach') || combined.includes('student') || combined.includes('tutorial')) {
        suggestedCases.push('education');
      }
      if (combined.includes('marketing') || combined.includes('advertising') || combined.includes('campaign') || combined.includes('social media')) {
        suggestedCases.push('marketing');
      }
      if (combined.includes('productivity') || combined.includes('workflow') || combined.includes('efficiency') || combined.includes('organize')) {
        suggestedCases.push('productivity');
      }

      // Default to creative if nothing matches
      if (suggestedCases.length === 0) {
        suggestedCases.push('creative');
      }

      onUpdate(item.id, 'use_cases', suggestedCases);
    }
  };

  const removeImage = (index: number) => {
    const current = item.image_urls || [];
    onUpdate(item.id, 'image_urls', current.filter((_, i) => i !== index));
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <div className="flex flex-col gap-0.5">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                  <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                  <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                </div>
              </div>
              <CardTitle className="text-base">Item {index + 1}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDuplicate(item.id)}
                title="Duplicate item"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor={`title-${item.id}`}>Title - Optional</Label>
            <Input
              id={`title-${item.id}`}
              value={item.title}
              onChange={(e) => onUpdate(item.id, 'title', e.target.value)}
              onBlur={() => {
                autoGenerateTags();
                autoSuggestMetadata();
              }}
              placeholder="e.g., Astronaut Mascot Design"
            />
          </div>

          <div>
            <Label htmlFor={`difficulty-${item.id}`}>Difficulty Level - Auto-suggested</Label>
            <Select 
              value={item.difficulty || ''} 
              onValueChange={(value) => onUpdate(item.id, 'difficulty', value)}
            >
              <SelectTrigger id={`difficulty-${item.id}`}>
                <SelectValue placeholder="Auto-suggested after title/prompt..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Use Cases - Auto-suggested (Multiple)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {useCaseOptions.map(useCase => (
                <Badge
                  key={useCase.value}
                  variant={item.use_cases?.includes(useCase.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleUseCase(useCase.value)}
                >
                  {useCase.label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>AI Model Compatibility - Optional</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {aiModelOptions.map(model => (
                <Badge
                  key={model.value}
                  variant={item.ai_models?.includes(model.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleAIModel(model.value)}
                >
                  {model.label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor={`desc-top-${item.id}`}>Description (Top) - Optional</Label>
            <Textarea
              id={`desc-top-${item.id}`}
              value={item.description_top || ''}
              onChange={(e) => onUpdate(item.id, 'description_top', e.target.value)}
              placeholder="Optional description text above the prompt..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor={`prompt-${item.id}`}>Main Prompt - Optional</Label>
            <Textarea
              id={`prompt-${item.id}`}
              value={item.prompt}
              onChange={(e) => onUpdate(item.id, 'prompt', e.target.value)}
              onBlur={autoSuggestMetadata}
              placeholder="Enter the AI prompt that users will copy..."
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Model-Specific Variations (Optional)</Label>
              <Button variant="outline" size="sm" onClick={addVariation}>
                <Plus className="h-3 w-3 mr-1" />
                Add Variation
              </Button>
            </div>
            {item.variations?.map((variation, varIndex) => (
              <div key={varIndex} className="flex gap-2 mb-2 p-3 border rounded-lg">
                <Select 
                  value={variation.model} 
                  onValueChange={(value) => updateVariation(varIndex, 'model', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chatgpt">ChatGPT</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="claude">Claude</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={variation.prompt}
                  onChange={(e) => updateVariation(varIndex, 'prompt', e.target.value)}
                  placeholder="Model-specific prompt..."
                  rows={2}
                  className="font-mono text-sm flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVariation(varIndex)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor={`image-${item.id}`}>Images - Optional</Label>
            <div className="flex gap-2 items-center">
              <Input
                id={`image-${item.id}`}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImageUpload(item.id, file);
                }}
                disabled={uploadingImageFor === item.id}
              />
              {uploadingImageFor === item.id && (
                <span className="text-sm text-muted-foreground">Uploading...</span>
              )}
            </div>
            {item.image_urls && item.image_urls.length > 0 && (
              <div className="mt-2 space-y-2">
                {item.image_urls.map((url, imgIndex) => (
                  <div key={imgIndex} className="flex gap-2 items-start">
                    <img
                      src={url}
                      alt={`${item.title} - Image ${imgIndex + 1}`}
                      className="max-w-xs rounded-md"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage(imgIndex)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor={`desc-bottom-${item.id}`}>Description (Bottom) - Optional</Label>
            <Textarea
              id={`desc-bottom-${item.id}`}
              value={item.description_bottom || ''}
              onChange={(e) => onUpdate(item.id, 'description_bottom', e.target.value)}
              placeholder="Optional description text below the prompt..."
              rows={3}
            />
          </div>

          <div>
            <Label>Tags - Optional</Label>
            <div className="flex flex-wrap gap-2 mt-2 mb-2">
              {item.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-destructive">×</button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add tag... (or leave empty for auto-generation)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const TopListsEditor = ({ items, onChange }: TopListsEditorProps) => {
  const { toast } = useToast();
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importText, setImportText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onChange(arrayMove(items, oldIndex, newIndex));
    }
  };

  const addItem = () => {
    const newItem: TopListItem = {
      id: `item-${Date.now()}`,
      title: "",
      prompt: "",
      ai_models: ['all'],
      tags: [],
      variations: [],
    };
    onChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const duplicateItem = (id: string) => {
    const itemToDuplicate = items.find(item => item.id === id);
    if (itemToDuplicate) {
      const newItem: TopListItem = {
        ...itemToDuplicate,
        id: `item-${Date.now()}`,
        title: `${itemToDuplicate.title} (Copy)`,
      };
      const index = items.findIndex(item => item.id === id);
      const newItems = [...items];
      newItems.splice(index + 1, 0, newItem);
      onChange(newItems);
      toast({
        title: "Item duplicated",
        description: "Item has been duplicated successfully",
      });
    }
  };

  const updateItem = (id: string, field: keyof TopListItem, value: any) => {
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

      // Support multiple images by adding to array
      const item = items.find(i => i.id === itemId);
      const currentImages = item?.image_urls || [];
      updateItem(itemId, 'image_urls', [...currentImages, publicUrl]);

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

  const handleBulkImport = () => {
    try {
      let parsed;
      
      // Try parsing as JSON first
      try {
        parsed = JSON.parse(importText);
      } catch {
        // If JSON parsing fails, try CSV format
        const lines = importText.trim().split('\n');
        parsed = lines.slice(1).map(line => {
          const [title, prompt, difficulty, models, useCases, tags] = line.split(',').map(s => s.trim());
          return {
            title,
            prompt,
            difficulty: difficulty || undefined,
            ai_models: models ? models.split(';') : ['all'],
            use_cases: useCases ? useCases.split(';') : [],
            tags: tags ? tags.split(';') : [],
          };
        });
      }

      const newItems = Array.isArray(parsed) ? parsed : [parsed];
      const itemsWithIds = newItems.map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        title: item.title || "",
        prompt: item.prompt || "",
        description_top: item.description_top,
        description_bottom: item.description_bottom,
        image_urls: item.image_urls || (item.image_url ? [item.image_url] : []),
        difficulty: item.difficulty,
        ai_models: item.ai_models || ['all'],
        use_cases: item.use_cases || (item.use_case ? [item.use_case] : []),
        tags: item.tags || [],
        variations: item.variations || [],
      }));

      onChange([...items, ...itemsWithIds]);
      setShowBulkImport(false);
      setImportText('');
      toast({
        title: "Import successful",
        description: `${itemsWithIds.length} item(s) imported`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Invalid format. Please check your JSON or CSV data.",
        variant: "destructive",
      });
    }
  };

  const exportItems = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const dataStr = JSON.stringify(items, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'top-lists-export.json';
      link.click();
    } else {
      const headers = 'Title,Prompt,Difficulty,AI Models,Use Cases,Tags\n';
      const rows = items.map(item => 
        `"${item.title}","${item.prompt}","${item.difficulty || ''}","${item.ai_models?.join(';') || ''}","${item.use_cases?.join(';') || ''}","${item.tags?.join(';') || ''}"`
      ).join('\n');
      const csv = headers + rows;
      const dataBlob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'top-lists-export.csv';
      link.click();
    }
    toast({
      title: "Export successful",
      description: `Items exported as ${format.toUpperCase()}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Top List Items</h3>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowPreview(true)} variant="outline" size="sm">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </Button>
          <Button onClick={() => setShowBulkImport(true)} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => exportItems('json')} variant="outline" size="sm">
            <FileJson className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={() => exportItems('csv')} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={addItem} variant="default" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No items yet. Click "Add Item" or "Bulk Import" to create your first list item.
            </p>
          </CardContent>
        </Card>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              onUpdate={updateItem}
              onRemove={removeItem}
              onDuplicate={duplicateItem}
              onImageUpload={handleImageUpload}
              uploadingImageFor={uploadingImageFor}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Prompts</DialogTitle>
            <DialogDescription>
              Import multiple prompts at once using JSON or CSV format
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Import Data</Label>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='JSON: [{"title": "...", "prompt": "..."}]\n\nCSV:\nTitle,Prompt,Difficulty,AI Models,Use Case,Tags\n"Example","Prompt text","beginner","chatgpt;gemini","creative","tag1;tag2"'
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkImport(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Live Preview</DialogTitle>
            <DialogDescription>
              Preview how your top list will appear to readers
            </DialogDescription>
          </DialogHeader>
          <TopListsPreview items={items} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
