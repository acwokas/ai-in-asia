import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ArticleFallbackImage } from "@/components/ui/ArticleFallbackImage";
import { getCategoryColor } from "@/lib/categoryColors";

interface MidArticleRelatedProps {
  currentArticleId: string;
  categoryId: string;
  categorySlug: string;
}

const MidArticleRelated = ({ currentArticleId, categoryId, categorySlug }: MidArticleRelatedProps) => {
  const { data: relatedArticles } = useQuery({
    queryKey: ["mid-article-related", currentArticleId, categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          featured_image_url,
          reading_time_minutes,
          categories:primary_category_id (name, slug)
        `)
        .eq("primary_category_id", categoryId)
        .eq("status", "published")
        .neq("id", currentArticleId)
        .order("published_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  if (!relatedArticles || relatedArticles.length === 0) return null;

  return (
    <aside className="not-prose my-10 rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        You might also like
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        {relatedArticles.map((article) => {
          const catSlug = (article.categories as any)?.slug || categorySlug;
          const catName = (article.categories as any)?.name || catSlug;
          const catColor = getCategoryColor(catSlug);

          return (
            <Link
              key={article.id}
              to={`/${catSlug}/${article.slug}`}
              className="group flex sm:flex-col gap-3 sm:gap-0 flex-1 rounded-lg overflow-hidden border border-border/50 hover:border-primary/30 transition-colors bg-background/50"
            >
              <div className="w-24 h-20 sm:w-full sm:h-28 flex-shrink-0 overflow-hidden">
                <ArticleFallbackImage
                  src={article.featured_image_url}
                  alt={article.title}
                  categorySlug={catSlug}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  width={400}
                  height={225}
                />
              </div>
              <div className="flex flex-col justify-center sm:p-3 pr-3 py-2 min-w-0">
                <Badge
                  variant="outline"
                  className="w-fit text-[10px] mb-1.5 border-0 px-1.5 py-0"
                  style={{ color: catColor, backgroundColor: `${catColor}15` }}
                >
                  {catName}
                </Badge>
                <h4 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h4>
                {article.reading_time_minutes && (
                  <span className="text-xs text-muted-foreground mt-1">
                    {article.reading_time_minutes} min read
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};

export default MidArticleRelated;
