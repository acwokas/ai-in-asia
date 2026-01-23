import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

interface HeadlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headlineOptions: { best: string; alternatives: string[] } | null;
  onSelectHeadline: (headline: string) => void;
}

export const HeadlineDialog = ({
  open,
  onOpenChange,
  headlineOptions,
  onSelectHeadline,
}: HeadlineDialogProps) => {
  if (!headlineOptions) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#10b981]" />
            Scout Headline Suggestions
          </DialogTitle>
          <DialogDescription>
            Click on a headline to use it as your article title
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Best headline */}
          <div className="p-4 border-2 border-[#10b981] rounded-lg bg-[#10b981]/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[#10b981] uppercase tracking-wide">
                Recommended
              </span>
            </div>
            <button
              onClick={() => onSelectHeadline(headlineOptions.best)}
              className="text-left w-full text-lg font-semibold hover:text-[#10b981] transition-colors"
            >
              {headlineOptions.best}
            </button>
          </div>

          {/* Alternative headlines */}
          {headlineOptions.alternatives.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Alternatives
              </span>
              {headlineOptions.alternatives.map((alt, index) => (
                <button
                  key={index}
                  onClick={() => onSelectHeadline(alt)}
                  className="w-full text-left p-3 border rounded-lg hover:border-[#10b981] hover:bg-[#10b981]/5 transition-colors"
                >
                  {alt}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
