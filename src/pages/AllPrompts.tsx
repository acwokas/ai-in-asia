import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Copy, Check, ChevronDown, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import promptAndGoLogo from "@/assets/promptandgo-logo.png";

const platformColors: Record<string, string> = {
  ChatGPT: "bg-emerald-500/20 text-emerald-400",
  Claude: "bg-amber-500/20 text-amber-400",
  Gemini: "bg-blue-500/20 text-blue-400",
  Midjourney: "bg-purple-500/20 text-purple-400",
  "Multi-platform": "bg-indigo-500/20 text-indigo-400",
};

const categories = [
  "All",
  "Content & Writing",
  "SEO & Marketing",
  "Research & Analysis",
  "Strategy & Planning",
  "Productivity",
];

const platforms = ["All", "ChatGPT", "Claude", "Gemini", "Multi-platform"];

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "most-copied", label: "Most copied" },
  { value: "by-guide", label: "By guide" },
];

const AllPrompts = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Fetch prompts with guide info
  const { data: prompts, isLoading } = useQuery({
    queryKey: ["guide-prompts-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guide_prompts")
        .select("*, ai_guides!inner(title, slug, status)")
        .eq("ai_guides.status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch guide count
  const { data: guideCount } = useQuery({
    queryKey: ["guide-count-for-prompts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_guide_prompts")
        .select("guide_id")
        .limit(1000);
      const uniqueGuides = new Set(data?.map(d => d.guide_id));
      return uniqueGuides.size;
    },
  });

  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    let filtered = [...prompts];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.prompt_title?.toLowerCase().includes(q) ||
          p.prompt_text?.toLowerCase().includes(q) ||
          (p.ai_guides as any)?.title?.toLowerCase().includes(q)
      );
    }

    // Platform
    if (platformFilter !== "All") {
      filtered = filtered.filter((p) =>
        p.platforms?.includes(platformFilter)
      );
    }

    // Category
    if (categoryFilter !== "All") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    // Sort
    if (sortBy === "newest") {
      filtered.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
    } else if (sortBy === "most-copied") {
      filtered.sort((a, b) => (b.copy_count || 0) - (a.copy_count || 0));
    } else if (sortBy === "by-guide") {
      filtered.sort((a, b) => {
        const guideA = (a.ai_guides as any)?.title || "";
        const guideB = (b.ai_guides as any)?.title || "";
        if (guideA !== guideB) return guideA.localeCompare(guideB);
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
    }

    return filtered;
  }, [prompts, searchQuery, platformFilter, categoryFilter, sortBy]);

  const copyPrompt = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      // Increment copy count
      supabase
        .from("ai_guide_prompts")
        .update({ copy_count: (prompts?.find(p => p.id === id)?.copy_count || 0) + 1 })
        .eq("id", id)
        .then(() => queryClient.invalidateQueries({ queryKey: ["guide-prompts-library"] }));
      toast({ title: "Copied!", description: "Prompt copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Error", description: "Failed to copy", variant: "destructive" });
    }
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPrompts = prompts?.length || 0;

  // Insert ad after every 6 cards
  const renderPromptCards = () => {
    const cards: React.ReactNode[] = [];
    filteredPrompts.forEach((prompt, index) => {
      const guide = prompt.ai_guides as any;
      const isExpanded = !isMobile || expandedCards.has(prompt.id);

      cards.push(
        <div key={prompt.id} className="border border-border rounded-lg bg-card overflow-hidden">
          {isMobile ? (
            <Collapsible open={expandedCards.has(prompt.id)} onOpenChange={() => toggleCard(prompt.id)}>
              <CollapsibleTrigger className="w-full text-left px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight">{prompt.prompt_title}</h3>
                    <p className="text-xs text-muted-foreground">
                      From: <Link to={`/guides/${guide?.slug}`} className="text-primary hover:underline" onClick={e => e.stopPropagation()}>{guide?.title}</Link>
                    </p>
                    {prompt.platforms && prompt.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {prompt.platforms.map((p: string) => (
                          <Badge key={p} className={`text-[10px] px-1.5 py-0 border-0 ${platformColors[p] || "bg-muted text-muted-foreground"}`}>{p}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 transition-transform ${expandedCards.has(prompt.id) ? "rotate-180" : ""}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 pb-5 space-y-3">
                  <PromptCodeBlock text={prompt.prompt_text} id={prompt.id} copiedId={copiedId} onCopy={copyPrompt} />
                  {prompt.what_to_expect && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{prompt.what_to_expect}</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="px-5 py-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <h3 className="font-semibold text-base leading-tight">{prompt.prompt_title}</h3>
                  <p className="text-xs text-muted-foreground">
                    From: <Link to={`/guides/${guide?.slug}`} className="text-primary hover:underline">{guide?.title}</Link>
                  </p>
                </div>
                {prompt.platforms && prompt.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1 flex-shrink-0">
                    {prompt.platforms.map((p: string) => (
                      <Badge key={p} className={`text-[10px] px-1.5 py-0 border-0 ${platformColors[p] || "bg-muted text-muted-foreground"}`}>{p}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <PromptCodeBlock text={prompt.prompt_text} id={prompt.id} copiedId={copiedId} onCopy={copyPrompt} />
              {prompt.what_to_expect && (
                <p className="text-sm text-muted-foreground leading-relaxed">{prompt.what_to_expect}</p>
              )}
            </div>
          )}
        </div>
      );

      // Ad slot after every 6 cards
      if ((index + 1) % 6 === 0 && index < filteredPrompts.length - 1) {
        cards.push(
          <div key={`ad-${index}`} className="flex flex-col items-center gap-1 py-4">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">Advertisement</span>
            <div className="w-[300px] h-[250px] bg-muted/30 border border-border/50 rounded-lg flex items-center justify-center">
              <span className="text-xs text-muted-foreground/40">Ad slot</span>
            </div>
          </div>
        );
      }
    });

    return cards;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Prompt Library | AI in Asia"
        description="Every prompt from every guide. Tested, specific, ready to paste. Browse and copy AI prompts for ChatGPT, Claude, Gemini, and more."
        canonical="https://aiinasia.com/prompts"
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <div className="bg-card border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-8 md:py-10 text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">AI Prompt Library</h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Every prompt from every guide. Tested, specific, ready to paste.
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{totalPrompts}</span> prompts across{" "}
              <span className="font-medium text-foreground">{guideCount || 0}</span> guides
            </p>
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-border bg-background sticky top-0 z-20">
          <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
            {/* Platform pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-muted-foreground flex-shrink-0">Platform:</span>
              {platforms.map((p) => (
                <Button
                  key={p}
                  variant={platformFilter === p ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs flex-shrink-0"
                  onClick={() => setPlatformFilter(p)}
                >
                  {p}
                </Button>
              ))}
            </div>

            {/* Category + Sort */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs text-muted-foreground flex-shrink-0">Category:</span>
              {categories.map((c) => (
                <Button
                  key={c}
                  variant={categoryFilter === c ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs flex-shrink-0"
                  onClick={() => setCategoryFilter(c)}
                >
                  {c}
                </Button>
              ))}
              <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                <span className="text-xs text-muted-foreground">Sort:</span>
                {sortOptions.map((s) => (
                  <Button
                    key={s.value}
                    variant={sortBy === s.value ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSortBy(s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-border rounded-lg p-5 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ))}
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-muted-foreground text-lg">
                {totalPrompts === 0
                  ? "Prompts are being added. Check back soon, or browse our guides for tested prompts in context."
                  : "No prompts match these filters. Try broadening your selection."}
              </p>
              {totalPrompts === 0 && (
                <Button asChild variant="outline">
                  <Link to="/guides">Browse Guides</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {renderPromptCards()}
            </div>
          )}

          {/* PromptAndGo CTA */}
          <div className="mt-12 border border-teal-500/30 rounded-lg bg-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 space-y-2">
              <p className="font-semibold text-foreground">Want to customise these prompts for your specific use case?</p>
              <p className="text-sm text-muted-foreground">
                PromptAndGo.ai can optimise any prompt for your platform and audience.
              </p>
            </div>
            <Button asChild className="flex-shrink-0 gap-2">
              <a href="https://promptandgo.ai" target="_blank" rel="noopener noreferrer">
                Try PromptAndGo.ai <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Code block sub-component
function PromptCodeBlock({ text, id, copiedId, onCopy }: { text: string; id: string; copiedId: string | null; onCopy: (text: string, id: string) => void }) {
  const isCopied = copiedId === id;
  return (
    <div className="relative group">
      <pre className="bg-muted/60 border border-border rounded-md p-4 pr-12 text-sm font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[300px] overflow-y-auto">
        {text}
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-8 gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
        onClick={() => onCopy(text, id)}
      >
        {isCopied ? <><Check className="h-3.5 w-3.5" />Copied ✓</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
      </Button>
    </div>
  );
}

export default AllPrompts;
