import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, Sparkles, Copy, Check } from "lucide-react";

interface ImagePrompt {
  title: string;
  prompt: string;
  explanation: string;
}

interface ImagePromptsCardProps {
  imagePrompts: ImagePrompt[] | null;
  copiedPrompt: number | null;
  onCopyPrompt: (prompt: string, index: number) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  disabled: boolean;
}

export const ImagePromptsCard = ({
  imagePrompts,
  copiedPrompt,
  onCopyPrompt,
  isGenerating,
  onGenerate,
  disabled,
}: ImagePromptsCardProps) => {
  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Image Generation Prompts
          </h3>
          <p className="text-xs text-muted-foreground">
            Generate AI prompts for featured images based on your article content
          </p>
        </div>
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
              Scout Assist: Image Prompt
            </>
          )}
        </Button>
      </div>

      {imagePrompts && imagePrompts.length > 0 && (
        <div className="space-y-4 mt-4">
          {imagePrompts.map((prompt, index) => (
            <Card key={index} className="bg-cyan-500/10 border-cyan-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-500" />
                    {index + 1}. {prompt.title}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopyPrompt(prompt.prompt, index)}
                    className="text-cyan-600 hover:text-cyan-700"
                  >
                    {copiedPrompt === index ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="bg-background/50 p-3 rounded-md text-sm font-mono">
                  {prompt.prompt}
                </div>
                {prompt.explanation && (
                  <p className="text-xs text-muted-foreground italic">
                    {prompt.explanation}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
