import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Copy, Check, ExternalLink, ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const platformColors: Record<string, string> = {
  ChatGPT: "bg-emerald-500/20 text-emerald-400",
  Claude: "bg-amber-500/20 text-amber-400",
  Gemini: "bg-blue-500/20 text-blue-400",
  Midjourney: "bg-purple-500/20 text-purple-400",
  "Multi-platform": "bg-indigo-500/20 text-indigo-400",
};

const platforms = ["All", "ChatGPT", "Claude", "Gemini", "Multi-platform"];

const PROMPT_CATEGORIES: {
  slug: string;
  label: string;
  description: string;
  topicMatch: string; // matches ai_guides.topic_category
  borderColor: string;
}[] = [
  { slug: "business", label: "Business", description: "Strategy, marketing, sales, and operations prompts", topicMatch: "Business", borderColor: "border-l-blue-500" },
  { slug: "education", label: "Education", description: "Teaching, learning, and academic prompts", topicMatch: "Education", borderColor: "border-l-emerald-500" },
  { slug: "creators", label: "Creators", description: "Design, video, audio, and creative production", topicMatch: "Creators", borderColor: "border-l-purple-500" },
  { slug: "content", label: "Content", description: "Writing, blogging, SEO, and content marketing", topicMatch: "Content", borderColor: "border-l-pink-500" },
  { slug: "lifestyle", label: "Lifestyle", description: "Travel, food, fitness, and personal interests", topicMatch: "Lifestyle", borderColor: "border-l-orange-500" },
  { slug: "finance", label: "Finance", description: "Budgeting, investing, and financial planning", topicMatch: "Finance", borderColor: "border-l-cyan-500" },
  { slug: "work", label: "Work", description: "Careers, resumes, interviews, and HR tasks", topicMatch: "Work", borderColor: "border-l-indigo-500" },
  { slug: "productivity", label: "Productivity", description: "Time management, workflows, and automation", topicMatch: "Productivity", borderColor: "border-l-yellow-500" },
  { slug: "wellness", label: "Wellness", description: "Mental health, mindfulness, and self-care", topicMatch: "Wellness", borderColor: "border-l-rose-500" },
  { slug: "technology", label: "Technology", description: "Coding, data, DevOps, and technical tasks", topicMatch: "Technology", borderColor: "border-l-teal-500" },
  { slug: "safety", label: "Safety", description: "Security, privacy, and responsible AI use", topicMatch: "Safety", borderColor: "border-l-red-500" },
];

const getCategoryBorderClass = (topicCategory: string | null | undefined): string => {
  const cat = PROMPT_CATEGORIES.find(
    (c) => c.topicMatch.toLowerCase() === (topicCategory || "").toLowerCase()
  );
  return cat?.borderColor || "border-l-zinc-600";
};

const getCategoryAccentBg = (slug: string): string => {
  const map: Record<string, string> = {
    business: "bg-blue-500", education: "bg-emerald-500", creators: "bg-purple-500",
    content: "bg-pink-500", lifestyle: "bg-orange-500", finance: "bg-cyan-500",
    work: "bg-indigo-500", productivity: "bg-yellow-500", wellness: "bg-rose-500",
    technology: "bg-teal-500", safety: "bg-red-500",
  };
  return map[slug] || "bg-zinc-500";
};

/** Strip the repetitive "How to Use AI to/for " prefix from guide titles */
const cleanGuideTitle = (title: string | undefined): string => {
  if (!title) return "";
  return title.replace(/^How to Use AI (to |for )/i, "");
};

const guideHref = (slug: string, topicCategory?: string | null) => {
  const cat = (topicCategory || "general").toLowerCase().replace(/\s+/g, "-");
  return `/guides/${cat}/${slug}`;
};

