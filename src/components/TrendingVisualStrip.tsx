import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Flame, BookOpen } from "lucide-react";
import { getOptimizedThumbnail } from "@/lib/imageOptimization";
import { getCategoryColor } from "@/lib/categoryColors";

type CombinedItem =
  | { type: "article"; id: string; title: string; slug: string; featured_image_url: string | null; categories: { name: string; slug: string } | null }
  | { type: "guide"; id: string; title: string; slug: string; featured_image_url: string | null };

const ASIAN_KEYWORDS = [
  "singapore", "malaysia", "thailand", "vietnam", "indonesia", "philippines",
  "japan", "korea", "china", "india", "hong-kong", "taiwan", "bahasa", "halal",
  "hdb", "bto", "cpf", "iras", "ns-national",
];

function pickDailyGuides(allGuides: { id: string; title: string; slug: string; featured_image_url: string | null }[]): typeof allGuides {
  if (!allGuides.length) return [];
  const today = new Date().toISOString().slice(0, 10);
  let seed = 0;
  for (let i = 0; i < today.length; i++) seed = ((seed << 5) - seed + today.charCodeAt(i)) | 0;
  seed = Math.abs(seed);

  const asianGuides = allGuides.filter((g) => ASIAN_KEYWORDS.some((kw) => g.slug.includes(kw)));
  const generalGuides = allGuides.filter((g) => !ASIAN_KEYWORDS.some((kw) => g.slug.includes(kw)));

  const asianPick = asianGuides.length ? asianGuides[seed % asianGuides.length] : null;
  const generalPick = generalGuides.length ? generalGuides[(seed + 7) % generalGuides.length] : null;

  return [asianPick, generalPick].filter(Boolean) as typeof allGuides;
}

interface TrendingVisualStripProps {
  excludeIds?: string[];
}

const TrendingVisualStrip = memo(({ excludeIds = [] }: TrendingVisualStripProps) => {
  const excludeSet = new Set(excludeIds);

  const { data: articles } = useQuery({
    queryKey: ["trending-visual-strip"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, featured_image_url, trending_score, categories:primary_category_id(name, slug)")
        .eq("status", "published")
        .eq("is_trending", true)
        .order("trending_score", { ascending: false, nullsFirst: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: guides } = useQuery({
    queryKey: ["trending-strip-guides"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, featured_image_url, topic_category")
        .eq("status", "published")
        .not("featured_image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return pickDailyGuides(data || []);
    },
  });

  const { data: refreshTimestamp } = useQuery({
    queryKey: ["trending-refresh-timestamp"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_trending_refresh_timestamp");
      if (error) throw error;
      return data as string | null;
    },
  });

  const filteredArticles = articles?.filter(a => !excludeSet.has(a.id)) || [];
  if (!filteredArticles.length) return null;

  // Build combined 6-item array: articles at 0,2,3,5 — guides at 1,4
  const combined: CombinedItem[] = [];
  const arts = filteredArticles.slice(0, 4);
  const gds = [...(guides || [])];
  let ai = 0;
  let gi = 0;
  for (let pos = 0; pos < 6; pos++) {
    if ((pos === 1 || pos === 4) && gi < gds.length) {
      combined.push({ type: "guide", ...gds[gi++] });
    } else if (ai < arts.length) {
      combined.push({ type: "article", ...arts[ai++] });
    }
  }

  return (
    <section className="container mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-1.5 font-bold text-[16px] text-primary">
          <Flame className="h-4 w-4" />
          Trending
        </span>
      </div>

      {/* Cards row — horizontal scroll on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-6 md:overflow-visible md:pb-0">
        {combined.map((item) => {
          if (item.type === "guide") {
            return (
              <Link
                key={`guide-${item.id}`}
                to={`/guides/${((item as any).topic_category || "general").toLowerCase().replace(/\s+/g, "-")}/${item.slug}`}
                className="group flex-shrink-0 w-[160px] md:w-auto snap-start rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "hsl(215 35% 12%)",
                  border: "1px solid hsl(0 0% 100% / 0.06)",
                }}
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={getOptimizedThumbnail(item.featured_image_url || "/placeholder.svg", 320, 200)}
                    alt={item.title}
                    width={320}
                    height={200}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="p-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-emerald-400 flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    Guide
                  </span>
                  <h3 className="text-[14px] font-medium leading-snug text-white line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                  </h3>
                </div>
              </Link>
            );
          }

          const catSlug = item.categories?.slug || "news";
          const catName = item.categories?.name || "News";
          const catColor = getCategoryColor(catSlug);

          return (
            <Link
              key={`article-${item.id}`}
              to={`/${catSlug}/${item.slug}`}
              className="group flex-shrink-0 w-[160px] md:w-auto snap-start rounded-lg overflow-hidden transition-all duration-200 hover:-translate-y-1"
              style={{
                background: "hsl(215 35% 12%)",
                border: "1px solid hsl(0 0% 100% / 0.06)",
              }}
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={getOptimizedThumbnail(item.featured_image_url || "/placeholder.svg", 320, 200)}
                  alt={item.title}
                  width={320}
                  height={200}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-2.5">
                <span
                  className="text-[11px] font-bold uppercase tracking-wider block mb-1"
                  style={{ color: catColor }}
                >
                  {catName}
                </span>
                <h3 className="text-[14px] font-medium leading-snug text-white line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Trending refreshed timestamp */}
      {refreshTimestamp && (
        <p className="text-muted-foreground text-xs mt-2 text-right">
          Trending refreshed: {new Date(refreshTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}
    </section>
  );
});

TrendingVisualStrip.displayName = "TrendingVisualStrip";
export default TrendingVisualStrip;
