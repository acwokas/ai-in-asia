import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wand2, Loader2 } from "lucide-react";
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

const ScoutWritingAssistant = ({ selectedText, onReplace, fullFieldContent, context, canUndo, onUndo }: ScoutWritingAssistantProps) => {
  const [isLoading, setIsLoading] = useState(false);
  

  const callAI = async (action: string) => {
    const textToProcess = selectedText.trim() || fullFieldContent?.trim() || "";
    
    if (!textToProcess) {
      toast.error("No text available", {
        description: "Please add some text to use Scout.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scout-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action,
            content: textToProcess,
            context,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "AI request failed");
      }

      const data = await response.json();
      
      if (data.result) {
        onReplace(data.result);
        toast.success("Scout suggestion applied", {
          description: "The text has been updated with Scout's assistance.",
        });
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

  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || (!selectedText.trim() && !fullFieldContent?.trim())}
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
          <DropdownMenuItem onClick={() => callAI("improve")}>
            Improve Writing
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => callAI("shorten")}>
            Make Shorter
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => callAI("expand")}>
            Expand
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => callAI("summarize")}>
            Summarize
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {canUndo && onUndo && (
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          className="gap-2"
        >
          Undo
        </Button>
      )}
    </div>
  );
};

export default ScoutWritingAssistant;
