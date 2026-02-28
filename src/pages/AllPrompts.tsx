import { useState, useMemo, useRef } from "react";
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
import { Search, Copy, Check, ExternalLink, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Star, Sparkles } from "lucide-react";
import { toast } from "sonner";

const platformColors: Record<string, string> = {
  ChatGPT: "bg-emerald-500/20 text-emerald-400",
  Claude: "bg-amber-500/20 text-amber-400",
  Gemini: "bg-blue-500/20 text-blue-400",
  Midjourney: "bg-purple-500/20 text-purple-400",
  "Multi-platform": "bg-indigo-500/20 text-indigo-400",
  ElevenLabs: "bg-sky-500/20 text-sky-400",
  NotebookLM: "bg-lime-500/20 text-lime-400",
  Generic: "bg-zinc-500/20 text-zinc-400",
};

const PROMPT_CATEGORIES: {
  slug: string;
  label: string;
  description: string;
  topicMatch: string;
  borderColor: string;
  accent: string;
  gradient: string;
}[] = [
  { slug: "asia", label: "Asia", description: "AI trends, news, and insights from across Asia", topicMatch: "Asia", borderColor: "border-t-amber-500", accent: "bg-amber-500", gradient: "from-amber-600 to-amber-800" },
  { slug: "startup", label: "Startup", description: "AI for founders, MVPs, fundraising, and growth", topicMatch: "Startup", borderColor: "border-t-violet-500", accent: "bg-violet-500", gradient: "from-violet-600 to-violet-800" },
  { slug: "business", label: "Business", description: "Strategy, marketing, sales, and operations prompts", topicMatch: "Business", borderColor: "border-t-blue-500", accent: "bg-blue-500", gradient: "from-blue-600 to-blue-800" },
  { slug: "education", label: "Education", description: "Teaching, learning, and academic prompts", topicMatch: "Education", borderColor: "border-t-emerald-500", accent: "bg-emerald-500", gradient: "from-emerald-600 to-emerald-800" },
  { slug: "creators", label: "Creators", description: "Design, video, audio, and creative production", topicMatch: "Creators", borderColor: "border-t-purple-500", accent: "bg-purple-500", gradient: "from-purple-600 to-purple-800" },
  { slug: "content", label: "Content", description: "Writing, blogging, SEO, and content marketing", topicMatch: "Content", borderColor: "border-t-pink-500", accent: "bg-pink-500", gradient: "from-pink-600 to-pink-800" },
  { slug: "lifestyle", label: "Lifestyle", description: "Travel, food, fitness, and personal interests", topicMatch: "Lifestyle", borderColor: "border-t-orange-500", accent: "bg-orange-500", gradient: "from-orange-600 to-orange-800" },
  { slug: "finance", label: "Finance", description: "Budgeting, investing, and financial planning", topicMatch: "Finance", borderColor: "border-t-cyan-500", accent: "bg-cyan-500", gradient: "from-cyan-600 to-cyan-800" },
  { slug: "work", label: "Work", description: "Careers, resumes, interviews, and HR tasks", topicMatch: "Work", borderColor: "border-t-indigo-500", accent: "bg-indigo-500", gradient: "from-indigo-600 to-indigo-800" },
  { slug: "productivity", label: "Productivity", description: "Time management, workflows, and automation", topicMatch: "Productivity", borderColor: "border-t-yellow-500", accent: "bg-yellow-500", gradient: "from-yellow-600 to-yellow-800" },
  { slug: "wellness", label: "Wellness", description: "Mental health, mindfulness, and self-care", topicMatch: "Wellness", borderColor: "border-t-rose-500", accent: "bg-rose-500", gradient: "from-rose-600 to-rose-800" },
  { slug: "technology", label: "Technology", description: "Coding, data, DevOps, and technical tasks", topicMatch: "Technology", borderColor: "border-t-teal-500", accent: "bg-teal-500", gradient: "from-teal-600 to-teal-800" },
  { slug: "safety", label: "Safety", description: "Security, privacy, and responsible AI use", topicMatch: "Safety", borderColor: "border-t-red-500", accent: "bg-red-500", gradient: "from-red-600 to-red-800" },
];

