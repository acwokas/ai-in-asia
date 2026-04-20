import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { getOptimizedThumbnail } from "@/lib/imageOptimization";
import { getCategoryColor } from "@/lib/categoryColors";

/* ── category pills ────────────────────────────────────────────────── */

const CATEGORIES = [
  { label: "All", slug: "all" },
  { label: "News", slug: "news" },
  { label: "Business", slug: "business" },
  { label: "Life", slug: "life" },
  { label: "Learn", slug: "learn" },
  { label: "Create", slug: "create" },
  { label: "Voices", slug: "voices" },
] as const;

type FilterPillProps = {
  label: string;
  slug: string;
  active: boolean;
  onClick: () => void;
};

const FilterPill = ({ label, slug, active, onClick }: FilterPillProps) => {
  const color = slug === "all" ? "#6b7280" : getCategoryColor(slug);
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap"
      style={
        active
          ? { backgroundColor: color, color: "#fff", borderColor: color }
          : { backgroundColor: "transparent", color, borderColor: color + "55" }
      }
    >
      {label}
    </button>
  );
};

/* ── article card ──────────────────────────────────────────────────── */

const ArticleCard = ({ article }: { article: any }) => {
  const catSlug = article.categories?.slug;
  const catColor = getCategoryColor(catSlug);

  return (
    <Link
      to={`/${catSlug || "news"}/${article.slug}`}
      className="group block rounded-lg overflow-hidden border border-border hover:-translate-y-1 hover:shadow-lg transition-all duration-300 h-full"
      style={{ borderTop: `3px solid ${catColor}` }}
    >
      <div className="relative overflow-hidden h-[180px]">
        <img
          src={getOptimizedThumbnail(
            article.featured_image_url || "/placeholder.svg",
            400,
            225
          )}
          alt={article.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        {article.is_trending && (
          <Badge className="absolute top-3 left-3 bg-orange-500 text-white flex items-center gap-1 text-xs">
            <TrendingUp className="h-3 w-3" />
            Trending
          </Badge>
        )}
      </div>

      <div className="p-4">
        <span
          className="text-[13px] font-bold uppercase tracking-wider mb-2 block"
          style={{ color: catColor }}
        >
          {article.categories?.name || "Uncategorized"}
        </span>
        <h3 className="font-bold text-[16px] md:text-[17px] leading-[1.25] line-clamp-2 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mt-2">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground mt-3">
          {article.authors?.name && <span>{article.authors.name}</span>}
          {article.authors?.name && article.published_at && <span>•</span>}
          {article.published_at && (
            <span>
              {new Date(article.published_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          <span>•</span>
          <span>{article.reading_time_minutes || 5} min read</span>
        </div>
      </div>
    </Link>
  );
};

/* ── skeleton loader ───────────────────────────────────────────────── */

const CardSkeleton = () => (
  <div className="rounded-lg overflow-hidden border border-border/30">
    <Skeleton className="h-[180px] w-full" />
    <div className="p-4 space-y-2.5">
      <Skeleton className="h-2.5 w-14 rounded-sm" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="w-5 h-5 rounded-full" />
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-2.5 w-1" />
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-2.5 w-1" />
        <Skeleton className="h-2.5 w-14" />
      </div>
    </div>
  </div>
);

/* ── main page ─────────────────────────────────────────────────────── */

const ArticlesFeed = () => {
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(
          `id, title, slug, excerpt, featured_image_url, reading_time_minutes,
           published_at, is_trending, primary_category_id,
           authors:author_id (name, slug),
           categories:primary_category_id (name, slug)`
        )
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(60);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const filtered = useMemo(() => {
    if (!articles) return [];
    if (activeCategory === "all") return articles;
    return articles.filter(
      (a: any) =>
        a.categories?.slug?.toLowerCase() === activeCategory
    );
  }, [articles, activeCategory]);

  return (
    <>
      <SEOHead
        title="Latest Articles | AIinASIA"
        description="Browse the latest AI news, business insights, lifestyle guides, and more from across Asia."
        canonical="https://aiinasia.com/articles"
      />
      <Header />

      {/* Hero / page header */}
      <section className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <h1 className="headline text-3xl md:text-4xl mb-2">
            Latest Articles
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
            Stay up to date with AI developments across Asia - news, business,
            lifestyle and more.
          </p>
        </div>
      </section>

      {/* Category filter pills */}
      <section className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
            {CATEGORIES.map((cat) => (
              <FilterPill
                key={cat.slug}
                label={cat.label}
                slug={cat.slug}
                active={activeCategory === cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Articles grid */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            <p className="text-lg">No articles found in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((article: any) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
};

export default ArticlesFeed;
