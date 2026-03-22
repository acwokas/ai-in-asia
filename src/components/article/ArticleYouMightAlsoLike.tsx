import { Link } from "react-router-dom";
import { Clock, Calendar } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { getCategoryColor } from "@/lib/categoryColors";
import { memo } from "react";
import { useRelatedArticles } from "@/hooks/useRelatedArticles";

interface Props {
  articleId: string;
  categoryId?: string;
  categorySlug?: string;
  tags?: string[] | null;
  topicTags?: string[] | null;
  excludeIds?: string[];
}

const ArticleYouMightAlsoLike = memo(({ articleId, categoryId, categorySlug, tags, topicTags, excludeIds = [] }: Props) => {
  const { data: articles } = useRelatedArticles(categoryId, articleId, tags, topicTags, excludeIds);

  if (!articles || articles.length === 0) return null;

  return (
    <section style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid hsl(var(--border))" }}>
      <h2 className="text-xl font-semibold mb-5" style={{ fontFamily: "Poppins, sans-serif" }}>
        <span className="relative inline-block pb-1">
          You May Also Like
          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-full" />
        </span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {articles.map((a: any) => {
          const cat = a.categories;
          const catColor = getCategoryColor(cat?.slug);
          const slug = `/${cat?.slug || categorySlug || "news"}/${a.slug}`;
          const publishedDate = a.published_at
            ? new Date(a.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : null;

          return (
            <Link
              key={a.id}
              to={slug}
              className="group block rounded-lg overflow-hidden border border-border/40 shadow-md hover:scale-[1.02] transition-all duration-200"
              style={{ background: "hsl(var(--card))" }}
              onMouseDown={() => {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ event: "related_article_click", article_title: a.title, article_slug: a.slug });
              }}
            >
              <OptimizedImage
                src={a.featured_image_url}
                alt={a.title}
                categorySlug={cat?.slug}
                aspectRatio="16/9"
                className="w-full rounded-t-lg group-hover:scale-[1.03] transition-transform duration-500"
              />
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
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                  {publishedDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      {publishedDate}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    {a.reading_time_minutes || 5} min
                  </span>
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
