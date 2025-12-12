import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ArticleCard from "./ArticleCard";
import { Sparkles, Loader2 } from "lucide-react";

interface RecommendedArticlesProps {
  excludeIds?: string[];
}

const RecommendedArticles = ({ excludeIds = [] }: RecommendedArticlesProps) => {
  // Fetch next most recent articles after those in hero/latest sections
  const { data: articles, isLoading } = useQuery({
    queryKey: ["you-may-like-articles", excludeIds],
    staleTime: 5 * 60 * 1000, // 5 minutes
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

      // Exclude articles already shown in hero/latest
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
      <section className="container mx-auto px-4 py-12">
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

  return (
    <section className="container mx-auto px-4 py-12 bg-muted/30">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">You May Like</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article: any) => (
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
    </section>
  );
};

export default memo(RecommendedArticles);
