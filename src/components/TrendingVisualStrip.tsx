import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { getOptimizedThumbnail } from "@/lib/imageOptimization";
import { getCategoryColor } from "@/lib/categoryColors";

const TrendingVisualStrip = memo(() => {
  const { data: articles } = useQuery({
    queryKey: ["trending-visual-strip"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, featured_image_url, categories:primary_category_id(name, slug)")
        .eq("status", "published")
        .not("title", "ilike", "%3 Before 9%")
        .order("view_count", { ascending: false, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
  });

  if (!articles?.length) return null;

  return (
    <section className="container mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-1.5 font-bold text-[16px] text-primary">
          <Flame className="h-4 w-4" />
          Trending
        </span>
        {/* No "View all" — trending is curated, not a browsable category */}
      </div>

      {/* Cards row — horizontal scroll on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-6 md:overflow-visible md:pb-0">
        {articles.map((article) => {
          const catSlug = article.categories?.slug || "news";
          const catName = article.categories?.name || "News";
          const catColor = getCategoryColor(catSlug);

          return (
            <Link
              key={article.id}
              to={`/${catSlug}/${article.slug}`}
              className="group flex-shrink-0 w-[160px] md:w-auto snap-start rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-1"
              style={{
                background: "hsl(215 35% 12%)",
                border: "1px solid hsl(0 0% 100% / 0.06)",
              }}
            >
              {/* Thumbnail */}
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={getOptimizedThumbnail(article.featured_image_url || "/placeholder.svg", 320, 200)}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Info */}
              <div className="p-2.5">
                <span
                  className="text-[11px] font-bold uppercase tracking-wider block mb-1"
                  style={{ color: catColor }}
                >
                  {catName}
                </span>
                <h3 className="text-[14px] font-medium leading-snug text-white line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
});

TrendingVisualStrip.displayName = "TrendingVisualStrip";
export default TrendingVisualStrip;
