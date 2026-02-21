import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import ArticleCard from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";

interface ForYouSectionProps {
  excludeIds?: string[];
}

const ForYouSection = memo(({ excludeIds = [] }: ForYouSectionProps) => {
  const { user } = useAuth();

  // Fetch user interests
  const { data: interests } = useQuery({
    queryKey: ["user-interests", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", user!.id)
        .maybeSingle();
      return data?.interests || [];
    },
  });

  // Fetch reading history IDs to exclude
  const { data: readArticleIds } = useQuery({
    queryKey: ["read-article-ids", user?.id],
    enabled: !!user?.id && !!interests && interests.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("reading_history")
        .select("article_id")
        .eq("user_id", user!.id);
      return (data || []).map(r => r.article_id);
    },
  });

  // Fetch recommended articles based on interests
  const { data: articles } = useQuery({
    queryKey: ["for-you-articles", user?.id, interests, readArticleIds],
    enabled: !!interests && interests.length > 0 && readArticleIds !== undefined,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("articles")
        .select(`
          id, title, slug, excerpt, featured_image_url,
          reading_time_minutes, published_at, comment_count,
          ai_tags,
          authors:author_id (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .gte("published_at", thirtyDaysAgo.toISOString())
        .overlaps("ai_tags", interests!)
        .order("published_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      if (!data) return [];

      // Filter out already-read and excluded articles
      const allExclude = new Set([...excludeIds, ...(readArticleIds || [])]);
      return data.filter(a => !allExclude.has(a.id)).slice(0, 6);
    },
  });

  if (!user) return null;

  // User has no interests set — show prompt
  if (interests && interests.length === 0) {
    return (
      <section className="container mx-auto px-4 py-8">
        <div className="bg-muted/30 border border-border rounded-lg p-6 text-center">
          <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Set your interests to get personalised recommendations
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/profile?tab=account">Set Interests</Link>
          </Button>
        </div>
      </section>
    );
  }

  // No matching articles — fail silently
  if (!articles || articles.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="headline text-2xl">Recommended For You</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article: any) => (
          <ArticleCard
            key={article.id}
            title={article.title}
            excerpt={article.excerpt || ""}
            category={article.categories?.name || "Uncategorized"}
            categorySlug={article.categories?.slug || "news"}
            author={article.authors?.name || "AI in ASIA"}
            readTime={`${article.reading_time_minutes || 5} min read`}
            image={article.featured_image_url || "/placeholder.svg"}
            slug={article.slug}
            commentCount={article.comment_count || 0}
            publishedAt={article.published_at}
          />
        ))}
      </div>
    </section>
  );
});

ForYouSection.displayName = "ForYouSection";

export default ForYouSection;
