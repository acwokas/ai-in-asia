import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowRight, Search, ChevronDown, Star, Globe, SlidersHorizontal, X, Rocket, Layers } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { MPUAd } from "@/components/GoogleAds";

const guideHref = (slug: string, topicCategory?: string | null) => {
  const cat = (topicCategory || "general").toLowerCase().replace(/\s+/g, "-");
  return `/guides/${cat}/${slug}`;
};

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
  "All", "Business", "Lifestyle", "Creators", "Work", "Education",
  "Wellness", "Finance", "Productivity", "Content", "General",
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "difficulty", label: "Difficulty" },
] as const;

const DIFF_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

const CATEGORY_TILE_COLORS: Record<string, string> = {
  Business: "bg-blue-600", Lifestyle: "bg-emerald-500", Creators: "bg-purple-500",
  Work: "bg-amber-500", Education: "bg-rose-500", Wellness: "bg-teal-500",
  Finance: "bg-indigo-500", Productivity: "bg-orange-500", Content: "bg-pink-500",
  General: "bg-gray-500",
};

type FilterPillProps = { label: string; active: boolean; onClick: () => void };

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

const InlineMPU = () => (
  <div className="flex flex-col items-center py-6">
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Advertisement</span>
    <div className="rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center p-4 min-h-[250px] w-full max-w-[336px]">
      <MPUAd />
    </div>
  </div>
);

const AdCard = () => (
  <div className="flex flex-col items-center">
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Advertisement</span>
    <div className="rounded-xl border border-border bg-card overflow-hidden flex items-center justify-center w-[300px] h-[250px]">
      <MPUAd />
    </div>
  </div>
);

/* ── Card variants for magazine-style layouts ── */

const GuideCard = ({ g }: { g: any }) => (
  <Link
    to={guideHref(g.slug, g.topic_category)}
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
    <div className="p-5 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {g.pillar && <Badge className={`${pillarColors[g.pillar] || "bg-primary"} text-white text-[10px]`}>{g.pillar}</Badge>}
        {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>{g.difficulty}</Badge>}
        {g.platform_tags?.length > 0 && g.platform_tags.map((tag: string) => (
          <Badge key={tag} variant="secondary" className="bg-muted/60 text-muted-foreground text-[10px] font-normal border-0">{tag}</Badge>
        ))}
      </div>
      <h2 className="text-lg font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h2>
      {g.one_line_description && <p className="text-sm text-muted-foreground line-clamp-2">{g.one_line_description}</p>}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || "5"} min read</span>
        <span className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">Read guide <ArrowRight className="h-3 w-3" /></span>
      </div>
    </div>
  </Link>
);

// Large featured card — taller image
const GuideFeaturedCard = ({ g }: { g: any }) => (
  <Link
    to={guideHref(g.slug, g.topic_category)}
    className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg"
    style={{ transition: "transform 200ms ease, box-shadow 200ms ease" }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
  >
    {g.featured_image_url && (
      <div className="aspect-[4/3] overflow-hidden">
        <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
    )}
    <div className="p-5 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>{g.difficulty}</Badge>}
        {g.pillar && <Badge className={`${pillarColors[g.pillar] || "bg-primary"} text-white text-[10px]`}>{g.pillar}</Badge>}
      </div>
      <h2 className="text-xl font-bold leading-snug group-hover:text-primary transition-colors line-clamp-3">{g.title}</h2>
      {g.one_line_description && <p className="text-sm text-muted-foreground line-clamp-3">{g.one_line_description}</p>}
      <div className="flex items-center text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || "5"} min read</span>
      </div>
    </div>
  </Link>
);

// Compact horizontal list card
const GuideListCard = ({ g }: { g: any }) => (
  <Link
    to={guideHref(g.slug, g.topic_category)}
    className="group flex gap-3 rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-md"
    style={{ transition: "transform 200ms ease" }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
  >
    {g.featured_image_url ? (
      <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-24 h-24 md:w-28 md:h-28 object-cover shrink-0" />
    ) : (
      <div className="w-24 h-24 md:w-28 md:h-28 bg-muted shrink-0" />
    )}
    <div className="py-3 pr-3 flex flex-col justify-center min-w-0 space-y-1">
      <div className="flex flex-wrap gap-1">
        {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[9px]`}>{g.difficulty}</Badge>}
      </div>
      <h3 className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h3>
      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || "5"} min</span>
    </div>
  </Link>
);

// Landscape wide card
const GuideLandscapeCard = ({ g }: { g: any }) => (
  <Link
    to={guideHref(g.slug, g.topic_category)}
    className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg"
    style={{ transition: "transform 200ms ease, box-shadow 200ms ease" }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
  >
    {g.featured_image_url && (
      <div className="aspect-[2/1] overflow-hidden">
        <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
    )}
    <div className="p-4 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>{g.difficulty}</Badge>}
      </div>
      <h2 className="text-base font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h2>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || "5"} min read</span>
        <span className="flex items-center gap-1 text-primary font-medium">Read <ArrowRight className="h-3 w-3" /></span>
      </div>
    </div>
  </Link>
);

// Square compact card
const GuideSquareCard = ({ g }: { g: any }) => (
  <Link
    to={guideHref(g.slug, g.topic_category)}
    className="group rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg"
    style={{ transition: "transform 200ms ease, box-shadow 200ms ease" }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
  >
    {g.featured_image_url && (
      <div className="aspect-square overflow-hidden">
        <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
    )}
    <div className="p-3 space-y-1.5">
      {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[9px]`}>{g.difficulty}</Badge>}
      <h2 className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h2>
      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || "5"} min</span>
    </div>
  </Link>
);

