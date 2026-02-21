import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Copy, Check, RefreshCw, Upload, Loader2, Image } from "lucide-react";

interface GuideEditorFeaturedImageProps {
  imageUrl: string;
  imageAlt: string;
  title: string;
  pillar: string;
  topicTags: string[];
  oneLineDescription: string;
  onUpdateField: (field: string, value: any) => void;
}

const GuideEditorFeaturedImage = ({
  imageUrl, imageAlt, title, pillar, topicTags, oneLineDescription, onUpdateField,
}: GuideEditorFeaturedImageProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [midjourneyPrompts, setMidjourneyPrompts] = useState<string[]>([]);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const generateMidjourneyPrompts = async () => {
    if (!title.trim()) {
      toast({ title: "Add a title first", description: "The title is needed to generate relevant prompts.", variant: "destructive" });
      return;
    }
    setGeneratingPrompts(true);
    try {
      const systemPrompt = `You are an expert Midjourney prompt engineer. Generate exactly 2 Midjourney image prompts for a guide hero image. The image should be editorial, professional, and suitable for a dark-themed AI publication (AIinASIA.com). Requirements:
- Dark moody backgrounds (deep navy, charcoal, or black)
- Teal (#0D9488) and electric blue accent lighting or elements
- Abstract, conceptual visualization of the topic - NOT literal representations
- No text, no words, no letters in the image
- Clean composition with breathing room for title overlay
- Professional, modern, slightly futuristic aesthetic
- --ar 16:9 --style raw --v 6.1

Return ONLY the 2 prompts, clearly numbered as 1. and 2. Nothing else.`;

      const userPrompt = `Guide title: ${title}\nTopic tags: ${topicTags.join(", ")}\nPillar: ${pillar}\nOne-line description: ${oneLineDescription}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scout-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action: "custom", content: userPrompt, context: { systemPrompt } }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate prompts");
      const data = await response.json();
      const result = data.result || "";

      // Parse numbered prompts
      const lines = result.split("\n").filter((l: string) => l.trim());
      const prompts: string[] = [];
      let current = "";
      for (const line of lines) {
        const match = line.match(/^\d+\.\s*(.*)/);
        if (match) {
          if (current) prompts.push(current.trim());
          current = match[1];
        } else {
          current += " " + line.trim();
        }
      }
      if (current) prompts.push(current.trim());

      if (prompts.length === 0) {
        // Fallback: treat as two prompts split by double newline or just use the whole thing
        prompts.push(result.trim());
      }

      setMidjourneyPrompts(prompts.slice(0, 2));
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to generate prompts", variant: "destructive" });
    } finally {
      setGeneratingPrompts(false);
    }
  };

  const copyPrompt = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({ title: "Prompt copied!" });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Invalid file type", description: "Only JPG, PNG, and WebP are accepted.", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      const compressed = await compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85, maxSizeMB: 1 });
      setUploadProgress(50);

      const ext = compressed.name.split(".").pop() || "jpg";
      const safeName = title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) : "guide";
      const fileName = `guides/${safeName}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("article-images")
        .upload(fileName, compressed, { contentType: compressed.type, upsert: false });

      if (uploadError) throw uploadError;
      setUploadProgress(80);

      const { data: { publicUrl } } = supabase.storage.from("article-images").getPublicUrl(fileName);
      onUpdateField("featured_image_url", publicUrl);
      setUploadProgress(100);
      toast({ title: "Image uploaded successfully" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setTimeout(() => { setUploading(false); setUploadProgress(0); }, 500);
    }
  }, [title, onUpdateField, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleUseUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
      onUpdateField("featured_image_url", trimmed);
      setUrlInput("");
      toast({ title: "Image URL set" });
    } catch {
      toast({ title: "Invalid URL", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Image Preview */}
      <div>
        {imageUrl ? (
          <div className="relative aspect-video rounded-lg overflow-hidden border border-border max-h-[300px]">
            <img src={imageUrl} alt={imageAlt || "Guide featured image"} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/20 max-h-[300px]">
            <div className="text-center text-muted-foreground">
              <Image className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No image yet - generate prompts or upload below</p>
            </div>
          </div>
        )}
        <Input
          className="mt-3"
          placeholder="Alt text for accessibility"
          value={imageAlt}
          onChange={e => onUpdateField("featured_image_alt", e.target.value)}
        />
      </div>

      {/* Section 2: Midjourney Prompts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Midjourney Prompts</h4>
          <div className="flex gap-2">
            {midjourneyPrompts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={generateMidjourneyPrompts} disabled={generatingPrompts}>
                <RefreshCw className="h-3 w-3 mr-1" />Regenerate
              </Button>
            )}
            <Button
              size="sm"
              onClick={generateMidjourneyPrompts}
              disabled={generatingPrompts || !title.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              {generatingPrompts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {midjourneyPrompts.length > 0 ? "Regenerate" : "Generate Midjourney Prompts"}
            </Button>
          </div>
        </div>

        {midjourneyPrompts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {midjourneyPrompts.map((prompt, i) => (
              <div key={i} className="bg-[hsl(222,47%,11%)] border border-border rounded-lg p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prompt {i + 1}</span>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => copyPrompt(prompt, i)}>
                    {copiedIndex === i ? <><Check className="h-3 w-3 mr-1" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
                  </Button>
                </div>
                <p className="text-sm font-mono leading-relaxed text-foreground/90">{prompt}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Upload Image */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Upload Image</h4>

        {/* Drag-drop zone */}
        <div
          className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer p-8 text-center ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileSelect}
          />
          {uploading ? (
            <div className="space-y-3">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <Progress value={uploadProgress} className="max-w-xs mx-auto" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">Drag and drop your image here, or click to browse</p>
              <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, WebP - Max 5MB</p>
            </>
          )}
        </div>

        {/* URL input */}
        <div className="flex gap-2">
          <Input
            placeholder="Or paste an image URL"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleUseUrl(); }}
            className="flex-1"
          />
          <Button variant="outline" size="default" onClick={handleUseUrl} disabled={!urlInput.trim()}>
            Use URL
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuideEditorFeaturedImage;
