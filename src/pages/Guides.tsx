import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock, ArrowRight, Search, ChevronDown, ChevronLeft, ChevronRight,
  Star, Globe, X, Eye, Briefcase, Sparkles, Wrench, MapPin, GraduationCap,
  Palette, Shield, Code, TrendingUp, SlidersHorizontal,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { GuideBookmarkButton } from "@/components/GuideBookmarkButton";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import GuideLearningPaths from "@/components/guide/GuideLearningPaths";

/* ── Helpers ── */

const guideHref = (slug: string, topicCategory?: string | null) => {
  const cat = (topicCategory || "general").toLowerCase().replace(/\s+/g, "-");
  return `/guides/${cat}/${slug}`;
};

const diffColors: Record<string, string> = {
  beginner: "bg-green-500",
  intermediate: "bg-amber-500",
  advanced: "bg-red-500",
};

const DIFF_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/* ── 1. Topic tiles config ── */
// Map display names to actual topic_category DB values
const TOPIC_TILES = [
  { label: "AI for Business", icon: Briefcase, dbValues: ["business", "finance"], gradient: "from-blue-600 to-blue-800" },
  { label: "Prompts & Workflows", icon: Sparkles, dbValues: ["productivity", "work"], gradient: "from-purple-600 to-violet-800" },
  { label: "AI Tools & Platforms", icon: Wrench, dbValues: ["technology"], gradient: "from-teal-500 to-emerald-700" },
  { label: "Asia AI Landscape", icon: MapPin, dbValues: ["__asia__"], gradient: "from-cyan-500 to-teal-700" },
  { label: "Getting Started", icon: GraduationCap, dbValues: ["education"], gradient: "from-amber-500 to-orange-700" },
  { label: "Creative AI", icon: Palette, dbValues: ["creators", "content"], gradient: "from-pink-500 to-rose-700" },
  { label: "AI Ethics & Policy", icon: Shield, dbValues: ["safety"], gradient: "from-red-600 to-red-800" },
  { label: "Lifestyle & Wellness", icon: Code, dbValues: ["lifestyle", "wellness"], gradient: "from-indigo-500 to-indigo-800" },
] as const;

/* ── 5. Platform hub config ── */
const PLATFORM_HUB = [
  { name: "ChatGPT", logo: "/logos/chatgpt.svg", fallbackColor: "#10a37f" },
  { name: "Claude", logo: "/logos/claude.svg", fallbackColor: "#d97757" },
  { name: "Gemini", logo: "/logos/gemini.svg", fallbackColor: "#4285f4" },
  { name: "Midjourney", logo: "/logos/midjourney.svg", fallbackColor: "#0f1923" },
  { name: "Runway", logo: "/logos/runway.svg", fallbackColor: "#6366f1" },
  { name: "ElevenLabs", logo: "/logos/elevenlabs.svg", fallbackColor: "#000000" },
  { name: "Cursor", logo: "/logos/cursor.svg", fallbackColor: "#7c3aed" },
  { name: "v0", logo: "/logos/v0.svg", fallbackColor: "#18181b" },
  { name: "Lovable", logo: "/logos/lovable.svg", fallbackColor: "#e11d48" },
  { name: "NotebookLM", logo: "/logos/notebooklm.svg", fallbackColor: "#fbbc04" },
  { name: "Perplexity", logo: "/logos/perplexity.svg", fallbackColor: "#20808d" },
  { name: "Suno", logo: "/logos/suno.svg", fallbackColor: "#f97316" },
  { name: "Copilot", logo: "/logos/copilot.svg", fallbackColor: "#0078d4" },
  { name: "Stable Diffusion", logo: "/logos/stable-diffusion.svg", fallbackColor: "#a855f7" },
] as const;

const isAsiaGuide = (g: any) => g.geo && g.geo !== "none" && g.geo !== "global";

const matchesTile = (g: any, dbValues: readonly string[]) => {
  if (dbValues.includes("__asia__")) return isAsiaGuide(g);
  return dbValues.includes((g.topic_category || "").toLowerCase());
};

