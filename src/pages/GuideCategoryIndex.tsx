import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowRight, ChevronRight, Home } from "lucide-react";
import { guideUrl } from "@/lib/guideUrl";

const ITEMS_PER_PAGE = 12;

const COUNTRY_OPTIONS = ["All", "Singapore", "India", "Indonesia", "Philippines", "Thailand", "Vietnam", "Japan", "Korea", "Malaysia"] as const;

const diffColors: Record<string, string> = {
  beginner: "bg-green-500",
  intermediate: "bg-amber-500",
  advanced: "bg-red-500",
};

const pillarColors: Record<string, string> = {
  learn: "bg-blue-500",
  prompts: "bg-purple-500",
  toolbox: "bg-teal-500",
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

const SPECIAL_CATEGORIES: Record<string, { label: string; description: string; gradient: string }> = {
  asia: { label: "Local Guides for Asia", description: "AI guides tailored for Asian markets, cultures, and regulations", gradient: "linear-gradient(135deg, #0891b2 0%, #0f766e 100%)" },
  startup: { label: "Startup Guides", description: "AI guides for startup founders building and scaling their businesses", gradient: "linear-gradient(135deg, #e11d48 0%, #f97316 100%)" },
  platform: { label: "Platform Deep Dives", description: "In-depth guides for specific AI platforms and tools", gradient: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" },
};

const isAsiaGuide = (g: any) => g.geo && g.geo !== "none" && g.geo !== "global";

const GuideCategoryIndex = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const slug = categorySlug || "general";
  const isSpecial = slug in SPECIAL_CATEGORIES;
  const specialMeta = SPECIAL_CATEGORIES[slug];

  const displayName = isSpecial
    ? specialMeta.label
    : slug.charAt(0).toUpperCase() + slug.slice(1);

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [asiaCountries, setAsiaCountries] = useState<Set<string>>(new Set(["All"]));

  const toggleCountry = (c: string) => {
    setAsiaCountries((prev) => {
      if (c === "All") return new Set(["All"]);
      const next = new Set(prev);
      next.delete("All");
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next.size === 0 ? new Set(["All"]) : next;
    });
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["guide-category-index", slug],
    queryFn: async () => {
      const q = supabase
        .from("ai_guides")
        .select("id, title, slug, excerpt, featured_image_url, difficulty, pillar, topic_category, read_time_minutes, geo, audience_role, guide_category, primary_platform, platform_tags, status, updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false });

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    let result = guides.filter((g: any) => {
      if (slug === "asia") return isAsiaGuide(g);
      if (slug === "startup") return g.audience_role === "Startup Founder";
      if (slug === "platform") return g.guide_category === "Platform Guide";
      return (g.topic_category || "general").toLowerCase() === slug.toLowerCase();
    });

    // Asia country sub-filter
    if (slug === "asia" && !asiaCountries.has("All")) {
      result = result.filter((g: any) => {
        const geo = (g.geo || "").toLowerCase();
        return Array.from(asiaCountries).some((c) => geo.includes(c.toLowerCase()));
      });
    }

    return result;
  }, [guides, slug, asiaCountries]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <>
      <SEOHead
        title={`${displayName} Guides | AI in Asia`}
        description={isSpecial ? specialMeta.description : `Browse all ${displayName} AI guides`}
        canonical={`https://aiinasia.com/guides/category/${slug}`}
      />
      <Header />
      <main id="main-content" className="min-h-screen bg-background">
        {/* Hero */}
        <section
          className="py-10 md:py-14"
          style={{ background: isSpecial ? specialMeta.gradient : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)" }}
        >
          <div className="container mx-auto px-4">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-white/70 mb-4" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-white flex items-center gap-1"><Home className="h-3 w-3" />Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/guides" className="hover:text-white">Guides</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-white font-medium">{displayName}</span>
            </nav>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{displayName}</h1>
            <p className="text-white/80 text-sm md:text-base max-w-xl">
              {isSpecial ? specialMeta.description : `All ${filtered.length} guides in ${displayName}`}
            </p>
            <Badge className="mt-3 bg-white/20 text-white border-0 text-sm">{filtered.length} guide{filtered.length !== 1 ? "s" : ""}</Badge>
          </div>
        </section>

        {/* Asia country sub-filters */}
        {slug === "asia" && (
          <section className="border-b border-border bg-card/80">
            <div className="container mx-auto px-4 py-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
                {COUNTRY_OPTIONS.map((c) => (
                  <FilterPill key={c} label={c} active={asiaCountries.has(c)} onClick={() => toggleCountry(c)} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Grid */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-4 space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /></div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No guides found in this category.</p>
                <Link to="/guides" className="text-primary text-sm hover:underline mt-2 inline-block">← Back to all guides</Link>
              </div>
            ) : (
              <>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visible.map((g: any) => (
                    <Link
                      key={g.id}
                      to={guideUrl(g.slug, g.topic_category)}
                      className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors"
                    >
                      {g.featured_image_url ? (
                        <div className="aspect-video overflow-hidden">
                          <img src={g.featured_image_url} alt={g.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      ) : <div className="aspect-video bg-muted" />}
                      <div className="p-4 space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>{g.difficulty}</Badge>}
                          {g.pillar && <Badge className={`${pillarColors[g.pillar] || "bg-primary"} text-white text-[10px]`}>{g.pillar}</Badge>}
                          {slug === "asia" && g.geo && <Badge className="bg-primary/15 text-primary text-[10px] border-0">{g.geo}</Badge>}
                          {slug === "platform" && g.primary_platform && <Badge className="bg-indigo-500 text-white text-[10px]">{g.primary_platform}</Badge>}
                        </div>
                        <h3 className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h3>
                        {g.excerpt && <p className="text-xs text-muted-foreground line-clamp-2">{g.excerpt}</p>}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || 5} min</span>
                          <span className="flex items-center gap-1 text-primary font-medium">Read <ArrowRight className="h-3 w-3" /></span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setVisibleCount((v) => v + ITEMS_PER_PAGE)}
                      className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Load more ({filtered.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default GuideCategoryIndex;
