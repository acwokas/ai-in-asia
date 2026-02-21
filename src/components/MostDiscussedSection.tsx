import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MostDiscussedArticle {
  id: string;
  title: string;
  slug: string;
  categories: { name: string; slug: string } | null;
  totalComments: number;
  latestComment: { content: string; author_name: string } | null;
}

export default function MostDiscussedSection() {
  const { data: articles } = useQuery({
    queryKey: ["most-discussed-this-week"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekAgoISO = oneWeekAgo.toISOString();

      // Get real comments from last 7 days grouped by article
      const { data: realComments } = await supabase
        .from("comments_public")
        .select("article_id, content, author_name, created_at")
        .gte("created_at", weekAgoISO)
        .eq("approved", true);

      // Get published AI comments from last 7 days
      const { data: aiComments } = await supabase
        .from("ai_generated_comments")
        .select("article_id, content, created_at")
        .gte("created_at", weekAgoISO)
        .eq("published", true);

      // Count comments per article
      const commentMap = new Map<string, { count: number; latest: { content: string; author_name: string; created_at: string } | null }>();

      for (const c of realComments || []) {
        const existing = commentMap.get(c.article_id) || { count: 0, latest: null };
        existing.count++;
        if (!existing.latest || c.created_at > existing.latest.created_at) {
          existing.latest = { content: c.content, author_name: c.author_name || "Reader", created_at: c.created_at };
        }
        commentMap.set(c.article_id, existing);
      }

      for (const c of aiComments || []) {
        const existing = commentMap.get(c.article_id) || { count: 0, latest: null };
        existing.count++;
        if (!existing.latest || c.created_at > existing.latest.created_at) {
          existing.latest = { content: c.content, author_name: "Community", created_at: c.created_at };
        }
        commentMap.set(c.article_id, existing);
      }

      if (commentMap.size === 0) return [];

      // Sort by count, take top 4
      const topArticleIds = [...commentMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4)
        .map(([id]) => id);

      // Fetch article details
      const { data: articleData } = await supabase
        .from("articles")
        .select("id, title, slug, categories:primary_category_id (name, slug)")
        .in("id", topArticleIds)
        .eq("status", "published");

      if (!articleData) return [];

      return topArticleIds
        .map((id) => {
          const article = articleData.find((a) => a.id === id);
          if (!article) return null;
          const stats = commentMap.get(id)!;
          return {
            id: article.id,
            title: article.title,
            slug: article.slug,
            categories: article.categories as any,
            totalComments: stats.count,
            latestComment: stats.latest ? { content: stats.latest.content, author_name: stats.latest.author_name } : null,
          } as MostDiscussedArticle;
        })
        .filter(Boolean) as MostDiscussedArticle[];
    },
  });

  if (!articles || articles.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto lg:max-w-none">
        <div className="mb-6">
          <h2 className="headline text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Most Discussed
          </h2>
          <p className="text-sm text-muted-foreground mt-1">This week</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {articles.map((article) => {
            const categorySlug = article.categories?.slug || "news";
            return (
              <Link
                key={article.id}
                to={`/${categorySlug}/${article.slug}`}
                className="block border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/30 transition-all duration-300 bg-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  {article.categories && (
                    <Badge variant="secondary" className="text-xs">
                      {article.categories.name}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-xs font-medium text-primary ml-auto">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {article.totalComments}
                  </span>
                </div>

                <h3 className="font-semibold text-sm line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                  {article.title}
                </h3>

                {article.latestComment && (
                  <div className="border-t border-border pt-2 mt-auto">
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      "{article.latestComment.content.slice(0, 100)}
                      {article.latestComment.content.length > 100 ? "…" : ""}"
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      — {article.latestComment.author_name}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
