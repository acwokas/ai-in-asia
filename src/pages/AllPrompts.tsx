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
import { Search, Copy, Check, ChevronRight, ExternalLink, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

// Deterministic hash from a date string to pick prompt of the day
const dateSeed = (dateStr: string): number => {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

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

const categoryIcons: Record<string, string> = {
  "Content & Writing": "✍️",
  "SEO & Marketing": "📈",
  "Research & Analysis": "🔬",
  "Strategy & Planning": "🎯",
  "Productivity": "⚡",
};

const categoryAccentColors: Record<string, string> = {
  "Content & Writing": "bg-emerald-400",
  "SEO & Marketing": "bg-amber-400",
  "Research & Analysis": "bg-violet-400",
  "Strategy & Planning": "bg-pink-400",
  "Productivity": "bg-cyan-400",
};

const categoryOrder = ["Content & Writing", "SEO & Marketing", "Research & Analysis", "Strategy & Planning", "Productivity"];

/** Strip the repetitive "How to Use AI to/for " prefix from guide titles */
const cleanGuideTitle = (title: string | undefined): string => {
  if (!title) return "";
  return title.replace(/^How to Use AI (to |for )/i, "");
};

const AllPrompts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  // Prompt of the Day: deterministic daily pick
  const promptOfTheDay = useMemo(() => {
    if (!prompts || prompts.length === 0) return null;
    const today = new Date().toISOString().slice(0, 10);
    const seed = dateSeed(today);
    return prompts[seed % prompts.length];
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    let filtered = prompts.filter(p => p.id !== promptOfTheDay?.id);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.prompt_title?.toLowerCase().includes(q) ||
          p.prompt_text?.toLowerCase().includes(q) ||
          (p.ai_guides as any)?.title?.toLowerCase().includes(q)
      );
    }

    if (platformFilter !== "All") {
      filtered = filtered.filter((p) => p.platforms?.includes(platformFilter));
    }

    if (categoryFilter !== "All") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

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
  }, [prompts, promptOfTheDay, searchQuery, platformFilter, categoryFilter, sortBy]);

  // Group prompts by category when showing "All" categories and not sorting by guide
  const groupedPrompts = useMemo(() => {
    if (categoryFilter !== "All" || sortBy === "by-guide") return null;
    const groups: Record<string, typeof filteredPrompts> = {};
    for (const prompt of filteredPrompts) {
      const cat = prompt.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(prompt);
    }
    return categoryOrder.filter(cat => groups[cat]?.length).map(cat => ({ category: cat, prompts: groups[cat] }));
  }, [filteredPrompts, categoryFilter, sortBy]);

  const copyPrompt = async (text: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
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

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const totalPrompts = prompts?.length || 0;

  /** Render a single prompt card */
  const renderPromptCard = (prompt: any, index?: number) => {
    const guide = prompt.ai_guides as any;
    const isExpanded = expandedId === prompt.id;
    const isCopied = copiedId === prompt.id;
    const accentColor = categoryAccentColors[prompt.category || ""] || "bg-primary";

    return (
      <div key={prompt.id} className="flex flex-col">
        <div
          className="bg-card border border-border rounded-xl p-5 cursor-pointer group relative hover:bg-accent/30 hover:border-border hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 flex flex-col flex-1"
          onClick={() => toggleExpand(prompt.id)}
        >
          {/* Coloured left accent on hover */}
          <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${accentColor} opacity-0 group-hover:opacity-100 transition-opacity`} />

          {/* Title */}
          <h3 className="text-[15px] font-semibold leading-snug group-hover:text-primary transition-colors">
            {prompt.prompt_title}
          </h3>

          {/* Guide attribution */}
          <p className="text-sm text-muted-foreground mt-1.5 mb-3">
            <Link
              to={`/guides/${guide?.slug}`}
              className="hover:text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {cleanGuideTitle(guide?.title)}
            </Link>
          </p>

          {/* Footer: platform tags + actions */}
          <div className="flex items-center justify-between mt-auto pt-2">
            <div className="flex gap-1.5 flex-wrap">
              {prompt.platforms?.map((p: string) => (
                <Badge
                  key={p}
                  className={`text-xs px-2 py-0.5 border-0 ${platformColors[p] || "bg-muted text-muted-foreground"}`}
                >
                  {p}
                </Badge>
              ))}
            </div>
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg hover:bg-primary hover:text-primary-foreground hover:border-primary"
                onClick={(e) => copyPrompt(prompt.prompt_text, prompt.id, e)}
              >
                {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg hover:bg-primary hover:text-primary-foreground hover:border-primary"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Link to={`/guides/${guide?.slug}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded content below card */}
        <div
          className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-[2000px] opacity-100 mt-2 mb-2" : "max-h-0 opacity-0"}`}
        >
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            {/* Code block */}
            <div className="relative group/code">
              <pre className="bg-background border border-border rounded-lg p-4 pr-12 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto text-muted-foreground">
                {prompt.prompt_text}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-8 gap-1.5 text-xs opacity-0 group-hover/code:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                onClick={(e) => copyPrompt(prompt.prompt_text, prompt.id, e)}
              >
                {isCopied ? (<><Check className="h-3.5 w-3.5" /> Copied</>) : (<><Copy className="h-3.5 w-3.5" /> Copy</>)}
              </Button>
            </div>

            {prompt.what_to_expect && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">What to expect:</span>{" "}
                {prompt.what_to_expect}
              </p>
            )}

            <Link
              to={`/guides/${guide?.slug}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              View in guide <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  /** Render the ad slot */
  const renderAdSlot = () => (
    <div className="py-6">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 block mb-2">
        Advertisement
      </span>
      <div className="w-full h-[250px] bg-muted/30 border border-border/50 rounded-lg flex items-center justify-center">
        <span className="text-xs text-muted-foreground/40">Ad slot</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Prompt Library | AI in Asia"
        description="Every prompt from every guide. Tested, specific, ready to paste. Browse and copy AI prompts for ChatGPT, Claude, Gemini, and more."
        canonical="https://aiinasia.com/prompts"
      />
      <Header />

      <main className="flex-1">
        {/* ── Hero ── */}
        <div className="border-b border-border">
          <div className="max-w-[1200px] mx-auto px-4 py-10 md:py-14 text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Prompt Library</h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Every prompt from every guide. Tested, specific, ready to paste.
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{totalPrompts}</span> prompts across{" "}
              <span className="font-semibold text-foreground">{guideCount || 0}</span> guides
            </p>
            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search prompts by keyword, category, or platform..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-full text-sm placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* ── Prompt of the Day ── */}
        {promptOfTheDay && !isLoading && (() => {
          const potdGuide = promptOfTheDay.ai_guides as any;
          const potdCopied = copiedId === promptOfTheDay.id;
          return (
            <div className="max-w-[1200px] mx-auto px-4 py-8">
              <div className="bg-card border border-border rounded-xl p-6 md:p-8 relative overflow-hidden">
                {/* Gradient top bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary" />

                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                    Prompt of the Day
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-bold mb-2">{promptOfTheDay.prompt_title}</h2>

                <p className="text-sm text-muted-foreground mb-4">
                  From:{" "}
                  <Link to={`/guides/${potdGuide?.slug}`} className="text-primary hover:underline">
                    {potdGuide?.title}
                  </Link>
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {promptOfTheDay.platforms?.map((p: string) => (
                    <Badge
                      key={p}
                      className={`text-xs px-2 py-0.5 border-0 ${platformColors[p] || "bg-muted text-muted-foreground"}`}
                    >
                      {p}
                    </Badge>
                  ))}
                  {promptOfTheDay.category && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      {promptOfTheDay.category}
                    </Badge>
                  )}
                </div>

                {/* Code block */}
                <div className="relative group/potd mb-5">
                  <pre className="bg-background border border-border rounded-lg p-5 pr-14 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-[280px] overflow-y-auto text-muted-foreground">
                    {promptOfTheDay.prompt_text}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-3 h-8 gap-1.5 text-xs opacity-0 group-hover/potd:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
                    onClick={(e) => copyPrompt(promptOfTheDay.prompt_text, promptOfTheDay.id, e)}
                  >
                    {potdCopied ? (<><Check className="h-3.5 w-3.5" /> Copied</>) : (<><Copy className="h-3.5 w-3.5" /> Copy</>)}
                  </Button>
                </div>

                {promptOfTheDay.what_to_expect && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    <span className="font-medium text-foreground">What to expect:</span>{" "}
                    {promptOfTheDay.what_to_expect}
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="gap-2"
                    onClick={(e) => copyPrompt(promptOfTheDay.prompt_text, promptOfTheDay.id, e)}
                  >
                    <Copy className="h-4 w-4" />
                    Copy Prompt
                  </Button>
                  <Button asChild variant="outline" className="gap-2">
                    <Link to={`/guides/${potdGuide?.slug}`}>
                      Try this prompt <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Filters (sticky) ── */}
        <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-[1200px] mx-auto px-4 py-3 space-y-2">
            {/* Row 1: Platform + Sort + Count */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium flex-shrink-0">Platform</span>
              {platforms.map((p) => (
                <Button
                  key={p}
                  variant={platformFilter === p ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPlatformFilter(p)}
                >
                  {p}
                </Button>
              ))}
              {/* Divider */}
              <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
              <span className="text-sm text-muted-foreground font-medium flex-shrink-0">Sort</span>
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
              <span className="ml-auto text-sm text-muted-foreground hidden sm:inline">
                Showing <span className="font-semibold text-foreground">{filteredPrompts.length}</span> of{" "}
                <span className="font-semibold text-foreground">{totalPrompts}</span>
              </span>
            </div>

            {/* Row 2: Category */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium flex-shrink-0">Category</span>
              {categories.map((c) => (
                <Button
                  key={c}
                  variant={categoryFilter === c ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCategoryFilter(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-[1200px] mx-auto px-4 py-8">
          {isLoading ? (
            /* Loading skeleton: card grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPrompts.length === 0 ? (
            /* Empty state */
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
          ) : groupedPrompts ? (
            /* ── Grouped by category (default view) ── */
            <>
              {groupedPrompts.map((group, groupIndex) => (
                <div key={group.category} className={groupIndex === 0 ? "mb-10" : "mt-10 mb-10"}>
                  {/* Category header */}
                  <div className="flex items-center gap-3 border-b border-border pb-3 mb-6">
                    <span className="text-xl" role="img" aria-label={group.category}>
                      {categoryIcons[group.category] || "📁"}
                    </span>
                    <h2 className="text-lg font-semibold">{group.category}</h2>
                    <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                      {group.prompts.length}
                    </span>
                  </div>

                  {/* Card grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.prompts.map((prompt, i) => renderPromptCard(prompt, i))}
                  </div>

                  {/* Ad slot after 2nd category */}
                  {groupIndex === 1 && groupedPrompts.length > 2 && renderAdSlot()}
                </div>
              ))}
            </>
          ) : (
            /* ── Flat grid (when specific category selected or sort by guide) ── */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPrompts.map((prompt, index) => (
                  <div key={prompt.id}>
                    {renderPromptCard(prompt, index)}
                    {/* Ad slot after 6th prompt */}
                    {index === 5 && filteredPrompts.length > 6 && renderAdSlot()}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── PromptAndGo CTA ── */}
          <div className="mt-14 mb-8 border border-border rounded-xl bg-card p-8 md:p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <h3 className="text-lg font-bold mb-2 relative">
              Want to customise these prompts for your specific use case?
            </h3>
            <p className="text-sm text-muted-foreground mb-5 relative">
              PromptAndGo.ai can optimise any prompt for your platform and audience.
            </p>
            <Button asChild size="lg" className="gap-2 relative">
              <a href="https://promptandgo.ai" target="_blank" rel="noopener noreferrer">
                Try PromptAndGo.ai <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AllPrompts;