const getCategoryBorderClass = (topicCategory: string | null | undefined): string => {
  const cat = PROMPT_CATEGORIES.find(
    (c) => c.topicMatch.toLowerCase() === (topicCategory || "").toLowerCase()
  );
  return cat?.borderColor || "border-t-zinc-600";
};

const cleanGuideTitle = (title: string | undefined): string => {
  if (!title) return "";
  return title.replace(/^How to Use AI (to |for )/i, "");
};

const guideHref = (slug: string, topicCategory?: string | null) => {
  const cat = (topicCategory || "general").toLowerCase().replace(/\s+/g, "-");
  return `/guides/${cat}/${slug}`;
};

/** Simple hash to get a deterministic daily index */
const getDailyIndex = (len: number): number => {
  if (len === 0) return 0;
  const dateStr = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % len;
};

/* ── Horizontal carousel wrapper ── */
const HorizontalCarousel = ({ children }: { children: React.ReactNode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };
  return (
    <div className="relative group/carousel">
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-zinc-800/90 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 opacity-0 group-hover/carousel:opacity-100 transition-opacity -ml-2"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children}
      </div>
      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-zinc-800/90 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 opacity-0 group-hover/carousel:opacity-100 transition-opacity -mr-2"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
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
        .select("*, ai_guides!inner(title, slug, status, topic_category, audience_role, geo)")
        .eq("ai_guides.status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // FIX 1: Dynamic platform list
  const platformFilterList = useMemo(() => {
    if (!prompts) return ["All"];
    const platformSet = new Set<string>();
    for (const p of prompts) {
      if (p.platforms) {
        for (const plat of p.platforms) platformSet.add(plat);
      }
    }
    const sorted = Array.from(platformSet).sort();
    return ["All", ...sorted, "Multi-platform"];
  }, [prompts]);

  const categoryCounts = useMemo(() => {
    if (!prompts) return {};
    const counts: Record<string, number> = {};
    for (const p of prompts) {
      const guide = p.ai_guides as any;
      const tc = (guide?.topic_category || "").toLowerCase();
      // Count for asia
      const geo = (guide?.geo || "").toLowerCase();
      if (geo && geo !== "none" && geo !== "global" && geo !== "") {
        counts["asia"] = (counts["asia"] || 0) + 1;
      }
      // Count for startup
      if (guide?.audience_role === "Startup Founder") {
        counts["startup"] = (counts["startup"] || 0) + 1;
      }
      // Count for standard categories
      const cat = PROMPT_CATEGORIES.find((c) => c.slug !== "asia" && c.slug !== "startup" && c.topicMatch.toLowerCase() === tc);
      if (cat) counts[cat.slug] = (counts[cat.slug] || 0) + 1;
    }
    return counts;
  }, [prompts]);

  // Group prompts by category for carousel sections
  const promptsByCategory = useMemo(() => {
    if (!prompts) return {};
    const groups: Record<string, any[]> = {};
    for (const p of prompts) {
      const tc = ((p.ai_guides as any)?.topic_category || "").toLowerCase();
      const cat = PROMPT_CATEGORIES.find((c) => c.topicMatch.toLowerCase() === tc);
      if (cat) {
        if (!groups[cat.slug]) groups[cat.slug] = [];
        groups[cat.slug].push(p);
      }
    }
    return groups;
  }, [prompts]);

  // Filter for category sub-pages
  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    let filtered = [...prompts];
    if (activeCategory) {
      if (activeCategory.slug === "asia") {
        filtered = filtered.filter((p) => {
          const geo = ((p.ai_guides as any)?.geo || "").toLowerCase();
          return geo && geo !== "none" && geo !== "global" && geo !== "";
        });
      } else if (activeCategory.slug === "startup") {
        filtered = filtered.filter((p) => (p.ai_guides as any)?.audience_role === "Startup Founder");
      } else {
        filtered = filtered.filter((p) => {
          const tc = ((p.ai_guides as any)?.topic_category || "").toLowerCase();
          return tc === activeCategory.topicMatch.toLowerCase();
        });
      }
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

  // Prompt of the Day
  const promptOfTheDay = useMemo(() => {
    if (!prompts || prompts.length === 0) return null;
    return prompts[getDailyIndex(prompts.length)];
  }, [prompts]);

  // Search-filtered prompts for index page carousels
  const isSearchActive = searchQuery.trim().length > 0 || platformFilter !== "All";

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

  /* ── Carousel prompt card ── */
  const renderCarouselCard = (prompt: any) => {
    const guide = prompt.ai_guides as any;
    const isCopied = copiedId === prompt.id;
    const borderClass = getCategoryBorderClass(guide?.topic_category);

    return (
      <div
        key={prompt.id}
        className={`flex-shrink-0 w-[300px] snap-start bg-zinc-800/80 border border-zinc-700/60 border-t-[3px] ${borderClass} rounded-xl p-4 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group`}
      >
        <h3 className="text-sm font-bold leading-snug text-zinc-100 group-hover:text-white line-clamp-2">
          {prompt.prompt_title}
        </h3>
        {expandedId === prompt.id ? (
          <p className="text-xs text-zinc-400 leading-relaxed flex-1 whitespace-pre-wrap">
            {prompt.prompt_text}
          </p>
        ) : (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed flex-1">
            {prompt.prompt_text}
          </p>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); toggleExpand(prompt.id); }}
          className="text-[11px] text-primary hover:underline text-left w-fit"
        >
          {expandedId === prompt.id ? "Show less" : "Show full prompt"}
        </button>
        <p className="text-[11px] text-zinc-500">
          From:{" "}
          <Link
            to={guideHref(guide?.slug, guide?.topic_category)}
            className="text-zinc-300 hover:text-white hover:underline"
          >
            {cleanGuideTitle(guide?.title)}
          </Link>
        </p>
        <div className="flex flex-wrap gap-1">
          {prompt.platforms?.map((p: string) => (
            <Badge key={p} className={`text-[9px] px-1.5 py-0 border-0 ${platformColors[p] || "bg-zinc-600 text-zinc-300"}`}>
              {p}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-700/50">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-600 px-2"
            onClick={(e) => copyPrompt(prompt.prompt_text, prompt.id, e)}
          >
            {isCopied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
          </Button>
          <Link
            to={guideHref(guide?.slug, guide?.topic_category)}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
          >
            Guide <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  };

  /* ── Full prompt card for category pages ── */
  const renderPromptCard = (prompt: any) => {
    const guide = prompt.ai_guides as any;
    const isExpanded = expandedId === prompt.id;
    const isCopied = copiedId === prompt.id;
    const borderClass = getCategoryBorderClass(guide?.topic_category);

    return (
      <div key={prompt.id} className="flex flex-col">
        <div
          className={`bg-zinc-800/80 border border-zinc-700/60 border-t-[3px] ${borderClass} rounded-xl p-5 cursor-pointer group relative hover:bg-zinc-700/60 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 flex flex-col flex-1`}
          onClick={() => toggleExpand(prompt.id)}
        >
          <h3 className="text-[15px] font-semibold leading-snug text-zinc-100 group-hover:text-white transition-colors">
            {prompt.prompt_title}
          </h3>
          <p className="text-sm text-zinc-400 mt-2 line-clamp-2 text-[13px] leading-relaxed">
            {prompt.prompt_text}
          </p>
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
          <div className="flex items-center justify-between mt-auto pt-3">
            <div className="flex gap-1.5 flex-wrap">
              {prompt.platforms?.map((p: string) => (
                <Badge key={p} className={`text-[10px] px-2 py-0.5 border-0 ${platformColors[p] || "bg-zinc-600 text-zinc-300"}`}>
                  {p}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {(prompt.copy_count ?? 0) > 0 && (
                <span className="text-[10px] text-zinc-500">{prompt.copy_count} copies</span>
              )}
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-600" onClick={(e) => copyPrompt(prompt.prompt_text, prompt.id, e)}>
                {isCopied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-zinc-600" asChild onClick={(e) => e.stopPropagation()}>
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
              <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-8 gap-1.5 text-xs opacity-0 group-hover/code:opacity-100 transition-opacity bg-zinc-800/80 text-zinc-300 hover:text-white" onClick={(e) => copyPrompt(prompt.prompt_text, prompt.id, e)}>
                {isCopied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
              </Button>
            </div>
            {prompt.what_to_expect && (
              <p className="text-sm text-zinc-400 leading-relaxed">
                <span className="font-medium text-zinc-200">What to expect:</span> {prompt.what_to_expect}
              </p>
            )}
            <Link to={guideHref(guide?.slug, guide?.topic_category)} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              View in guide <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const isIndexPage = !activeCategory;

  /* ── Featured category cards config ── */
  const featuredCats = ["content", "business", "productivity", "creators"];

  /* ── Categories with prompts for carousel sections ── */
  const categoriesWithPrompts = useMemo(() => {
    return PROMPT_CATEGORIES.filter((cat) => (promptsByCategory[cat.slug]?.length || 0) > 0);
  }, [promptsByCategory]);

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
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden border-b border-zinc-800" style={{ background: "linear-gradient(135deg, #040405 0%, #0a1a1f 50%, #0f1020 100%)" }}>
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

          <div className="relative container mx-auto px-4 py-8 md:py-12 text-center space-y-3">
            {activeCategory && (
              <Link to="/prompts" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-2">
                <ArrowLeft className="h-3.5 w-3.5" /> All Prompts
              </Link>
            )}
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              {activeCategory ? `${activeCategory.label} Prompts` : "AI Prompt Library"}
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-lg mx-auto">
              {activeCategory
                ? activeCategory.description
                : "Ready-to-use prompts across every AI platform. Copy, customise, and create."}
            </p>
            {!activeCategory && (
              <p className="text-xs text-zinc-500">
                <span className="font-semibold text-zinc-300">{totalPrompts}</span> prompts ready to use
              </p>
            )}
            <div className="relative max-w-lg mx-auto pt-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                type="search"
                placeholder="Search prompts by keyword or platform..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 rounded-full text-sm bg-zinc-800/60 border-zinc-700 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-primary"
              />
            </div>
          </div>
        </section>

        {/* ═══ CATEGORY PILLS + PLATFORM PILLS ═══ */}
        <div className="border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-20">
          <div className="container mx-auto px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
              <Link
                to="/prompts"
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                  isIndexPage && !activeCategory
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200"
                }`}
              >
                All
              </Link>
              {PROMPT_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/prompts/${cat.slug}`}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                    activeCategory?.slug === cat.slug
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {cat.label}
                  {(categoryCounts[cat.slug] || 0) > 0 && (
                    <span className="ml-1.5 text-[10px] opacity-60">{categoryCounts[cat.slug]}</span>
                  )}
                </Link>
              ))}
            </div>
            {/* Platform filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: "none" }}>
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide mr-1">Platform</span>
              {platformFilterList.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap ${
                    platformFilter === p
                      ? "bg-zinc-600 text-zinc-100 border-zinc-500"
                      : "bg-zinc-800/60 text-zinc-500 border-zinc-700/60 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ INDEX PAGE: Magazine layout ═══ */}
        {isIndexPage && !isLoading && !isSearchActive && (
          <>
            {/* ── Featured Category Cards ── */}
            <section className="container mx-auto px-4 pt-8 pb-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {featuredCats.map((slug) => {
                  const cat = PROMPT_CATEGORIES.find((c) => c.slug === slug);
                  if (!cat) return null;
                  const count = categoryCounts[slug] || 0;
                  return (
                    <Link
                      key={slug}
                      to={`/prompts/${slug}`}
                      className={`relative rounded-xl overflow-hidden bg-gradient-to-br ${cat.gradient} p-5 md:p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 group no-underline min-h-[120px] flex flex-col justify-end`}
                    >
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                      <div className="relative">
                        <h3 className="text-base md:text-lg font-bold text-white">{cat.label}</h3>
                        <p className="text-xs text-white/70 mt-1 line-clamp-1 hidden sm:block">{cat.description}</p>
                        {count > 0 && (
                          <span className="inline-block mt-2 text-[10px] font-semibold text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                            {count} prompts
                          </span>
                        )}
                      </div>
                      <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-white/40 group-hover:text-white/80 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* ── Prompt of the Day ── */}
            {promptOfTheDay && (
              <section className="container mx-auto px-4 py-6">
                <div className="relative rounded-xl border border-zinc-700/60 bg-zinc-800/60 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5 pointer-events-none" />
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-amber-500 to-primary" />
                  <div className="relative p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Prompt of the Day</span>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-3">
                      {promptOfTheDay.prompt_title}
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed mb-4 max-w-2xl whitespace-pre-wrap">
                      {promptOfTheDay.prompt_text}
                    </p>
                    <p className="text-xs text-zinc-500 mb-4">
                      From:{" "}
                      <Link
                        to={guideHref((promptOfTheDay.ai_guides as any)?.slug, (promptOfTheDay.ai_guides as any)?.topic_category)}
                        className="text-zinc-300 hover:text-white hover:underline"
                      >
                        {cleanGuideTitle((promptOfTheDay.ai_guides as any)?.title)}
                      </Link>
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex gap-1.5">
                        {promptOfTheDay.platforms?.map((p: string) => (
                          <Badge key={p} className={`text-[10px] px-2 py-0.5 border-0 ${platformColors[p] || "bg-zinc-600 text-zinc-300"}`}>
                            {p}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={(e) => copyPrompt(promptOfTheDay.prompt_text, promptOfTheDay.id, e)}
                      >
                        {copiedId === promptOfTheDay.id
                          ? <><Check className="h-3.5 w-3.5" /> Copied</>
                          : <><Copy className="h-3.5 w-3.5" /> Copy Prompt</>}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-zinc-400 hover:text-white" asChild>
                        <Link to={guideHref((promptOfTheDay.ai_guides as any)?.slug, (promptOfTheDay.ai_guides as any)?.topic_category)}>
                          View in Guide <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Category Carousel Sections ── */}
            {categoriesWithPrompts.map((cat) => {
              const catPrompts = promptsByCategory[cat.slug] || [];
              if (catPrompts.length === 0) return null;
              return (
                <section key={cat.slug} className="container mx-auto px-4 py-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-6 rounded-full ${cat.accent}`} />
                      <h2 className="text-base md:text-lg font-bold text-zinc-100">{cat.label} Prompts</h2>
                      <span className="text-xs text-zinc-500 font-medium">{catPrompts.length}</span>
                    </div>
                    <Link
                      to={`/prompts/${cat.slug}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      View all <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <HorizontalCarousel>
                    {catPrompts.slice(0, 12).map((prompt: any) => renderCarouselCard(prompt))}
                  </HorizontalCarousel>
                </section>
              );
            })}

            {/* PromptAndGo CTA */}
            <div className="container mx-auto px-4">
              <div className="mt-8 mb-10 border border-zinc-700/50 rounded-xl bg-zinc-800/50 p-8 md:p-10 text-center relative overflow-hidden">
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
          </>
        )}

        {/* ═══ INDEX PAGE: Search/filter active — show flat grid ═══ */}
        {isIndexPage && !isLoading && isSearchActive && (
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="ml-auto text-xs text-zinc-500">
                <span className="font-semibold text-zinc-300">{filteredPrompts.length}</span> results
              </span>
            </div>
            {filteredPrompts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-zinc-400 text-lg">No prompts match these filters. Try broadening your selection.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPrompts.map((prompt) => renderPromptCard(prompt))}
              </div>
            )}
          </div>
        )}

        {/* ═══ CATEGORY SUB-PAGE ═══ */}
        {activeCategory && (
          <>
            <div className="container mx-auto px-4 py-4">
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="ml-auto text-xs text-zinc-500">
                  Showing <span className="font-semibold text-zinc-300">{filteredPrompts.length}</span>
                </span>
              </div>
            </div>

            <div className="container mx-auto px-4 pb-8">
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
                    No prompts match these filters. Try broadening your selection.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPrompts.map((prompt) => renderPromptCard(prompt))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ INDEX LOADING STATE ═══ */}
        {isIndexPage && isLoading && (
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-xl bg-zinc-800" />
              ))}
            </div>
            <Skeleton className="h-[180px] rounded-xl bg-zinc-800 mb-8" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="mb-8">
                <Skeleton className="h-6 w-48 bg-zinc-700 mb-4" />
                <div className="flex gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-[200px] w-[300px] rounded-xl bg-zinc-800 flex-shrink-0" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AllPrompts;
