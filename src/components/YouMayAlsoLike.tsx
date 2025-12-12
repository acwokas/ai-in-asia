import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ArticleCard from "./ArticleCard";
import { Loader2 } from "lucide-react";
import { memo, Fragment } from "react";
import { MPUAd } from "./GoogleAds";

interface YouMayAlsoLikeProps {
  excludeIds?: string[];
  skipCount?: number;
}

const YouMayAlsoLikeComponent = ({ excludeIds = [], skipCount = 0 }: YouMayAlsoLikeProps) => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["you-may-also-like", excludeIds, skipCount],
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
          primary_category_id,
          comment_count,
          published_at,
          is_trending,
          authors:author_id (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });

      // Exclude articles already shown in previous sections
      if (excludeIds.length > 0) {
        query = query.not("id", "in", `(${excludeIds.join(",")})`);
      }

      // Skip articles already shown in "You May Like" section
      if (skipCount > 0) {
        query = query.range(skipCount, skipCount + 12);
      } else {
        query = query.limit(13);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <h2 className="headline text-3xl mb-8">You May Also Like</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 py-12">
      <h2 className="headline text-3xl mb-8">You May Also Like</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {articles.map((article, index) => (
          <Fragment key={article.id}>
            <ArticleCard
              title={article.title}
              excerpt={article.excerpt || ""}
              category={article.categories?.name || "Uncategorized"}
              categorySlug={article.categories?.slug || "news"}
              author={article.authors?.name || "Intelligence Desk"}
              readTime={`${article.reading_time_minutes || 5} min read`}
              image={article.featured_image_url || "/placeholder.svg"}
              slug={article.slug}
              isTrending={article.is_trending || false}
              commentCount={article.comment_count || 0}
              publishedAt={article.published_at}
            />
            {index === 6 && (
              <div className="flex items-center justify-center">
                <MPUAd />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
};

// Memoized and exported as default
const YouMayAlsoLike = memo(YouMayAlsoLikeComponent);

export default YouMayAlsoLike;
