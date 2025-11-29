import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Share2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TopListItem } from "./TopListsEditor";
import { convertSimpleMarkdownToHtml } from "@/lib/markdown";

interface TopListsContentProps {
  items: TopListItem[];
  articleId?: string;
  introHtml?: string;
  outroHtml?: string;
}

export const TopListsContent = ({ items, articleId, introHtml, outroHtml }: TopListsContentProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copyStats, setCopyStats] = useState<Record<string, number>>({});
  const [filteredItems, setFilteredItems] = useState(items);
  const showPromptTools = (items[0] as any)?.showPromptTools ?? true;
  const [showSearchWidget, setShowSearchWidget] = useState(true);

  console.log('[TopListsContent] introHtml:', introHtml);
  console.log('[TopListsContent] outroHtml:', outroHtml);

  const getHtmlContent = (content?: string) => {
    if (!content) return undefined;

    // If content already contains HTML tags (e.g. <ul><li> from the rich text editor),
    // use it as-is so browser/default prose styles control indentation and spacing.
    const looksLikeHtml = /<\/?(ul|ol|li|p|h[1-6]|blockquote|table|strong|em|a)[\s>]/i.test(content);
    if (looksLikeHtml) {
      return { __html: content };
    }

    // Normalise manual "•" bullets into proper markdown lists so intro/outro behave the same
    const normalised = content
      .split("\n")
      .map((line) =>
        line.trimStart().startsWith("• ") ? line.replace("• ", "- ") : line
      )
      .join("\n");

    const html = convertSimpleMarkdownToHtml(normalised);
    return { __html: html };
  };
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = items.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.prompt.toLowerCase().includes(query) ||
      item.description_top?.toLowerCase().includes(query) ||
      item.description_bottom?.toLowerCase().includes(query) ||
      item.tags?.some(tag => tag.toLowerCase().includes(query))
    );
    setFilteredItems(filtered);
  }, [searchQuery, items]);

  // Load copy statistics
  useEffect(() => {
    const loadStats = async () => {
      if (!articleId) return;

      const { data, error } = await supabase
        .from('prompt_copies')
        .select('prompt_item_id')
        .eq('article_id', articleId);

      if (error) {
        console.error('Error loading copy stats:', error);
        return;
      }

      const stats: Record<string, number> = {};
      data?.forEach(record => {
        stats[record.prompt_item_id] = (stats[record.prompt_item_id] || 0) + 1;
      });
      setCopyStats(stats);
    };

    loadStats();
  }, [articleId]);

  const trackCopy = async (itemId: string) => {
    if (!articleId) return;

    try {
      await supabase.from('prompt_copies').insert({
        article_id: articleId,
        prompt_item_id: itemId,
        user_id: user?.id || null,
        user_agent: navigator.userAgent,
      });

      // Update local stats
      setCopyStats(prev => ({
        ...prev,
        [itemId]: (prev[itemId] || 0) + 1,
      }));
    } catch (error) {
      console.error('Error tracking copy:', error);
    }
  };

  const copyPrompt = async (prompt: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(itemId);
      await trackCopy(itemId);
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

  const copyAllPrompts = async () => {
    const allPrompts = items.map((item, index) => 
      `${index + 1}. ${item.title}\n${item.prompt}`
    ).join('\n\n---\n\n');

    try {
      await navigator.clipboard.writeText(allPrompts);
      toast({
        title: "All prompts copied!",
        description: `${items.length} prompts copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy all prompts",
        variant: "destructive",
      });
    }
  };

  const sharePrompt = async (item: TopListItem, index: number) => {
    const url = `${window.location.href}#prompt-${index + 1}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: item.prompt,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied!",
          description: "Shareable link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro block above prompts list */}
      {introHtml && (
        <div
          className="border-b pb-6 mb-6 prose prose-sm max-w-none [&_ul]:pl-4 [&_ol]:pl-4 [&_li]:ml-0"
          dangerouslySetInnerHTML={getHtmlContent(introHtml)}
        />
      )}

      {/* Search and Actions Bar */}
      {showPromptTools && (
        <div className="border-b pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Prompt Tools</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearchWidget(!showSearchWidget)}
              className="gap-2"
            >
              {showSearchWidget ? (
                <>
                  Hide <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Show <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          {showSearchWidget && (
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={copyAllPrompts} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy All Prompts
              </Button>
            </div>
          )}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {searchQuery ? 'No prompts match your search' : 'No prompts available'}
        </p>
      ) : (
        <div className="space-y-8">
          {filteredItems.map((item, index) => {
            const originalIndex = items.findIndex(i => i.id === item.id);
            return (
              <div key={item.id} id={`prompt-${originalIndex + 1}`} className="scroll-mt-24 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-bold flex-1">
                    {originalIndex + 1}. {item.title}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => sharePrompt(item, originalIndex)}
                    title="Share this prompt"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Metadata badges */}
                <div className="flex flex-wrap gap-2">
                  {item.difficulty && (
                    <Badge variant="outline" className="capitalize">
                      {item.difficulty}
                    </Badge>
                  )}
                  {item.use_cases?.map(useCase => (
                    <Badge key={useCase} variant="secondary" className="capitalize">
                      {useCase}
                    </Badge>
                  ))}
                  {item.ai_models?.map(model => (
                    <Badge key={model} variant="default" className="capitalize">
                      {model === 'all' ? '✨ All Models' : model}
                    </Badge>
                  ))}
                  {item.tags?.map(tag => (
                    <Badge key={tag} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>

                {item.description_top && (
                  <div
                    className="prose prose-sm max-w-none [&_ul]:pl-4 [&_ol]:pl-4"
                    dangerouslySetInnerHTML={getHtmlContent(item.description_top)}
                  />
                )}

                {/* Optional rich content box between sections */}
                {item.contentBox && (
                  <div
                    className="prose prose-sm max-w-none my-4 [&_ul]:pl-4 [&_ol]:pl-4"
                    dangerouslySetInnerHTML={getHtmlContent(item.contentBox)}
                  />
                )}

                {item.image_urls && item.image_urls.length > 0 && (
                  <div className="my-4">
                    <img
                      src={item.image_urls[0]}
                      alt={item.title}
                      className="rounded-lg max-w-full h-auto"
                    />
                  </div>
                )}

                <div className="prompt-box bg-muted/50 border border-border rounded-lg p-4 relative group">
                  <pre className="whitespace-pre-wrap font-mono text-sm mb-2">
                    {item.prompt}
                  </pre>
                  <div className="flex items-center justify-end gap-2">
                    {copyStats[item.id] > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {copyStats[item.id]} {copyStats[item.id] === 1 ? 'copy' : 'copies'}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
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
                          Copy Prompt
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Model-specific variations */}
                {item.variations && item.variations.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground">Model-Specific Variations:</p>
                    {item.variations.map((variation, varIndex) => (
                      <div key={varIndex} className="prompt-box bg-muted/30 border border-border rounded-lg p-3 relative group">
                        <span className="text-xs font-semibold uppercase block mb-2">{variation.model}</span>
                        <pre className="whitespace-pre-wrap font-mono text-xs mb-2">
                          {variation.prompt}
                        </pre>
                        <div className="flex items-start justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyPrompt(variation.prompt, `${item.id}-var-${varIndex}`)}
                          >
                            {copiedId === `${item.id}-var-${varIndex}` ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {item.description_bottom && (
                  <div
                    className="prose prose-sm max-w-none [&_ul]:pl-4 [&_ol]:pl-4"
                    dangerouslySetInnerHTML={getHtmlContent(item.description_bottom)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Outro block below prompts list */}
      {outroHtml && (
        <div
          className="border-b pb-6 mb-6 prose prose-sm max-w-none [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:ml-0 [&_li]:my-1"
          dangerouslySetInnerHTML={getHtmlContent(outroHtml)}
        />
      )}
    </div>
  );
};
