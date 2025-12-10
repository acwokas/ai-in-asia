import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ArticleCard from "./ArticleCard";
import { Sparkles, Loader2 } from "lucide-react";

const RecommendedArticles = () => {
  const { user } = useAuth();

  // Fetch personalized recommendations for logged-in users
  const { data: recommendations, isLoading: isLoadingRecommendations } = useQuery({
    queryKey: ["recommendations", user?.id],
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes - recommendations relatively static
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-recommendations", {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;
      return data;
    },
  });

  // Fetch popular articles for non-logged-in users
  const { data: popularArticles, isLoading: isLoadingPopular } = useQuery({
    queryKey: ["popular-articles"],
    enabled: !user,
    staleTime: 15 * 60 * 1000, // 15 minutes - popular articles are stable
    queryFn: async () => {
      const { data, error } = await supabase
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
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data;
    },
  });

  const isLoading = user ? isLoadingRecommendations : isLoadingPopular;
  const articles = user ? recommendations?.recommendations : popularArticles;
  const title = user 
    ? (recommendations?.reason === "ai_personalized" 
        ? "Recommended For You" 
        : recommendations?.reason === "trending"
        ? "Trending Now"
        : "You Might Like")
    : "You Might Like";
  
  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <h2 className="text-2xl font-bold">Loading recommendations...</h2>
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
        <h2 className="text-2xl font-bold">{title}</h2>
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
