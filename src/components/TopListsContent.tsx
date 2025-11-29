import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TopListItem {
  id: string;
  title: string;
  description_top?: string;
  prompt: string;
  description_bottom?: string;
  image_url?: string;
}

interface TopListsContentProps {
  items: TopListItem[];
}

export const TopListsContent = ({ items }: TopListsContentProps) => {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyPrompt = async (prompt: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(itemId);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy prompt",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {items.map((item, index) => (
        <div key={item.id} className="space-y-4">
          <h3 className="text-xl font-bold">
            {index + 1}. {item.title}
          </h3>

          {item.description_top && (
            <div className="prose prose-sm max-w-none">
              <p>{item.description_top}</p>
            </div>
          )}

          {item.image_url && (
            <div className="my-4">
              <img
                src={item.image_url}
                alt={item.title}
                className="rounded-lg max-w-full h-auto"
              />
            </div>
          )}

          <div className="prompt-box bg-muted/50 border border-border rounded-lg p-4 relative group">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => copyPrompt(item.prompt, item.id)}
            >
              {copiedId === item.id ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
            <pre className="whitespace-pre-wrap font-mono text-sm pr-20">
              {item.prompt}
            </pre>
          </div>

          {item.description_bottom && (
            <div className="prose prose-sm max-w-none">
              <p>{item.description_bottom}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
