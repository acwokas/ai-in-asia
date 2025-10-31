import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ArticleCard from "./ArticleCard";
import { Loader2 } from "lucide-react";
import { memo, Fragment } from "react";
import { MPUAd } from "./GoogleAds";

const YouMayAlsoLikeComponent = () => {
  const { user } = useAuth();

  const { data: articles, isLoading } = useQuery({
    queryKey: ["you-may-also-like", user?.id],
    staleTime: 10 * 60 * 1000, // 10 minutes - "you may also like" relatively stable
    queryFn: async () => {
      let selectedArticles: any[] = [];

      if (user) {
        // For logged-in users, try to get articles based on their interests
        const { data: profile } = await supabase
          .from("profiles")
          .select("interests")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.interests && profile.interests.length > 0) {
          // Get categories matching user interests
          const { data: categories } = await supabase
            .from("categories")
            .select("id")
            .in("slug", profile.interests.map((i: string) => i.toLowerCase()));

          if (categories && categories.length > 0) {
            const categoryIds = categories.map((c) => c.id);
            
            // Get articles from user's interested categories - only needed fields
            const { data: interestedArticles } = await supabase
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
                authors (name, slug),
                categories:primary_category_id (name, slug)
              `)
              .eq("status", "published")
              .in("primary_category_id", categoryIds)
              .order("view_count", { ascending: false })
              .limit(13);

            if (interestedArticles && interestedArticles.length > 0) {
              selectedArticles = interestedArticles;
            }
          }
        }
      }

      // If no personalized articles or not logged in, get popular from each category
      if (selectedArticles.length === 0) {
        const mainCategories = ["news", "business", "life", "voices", "create", "learn"];
        
        // Get category IDs
        const { data: categories } = await supabase
          .from("categories")
          .select("id, slug")
          .in("slug", mainCategories);

        if (!categories) return [];

        const categoryMap = new Map(categories.map((c) => [c.slug, c.id]));
        
        // Get 2 popular articles from each category - optimized to only fetch needed fields
        const articlePromises = mainCategories.map(async (slug) => {
          const categoryId = categoryMap.get(slug);
          if (!categoryId) return [];

          const { data } = await supabase
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
              authors (name, slug),
              categories:primary_category_id (name, slug)
            `)
            .eq("status", "published")
            .eq("primary_category_id", categoryId)
            .order("view_count", { ascending: false })
            .limit(slug === "voices" ? 2 : 1);

          return data || [];
        });

        const results = await Promise.all(articlePromises);
        selectedArticles = results.flat();
      }

      // Ensure at least 2 Voices articles
      const voicesArticles = selectedArticles.filter(
        (a) => a.categories?.slug === "voices"
      );
      
      if (voicesArticles.length < 2) {
        // Get Voices category ID
        const { data: voicesCategory } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", "voices")
          .maybeSingle();

        if (voicesCategory) {
          const { data: additionalVoices } = await supabase
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
              authors (name, slug),
              categories:primary_category_id (name, slug)
            `)
            .eq("status", "published")
            .eq("primary_category_id", voicesCategory.id)
            .order("view_count", { ascending: false })
            .limit(2);

          if (additionalVoices) {
            // Remove existing voices articles and add the new ones
            selectedArticles = selectedArticles.filter(
              (a) => a.categories?.slug !== "voices"
            );
            selectedArticles = [...additionalVoices, ...selectedArticles];
          }
        }
      }

      // Return max 13 articles
      return selectedArticles.slice(0, 13);
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
              author={article.authors?.name || "Unknown"}
              readTime={`${article.reading_time_minutes || 5} min read`}
              image={article.featured_image_url || "/placeholder.svg"}
              slug={article.slug}
              commentCount={article.comment_count || 0}
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
