import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2, Upload, X, Image as ImageIcon } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompression";

interface TldrSnapshotCardProps {
  tldrSnapshot: string[];
  whoShouldPayAttention: string;
  whatChangesNext: string;
  isGenerating: boolean;
  disabled: boolean;
  onTldrChange: (bullets: string[]) => void;
  onWhoChange: (value: string) => void;
  onWhatChange: (value: string) => void;
  onGenerate: () => void;
  // Signal images (3B9 only)
  articleType?: string;
  signalImages?: string[];
  onSignalImagesChange?: (images: string[]) => void;
}

export const TldrSnapshotCard = ({
  tldrSnapshot,
  whoShouldPayAttention,
  whatChangesNext,
  isGenerating,
  disabled,
  onTldrChange,
  onWhoChange,
  onWhatChange,
  onGenerate,
  articleType,
  signalImages = ["", "", ""],
  onSignalImagesChange,
}: TldrSnapshotCardProps) => {
  const is3B9 = articleType === "three_before_nine";
  
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const handleImageUpload = async (index: number, file: File) => {
    setUploadingIndex(index);
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 800, quality: 0.85, maxSizeMB: 1 });
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `3b9/signal-${index + 1}-${Date.now()}-${safeName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, compressed, { contentType: compressed.type });
      
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      const newImages = [...signalImages];
      newImages[index] = urlData.publicUrl;
      onSignalImagesChange?.(newImages);
      toast.success("Image uploaded", { description: `Signal ${index + 1} image set` });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Upload failed", { description: err.message });
    } finally {
      setUploadingIndex(null);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...signalImages];
    newImages[index] = "";
    onSignalImagesChange?.(newImages);
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>TL;DR Snapshot</CardTitle>
        <CardDescription>Generate 3 concise bullet points summarizing the article</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Appears below the featured image. Automatically removes existing TL;DR from content.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={isGenerating || disabled}
            className="bg-[#10b981] hover:bg-[#059669] text-white border-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Scout Assist: TL;DR
              </>
            )}
          </Button>
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="space-y-2">
              <div className="flex gap-2 items-start">
                <div className="flex-shrink-0 mt-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <Input
                  value={tldrSnapshot[index] || ""}
                  onChange={(e) => {
                    const newTldr = [...tldrSnapshot];
                    newTldr[index] = e.target.value;
                    onTldrChange(newTldr);
                  }}
                  placeholder={`Bullet point ${index + 1}`}
                />
              </div>
              
              {/* Signal image upload for 3B9 */}
              {is3B9 && (
                <div className="ml-6 flex items-center gap-3">
                  <input
                    ref={fileInputRefs[index]}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(index, file);
                      e.target.value = '';
                    }}
                  />
                  {signalImages[index] ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={signalImages[index]}
                        alt={`Signal ${index + 1}`}
                        className="h-12 w-20 object-cover rounded border border-border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRefs[index].current?.click()}
                        className="text-xs"
                      >
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(index)}
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs[index].current?.click()}
                      disabled={uploadingIndex === index}
                      className="text-xs"
                    >
                      {uploadingIndex === index ? (
                        <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Uploading...</>
                      ) : (
                        <><ImageIcon className="h-3 w-3 mr-1" /> Add signal image</>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="space-y-3 pt-3 mt-3 border-t border-border/50">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Who should pay attention</Label>
            <Input
              value={whoShouldPayAttention}
              onChange={(e) => onWhoChange(e.target.value)}
              placeholder="Founders | Platform trust teams | Regulators"
            />
            <p className="text-xs text-muted-foreground">Short list of audiences separated by vertical bars (|). Keep under 20 words.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">What changes next</Label>
            <Input
              value={whatChangesNext}
              onChange={(e) => onWhatChange(e.target.value)}
              placeholder="Platform moderation rules are likely to tighten across major markets."
            />
            <p className="text-xs text-muted-foreground">One short sentence about implications. Leave blank if uncertain. Keep under 20 words.</p>
          </div>
        </div>

        {is3B9 && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            Signal images are optional. The article's featured image will be used as a fallback.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
