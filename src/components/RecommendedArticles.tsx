import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ArticleCard from "./ArticleCard";
import { Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getOptimizedThumbnail } from "@/lib/imageOptimization";

interface RecommendedArticlesProps {
  excludeIds?: string[];
}

const RecommendedArticles = ({ excludeIds = [] }: RecommendedArticlesProps) => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["you-may-like-articles", excludeIds],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image_url,
          reading_time_minutes,
          comment_count,
          published_at,
          is_trending,
          authors:author_id (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });

      if (excludeIds.length > 0) {
        query = query.not("id", "in", `(${excludeIds.join(",")})`);
      }

      const { data, error } = await query.limit(6);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <h2 className="text-2xl font-bold">Loading articles...</h2>
        </div>
      </section>
    );
  }

  if (!articles || articles.length === 0) {
    return null;
  }

  const featuredArticle = articles[0] as any;
  const restArticles = articles.slice(1) as any[];

  return (
    <section className="container mx-auto px-4">
      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-[22px] md:text-[28px] font-bold">You May Like</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Featured recommended pick — wider first card */}
        <div className="lg:col-span-5">
          <Link
            to={`/${featuredArticle.categories?.slug || 'news'}/${featuredArticle.slug}`}
            className="group block border border-border rounded-lg overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-card h-full"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={getOptimizedThumbnail(featuredArticle.featured_image_url || "/placeholder.svg", 640, 400)}
                alt={featuredArticle.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-semibold">
                Recommended
              </Badge>
            </div>
            <div className="p-6">
              <span className="text-[13px] font-bold uppercase tracking-wider text-primary mb-2 block">
                {featuredArticle.categories?.name || "Uncategorized"}
              </span>
              <h3 className="font-semibold text-xl md:text-2xl leading-[1.25] line-clamp-2 group-hover:text-primary transition-colors">
                {featuredArticle.title}
              </h3>
              {featuredArticle.excerpt && (
                <p className="text-muted-foreground/70 text-[15px] leading-[1.6] line-clamp-2 mt-2">
                  {featuredArticle.excerpt}
                </p>
              )}
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground/60 mt-3">
                {featuredArticle.authors?.name && <span>{featuredArticle.authors.name}</span>}
                {featuredArticle.authors?.name && featuredArticle.published_at && <span>•</span>}
                {featuredArticle.published_at && (
                  <span>{new Date(featuredArticle.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                )}
                <span>•</span>
                <span>{featuredArticle.reading_time_minutes || 5} min read</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Remaining articles */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {restArticles.map((article: any) => (
            <ArticleCard
              key={article.id}
              title={article.title}
              excerpt={article.excerpt || ""}
              category={article.categories?.name || ""}
              categorySlug={article.categories?.slug || "uncategorized"}
              author={article.authors?.name || "Intelligence Desk"}
              readTime={`${article.reading_time_minutes || 5} min read`}
              image={article.featured_image_url || ""}
              slug={article.slug}
              isTrending={article.is_trending || false}
              commentCount={article.comment_count || 0}
              publishedAt={article.published_at}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default memo(RecommendedArticles);
