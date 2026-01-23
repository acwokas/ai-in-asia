import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2 } from "lucide-react";

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
}: TldrSnapshotCardProps) => {
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
            <div key={index} className="flex gap-2 items-start">
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
      </CardContent>
    </Card>
  );
};
