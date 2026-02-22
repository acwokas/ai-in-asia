import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface InternalLinkSuggestionsProps {
  content: string;
  title: string;
  focusKeyphrase?: string;
}

const InternalLinkSuggestions = ({ content, title, focusKeyphrase }: InternalLinkSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Array<{ id: string; title: string; slug: string; categorySlug?: string }>>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  useEffect(() => {
    if (wordCount < 200 || !title) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      // Build search terms from title and focus keyphrase
      const titleWords = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3);
      
      const keyphraseWords = (focusKeyphrase || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3);

      const allTerms = [...new Set([...keyphraseWords, ...titleWords])].slice(0, 5);
      if (allTerms.length === 0) return;

      const searchTerms = allTerms.join(' | ');

      try {
        const { data } = await supabase
          .from('articles')
          .select('id, title, slug, primary_category_id, categories:primary_category_id(slug)')
          .eq('status', 'published')
          .textSearch('title', searchTerms, { type: 'websearch' })
          .limit(5);

        if (data && data.length > 0) {
          setSuggestions(
            data.map((a: any) => ({
              id: a.id,
              title: a.title,
              slug: a.slug,
              categorySlug: a.categories?.slug,
            }))
          );
        } else {
          setSuggestions([]);
        }
      } catch {
        // Silent fail
      }
    };

    const debounce = setTimeout(fetchSuggestions, 1500);
    return () => clearTimeout(debounce);
  }, [title, focusKeyphrase, wordCount]);

  if (suggestions.length === 0) return null;

  const handleCopy = async (suggestion: typeof suggestions[0], index: number) => {
    const categoryPrefix = suggestion.categorySlug ? `/${suggestion.categorySlug}` : '';
    const link = `[${suggestion.title}](${categoryPrefix}/${suggestion.slug})`;
    await navigator.clipboard.writeText(link);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast("Copied!", { description: "Markdown link copied to clipboard" });
  };

  return (
    <Card className="bg-muted/30 border-dashed">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Internal Link Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0 space-y-2">
        {suggestions.map((s, i) => (
          <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate text-muted-foreground">{s.title}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 shrink-0"
              onClick={() => handleCopy(s, i)}
            >
              {copiedIndex === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default InternalLinkSuggestions;
