import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import {
  Search, BookOpen, Zap, ArrowRight,
  Cpu, GraduationCap, Terminal, Compass, Clock, ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PromptsGrid from "@/components/PromptsGrid";
import AdriansToolbox from "@/components/AdriansToolbox";

// ─── Pillar definitions ────────────────────────────────────────
const PILLARS = [
  {
    value: "learn",
    label: "Learn",
    description: "Guides, tutorials, and role-based walkthroughs",
    icon: GraduationCap,
    color: "from-blue-500 to-cyan-500",
    borderGlow: "shadow-blue-500/20",
    badgeBg: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    guideCategories: ["Guide", "Tutorial", "Platform Guide", "Role Guide", "Use Case"],
  },
  {
    value: "prompts",
    label: "Prompts",
    description: "Ready-to-use prompts and collections",
    icon: Terminal,
    color: "from-purple-500 to-pink-500",
    borderGlow: "shadow-purple-500/20",
    badgeBg: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    guideCategories: ["Prompt List", "Prompt Pack"],
    isPrompts: true,
  },
  {
    value: "toolbox",
    label: "Toolbox",
    description: "Adrian's curated picks and recommendations",
    icon: Compass,
    color: "from-teal-500 to-emerald-500",
    borderGlow: "shadow-teal-500/20",
    badgeBg: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    guideCategories: ["Tools"],
    isTools: true,
  },
] as const;

// ─── Content-type sub-filter pills ────────────────────────────
const CONTENT_TYPES = [
  { value: "all", label: "All" },
  { value: "quick-guide", label: "Quick Guides" },
  { value: "deep-dive", label: "Deep Dives" },
  { value: "role-guide", label: "Role Guides" },
  { value: "prompt-collection", label: "Prompt Collections" },
  { value: "prompt-pack", label: "Prompt Packs" },
  { value: "tool-pick", label: "Tool Picks" },
];

const PLATFORMS = [
  { value: "ChatGPT", label: "ChatGPT", accent: "bg-emerald-500" },
  { value: "Claude", label: "Claude", accent: "bg-orange-500" },
  { value: "Gemini", label: "Gemini", accent: "bg-blue-500" },
  { value: "Midjourney", label: "Midjourney", accent: "bg-purple-500" },
  { value: "Generic", label: "Multi-platform", accent: "bg-muted" },
];

const LEVELS = [
  { value: "Beginner", color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
  { value: "Intermediate", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10" },
  { value: "Advanced", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
];

// ─── Role-based nav pills ─────────────────────────────────────
const ROLE_PILLS = [
  { label: "Marketer", keywords: ["marketer", "marketing", "seo", "social media"] },
  { label: "Developer", keywords: ["developer", "engineer", "coding", "product manager"] },
  { label: "Founder", keywords: ["founder", "entrepreneur", "startup", "ceo"] },
  { label: "Student", keywords: ["student", "learner", "educator", "parent"] },
  { label: "Content Creator", keywords: ["creator", "content", "writer", "artist", "hobbyist"] },
  { label: "Manager", keywords: ["manager", "team lead", "operations", "knowledge worker"] },
  { label: "Analyst", keywords: ["analyst", "researcher", "data", "intelligence"] },
];

const DEEP_DIVE_CHAR_THRESHOLD = 7500;
const SUBTYPE_LABELS: Record<string, string> = {
  "quick-guide": "Quick Guide",
  "deep-dive": "Deep Dive",
  "role-guide": "Role Guide",
  "prompt-collection": "Prompt Collection",
  "prompt-pack": "Prompt Pack",
  "tool-pick": "Tool Pick",
};

function getSubtype(guide: { guide_category: string; bodyLength: number }): string {
  switch (guide.guide_category) {
    case "Role Guide": return "role-guide";
    case "Prompt List": return "prompt-collection";
    case "Prompt Pack": return "prompt-pack";
    case "Tools": return "tool-pick";
    case "Tutorial": return "deep-dive";
    case "Platform Guide": return "quick-guide";
    default: return guide.bodyLength > DEEP_DIVE_CHAR_THRESHOLD ? "deep-dive" : "quick-guide";
  }
}

function getPillar(guideCategory: string) {
  return PILLARS.find(p => (p.guideCategories as readonly string[]).includes(guideCategory)) || PILLARS[0];
}

/** Rough reading-time estimate (200 wpm) */
function estimateReadTime(charLen: number): number {
  return Math.max(1, Math.round(charLen / 5 / 200));
}

/** Check if a guide matches a role pill */
function matchesRole(guide: { audience_role?: string | null; tags?: string | null }, role: typeof ROLE_PILLS[number]): boolean {
  const haystack = ((guide.audience_role || "") + " " + (guide.tags || "")).toLowerCase();
  return role.keywords.some(k => haystack.includes(k));
}

// ═══════════════════════════════════════════════════════════════
const Guides = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat === "prompts") setSelectedPillar("prompts");
    else if (cat === "tools") setSelectedPillar("toolbox");
  }, [searchParams]);

  const isPromptsView = selectedPillar === "prompts";
  const isToolsView = selectedPillar === "toolbox";

  // ─── Data fetching ──────────────────────────────────────────
  const { data: guides, isLoading } = useQuery({
    queryKey: ["ai-guides-list"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, guide_category, primary_platform, level, excerpt, tags, created_at, audience_role, body_intro, body_section_1_text, body_section_2_text, body_section_3_text")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(g => ({
        ...g,
        bodyLength: (g.body_intro || "").length + (g.body_section_1_text || "").length + (g.body_section_2_text || "").length + (g.body_section_3_text || "").length,
      }));
    },
  });

  const { data: toolsCount } = useQuery({
    queryKey: ["ai-tools-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("ai_tools").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: promptsCount } = useQuery({
    queryKey: ["prompts-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("top_list_items")
        .eq("article_type", "top_lists")
        .eq("status", "published");
      if (error) throw error;
      let total = 0;
      data?.forEach(a => { if (Array.isArray(a.top_list_items)) total += a.top_list_items.length; });
      return total;
    },
  });

  // ─── Computed values ────────────────────────────────────────
  const pillarCounts = useMemo(() => {
    const counts: Record<string, number> = { learn: 0, prompts: promptsCount || 0, toolbox: toolsCount || 0 };
    guides?.forEach(g => { if (getPillar(g.guide_category).value === "learn") counts.learn++; });
    return counts;
  }, [guides, toolsCount, promptsCount]);

  const totalCount = useMemo(() => (guides?.length || 0) + (promptsCount || 0) + (toolsCount || 0), [guides, promptsCount, toolsCount]);

  const subtypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    guides?.forEach(g => {
      const st = getSubtype({ guide_category: g.guide_category, bodyLength: g.bodyLength });
      counts[st] = (counts[st] || 0) + 1;
    });
    if (promptsCount) counts["prompt-collection"] = (counts["prompt-collection"] || 0) + promptsCount;
    if (toolsCount) counts["tool-pick"] = (counts["tool-pick"] || 0) + toolsCount;
    return counts;
  }, [guides, promptsCount, toolsCount]);

  const visibleContentTypes = useMemo(() => CONTENT_TYPES.filter(ct => ct.value === "all" || (subtypeCounts[ct.value] || 0) > 0), [subtypeCounts]);
  const visiblePlatforms = useMemo(() => { if (!guides) return []; const s = new Set(guides.map(g => g.primary_platform)); return PLATFORMS.filter(p => s.has(p.value)); }, [guides]);
  const visibleLevels = useMemo(() => { if (!guides) return []; const s = new Set(guides.map(g => g.level)); return LEVELS.filter(l => s.has(l.value)); }, [guides]);

  // Role pills - only show those with matching content
  const visibleRolePills = useMemo(() => {
    if (!guides) return [];
    return ROLE_PILLS.filter(role => guides.some(g => matchesRole(g, role)));
  }, [guides]);

  // EDITOR'S PICKS: Replace these IDs with manually curated selections
  const editorsPicks = useMemo(() => {
    if (!guides) return [];
    const picks: typeof guides = [];
    for (const pillar of PILLARS) {
      const match = guides.find(g => (pillar.guideCategories as readonly string[]).includes(g.guide_category));
      if (match) picks.push(match);
    }
    return picks;
  }, [guides]);

  // ─── Filtered guides ───────────────────────────────────────
  const filteredGuides = useMemo(() => {
    return guides?.filter(guide => {
      const subtype = getSubtype({ guide_category: guide.guide_category, bodyLength: guide.bodyLength });
      const pillar = getPillar(guide.guide_category);

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!guide.title.toLowerCase().includes(q) && !guide.excerpt?.toLowerCase().includes(q)) return false;
      }
      if (selectedPillar && selectedPillar !== pillar.value) return false;
      if (selectedContentType && selectedContentType !== "all" && subtype !== selectedContentType) return false;
      if (selectedPlatform && guide.primary_platform !== selectedPlatform) return false;
      if (selectedLevel && guide.level !== selectedLevel) return false;
      if (selectedRole) {
        const role = ROLE_PILLS.find(r => r.label === selectedRole);
        if (role && !matchesRole(guide, role)) return false;
      }
      return true;
    });
  }, [guides, searchQuery, selectedPillar, selectedContentType, selectedPlatform, selectedLevel, selectedRole]);

  const clearFilters = () => {
    setSelectedPillar(null);
    setSelectedContentType(null);
    setSelectedPlatform(null);
    setSelectedLevel(null);
    setSelectedRole(null);
    setSearchQuery("");
  };

  const hasActiveFilters = selectedPillar || selectedContentType || selectedPlatform || selectedLevel || selectedRole || searchQuery;

  const handleRoleClick = useCallback((roleLabel: string) => {
    setSelectedRole(selectedRole === roleLabel ? null : roleLabel);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedRole]);

  const getLevelStyle = (level: string) => LEVELS.find(l => l.value === level) || LEVELS[0];
  const getPlatformAccent = (platform: string) => PLATFORMS.find(p => p.value === platform)?.accent || "bg-muted";

  // ═══════════════════════════════════════════════════════════════
  return (
    <>
      <SEOHead
        title="AI Guides & Prompts - Master AI Tools with Practical Tutorials"
        description="Explore our collection of AI guides, tutorials, prompt packs, and frameworks. Learn to master ChatGPT, Claude, Gemini, Midjourney and more."
        canonical="https://aiinasia.com/guides"
      />
      <Header />

      <main className="min-h-screen bg-background">

        {/* ──────────── SECTION 1: HERO ──────────── */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
          <div className="absolute top-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="container relative mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-4 w-4" />
                <span>{totalCount} resources and counting</span>
              </div>

              <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
                Master AI with
                <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  {isPromptsView ? "Ready-to-Use Prompts" : isToolsView ? "AI Tools" : "Practical Guides"}
                </span>
              </h1>

              <p className="text-xl text-muted-foreground md:text-2xl leading-relaxed max-w-2xl">
                Real techniques, tested prompts, and honest tool recommendations. No theory, no filler.
              </p>

              <p className="mt-3 text-sm text-muted-foreground/70 tracking-wide uppercase">
                Built for practitioners across Asia
              </p>

              <div className="mt-10 relative max-w-xl">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search guides, prompts, tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg rounded-xl border-2 border-border bg-background/80 backdrop-blur-sm focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ──────────── SECTION 2: EDITOR'S PICKS ──────────── */}
        {editorsPicks.length > 0 && (
          <section className="py-12 border-b border-border">
            <div className="container mx-auto px-4">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-1">Start Here</h2>
                <p className="text-muted-foreground">Hand-picked by Adrian. Best entry points for new readers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {editorsPicks.map((guide) => {
                  const pillar = getPillar(guide.guide_category);
                  const levelStyle = getLevelStyle(guide.level);
                  const readTime = estimateReadTime(guide.bodyLength);

                  return (
                    <Link
                      key={guide.id}
                      to={`/guides/${guide.slug}`}
                      className="group"
                    >
                      <div className={`relative h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:${pillar.borderGlow} overflow-hidden`}>
                        {/* Pillar accent bar */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${pillar.color}`} />

                        <div className="flex flex-wrap items-center gap-2 mb-4 mt-1">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${pillar.badgeBg}`}>
                            {pillar.label}
                          </span>
                          <Badge variant="outline" className={`text-xs ${levelStyle.color}`}>
                            {guide.level}
                          </Badge>
                        </div>

                        <h3 className="font-bold text-foreground text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {guide.title}
                        </h3>

                        {guide.excerpt && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {guide.excerpt}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-auto">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {readTime} min read
                          </span>
                          <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                            Read guide <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ──────────── SECTION 3: BROWSE BY PILLAR ──────────── */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Browse by Pillar</h2>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                  Clear all filters
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PILLARS.map(pillar => {
                const Icon = pillar.icon;
                const isSelected = selectedPillar === pillar.value;
                const count = pillarCounts[pillar.value] || 0;
                return (
                  <button
                    key={pillar.value}
                    onClick={() => {
                      setSelectedPillar(isSelected ? null : pillar.value);
                      setSelectedContentType(null);
                      setSelectedRole(null);
                    }}
                    className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${
                      isSelected
                        ? `border-primary bg-primary/5 shadow-lg ${pillar.borderGlow}`
                        : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${pillar.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${pillar.color} mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{pillar.label}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{pillar.description}</p>
                    <p className="text-xs text-muted-foreground">{count} {count === 1 ? "item" : "items"}</p>
                    {isSelected && <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-primary animate-pulse" />}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ──────────── SECTION 4: FILTERS + CONTENT GRID ──────────── */}
        <div ref={gridRef}>
          {/* Sticky filter bar */}
          <section className="py-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
            <div className="container mx-auto px-4 space-y-3">
              {visibleContentTypes.length > 1 && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground shrink-0">Type:</span>
                  <div className="flex flex-wrap gap-2">
                    {visibleContentTypes.map(ct => (
                      <button
                        key={ct.value}
                        onClick={() => setSelectedContentType(ct.value === "all" ? null : (selectedContentType === ct.value ? null : ct.value))}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          (ct.value === "all" && !selectedContentType) || selectedContentType === ct.value
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {visiblePlatforms.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground shrink-0">Platform:</span>
                  <div className="flex flex-wrap gap-2">
                    {visiblePlatforms.map(platform => (
                      <button
                        key={platform.value}
                        onClick={() => setSelectedPlatform(selectedPlatform === platform.value ? null : platform.value)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          selectedPlatform === platform.value
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${platform.accent}`} />
                        {platform.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {visibleLevels.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground shrink-0">Level:</span>
                  <div className="flex flex-wrap gap-2">
                    {visibleLevels.map(level => (
                      <button
                        key={level.value}
                        onClick={() => setSelectedLevel(selectedLevel === level.value ? null : level.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          selectedLevel === level.value
                            ? "bg-primary text-primary-foreground shadow-md"
                            : `${level.bg} ${level.color} hover:opacity-80`
                        }`}
                      >
                        {level.value}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Conditional content */}
          {(isPromptsView || selectedContentType === "prompt-collection" || selectedContentType === "prompt-pack") ? (
            <section className="py-8">
              <div className="container mx-auto px-4">
                <PromptsGrid searchQuery={searchQuery} />
              </div>
            </section>
          ) : (isToolsView || selectedContentType === "tool-pick") ? (
            <section className="py-8">
              <div className="container mx-auto px-4">
                <AdriansToolbox searchQuery={searchQuery} />
              </div>
            </section>
          ) : (
            <>
              {/* Results count */}
              <section className="pt-8 pb-4">
                <div className="container mx-auto px-4">
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{filteredGuides?.length ?? 0}</span>
                    {" "}guide{filteredGuides?.length !== 1 ? "s" : ""}
                    {hasActiveFilters && " matching your filters"}
                  </p>
                </div>
              </section>

              {/* Guides Grid */}
              <section className="pb-16">
                <div className="container mx-auto px-4">
                  {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="animate-pulse rounded-2xl bg-muted h-64" />
                      ))}
                    </div>
                  ) : filteredGuides?.length === 0 ? (
                    <div className="py-24 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                        <BookOpen className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="mb-3 text-xl font-semibold">No guides found</h3>
                      <p className="text-muted-foreground max-w-md mx-auto mb-6">
                        Try adjusting your search or filters to find what you are looking for.
                      </p>
                      <Button onClick={clearFilters} variant="outline">Clear all filters</Button>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {filteredGuides?.map((guide) => {
                        const pillar = getPillar(guide.guide_category);
                        const subtype = getSubtype({ guide_category: guide.guide_category, bodyLength: guide.bodyLength });
                        const levelStyle = getLevelStyle(guide.level);
                        const platformAccent = getPlatformAccent(guide.primary_platform);
                        const readTime = estimateReadTime(guide.bodyLength);

                        return (
                          <Link key={guide.id} to={`/guides/${guide.slug}`} className="group">
                            <div className={`relative h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 hover:${pillar.borderGlow} overflow-hidden`}>
                              <div className={`absolute inset-0 bg-gradient-to-br ${pillar.color} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />
                              <div className={`absolute top-0 left-0 right-0 h-1 ${platformAccent} opacity-60`} />

                              <div className="relative">
                                {/* Badges row */}
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${pillar.badgeBg}`}>
                                    {pillar.label}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                                    {SUBTYPE_LABELS[subtype] || subtype}
                                  </span>
                                  {guide.primary_platform !== "Generic" && (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <Cpu className="h-3 w-3" /> {guide.primary_platform}
                                    </span>
                                  )}
                                </div>

                                <h3 className="font-bold text-foreground text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                  {guide.title}
                                </h3>

                                {guide.excerpt && (
                                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                    {guide.excerpt}
                                  </p>
                                )}

                                {/* Tags */}
                                {guide.tags && (
                                  <div className="flex flex-wrap gap-1.5 mb-4">
                                    {guide.tags.split(",").slice(0, 3).map((tag, i) => (
                                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/50 text-[11px] text-muted-foreground">
                                        {tag.trim()}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-[11px] ${levelStyle.color}`}>
                                      {guide.level}
                                    </Badge>
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" /> {readTime} min
                                    </span>
                                  </div>
                                  <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                                    Read guide <ArrowRight className="h-3.5 w-3.5" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* ──────────── SECTION 5: ROLE-BASED NAVIGATION ──────────── */}
        {visibleRolePills.length > 0 && (
          <section className="py-12 border-t border-border bg-muted/20">
            <div className="container mx-auto px-4">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-1">Find Guides for Your Role</h2>
                <p className="text-muted-foreground">Quick filters by job function</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {visibleRolePills.map(role => (
                  <button
                    key={role.label}
                    onClick={() => handleRoleClick(role.label)}
                    className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                      selectedRole === role.label
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ──────────── SECTION 6: PROMPTANDGO CTA ──────────── */}
        <section className="py-16 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent border border-teal-500/20 p-8 md:p-12">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
              <div className="relative max-w-2xl">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Want to go further with prompts?
                </h2>
                <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                  Every prompt in our collection works great as-is. But if you want to customize them for your platform, audience, or specific use case, PromptAndGo.ai can help.
                </p>
                <a
                  href="https://promptandgo.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors"
                >
                  Try PromptAndGo <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
};

export default Guides;
