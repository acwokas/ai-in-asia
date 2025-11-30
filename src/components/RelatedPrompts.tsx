import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { TopListItem } from "@/components/TopListsEditor";
import { StarRating } from "@/components/StarRating";

interface RelatedPromptsProps {
  currentPromptId: string;
  allPrompts: Array<TopListItem & {
    articleTitle: string;
    articleSlug: string;
    categorySlug: string;
    avgRating: number;
    ratingCount: number;
    tags?: string[];
    use_cases?: string[];
  }>;
}

export const RelatedPrompts = ({ currentPromptId, allPrompts }: RelatedPromptsProps) => {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const currentPrompt = allPrompts.find(p => p.id === currentPromptId);
  if (!currentPrompt) return null;

  // Find related prompts based on tags and use cases
  const relatedPrompts = allPrompts
    .filter(p => p.id !== currentPromptId)
    .map(p => {
      let score = 0;
      
      // Score based on matching tags
      const matchingTags = p.tags?.filter(tag => 
        currentPrompt.tags?.includes(tag)
      ).length || 0;
      score += matchingTags * 3;

      // Score based on matching use cases
      const matchingUseCases = p.use_cases?.filter(uc => 
        currentPrompt.use_cases?.includes(uc)
      ).length || 0;
      score += matchingUseCases * 5;

      // Bonus for high ratings
      if (p.avgRating >= 4) score += 2;

      return { ...p, similarityScore: score };
    })
    .filter(p => p.similarityScore > 0)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 3);

  if (relatedPrompts.length === 0) return null;

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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Related Prompts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {relatedPrompts.map((prompt) => (
          <div
            key={prompt.id}
            className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm flex-1">{prompt.title}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyPrompt(prompt.prompt, prompt.id)}
              >
                {copiedId === prompt.id ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-1">
              {prompt.use_cases?.slice(0, 2).map(useCase => (
                <Badge key={useCase} variant="secondary" className="text-xs capitalize">
                  {useCase}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <StarRating rating={prompt.avgRating} size={14} />
              <span className="text-xs text-muted-foreground">
                {prompt.avgRating > 0 ? prompt.avgRating.toFixed(1) : 'New'}
              </span>
            </div>

            <div className="bg-muted/30 rounded p-2">
              <pre className="whitespace-pre-wrap font-mono text-xs line-clamp-2">
                {prompt.prompt}
              </pre>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};