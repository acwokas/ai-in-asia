import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wand2, Loader2, Check, X, ArrowLeftRight, Undo2 } from "lucide-react";
import { toast } from "sonner";

interface ScoutWritingAssistantProps {
  selectedText: string;
  onReplace: (newText: string) => void;
  fullFieldContent?: string;
  context?: {
    title?: string;
    fullContent?: string;
  };
  canUndo?: boolean;
  onUndo?: () => void;
}

const MODES = [
  { key: "improve", label: "Improve Writing" },
  { key: "shorten", label: "Make Shorter" },
  { key: "expand", label: "Expand" },
  { key: "summarize", label: "Summarize" },
  { key: "simplify", label: "Simplify" },
  { key: "seo", label: "SEO Optimize" },
] as const;

const wordCount = (text: string) =>
  text.trim().split(/\s+/).filter(w => w.length > 0).length;

const ScoutWritingAssistant = ({ selectedText, onReplace, fullFieldContent, context, canUndo, onUndo }: ScoutWritingAssistantProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<string | null>(null);

  const originalText = selectedText.trim() || fullFieldContent?.trim() || "";

  const stats = useMemo(() => {
    if (!result) return null;
    return {
      before: wordCount(originalText),
      after: wordCount(result),
    };
  }, [result, originalText]);

  const callAI = async (action: string) => {
    if (!originalText) {
      toast.error("No text available", { description: "Please add some text to use Scout." });
      return;
    }

    setIsLoading(true);
    setActiveMode(action);
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scout-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action, content: originalText, context }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "AI request failed");
      }

      const data = await response.json();
      if (data.result) {
        setResult(data.result);
      }
    } catch (error) {
      console.error("AI assistant error:", error);
      toast.error("Scout Error", {
        description: error instanceof Error ? error.message : "Failed to process request",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyResult = () => {
    if (result) {
      onReplace(result);
      toast.success("Scout suggestion applied");
      setResult(null);
      setActiveMode(null);
    }
  };

  const discardResult = () => {
    setResult(null);
    setActiveMode(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || !originalText}
              className="bg-[#10b981] hover:bg-[#059669] text-white border-0 gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Scout Assist
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {MODES.map((mode) => (
              <DropdownMenuItem key={mode.key} onClick={() => callAI(mode.key)}>
                {mode.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {canUndo && onUndo && (
          <Button variant="outline" size="sm" onClick={onUndo} className="gap-2">
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>
        )}
      </div>

      {/* Diff view when result is available */}
      {result && (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {/* Header with stats */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <ArrowLeftRight className="h-3 w-3" />
              {activeMode && MODES.find(m => m.key === activeMode)?.label}
            </span>
            {stats && (
              <span className="text-muted-foreground">
                {stats.before} → {stats.after} words
                <span className={stats.after > stats.before ? "text-green-500 ml-1" : stats.after < stats.before ? "text-amber-500 ml-1" : "ml-1"}>
                  ({stats.after - stats.before > 0 ? '+' : ''}{stats.after - stats.before})
                </span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 divide-x divide-border max-h-48 overflow-y-auto">
            <div className="p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Original</p>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{originalText.substring(0, 500)}{originalText.length > 500 ? '…' : ''}</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-semibold text-primary uppercase mb-1">Improved</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{result.substring(0, 500)}{result.length > 500 ? '…' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-t border-border">
            <Button size="sm" onClick={applyResult} className="gap-1.5 h-7 text-xs bg-primary hover:bg-primary/90">
              <Check className="h-3 w-3" />
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={discardResult} className="gap-1.5 h-7 text-xs">
              <X className="h-3 w-3" />
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoutWritingAssistant;
