import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { getCategoryColor } from "@/lib/categoryColors";
import { memo } from "react";

interface Props {
  articleId: string;
  categoryId?: string;
  categorySlug?: string;
  tags?: string[] | null;
  topicTags?: string[] | null;
  excludeIds?: string[];
}

const ArticleYouMightAlsoLike = memo(({ articleId, categoryId, categorySlug, tags, topicTags, excludeIds = [] }: Props) => {
  const allTags = [...(tags || []), ...(topicTags || [])].map(t => t.toLowerCase());

  const { data: articles } = useQuery({
    queryKey: ["you-might-also-like", articleId, categoryId],
    staleTime: 5 * 60 * 1000,
    enabled: !!articleId,
    queryFn: async () => {
      // Fetch candidates from same category
      let query = supabase
        .from("articles")
        .select("id, title, slug, excerpt, featured_image_url, reading_time_minutes, published_at, ai_tags, topic_tags, categories:primary_category_id(name, slug)")
        .eq("status", "published")
        .neq("id", articleId)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(30);

      if (categoryId) {
        query = query.eq("primary_category_id", categoryId);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      const allExclude = new Set([articleId, ...excludeIds]);
      const candidates = data.filter(a => !allExclude.has(a.id));

      if (allTags.length === 0) {
        return candidates.slice(0, 4);
      }

      // Score by shared tags
      const scored = candidates.map(a => {
        const aTags = [...(a.ai_tags || []), ...(a.topic_tags || [])].map(t => t.toLowerCase());
        const shared = allTags.filter(t => aTags.includes(t)).length;
        return { ...a, score: shared };
      });

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
      });

      return scored.slice(0, 4);
    },
  });

  if (!articles || articles.length === 0) return null;

  return (
    <section style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid hsl(var(--border))" }}>
      <h2 className="text-xl font-semibold mb-5" style={{ fontFamily: "Poppins, sans-serif" }}>
        You Might Also Like
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {articles.map((a: any) => {
          const cat = a.categories;
          const catColor = getCategoryColor(cat?.slug);
          const slug = `/${cat?.slug || categorySlug || "news"}/${a.slug}`;

          return (
            <Link
              key={a.id}
              to={slug}
              className="group block rounded-lg overflow-hidden border border-border/40 hover:-translate-y-0.5 transition-all duration-200"
              style={{ background: "hsl(var(--card))" }}
            >
              {a.featured_image_url && (
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={a.featured_image_url}
                    alt={a.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-4">
                <span
                  className="inline-block px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider rounded-full mb-2"
                  style={{ backgroundColor: catColor, color: "#fff" }}
                >
                  {cat?.name || "Article"}
                </span>
                <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {a.title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                </h3>
                {a.excerpt && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{a.excerpt}</p>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>{a.reading_time_minutes || 5} min read</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
});

ArticleYouMightAlsoLike.displayName = "ArticleYouMightAlsoLike";
export default ArticleYouMightAlsoLike;