// Wide 2-col card with more description
const GuideWideCard = ({ g }: { g: any }) => (
  <Link
    to={guideHref(g.slug, g.topic_category)}
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
    <div className="p-5 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>{g.difficulty}</Badge>}
        {g.pillar && <Badge className={`${pillarColors[g.pillar] || "bg-primary"} text-white text-[10px]`}>{g.pillar}</Badge>}
      </div>
      <h2 className="text-lg font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h2>
      {g.one_line_description && <p className="text-sm text-muted-foreground line-clamp-3">{g.one_line_description}</p>}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || "5"} min read</span>
        <span className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">Read guide <ArrowRight className="h-3 w-3" /></span>
      </div>
    </div>
  </Link>
);

/* ── Section layout renderers ── */

// "featured" layout: 1 big card left + 2 stacked list cards right
const FeaturedLayout = ({ guides, mirrored = false }: { guides: any[]; mirrored?: boolean }) => {
  const big = guides[0];
  const stacked = guides.slice(1, 3);
  const rest = guides.slice(3);
  return (
    <>
      <div className={`grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-5 ${mirrored ? "" : ""}`}>
        <div className={`lg:col-span-3 ${mirrored ? "lg:order-2" : ""}`}>
          {big && <GuideFeaturedCard g={big} />}
        </div>
        <div className={`lg:col-span-2 flex flex-col gap-4 ${mirrored ? "lg:order-1" : ""}`}>
          {stacked.map((g: any) => <GuideListCard key={g.id} g={g} />)}
        </div>
      </div>
      {rest.length > 0 && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 sm:gap-6 mt-4">
          {rest.map((g: any) => <GuideCard key={g.id} g={g} />)}
        </div>
      )}
    </>
  );
};

// 3-col landscape
const LandscapeLayout = ({ guides }: { guides: any[] }) => (
  <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 sm:gap-6">
    {guides.map((g: any) => <GuideLandscapeCard key={g.id} g={g} />)}
  </div>
);

// 4-col square compact
const SquareLayout = ({ guides }: { guides: any[] }) => (
  <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
    {guides.map((g: any) => <GuideSquareCard key={g.id} g={g} />)}
  </div>
);

// 2-col wide
const WideLayout = ({ guides }: { guides: any[] }) => (
  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 sm:gap-6">
    {guides.map((g: any) => <GuideWideCard key={g.id} g={g} />)}
  </div>
);

// Standard 3-col
const StandardLayout = ({ guides }: { guides: any[] }) => (
  <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 sm:gap-6">
    {guides.map((g: any) => <GuideCard key={g.id} g={g} />)}
  </div>
);

const LAYOUT_SEQUENCE = ["featured", "landscape", "square", "wide", "featured-mirror", "standard"] as const;