/* ── Guide card (improved) ── */
const ImprovedGuideCard = ({ g }: { g: any }) => (
  <div className="relative group">
    <GuideBookmarkButton
      guideId={g.id}
      className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
    />
    <Link
      to={guideHref(g.slug, g.topic_category)}
      className="block rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 h-full"
    >
      <div className="aspect-video overflow-hidden">
        {g.featured_image_url ? (
          <OptimizedImage src={g.featured_image_url} alt={g.title} aspectRatio="16/9" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary/30" />
          </div>
        )}
      </div>
      <div className="p-4 space-y-2.5 flex flex-col flex-1">
        <div className="flex flex-wrap gap-1.5">
          {g.difficulty && (
            <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>{g.difficulty}</Badge>
          )}
          {g.primary_platform && g.primary_platform !== "Generic" && (() => {
            const hub = PLATFORM_HUB.find((h) => h.name === g.primary_platform);
            return (
              <Badge variant="secondary" className="bg-muted/60 text-muted-foreground text-[10px] border-0 flex items-center gap-1">
                {hub && <img src={hub.logo} alt="" className="w-3 h-3 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                {g.primary_platform}
              </Badge>
            );
          })()}
          {g.topic_category && (
            <Badge variant="outline" className="text-[10px] capitalize border-border">{g.topic_category}</Badge>
          )}
        </div>
        <h2 className="text-sm sm:text-base font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h2>
        {g.one_line_description && <p className="text-xs text-muted-foreground line-clamp-2">{g.one_line_description}</p>}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-auto mt-auto">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || "5"} min</span>
          {(g.view_count ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{g.view_count >= 1000 ? `${(g.view_count / 1000).toFixed(1)}k` : g.view_count}</span>
          )}
        </div>
      </div>
    </Link>
  </div>
);

/* ── Trending card (compact horizontal) ── */
const TrendingCard = ({ g }: { g: any }) => (
  <Link
    to={guideHref(g.slug, g.topic_category)}
    className="snap-start shrink-0 w-[280px] sm:w-[300px] rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group"
  >
    <div className="aspect-video overflow-hidden">
      {g.featured_image_url ? (
        <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
      )}
    </div>
    <div className="p-3 space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[9px]`}>{g.difficulty}</Badge>}
        {g.primary_platform && g.primary_platform !== "Generic" && (
          <Badge variant="secondary" className="bg-muted/60 text-[9px] border-0">{g.primary_platform}</Badge>
        )}
      </div>
      <h3 className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h3>
    </div>
  </Link>
);

/* ── Main page ── */

const Guides = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("newest");

  // Filters from URL
  const activeTile = searchParams.get("topic") || null;
  const activePlatform = searchParams.get("platform") || null;
  const activeDifficulty = searchParams.get("difficulty") || null;

  const setFilter = (key: string, value: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  };

  const clearAllFilters = () => {
    setSearchParams({}, { replace: true });
    setSearchQuery("");
  };

  const activeFilterCount =
    (activeTile ? 1 : 0) + (activePlatform ? 1 : 0) + (activeDifficulty ? 1 : 0) + (debouncedSearch.trim() ? 1 : 0);

  // Trending scroll ref
  const trendingRef = useRef<HTMLDivElement>(null);
  const scrollTrending = (dir: "left" | "right") => {
    if (!trendingRef.current) return;
    trendingRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  /* ── Queries ── */

  const { data: guides, isLoading } = useQuery({
    queryKey: ["guides-index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, pillar, difficulty, one_line_description, excerpt, featured_image_url, read_time_minutes, platform_tags, published_at, topic_category, updated_at, view_count, geo, audience_role, guide_category, primary_platform, is_editors_pick, topic_tags")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Guide of the week: editors pick with highest views
  const guideOfWeek = useMemo(() => {
    if (!guides) return null;
    const picks = guides.filter((g) => g.is_editors_pick);
    if (picks.length === 0) return null;
    return picks.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))[0];
  }, [guides]);

  // Trending: top 6 by views from last 7 days
  const trendingGuides = useMemo(() => {
    if (!guides) return [];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    return guides
      .filter((g) => g.published_at && g.published_at >= weekAgo)
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, 6);
  }, [guides]);

  // Topic tile counts
  const tileCounts = useMemo(() => {
    if (!guides) return {};
    const counts: Record<string, number> = {};
    for (const tile of TOPIC_TILES) {
      counts[tile.label] = guides.filter((g) => matchesTile(g, tile.dbValues)).length;
    }
    return counts;
  }, [guides]);

  // Platform counts
  const platformCounts = useMemo(() => {
    if (!guides) return {};
    const counts: Record<string, number> = {};
    for (const p of PLATFORM_HUB) {
      counts[p.name] = guides.filter((g) => g.primary_platform === p.name).length;
    }
    return counts;
  }, [guides]);

  // Distinct platforms for dropdown
  const distinctPlatforms = useMemo(() => {
    if (!guides) return [];
    const set = new Set<string>();
    for (const g of guides) {
      if (g.primary_platform && g.primary_platform !== "Generic") set.add(g.primary_platform);
    }
    return Array.from(set).sort();
  }, [guides]);

  // Editors picks
  const editorsPicks = useMemo(() => {
    if (!guides) return [];
    return guides.filter((g) => g.is_editors_pick && g.id !== guideOfWeek?.id).slice(0, 6);
  }, [guides, guideOfWeek]);

  // Asia guides
  const asiaGuides = useMemo(() => {
    if (!guides) return [];
    return guides.filter((g) => isAsiaGuide(g)).slice(0, 12);
  }, [guides]);

  /* ── Filtered guides ── */
  const filteredGuides = useMemo(() => {
    if (!guides) return [];
    let result = guides.filter((g) => {
      // Search
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        const matches = g.title?.toLowerCase().includes(q) ||
          g.one_line_description?.toLowerCase().includes(q) ||
          g.topic_category?.toLowerCase().includes(q) ||
          g.primary_platform?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      // Topic tile filter
      if (activeTile) {
        const tile = TOPIC_TILES.find((t) => t.label === activeTile);
        if (tile && !matchesTile(g, tile.dbValues)) return false;
      }
      // Platform filter
      if (activePlatform) {
        if (g.primary_platform !== activePlatform) return false;
      }
      // Difficulty filter
      if (activeDifficulty) {
        if (g.difficulty?.toLowerCase() !== activeDifficulty.toLowerCase()) return false;
      }
      return true;
    });

    if (sortBy === "newest") result.sort((a, b) => new Date(b.published_at || b.updated_at).getTime() - new Date(a.published_at || a.updated_at).getTime());
    else if (sortBy === "popular") result.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    else if (sortBy === "difficulty") result.sort((a, b) => (DIFF_ORDER[a.difficulty ?? ""] ?? 99) - (DIFF_ORDER[b.difficulty ?? ""] ?? 99));
    return result;
  }, [guides, debouncedSearch, activeTile, activePlatform, activeDifficulty, sortBy]);

  const guideCount = guides?.length ?? 0;

  // Sync search to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch.trim()) params.set("q", debouncedSearch);
    else params.delete("q");
    setSearchParams(params, { replace: true });
  }, [debouncedSearch]);

  return (
    <>
      <SEOHead
        title="AI Guides, Prompts & Tools | AI in Asia"
        description="Practical AI guides, ready-to-use prompt collections, and curated tool recommendations. Real techniques for practitioners across Asia."
        canonical="https://aiinasia.com/guides"
        ogType="website"
        ogImage="https://aiinasia.com/icons/aiinasia-512.png?v=3"
        ogImageAlt="AI Guides, Prompts & Tools - AI in Asia"
        schemaJson={guides && guides.length > 0 ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "AI Guides for Asia-Pacific",
          "description": "Practical AI guides, prompt collections, and tool recommendations for practitioners across Asia.",
          "url": "https://aiinasia.com/guides",
          "numberOfItems": guides.length,
          "itemListElement": guides.slice(0, 20).map((g: any, i: number) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `https://aiinasia.com${guideHref(g.slug, g.topic_category)}`,
            "name": g.title,
          }))
        } : undefined}
      />
      <Header />

      <main id="main-content" className="min-h-screen bg-background">
        {/* Header strip */}
        <section className="border-b border-border" style={{ background: "linear-gradient(135deg, #040405 0%, #0a1a1f 100%)" }}>
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">AI in Asia Guides</p>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Master AI with practical guides</h1>
                <p className="text-sm text-muted-foreground mt-1">{isLoading ? "\u2014" : `${guideCount}+`} step-by-step workflows. Free. No signup.</p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search guides..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors bg-card/60 border border-border text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. GUIDE OF THE WEEK SPOTLIGHT ── */}
        {guideOfWeek && (
          <section className="border-b border-border">
            <div className="container mx-auto px-4 py-8">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <h2 className="text-base font-bold text-foreground">Guide of the Week</h2>
              </div>
              <Link
                to={guideHref(guideOfWeek.slug, guideOfWeek.topic_category)}
                className="group block rounded-2xl border border-border bg-card overflow-hidden transition-all hover:shadow-xl md:flex"
              >
                <div className="md:w-1/2 aspect-video md:aspect-auto overflow-hidden">
                  {guideOfWeek.featured_image_url ? (
                    <OptimizedImage src={guideOfWeek.featured_image_url} alt={guideOfWeek.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full min-h-[240px] bg-gradient-to-br from-primary/20 to-primary/5" />
                  )}
                </div>
                <div className="p-6 md:p-8 md:w-1/2 flex flex-col justify-center space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {guideOfWeek.difficulty && (
                      <Badge className={`${diffColors[guideOfWeek.difficulty]} text-white text-xs`}>{guideOfWeek.difficulty}</Badge>
                    )}
                    {guideOfWeek.primary_platform && guideOfWeek.primary_platform !== "Generic" && (
                      <Badge variant="secondary" className="text-xs">{guideOfWeek.primary_platform}</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />{guideOfWeek.read_time_minutes || 5} min read
                    </Badge>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold leading-tight group-hover:text-primary transition-colors">{guideOfWeek.title}</h3>
                  {(guideOfWeek.one_line_description || guideOfWeek.excerpt) && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{guideOfWeek.one_line_description || guideOfWeek.excerpt}</p>
                  )}
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                    Read this guide <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* ── 1. INTENT-BASED NAVIGATION TILES ── */}
        <section className="border-b border-border" style={{ background: "#080a0f" }}>
          <div className="container mx-auto px-4 py-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Browse by topic</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TOPIC_TILES.map((tile) => {
                const count = tileCounts[tile.label] || 0;
                const isActive = activeTile === tile.label;
                const Icon = tile.icon;
                return (
                  <button
                    key={tile.label}
                    onClick={() => setFilter("topic", isActive ? null : tile.label)}
                    className={`relative rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.02] border ${
                      isActive
                        ? "ring-2 ring-primary border-primary/50 bg-gradient-to-br " + tile.gradient
                        : "border-border/50 bg-gradient-to-br " + tile.gradient + " opacity-80 hover:opacity-100"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-white/80 mb-2" />
                    <span className="block text-sm font-bold text-white">{tile.label}</span>
                    <span className="block text-xs text-white/60 mt-0.5">{count} guides</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 3. TRENDING THIS WEEK ── */}
        {trendingGuides.length > 0 && (
          <section className="border-b border-border py-6">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Trending This Week</h2>
                </div>
                <div className="hidden sm:flex gap-1">
                  <button onClick={() => scrollTrending("left")} className="p-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => scrollTrending("right")} className="p-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div ref={trendingRef} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                {trendingGuides.map((g) => <TrendingCard key={g.id} g={g} />)}
              </div>
            </div>
          </section>
        )}

        {/* ── 5. PLATFORM HUB GRID ── */}
        <section className="border-b border-border py-6">
          <div className="container mx-auto px-4">
            <h2 className="text-base font-bold text-foreground mb-4">Platform Deep Dives</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {PLATFORM_HUB.map((p) => {
                const count = platformCounts[p.name] || 0;
                const isActive = activePlatform === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => setFilter("platform", isActive ? null : p.name)}
                    className={`rounded-xl border p-3 text-center transition-all duration-200 hover:scale-[1.03] ${
                      isActive
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-xl mx-auto mb-2 flex items-center justify-center bg-white/10 backdrop-blur-sm p-1.5 ring-1 ring-white/5">
                      <img
                        src={p.logo}
                        alt={p.name}
                        className="w-full h-full object-contain drop-shadow-sm"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = document.createElement('span');
                          fallback.textContent = p.name[0];
                          fallback.className = 'text-white font-bold text-lg';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.style.backgroundColor = p.fallbackColor;
                            parent.classList.remove('bg-white/10');
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                    <span className="block text-xs font-semibold text-foreground truncate">{p.name}</span>
                    {count > 0 && <span className="block text-[10px] text-muted-foreground">{count} guides</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── LEARNING PATHS ── */}
        <GuideLearningPaths />

        {/* ── 4. FACETED FILTER BAR + MAIN GRID ── */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            {/* Filter bar */}
            <div className="rounded-xl border border-border bg-card/80 backdrop-blur p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[10px]">{activeFilterCount} active</Badge>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <X className="h-3 w-3" /> Clear all
                  </button>
                )}
              </div>

              {/* Difficulty chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Level</span>
                {["Beginner", "Intermediate", "Advanced"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setFilter("difficulty", activeDifficulty === d ? null : d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      activeDifficulty === d
                        ? `${diffColors[d.toLowerCase()]} text-white border-transparent`
                        : "bg-card text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Platform dropdown */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Platform</span>
                <div className="relative">
                  <select
                    value={activePlatform || ""}
                    onChange={(e) => setFilter("platform", e.target.value || null)}
                    className="appearance-none bg-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All platforms</option>
                    {distinctPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Sort + count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {filteredGuides.length} guide{filteredGuides.length !== 1 ? "s" : ""}
                {activeFilterCount > 0 ? " found" : ""}
              </p>
              <div className="relative">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none bg-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="newest">Sort: Newest</option>
                  <option value="popular">Sort: Most popular</option>
                  <option value="difficulty">Sort: Difficulty</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Guide grid */}
            {isLoading ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredGuides.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredGuides.map((g) => <ImprovedGuideCard key={g.id} g={g} />)}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p>No guides match these filters. Try broadening your selection.</p>
                <button onClick={clearAllFilters} className="mt-3 text-sm text-primary hover:underline">Clear all filters</button>
              </div>
            )}
          </div>
        </section>

        {/* ── Editors' Picks ── */}
        {editorsPicks.length > 0 && (
          <section className="border-t border-border py-8">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <h2 className="text-base font-bold text-foreground">Editors' Picks</h2>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {editorsPicks.map((g) => (
                  <div key={g.id} className="relative group">
                    <GuideBookmarkButton guideId={g.id} className="absolute top-2 left-2 z-10 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Link to={guideHref(g.slug, g.topic_category)} className="block relative rounded-xl overflow-hidden border border-border">
                      <div className="aspect-[16/9] w-full relative">
                        {g.featured_image_url ? (
                          <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      {g.difficulty && <Badge className={`absolute top-2 right-2 ${diffColors[g.difficulty] || "bg-primary"} text-white text-[10px]`}>{g.difficulty}</Badge>}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-sm font-bold leading-snug text-white line-clamp-2 group-hover:underline decoration-primary underline-offset-2">{g.title}</h3>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Local Guides for Asia ── */}
        {asiaGuides.length > 0 && (
          <section className="border-t border-border py-8">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Local Guides for Asia</h2>
                <Badge variant="secondary" className="text-[10px] bg-muted/60 border-0">{asiaGuides.length}</Badge>
              </div>
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
                {asiaGuides.map((g) => (
                  <div key={g.id} className="relative group snap-start shrink-0 w-[70vw] max-w-[280px] md:w-[260px]">
                    <GuideBookmarkButton guideId={g.id} className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Link to={guideHref(g.slug, g.topic_category)} className="block rounded-xl border border-border bg-card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                      {g.featured_image_url ? (
                        <div className="aspect-video overflow-hidden">
                          <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5" />
                      )}
                      <div className="p-3 space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {g.geo && <Badge className="bg-primary/15 text-primary text-[10px] border-0">{g.geo}</Badge>}
                          {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>{g.difficulty}</Badge>}
                        </div>
                        <h3 className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || "5"} min</span>
                          <span className="flex items-center gap-1 text-primary font-medium">Read <ArrowRight className="h-3 w-3" /></span>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
              <Link to="/guides/asia" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View all Asia guides <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
};

export default Guides;
