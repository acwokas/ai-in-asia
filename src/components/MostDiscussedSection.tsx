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

      const { data: realComments } = await supabase
        .from("comments_public")
        .select("article_id, content, author_name, created_at")
        .gte("created_at", weekAgoISO)
        .eq("approved", true);

      const { data: aiComments } = await supabase
        .from("ai_generated_comments")
        .select("article_id, content, created_at")
        .gte("created_at", weekAgoISO)
        .eq("published", true);

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

      const topArticleIds = [...commentMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4)
        .map(([id]) => id);

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
    <section className="container mx-auto px-4">
      <div className="max-w-3xl mx-auto lg:max-w-none">
        <div className="mb-8">
          <h2 className="headline text-[22px] md:text-[28px] font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            Most Discussed
          </h2>
          <p className="text-[13px] text-muted-foreground/60 mt-1">This week</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {articles.map((article, index) => {
            const categorySlug = article.categories?.slug || "news";
            const isTop = index === 0;
            return (
              <Link
                key={article.id}
                to={`/${categorySlug}/${article.slug}`}
                className={`group block border border-border rounded-lg hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 bg-card relative overflow-hidden ${
                  isTop ? 'p-6 sm:col-span-2 lg:col-span-1' : 'p-5'
                }`}
              >
                {/* Ranking number */}
                <span className="text-[28px] md:text-[32px] font-bold text-primary/80 leading-none absolute top-3 right-4 select-none">
                  {index + 1}
                </span>

                <div className="flex items-center gap-2 mb-3 pr-8">
                  {article.categories && (
                    <Badge variant="secondary" className="text-xs">
                      {article.categories.name}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-primary ml-auto mr-6">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {article.totalComments}
                  </span>
                </div>

                <h3 className={`font-semibold line-clamp-2 mb-3 group-hover:text-primary transition-colors leading-[1.3] ${
                  isTop ? 'text-lg md:text-xl' : 'text-[15px]'
                }`}>
                  {article.title}
                </h3>

                {article.latestComment && (
                  <div className="border-t border-border/50 pt-3 mt-auto">
                    <p className="text-[13px] text-muted-foreground/60 line-clamp-2 italic leading-[1.5]">
                      "{article.latestComment.content.slice(0, 100)}
                      {article.latestComment.content.length > 100 ? "…" : ""}"
                    </p>
                    <p className="text-[12px] text-muted-foreground/50 mt-1">
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