const AllPrompts = () => {
  const { category: categoryParam } = useParams<{ category?: string }>();
  const activeCategory = categoryParam
    ? PROMPT_CATEGORIES.find((c) => c.slug === categoryParam.toLowerCase())
    : null;

  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: prompts, isLoading } = useQuery({
    queryKey: ["guide-prompts-library-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guide_prompts")
        .select("*, ai_guides!inner(title, slug, status, topic_category)")
        .eq("ai_guides.status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Category counts
  const categoryCounts = useMemo(() => {
    if (!prompts) return {};
    const counts: Record<string, number> = {};
    for (const p of prompts) {
      const tc = ((p.ai_guides as any)?.topic_category || "").toLowerCase();
      const cat = PROMPT_CATEGORIES.find((c) => c.topicMatch.toLowerCase() === tc);
      if (cat) counts[cat.slug] = (counts[cat.slug] || 0) + 1;
    }
    return counts;
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    let filtered = [...prompts];

    // Category filter from URL
    if (activeCategory) {
      filtered = filtered.filter((p) => {
        const tc = ((p.ai_guides as any)?.topic_category || "").toLowerCase();
        return tc === activeCategory.topicMatch.toLowerCase();
      });
    }

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

    return filtered;
  }, [prompts, activeCategory, searchQuery, platformFilter]);

  const copyPrompt = async (text: string, id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      supabase
        .from("ai_guide_prompts")
        .update({ copy_count: (prompts?.find((p) => p.id === id)?.copy_count || 0) + 1 })
        .eq("id", id)
        .then(() => queryClient.invalidateQueries({ queryKey: ["guide-prompts-library-v2"] }));
      toast("Copied!", { description: "Prompt copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Error", { description: "Failed to copy" });
    }
  };

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));
  const totalPrompts = prompts?.length || 0;

  const renderPromptCard = (prompt: any) => {
    const guide = prompt.ai_guides as any;
    const isExpanded = expandedId === prompt.id;
    const isCopied = copiedId === prompt.id;
    const borderClass = getCategoryBorderClass(guide?.topic_category);

    return (
      <div key={prompt.id} className="flex flex-col">
        <div
          className={`bg-zinc-800/80 border border-zinc-700/60 border-l-4 ${borderClass} rounded-lg p-5 cursor-pointer group relative hover:bg-zinc-700/60 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 flex flex-col flex-1`}
          onClick={() => toggleExpand(prompt.id)}
        >
          <h3 className="text-[15px] font-semibold leading-snug text-zinc-100 group-hover:text-white transition-colors">
            {prompt.prompt_title}
          </h3>

          {/* Truncated preview */}
          <p className="text-sm text-zinc-400 mt-2 line-clamp-2 font-mono text-[13px] leading-relaxed">
            {prompt.prompt_text}
          </p>

          {/* Guide attribution */}
          <p className="text-xs text-zinc-500 mt-3">
            From:{" "}
            <Link
              to={guideHref(guide?.slug, guide?.topic_category)}
              className="text-zinc-300 hover:text-white hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {cleanGuideTitle(guide?.title)}
            </Link>
          </p>

          {/* Footer: platform tags + actions */}
          <div className="flex items-center justify-between mt-auto pt-3">
            <div className="flex gap-1.5 flex-wrap">
              {prompt.platforms?.map((p: string) => (
                <Badge
                  key={p}
                  className={`text-[10px] px-2 py-0.5 border-0 ${platformColors[p] || "bg-zinc-600 text-zinc-300"}`}
                >
                  {p}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {(prompt.copy_count ?? 0) > 0 && (
                <span className="text-[10px] text-zinc-500">{prompt.copy_count} copies</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-600"
                onClick={(e) => copyPrompt(prompt.prompt_text, prompt.id, e)}
              >
                {isCopied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-zinc-600"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Link to={guideHref(guide?.slug, guide?.topic_category)}>
                  View in Guide <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-[2000px] opacity-100 mt-2 mb-2" : "max-h-0 opacity-0"}`}>
          <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-5 space-y-3">
            <div className="relative group/code">
              <pre className="bg-zinc-900 border border-zinc-700/50 rounded-lg p-4 pr-12 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto text-zinc-300">
                {prompt.prompt_text}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-8 gap-1.5 text-xs opacity-0 group-hover/code:opacity-100 transition-opacity bg-zinc-800/80 text-zinc-300 hover:text-white"
                onClick={(e) => copyPrompt(prompt.prompt_text, prompt.id, e)}
              >
                {isCopied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
              </Button>
            </div>

            {prompt.what_to_expect && (
              <p className="text-sm text-zinc-400 leading-relaxed">
                <span className="font-medium text-zinc-200">What to expect:</span>{" "}
                {prompt.what_to_expect}
              </p>
            )}

            <Link
              to={guideHref(guide?.slug, guide?.topic_category)}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              View in guide <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const isIndexPage = !activeCategory;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0f" }}>
      <SEOHead
        title={activeCategory ? `${activeCategory.label} AI Prompts | AI in Asia` : "AI Prompt Library | AI in Asia"}
        description={activeCategory
          ? `${activeCategory.description}. Ready-to-use AI prompts for ChatGPT, Claude, Gemini, and more.`
          : "Ready-to-use prompts across every AI platform. Copy, customise, and create."}
        canonical={activeCategory ? `https://aiinasia.com/prompts/${activeCategory.slug}` : "https://aiinasia.com/prompts"}
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-zinc-800" style={{ background: "linear-gradient(135deg, #040405 0%, #0a1a1f 50%, #0f1020 100%)" }}>
          {/* SVG circuit pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="prompt-circuit" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="30" cy="30" r="1.5" fill="currentColor" />
                <line x1="30" y1="30" x2="60" y2="30" stroke="currentColor" strokeWidth="0.5" />
                <line x1="30" y1="30" x2="30" y2="0" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="0" cy="0" r="1" fill="currentColor" />
                <circle cx="60" cy="60" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#prompt-circuit)" />
          </svg>

          <div className="relative container mx-auto px-4 py-10 md:py-16 text-center space-y-4">
            {activeCategory && (
              <Link to="/prompts" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-2">
                <ArrowLeft className="h-3.5 w-3.5" /> All Prompts
              </Link>
            )}
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
              {activeCategory ? `${activeCategory.label} Prompts` : "AI Prompt Library"}
            </h1>
            <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto">
              {activeCategory
                ? activeCategory.description
                : "Ready-to-use prompts across every AI platform. Copy, customise, and create."}
            </p>
            {!activeCategory && (
              <p className="text-sm text-zinc-500">
                <span className="font-semibold text-zinc-300">{totalPrompts}</span> prompts ready to use
              </p>
            )}
            <div className="relative max-w-xl mx-auto pt-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="search"
                placeholder="Search prompts by keyword or platform..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-full text-sm bg-zinc-800/60 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-primary"
              />
            </div>
          </div>
        </section>

        {/* Category Grid (index page only) */}
        {isIndexPage && !isLoading && (
          <section className="border-b border-zinc-800" style={{ background: "#080a0f" }}>
            <div className="container mx-auto px-4 py-8">
              <h2 className="text-lg font-semibold text-zinc-200 mb-5">Browse by Category</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PROMPT_CATEGORIES.map((cat) => {
                  const count = categoryCounts[cat.slug] || 0;
                  return (
                    <Link
                      key={cat.slug}
                      to={`/prompts/${cat.slug}`}
                      className={`bg-zinc-800/70 border border-zinc-700/50 border-l-4 ${cat.borderColor} rounded-lg p-4 hover:bg-zinc-700/60 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 group no-underline`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">{cat.label}</h3>
                        <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{cat.description}</p>
                      {count > 0 && (
                        <span className="inline-block mt-2 text-[10px] font-medium text-zinc-400 bg-zinc-700/60 px-2 py-0.5 rounded-full">
                          {count} prompts
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Filter Bar */}
        <div className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-20">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500 font-medium flex-shrink-0">Platform</span>
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                    platformFilter === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {p}
                </button>
              ))}
              <span className="ml-auto text-xs text-zinc-500 hidden sm:inline">
                Showing <span className="font-semibold text-zinc-300">{filteredPrompts.length}</span>
                {!activeCategory && <> of <span className="font-semibold text-zinc-300">{totalPrompts}</span></>}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4 bg-zinc-700" />
                  <Skeleton className="h-4 w-full bg-zinc-700" />
                  <Skeleton className="h-4 w-1/2 bg-zinc-700" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-5 w-16 rounded-full bg-zinc-700" />
                    <Skeleton className="h-5 w-14 rounded-full bg-zinc-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-zinc-400 text-lg">
                {totalPrompts === 0
                  ? "Prompts are being added. Check back soon."
                  : "No prompts match these filters. Try broadening your selection."}
              </p>
              {totalPrompts === 0 && (
                <Button asChild variant="outline">
                  <Link to="/guides">Browse Guides</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {isIndexPage && <h2 className="text-lg font-semibold text-zinc-200 mb-5">All Prompts</h2>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPrompts.map((prompt) => renderPromptCard(prompt))}
              </div>
            </>
          )}

          {/* PromptAndGo CTA */}
          <div className="mt-14 mb-8 border border-zinc-700/50 rounded-xl bg-zinc-800/50 p-8 md:p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <h3 className="text-lg font-bold mb-2 text-zinc-100 relative">
              Want to customise these prompts for your specific use case?
            </h3>
            <p className="text-sm text-zinc-400 mb-5 relative">
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
