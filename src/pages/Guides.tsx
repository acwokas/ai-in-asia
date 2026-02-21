import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowRight, Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

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
  "Content & Writing",
  "Research & Analysis",
  "SEO & Marketing",
  "Strategy & Planning",
  "Productivity",
] as const;

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

const Guides = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);

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
        .select("id, title, slug, pillar, difficulty, one_line_description, featured_image_url, read_time_minutes, platform_tags, published_at, topic_category")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredGuides = useMemo(() => {
    if (!guides) return [];
    return guides.filter((g) => {
      // Search
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

      // Difficulty
      if (difficulty !== "All" && g.difficulty?.toLowerCase() !== difficulty.toLowerCase()) return false;

      // Platform
      if (!platforms.has("All")) {
        const guidePlatforms = (g.platform_tags || []).map((t: string) => t.toLowerCase());
        const match = Array.from(platforms).some((p) => guidePlatforms.includes(p.toLowerCase()));
        if (!match) return false;
      }

      // Topic
      if (topic !== "All") {
        if (!g.topic_category || g.topic_category !== topic) return false;
      }

      return true;
    });
  }, [guides, debouncedSearch, difficulty, platforms, topic]);

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
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
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
        <section className="border-b border-border bg-card/50 py-4">
          <div className="container mx-auto px-4 space-y-3 md:space-y-2">
            {/* Row 1: Difficulty */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Level</span>
              {DIFFICULTY_OPTIONS.map((d) => (
                <FilterPill key={d} label={d} active={difficulty === d} onClick={() => setDifficulty(d)} />
              ))}
            </div>
            {/* Row 2: Platform */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Platform</span>
              {PLATFORM_OPTIONS.map((p) => (
                <FilterPill key={p} label={p} active={platforms.has(p)} onClick={() => togglePlatform(p)} />
              ))}
            </div>
            {/* Row 3: Topic */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Topic</span>
              {TOPIC_OPTIONS.map((t) => (
                <FilterPill key={t} label={t} active={topic === t} onClick={() => setTopic(t)} />
              ))}
            </div>
          </div>
        </section>

        {/* Guides Grid */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                {hasActiveFilters && (
                  <p className="text-sm text-muted-foreground mb-6">
                    {filteredGuides.length} guide{filteredGuides.length !== 1 ? "s" : ""} found
                    {debouncedSearch.trim() ? ` matching "${debouncedSearch}"` : ""}
                  </p>
                )}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredGuides.map((g: any) => (
                    <Link
                      key={g.id}
                      to={`/guides/${g.slug}`}
                      className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg"
                    >
                      {g.featured_image_url && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={g.featured_image_url}
                            alt={g.title}
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
                  ))}
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