const renderSectionLayout = (layout: string, guides: any[]) => {
  switch (layout) {
    case "featured": return <FeaturedLayout guides={guides} />;
    case "featured-mirror": return <FeaturedLayout guides={guides} mirrored />;
    case "landscape": return <LandscapeLayout guides={guides} />;
    case "square": return <SquareLayout guides={guides} />;
    case "wide": return <WideLayout guides={guides} />;
    default: return <StandardLayout guides={guides} />;
  }
};

/* ── Main page component ── */

const Guides = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [difficulty, setDifficulty] = useState("All");
  const [platforms, setPlatforms] = useState<Set<string>>(new Set(["All"]));
  const [topic, setTopic] = useState("All");
  const [specialFilter, setSpecialFilter] = useState<"asia" | "startup" | "platform" | null>(null);
  const [asiaCountries, setAsiaCountries] = useState<Set<string>>(new Set(["All"]));

  const activeFilterCount = (difficulty !== "All" ? 1 : 0) + (!platforms.has("All") ? 1 : 0) + (topic !== "All" ? 1 : 0);

  const togglePlatform = (p: string) => {
    if (p === "All") { setPlatforms(new Set(["All"])); return; }
    setPlatforms((prev) => {
      const next = new Set(prev);
      next.delete("All");
      if (next.has(p)) { next.delete(p); if (next.size === 0) next.add("All"); }
      else next.add(p);
      return next;
    });
  };

  const { data: guides, isLoading } = useQuery({
    queryKey: ["guides-index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, pillar, difficulty, one_line_description, featured_image_url, read_time_minutes, platform_tags, published_at, topic_category, updated_at, view_count, geo, audience_role, guide_category, primary_platform")
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

  // Asia spotlight query removed - now uses main guides data filtered by geo field

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

  const isAsiaGuide = (g: any) => g.geo && g.geo !== "none" && g.geo !== "global";

  const filteredGuides = useMemo(() => {
    if (!guides) return [];
    let result = guides.filter((g) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        const matches = g.title?.toLowerCase().includes(q) || g.one_line_description?.toLowerCase().includes(q) || g.pillar?.toLowerCase().includes(q) || g.difficulty?.toLowerCase().includes(q) || g.platform_tags?.some((t: string) => t.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (difficulty !== "All" && g.difficulty?.toLowerCase() !== difficulty.toLowerCase()) return false;
      if (!platforms.has("All")) {
        const gp = (g.platform_tags || []).map((t: string) => t.toLowerCase());
        if (!Array.from(platforms).some((p) => gp.includes(p.toLowerCase()))) return false;
      }
      if (topic !== "All" && (g.topic_category || "").toLowerCase() !== topic.toLowerCase()) return false;
      // Special filter
      if (specialFilter === "asia" && !isAsiaGuide(g)) return false;
      if (specialFilter === "startup" && g.audience_role !== "Startup Founder") return false;
      if (specialFilter === "platform" && g.guide_category !== "Platform Guide") return false;
      return true;
    });
    if (sortBy === "newest") result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    else if (sortBy === "popular") result.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
    else if (sortBy === "difficulty") result.sort((a, b) => (DIFF_ORDER[a.difficulty ?? ""] ?? 99) - (DIFF_ORDER[b.difficulty ?? ""] ?? 99));
    return result;
  }, [guides, debouncedSearch, difficulty, platforms, topic, sortBy, specialFilter]);

  const showGrouped = topic === "All" && !debouncedSearch.trim() && !specialFilter;

  const groupedGuides = useMemo(() => {
    if (!showGrouped || !filteredGuides.length) return [];
    const groups: Record<string, typeof filteredGuides> = {};
    for (const g of filteredGuides) {
      const cat = g.topic_category || "General";
      (groups[cat] ??= []).push(g);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredGuides, showGrouped]);

  const guideCount = guides?.length ?? 0;
  const hasActiveFilters = difficulty !== "All" || !platforms.has("All") || topic !== "All" || debouncedSearch.trim() || !!specialFilter;

  const specialCounts = useMemo(() => {
    if (!guides) return { asia: 0, startup: 0, platform: 0 };
    return {
      asia: guides.filter((g) => isAsiaGuide(g)).length,
      startup: guides.filter((g) => g.audience_role === "Startup Founder").length,
      platform: guides.filter((g) => g.guide_category === "Platform Guide").length,
    };
  }, [guides]);

  const asiaGuides = useMemo(() => {
    if (!guides) return [];
    let pool = guides.filter((g) => isAsiaGuide(g));
    if (!asiaCountries.has("All")) {
      pool = pool.filter((g) => {
        const geo = (g.geo || "").toLowerCase();
        return Array.from(asiaCountries).some((c) => geo.includes(c.toLowerCase()));
      });
    }
    return pool;
  }, [guides, asiaCountries]);

  const startupGuides = useMemo(() => {
    if (!guides) return [];
    return guides.filter((g) => g.audience_role === "Startup Founder");
  }, [guides]);

  const platformGuides = useMemo(() => {
    if (!guides) return [];
    return guides.filter((g) => g.guide_category === "Platform Guide");
  }, [guides]);

  const COUNTRY_OPTIONS = ["All", "Singapore", "India", "Indonesia", "Philippines", "Thailand", "Vietnam", "Japan", "Korea", "Malaysia"] as const;

  const toggleCountry = (c: string) => {
    if (c === "All") { setAsiaCountries(new Set(["All"])); return; }
    setAsiaCountries((prev) => {
      const next = new Set(prev);
      next.delete("All");
      if (next.has(c)) { next.delete(c); if (next.size === 0) next.add("All"); }
      else next.add(c);
      return next;
    });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
        {/* ROW 1 — Compact header strip */}
        <section className="border-b border-border" style={{ background: "linear-gradient(135deg, #040405 0%, #0a1a1f 100%)" }}>
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">AI in Asia Guides</p>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Master AI with practical guides</h1>
                <p className="text-sm text-muted-foreground mt-1">{isLoading ? "—" : `${guideCount}+`} step-by-step workflows. Free. No signup.</p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search guides..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors bg-card/60 border border-border text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm border transition-colors ${
                    filtersOpen || activeFilterCount > 0
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-card/60 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Collapsible Filter Panel */}
        {filtersOpen && (
          <section className="border-b border-border bg-card/80 backdrop-blur">
            <div className="container mx-auto px-4 py-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">Filters</span>
                <button onClick={() => setFiltersOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Level</span>
                {DIFFICULTY_OPTIONS.map((d) => <FilterPill key={d} label={d} active={difficulty === d} onClick={() => setDifficulty(d)} />)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Platform</span>
                {PLATFORM_OPTIONS.map((p) => <FilterPill key={p} label={p} active={platforms.has(p)} onClick={() => togglePlatform(p)} />)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Topic</span>
                {TOPIC_OPTIONS.map((t) => <FilterPill key={t} label={t} active={topic === t} onClick={() => setTopic(t)} />)}
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setDifficulty("All"); setPlatforms(new Set(["All"])); setTopic("All"); setSpecialFilter(null); }}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </section>
        )}

        {/* ROW 2 — Category quick-nav tiles */}
        <section className="border-b border-border" style={{ background: "#080a0f" }}>
          <div className="container mx-auto px-4 py-3">
            <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
              {/* Special pills */}
              <button
                onClick={() => { setSpecialFilter(specialFilter === "asia" ? null : "asia"); setTopic("All"); }}
                className={`snap-start shrink-0 min-w-[100px] rounded-xl px-3 py-2.5 text-left transition-transform hover:scale-105 ${specialFilter === "asia" ? "ring-2 ring-white/50" : ""}`}
                style={{ background: "linear-gradient(135deg, #0891b2 0%, #0f766e 100%)" }}
              >
                <span className="flex items-center gap-1 text-xs font-bold text-white"><Globe className="h-3 w-3" />Asia</span>
                {specialCounts.asia > 0 && <span className="block text-[10px] text-white/70 mt-0.5">{specialCounts.asia} guides</span>}
              </button>
              <button
                onClick={() => { setSpecialFilter(specialFilter === "startup" ? null : "startup"); setTopic("All"); }}
                className={`snap-start shrink-0 min-w-[100px] rounded-xl px-3 py-2.5 text-left transition-transform hover:scale-105 ${specialFilter === "startup" ? "ring-2 ring-white/50" : ""}`}
                style={{ background: "linear-gradient(135deg, #e11d48 0%, #f97316 100%)" }}
              >
                <span className="flex items-center gap-1 text-xs font-bold text-white"><Rocket className="h-3 w-3" />Startup</span>
                {specialCounts.startup > 0 && <span className="block text-[10px] text-white/70 mt-0.5">{specialCounts.startup} guides</span>}
              </button>
              <button
                onClick={() => { setSpecialFilter(specialFilter === "platform" ? null : "platform"); setTopic("All"); }}
                className={`snap-start shrink-0 min-w-[100px] rounded-xl px-3 py-2.5 text-left transition-transform hover:scale-105 ${specialFilter === "platform" ? "ring-2 ring-white/50" : ""}`}
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
              >
                <span className="flex items-center gap-1 text-xs font-bold text-white"><Layers className="h-3 w-3" />Platform</span>
                {specialCounts.platform > 0 && <span className="block text-[10px] text-white/70 mt-0.5">{specialCounts.platform} guides</span>}
              </button>
              {TOPIC_OPTIONS.filter((t) => t !== "All").map((cat) => {
                const count = topicCounts[cat] || 0;
                const colorClass = CATEGORY_TILE_COLORS[cat] || "bg-gray-500";
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      if (showGrouped) {
                        const el = document.getElementById(`cat-${cat.toLowerCase().replace(/\s+/g, "-")}`);
                        if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
                      }
                      setSpecialFilter(null); setTopic(topic === cat ? "All" : cat);
                    }}
                    className={`${colorClass} snap-start shrink-0 min-w-[100px] rounded-xl px-3 py-2.5 text-left transition-transform hover:scale-105`}
                  >
                    <span className="block text-xs font-bold text-white">{cat}</span>
                    {count > 0 && <span className="block text-[10px] text-white/70 mt-0.5">{count} guides</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ROW 3 — Highlight cards */}
        <section className="border-b border-border" style={{ background: "#040405" }}>
          <div className="container mx-auto px-4 py-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button onClick={() => scrollToSection("asia-spotlight")} className="rounded-xl p-4 text-left transition-transform hover:scale-[1.01]" style={{ background: "linear-gradient(135deg, #0891b2 0%, #0f766e 100%)" }}>
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-white/90 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Asia</h3>
                    <p className="text-[11px] text-white/70 mt-0.5">Local guides</p>
                  </div>
                </div>
              </button>
              <button onClick={() => scrollToSection("startup-guides")} className="rounded-xl p-4 text-left transition-transform hover:scale-[1.01]" style={{ background: "linear-gradient(135deg, #e11d48 0%, #f97316 100%)" }}>
                <div className="flex items-start gap-2">
                  <Rocket className="h-4 w-4 text-white/90 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Startup</h3>
                    <p className="text-[11px] text-white/70 mt-0.5">Founder guides</p>
                  </div>
                </div>
              </button>
              <button onClick={() => scrollToSection("platform-guides")} className="rounded-xl p-4 text-left transition-transform hover:scale-[1.01]" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}>
                <div className="flex items-start gap-2">
                  <Layers className="h-4 w-4 text-white/90 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Platform</h3>
                    <p className="text-[11px] text-white/70 mt-0.5">Deep dives</p>
                  </div>
                </div>
              </button>
              <button onClick={() => scrollToSection("editors-picks")} className="rounded-xl p-4 text-left transition-transform hover:scale-[1.01]" style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)" }}>
                <div className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-white/90 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Picks</h3>
                    <p className="text-[11px] text-white/70 mt-0.5">Editor curated</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Editors' Picks — compact */}
        {isLoadingPicks ? (
          <section id="editors-picks" className="pt-6 pb-2" aria-label="Editors' Picks loading">
            <div className="container mx-auto px-4">
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[16/9] rounded-xl w-full" />)}
              </div>
            </div>
          </section>
        ) : dailyPicks.length > 0 ? (
          <section id="editors-picks" className="pt-6 pb-2" aria-label="Editors' Picks guides">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <h2 className="text-base font-bold text-foreground">Editors' Picks</h2>
              </div>
              <div className="hidden lg:grid gap-4 grid-cols-3">
                {dailyPicks.map((g) => (
                  <Link key={g.id} to={guideHref(g.slug, g.topic_category)} className="group relative rounded-xl overflow-hidden border border-border">
                    <div className="aspect-[16/9] w-full relative">
                      {g.featured_image_url ? (
                        <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : <div className="w-full h-full bg-muted" />}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    {g.difficulty && <Badge className={`absolute top-2 right-2 ${diffColors[g.difficulty] || "bg-primary"} text-white text-[10px]`}>{g.difficulty}</Badge>}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-sm font-bold leading-snug text-white line-clamp-2 group-hover:underline decoration-primary underline-offset-2">{g.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="lg:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
                {dailyPicks.map((g) => (
                  <Link key={g.id} to={guideHref(g.slug, g.topic_category)} className="group relative rounded-xl overflow-hidden border border-border snap-start shrink-0 w-[80vw] max-w-[320px]">
                    <div className="aspect-[16/9] w-full relative">
                      {g.featured_image_url ? (
                        <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                      ) : <div className="w-full h-full bg-muted" />}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    {g.difficulty && <Badge className={`absolute top-2 right-2 ${diffColors[g.difficulty] || "bg-primary"} text-white text-[10px]`}>{g.difficulty}</Badge>}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-sm font-bold leading-snug text-white line-clamp-2">{g.title}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Asia Guides - full list with country filters */}
        {asiaGuides.length > 0 && (
          <section id="asia-spotlight" className="pt-6 pb-2" aria-label="Local guides for Asia">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Local Guides for Asia</h2>
                <Badge variant="secondary" className="text-[10px] bg-muted/60 border-0">{asiaGuides.length}</Badge>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
                {COUNTRY_OPTIONS.map((c) => (
                  <FilterPill key={c} label={c} active={asiaCountries.has(c)} onClick={() => toggleCountry(c)} />
                ))}
              </div>
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
                {asiaGuides.map((g) => (
                  <Link key={g.id} to={guideHref(g.slug, g.topic_category)} className="group rounded-xl border border-border bg-card overflow-hidden snap-start shrink-0 w-[70vw] max-w-[280px] md:w-[240px]" style={{ transition: "transform 200ms ease" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
                    {g.featured_image_url && <div className="aspect-video overflow-hidden"><img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>}
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
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Startup Guides */}
        {startupGuides.length > 0 && (
          <section id="startup-guides" className="pt-6 pb-2" aria-label="Startup Guides">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-3">
                <Rocket className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Startup Guides</h2>
                <Badge variant="secondary" className="text-[10px] bg-muted/60 border-0">{startupGuides.length}</Badge>
              </div>
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
                {startupGuides.map((g) => (
                  <Link key={g.id} to={guideHref(g.slug, g.topic_category)} className="group rounded-xl border border-border bg-card overflow-hidden snap-start shrink-0 w-[70vw] max-w-[280px] md:w-[240px]" style={{ transition: "transform 200ms ease" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
                    {g.featured_image_url && <div className="aspect-video overflow-hidden"><img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>}
                    <div className="p-3 space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>{g.difficulty}</Badge>}
                        {g.pillar && <Badge className={`${pillarColors[g.pillar] || "bg-primary"} text-white text-[10px]`}>{g.pillar}</Badge>}
                      </div>
                      <h3 className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h3>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || "5"} min</span>
                        <span className="flex items-center gap-1 text-primary font-medium">Read <ArrowRight className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Platform Deep Dives */}
        {platformGuides.length > 0 && (
          <section id="platform-guides" className="pt-6 pb-2" aria-label="Platform Deep Dives">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Platform Deep Dives</h2>
                <Badge variant="secondary" className="text-[10px] bg-muted/60 border-0">{platformGuides.length}</Badge>
              </div>
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
                {platformGuides.map((g) => (
                  <Link key={g.id} to={guideHref(g.slug, g.topic_category)} className="group rounded-xl border border-border bg-card overflow-hidden snap-start shrink-0 w-[70vw] max-w-[280px] md:w-[240px]" style={{ transition: "transform 200ms ease" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
                    {g.featured_image_url && <div className="aspect-video overflow-hidden"><img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>}
                    <div className="p-3 space-y-1.5">
                      <div className="flex flex-wrap gap-1">
                        {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>{g.difficulty}</Badge>}
                        {g.primary_platform && <Badge className="bg-indigo-500 text-white text-[10px]">{g.primary_platform}</Badge>}
                      </div>
                      <h3 className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h3>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || "5"} min</span>
                        <span className="flex items-center gap-1 text-primary font-medium">Read <ArrowRight className="h-3 w-3" /></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Guides Grid + Sidebar */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-5 space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /></div>
                  </div>
                ))}
              </div>
            ) : filteredGuides.length > 0 ? (
              <>
                {/* Sort bar */}
                <div className="flex items-center justify-between mb-4">
                  {hasActiveFilters ? (
                    <p className="text-sm text-muted-foreground">
                      {filteredGuides.length} guide{filteredGuides.length !== 1 ? "s" : ""} found
                      {debouncedSearch.trim() ? ` matching "${debouncedSearch}"` : ""}
                    </p>
                  ) : <div />}
                  <div className="relative">
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none bg-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary">
                      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Sort by: {o.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="flex gap-8">
                  <div className="flex-1 min-w-0">
                    {showGrouped ? (
                      <div className="space-y-10">
                        {groupedGuides.map(([cat, catGuides], sectionIndex) => {
                          const slug = cat.toLowerCase().replace(/\s+/g, "-");
                          const visible = catGuides.slice(0, 6);
                          const layout = LAYOUT_SEQUENCE[sectionIndex % LAYOUT_SEQUENCE.length];

                          return (
                            <div key={cat}>
                              <section id={`cat-${slug}`} aria-label={`${cat} guides`}>
                                <div className="flex items-center gap-2 mb-4">
                                  <h2 className="text-xl font-bold text-foreground capitalize">{cat}</h2>
                                  <Badge variant="secondary" className="text-xs bg-muted/60 border-0">{catGuides.length}</Badge>
                                </div>
                                {renderSectionLayout(layout, visible)}
                                {catGuides.length > 6 && (
                                  <button onClick={() => setTopic(cat)} className="mt-3 text-sm font-medium text-primary hover:underline">
                                    View all {catGuides.length} guides &rarr;
                                  </button>
                                )}
                              </section>
                              {/* MPU ad after 2nd and 5th sections */}
                              {(sectionIndex === 1 || sectionIndex === 4) && <InlineMPU />}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                        {filteredGuides.map((g: any) => <GuideCard key={g.id} g={g} />)}
                      </div>
                    )}
                  </div>

                  {/* Right sidebar — desktop only */}
                  <div className="hidden lg:block w-[300px] shrink-0">
                    <div className="sticky top-24 space-y-6">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search guides..." className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4">
                        <h3 className="text-sm font-semibold text-foreground mb-3">Browse by Topic</h3>
                        <div className="space-y-1 max-h-[260px] overflow-y-auto">
                          {Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                            <button
                              key={cat}
                              onClick={() => {
                                if (showGrouped) {
                                  const el = document.getElementById(`cat-${cat.toLowerCase().replace(/\s+/g, "-")}`);
                                  if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
                                }
                                setTopic(topic.toLowerCase() === cat.toLowerCase() ? "All" : cat);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${topic.toLowerCase() === cat.toLowerCase() ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                            >
                              <span className="capitalize">{cat}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-muted/60 border-0">{count}</Badge>
                            </button>
                          ))}
                        </div>
                      </div>

                      {popularGuides && popularGuides.length > 0 && (
                        <div className="rounded-xl border border-border bg-card p-4">
                          <h3 className="text-sm font-semibold text-foreground mb-3">Popular Guides</h3>
                          <div className="space-y-3">
                            {popularGuides.map((g) => (
                              <Link key={g.id} to={guideHref(g.slug, g.topic_category)} className="flex gap-3 group">
                                {g.featured_image_url ? (
                                  <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-16 h-16 rounded object-cover shrink-0" />
                                ) : <div className="w-16 h-16 rounded bg-muted shrink-0" />}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">{g.title}</p>
                                  {g.topic_category && <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0 h-5 bg-muted/60 border-0 capitalize">{g.topic_category}</Badge>}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      <AdCard />
                    </div>
                  </div>
                </div>

                <div className="lg:hidden mt-8"><AdCard /></div>
              </>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                {hasActiveFilters ? <p>No guides match these filters. Try broadening your selection.</p> : <p>No guides published yet. Check back soon!</p>}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Guides;
