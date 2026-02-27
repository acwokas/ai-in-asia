import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowRight, Search, ChevronDown, Star, Globe } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { MPUAd } from "@/components/GoogleAds";

const ASIAN_KEYWORDS = ["asia", "singapore", "malaysia", "indonesia", "thailand", "vietnam", "philippines", "japan", "korea", "china", "india", "taiwan", "hong-kong", "bangkok", "manila", "jakarta", "mumbai", "delhi", "tokyo", "seoul", "halal", "lunar", "chinese-new-year", "diwali", "ramadan", "grab", "gojek", "shopee", "lazada", "line", "wechat", "baidu", "cpf", "hdb", "medisave"];

const ASIAN_KEYWORD_LABELS: Record<string, string> = {
  singapore: "Singapore", malaysia: "Malaysia", indonesia: "Indonesia", thailand: "Thailand",
  vietnam: "Vietnam", philippines: "Philippines", japan: "Japan", korea: "Korea",
  china: "China", india: "India", taiwan: "Taiwan", "hong-kong": "Hong Kong",
  bangkok: "Bangkok", manila: "Manila", jakarta: "Jakarta", mumbai: "Mumbai",
  delhi: "Delhi", tokyo: "Tokyo", seoul: "Seoul", asia: "Asia",
};

const pillarColors: Record<string, string> = {
  learn: "bg-blue-500",
  prompts: "bg-purple-500",
  toolbox: "bg-teal-500",
};

const diffColors: Record<string, string> = {
  beginner: "bg-green-500",
  intermediate: "bg-amber-500",
  advanced: "bg-red-500",
};

const DIFFICULTY_OPTIONS = ["All", "Beginner", "Intermediate", "Advanced"] as const;
const PLATFORM_OPTIONS = ["All", "ChatGPT", "Claude", "Gemini", "Multi-platform"] as const;
const TOPIC_OPTIONS = [
  "All",
  "Business",
  "Lifestyle",
  "Creators",
  "Work",
  "Education",
  "Wellness",
  "Finance",
  "Productivity",
  "Content",
  "General",
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "difficulty", label: "Difficulty" },
] as const;

const DIFF_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

type FilterPillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

