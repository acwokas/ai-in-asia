import { memo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Sparkles, Bookmark, X } from "lucide-react";
import ArticleCard from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "unread_bookmarks_nudge_dismissed";

interface ForYouSectionProps {
  excludeIds?: string[];
}

const ForYouSection = memo(({ excludeIds = [] }: ForYouSectionProps) => {
  const { user } = useAuth();
  const [bookmarksDismissed, setBookmarksDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "1"
  );

  // Fetch unread bookmarks count
  const { data: unreadCount } = useQuery({
    queryKey: ["unread-bookmarks-count", user?.id],
    enabled: !!user?.id && !bookmarksDismissed,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("article_id")
        .eq("user_id", user!.id);
      if (!bookmarks?.length) return 0;
      const articleIds = bookmarks.map((b) => b.article_id);
      const { data: readArticles } = await supabase
        .from("reading_history")
        .select("article_id")
        .eq("user_id", user!.id)
        .in("article_id", articleIds);
      const readSet = new Set((readArticles || []).map((r) => r.article_id));
      return articleIds.filter((id) => !readSet.has(id)).length;
    },
  });

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

      const allExclude = new Set([...excludeIds, ...(readArticleIds || [])]);
      return data.filter(a => !allExclude.has(a.id)).slice(0, 6);
    },
  });

  if (!user) return null;

  const handleDismissBookmarks = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setBookmarksDismissed(true);
  };

  // Show bookmarks nudge even without interest-based articles
  const showBookmarksNudge = !bookmarksDismissed && !!unreadCount && unreadCount > 0;

  // User has no interests set — show prompt (with optional bookmarks nudge)
  if (interests && interests.length === 0) {
    return (
      <section className="container mx-auto px-4 py-12 md:py-16">
        {showBookmarksNudge && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-accent/30 px-4 py-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Bookmark className="h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground truncate">
                You have <span className="font-medium text-foreground">{unreadCount}</span> saved article{unreadCount !== 1 ? "s" : ""} waiting
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" asChild>
                <Link to="/saved">Read Now</Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDismissBookmarks} aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
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

  // No matching articles — still show bookmarks nudge if applicable
  if (!articles || articles.length === 0) {
    if (!showBookmarksNudge) return null;
    return (
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-accent/30 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Bookmark className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground truncate">
              You have <span className="font-medium text-foreground">{unreadCount}</span> saved article{unreadCount !== 1 ? "s" : ""} waiting
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link to="/saved">Read Now</Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDismissBookmarks} aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      {/* Unread Bookmarks Nudge - folded in as a small banner */}
      {showBookmarksNudge && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-accent/30 px-4 py-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <Bookmark className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground truncate">
              You have <span className="font-medium text-foreground">{unreadCount}</span> saved article{unreadCount !== 1 ? "s" : ""} waiting
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link to="/saved">Read Now</Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDismissBookmarks} aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

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