const FilterPill = ({ label, active, onClick }: FilterPillProps) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
    }`}
  >
    {label}
  </button>
);

const AdCard = () => (
  <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col items-center justify-center p-4 gap-2 min-h-[280px]">
    <MPUAd />
  </div>
);

const GuideCard = ({ g }: { g: any }) => (
  <Link
    to={`/guides/${g.slug}`}
    className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg"
    style={{ transition: "transform 200ms ease, box-shadow 200ms ease" }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
  >
    {g.featured_image_url && (
      <div className="aspect-video overflow-hidden">
        <img
          src={g.featured_image_url}
          alt={g.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
    )}
    <div className="p-5 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {g.pillar && (
          <Badge className={`${pillarColors[g.pillar] || "bg-primary"} text-white text-[10px]`}>
            {g.pillar}
          </Badge>
        )}
        {g.difficulty && (
          <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>
            {g.difficulty}
          </Badge>
        )}
        {g.platform_tags?.length > 0 &&
          g.platform_tags.map((tag: string) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-muted/60 text-muted-foreground text-[10px] font-normal border-0"
            >
              {tag}
            </Badge>
          ))}
      </div>
      <h2 className="text-lg font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">
        {g.title}
      </h2>
      {g.one_line_description && (
        <p className="text-sm text-muted-foreground line-clamp-2">{g.one_line_description}</p>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {g.read_time_minutes || "5"} min read
        </span>
        <span className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
          Read guide <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  </Link>
);

const Guides = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("newest");

  // Filters
  const [difficulty, setDifficulty] = useState("All");
  const [platforms, setPlatforms] = useState<Set<string>>(new Set(["All"]));
  const [topic, setTopic] = useState("All");

  const togglePlatform = (p: string) => {
    if (p === "All") {
      setPlatforms(new Set(["All"]));
      return;
    }
    setPlatforms((prev) => {
      const next = new Set(prev);
      next.delete("All");
      if (next.has(p)) {
        next.delete(p);
        if (next.size === 0) next.add("All");
      } else {
        next.add(p);
      }
      return next;
    });
  };

  const { data: guides, isLoading } = useQuery({
    queryKey: ["guides-index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, pillar, difficulty, one_line_description, featured_image_url, read_time_minutes, platform_tags, published_at, topic_category, updated_at, view_count")
        .eq("status", "published")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: editorsPicks, isLoading: isLoadingPicks } = useQuery({
    queryKey: ["editors-picks-guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, featured_image_url, difficulty, topic_category, updated_at")
        .eq("status", "published")
        .eq("is_editors_pick", true)
        .order("updated_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const dailyPicks = useMemo(() => {
    if (!editorsPicks || editorsPicks.length === 0) return [];
    const seed = Math.floor(Date.now() / 86400000);
    const pool = [...editorsPicks];
    const picks: typeof editorsPicks = [];
    const count = Math.min(3, pool.length);
    for (let i = 0; i < count; i++) {
      const idx = ((seed * (i + 1) * 2654435761) >>> 0) % pool.length;
      picks.push(pool.splice(idx, 1)[0]);
    }
    return picks;
  }, [editorsPicks]);
  const { data: asiaGuidesRaw } = useQuery({
    queryKey: ["asia-spotlight-guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, featured_image_url, difficulty, read_time_minutes, updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const asiaSpotlight = useMemo(() => {
    if (!asiaGuidesRaw) return [];
    const pool = asiaGuidesRaw.filter((g) =>
      ASIAN_KEYWORDS.some((kw) => g.slug.includes(kw))
    );
    if (pool.length === 0) return [];
    const seed = Math.floor(Date.now() / 86400000);
    const copy = [...pool];
    const picks: typeof pool = [];
    const count = Math.min(4, copy.length);
    for (let i = 0; i < count; i++) {
      const idx = ((seed * (i + 1) * 2654435761) >>> 0) % copy.length;
      picks.push(copy.splice(idx, 1)[0]);
    }
    return picks;
  }, [asiaGuidesRaw]);

  const { data: popularGuides } = useQuery({
    queryKey: ["guides-popular"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, featured_image_url, topic_category, view_count")
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const topicCounts = useMemo(() => {
    if (!guides) return {};
    const counts: Record<string, number> = {};
    for (const g of guides) {
      const cat = g.topic_category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [guides]);

  const filteredGuides = useMemo(() => {
    if (!guides) return [];
    let result = guides.filter((g) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        const matches =
          g.title?.toLowerCase().includes(q) ||
          g.one_line_description?.toLowerCase().includes(q) ||
          g.pillar?.toLowerCase().includes(q) ||
          g.difficulty?.toLowerCase().includes(q) ||
          g.platform_tags?.some((t: string) => t.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (difficulty !== "All" && g.difficulty?.toLowerCase() !== difficulty.toLowerCase()) return false;
      if (!platforms.has("All")) {
        const gp = (g.platform_tags || []).map((t: string) => t.toLowerCase());
        if (!Array.from(platforms).some((p) => gp.includes(p.toLowerCase()))) return false;
      }
      if (topic !== "All" && (g.topic_category || "").toLowerCase() !== topic.toLowerCase()) return false;
      return true;
    });

    // Sort
    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } else if (sortBy === "popular") {
      result.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    } else if (sortBy === "difficulty") {
      result.sort((a, b) => (DIFF_ORDER[a.difficulty ?? ""] ?? 99) - (DIFF_ORDER[b.difficulty ?? ""] ?? 99));
    }

    return result;
  }, [guides, debouncedSearch, difficulty, platforms, topic, sortBy]);

  const guideCount = guides?.length ?? 0;
  const hasActiveFilters = difficulty !== "All" || !platforms.has("All") || topic !== "All" || debouncedSearch.trim();

  return (
    <>
      <SEOHead
        title="AI Guides, Prompts & Tools | AI in Asia"
        description="Practical AI guides, ready-to-use prompt collections, and curated tool recommendations. Real techniques for practitioners across Asia."
        canonical="https://aiinasia.com/guides"
        ogType="website"
        ogImage="https://aiinasia.com/icons/aiinasia-512.png?v=3"
        ogImageAlt="AI Guides, Prompts & Tools - AI in Asia"
      />
      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border" style={{ background: "#040405" }}>
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
                animation: "heroOrb1 8s ease-in-out infinite alternate",
              }}
            />
            <div
              className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full blur-[100px] opacity-15"
              style={{
                background: "radial-gradient(circle, hsl(174 60% 40%) 0%, transparent 70%)",
                animation: "heroOrb2 10s ease-in-out infinite alternate",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                maskImage: "linear-gradient(to right, transparent 10%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,1) 75%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 10%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,1) 75%)",
              }}
            >
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.07 }}>
                <defs>
                  <pattern id="circuit-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                    <circle cx="30" cy="30" r="2" fill="#5F72FF" />
                    <circle cx="0" cy="0" r="1.5" fill="#5F72FF" />
                    <circle cx="60" cy="0" r="1.5" fill="#5F72FF" />
                    <circle cx="0" cy="60" r="1.5" fill="#5F72FF" />
                    <circle cx="60" cy="60" r="1.5" fill="#5F72FF" />
                    <line x1="0" y1="0" x2="30" y2="30" stroke="#5F72FF" strokeWidth="0.5" />
                    <line x1="60" y1="0" x2="30" y2="30" stroke="#5F72FF" strokeWidth="0.5" />
                    <line x1="30" y1="30" x2="60" y2="60" stroke="#5F72FF" strokeWidth="0.5" />
                    <line x1="30" y1="30" x2="0" y2="60" stroke="#5F72FF" strokeWidth="0.5" />
                    <line x1="30" y1="0" x2="30" y2="12" stroke="#5F72FF" strokeWidth="0.3" />
                    <line x1="30" y1="48" x2="30" y2="60" stroke="#5F72FF" strokeWidth="0.3" />
                    <line x1="0" y1="30" x2="12" y2="30" stroke="#5F72FF" strokeWidth="0.3" />
                    <line x1="48" y1="30" x2="60" y2="30" stroke="#5F72FF" strokeWidth="0.3" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#circuit-grid)" />
              </svg>
            </div>
          </div>

          <div className="container relative mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold tracking-widest uppercase text-muted-foreground mb-4">
                AI in Asia Guides
              </p>
              <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl" style={{ color: "#FFFFFF" }}>
                Stop reading theory.{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(174 60% 50%), hsl(var(--primary)))",
                    backgroundSize: "200% 200%",
                    animation: "heroGradientShift 6s ease-in-out infinite",
                  }}
                >
                  Start building.
                </span>
              </h1>
              <p className="text-lg md:text-xl leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.7)" }}>
                Step-by-step workflows, tested prompts, and worked examples for people who actually use AI at work.
                Every guide written by a practitioner, not a content farm.
              </p>

              <div className="flex items-center gap-4 text-sm mb-8" style={{ color: "rgba(255,255,255,0.45)" }}>
                <span className="font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {isLoading ? "—" : guideCount} guides
                </span>
                <span className="w-px h-4 bg-white/20" />
                <span>Updated monthly</span>
                <span className="w-px h-4 bg-white/20" />
                <span>Free, no signup required</span>
              </div>

              <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "rgba(255,255,255,0.35)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search guides... e.g. SEO, competitor analysis, Claude"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl text-base outline-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#FFFFFF",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="border-b border-border bg-card/50 py-4 overflow-visible">
          <div className="container mx-auto px-4 space-y-3 md:space-y-2 overflow-visible">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Level</span>
              {DIFFICULTY_OPTIONS.map((d) => (
                <FilterPill key={d} label={d} active={difficulty === d} onClick={() => setDifficulty(d)} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Platform</span>
              {PLATFORM_OPTIONS.map((p) => (
                <FilterPill key={p} label={p} active={platforms.has(p)} onClick={() => togglePlatform(p)} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Topic</span>
              {TOPIC_OPTIONS.map((t) => (
                <FilterPill key={t} label={t} active={topic === t} onClick={() => setTopic(t)} />
              ))}
            </div>
          </div>
        </section>

        {/* Editors' Picks */}
        {isLoadingPicks ? (
          <section className="pt-10 pb-2">
            <div className="container mx-auto px-4">
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="aspect-[16/10] rounded-xl w-full" />
                ))}
              </div>
            </div>
          </section>
        ) : dailyPicks.length > 0 ? (
          <section className="pt-10 pb-2">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-5">
                <Star className="h-5 w-5 text-primary fill-primary" />
                <h2 className="text-lg font-bold text-foreground">Editors' Picks</h2>
              </div>
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {dailyPicks.map((g) => (
                  <Link
                    key={g.id}
                    to={`/guides/${g.slug}`}
                    className="group relative rounded-xl overflow-hidden border border-border"
                  >
                    <div className="aspect-[16/10] w-full">
                      {g.featured_image_url ? (
                        <img
                          src={g.featured_image_url}
                          alt={g.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </div>
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    {/* Difficulty badge top-right */}
                    {g.difficulty && (
                      <Badge className={`absolute top-3 right-3 ${diffColors[g.difficulty] || "bg-primary"} text-white text-[10px]`}>
                        {g.difficulty}
                      </Badge>
                    )}
                    {/* Title overlaid */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="text-base font-bold leading-snug text-white line-clamp-2 group-hover:underline decoration-primary underline-offset-2">
                        {g.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Asia Spotlight */}
        {asiaSpotlight.length > 0 && (
          <section className="pt-8 pb-2">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-5">
                <Globe className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Local Guides for Asia</h2>
              </div>
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {asiaSpotlight.map((g) => {
                  const regionTag = ASIAN_KEYWORDS.find((kw) => g.slug.includes(kw));
                  const regionLabel = regionTag ? ASIAN_KEYWORD_LABELS[regionTag] : null;
                  return (
                    <Link
                      key={g.id}
                      to={`/guides/${g.slug}`}
                      className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg"
                      style={{ transition: "transform 200ms ease, box-shadow 200ms ease" }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      {g.featured_image_url && (
                        <div className="aspect-video overflow-hidden">
                          <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      )}
                      <div className="p-4 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {regionLabel && (
                            <Badge className="bg-primary/15 text-primary text-[10px] border-0">{regionLabel}</Badge>
                          )}
                          {g.difficulty && (
                            <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>{g.difficulty}</Badge>
                          )}
                        </div>
                        <h3 className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || "5"} min</span>
                          <span className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">Read <ArrowRight className="h-3 w-3" /></span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Guides Grid + Sidebar */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredGuides.length > 0 ? (
              <>
                {/* Sort bar */}
                <div className="flex items-center justify-between mb-6">
                  {hasActiveFilters ? (
                    <p className="text-sm text-muted-foreground">
                      {filteredGuides.length} guide{filteredGuides.length !== 1 ? "s" : ""} found
                      {debouncedSearch.trim() ? ` matching "${debouncedSearch}"` : ""}
                    </p>
                  ) : (
                    <div />
                  )}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none bg-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>Sort by: {o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="flex gap-8">
                  {/* Main guide grid */}
                  <div className="flex-1 min-w-0">
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {filteredGuides.map((g: any) => (
                        <GuideCard key={g.id} g={g} />
                      ))}
                    </div>
                  </div>

                  {/* Right sidebar — desktop only */}
                  <div className="hidden lg:block w-[300px] shrink-0">
                    <div className="sticky top-24 space-y-6">
                      {/* Mini search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search guides..."
                          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {/* Browse by Topic */}
                      <div className="rounded-xl border border-border bg-card p-4">
                        <h3 className="text-sm font-semibold text-foreground mb-3">Browse by Topic</h3>
                        <div className="space-y-1 max-h-[260px] overflow-y-auto">
                          {Object.entries(topicCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, count]) => (
                              <button
                                key={cat}
                                onClick={() => setTopic(topic.toLowerCase() === cat.toLowerCase() ? "All" : cat)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                  topic.toLowerCase() === cat.toLowerCase()
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                }`}
                              >
                                <span className="capitalize">{cat}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-muted/60 border-0">
                                  {count}
                                </Badge>
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Popular Guides */}
                      {popularGuides && popularGuides.length > 0 && (
                        <div className="rounded-xl border border-border bg-card p-4">
                          <h3 className="text-sm font-semibold text-foreground mb-3">Popular Guides</h3>
                          <div className="space-y-3">
                            {popularGuides.map((g) => (
                              <Link
                                key={g.id}
                                to={`/guides/${g.slug}`}
                                className="flex gap-3 group"
                              >
                                {g.featured_image_url ? (
                                  <img
                                    src={g.featured_image_url}
                                    alt={g.title}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-16 h-16 rounded object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded bg-muted shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                    {g.title}
                                  </p>
                                  {g.topic_category && (
                                    <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0 h-5 bg-muted/60 border-0 capitalize">
                                      {g.topic_category}
                                    </Badge>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ad */}
                      <AdCard />
                    </div>
                  </div>
                </div>

                {/* Mobile/tablet ad — below first few cards */}
                <div className="lg:hidden mt-8">
                  <AdCard />
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                {hasActiveFilters ? (
                  <p>No guides match these filters. Try broadening your selection.</p>
                ) : (
                  <p>No guides published yet. Check back soon!</p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      <style>{`
        @keyframes heroGradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes heroOrb1 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-40px, 30px) scale(1.15); }
        }
        @keyframes heroOrb2 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, -20px) scale(1.1); }
        }
      `}</style>
    </>
  );
};

export default Guides;
