import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { MessageCircle, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MostDiscussedArticle {
  id: string;
  title: string;
  slug: string;
  categories: { name: string; slug: string } | null;
  totalComments: number;
  latestComment: { content: string; author_name: string } | null;
  hasRecentComment: boolean;
}

interface MostDiscussedSectionProps {
  excludeIds?: string[];
}

export default function MostDiscussedSection({ excludeIds = [] }: MostDiscussedSectionProps) {
  const { data: articles } = useQuery({
    queryKey: ["most-discussed-30d", excludeIds],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffISO = thirtyDaysAgo.toISOString();

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const recentCutoff = oneDayAgo.toISOString();

      const { data: realComments } = await supabase
        .from("comments_public")
        .select("article_id, content, author_name, created_at")
        .gte("created_at", cutoffISO)
        .eq("approved", true);

      const { data: aiComments } = await supabase
        .from("ai_generated_comments")
        .select("article_id, content, created_at")
        .gte("created_at", cutoffISO)
        .eq("published", true);

      const commentMap = new Map<string, { count: number; hasRecent: boolean; latest: { content: string; author_name: string; created_at: string } | null }>();

      for (const c of realComments || []) {
        const existing = commentMap.get(c.article_id) || { count: 0, hasRecent: false, latest: null };
        existing.count++;
        if (c.created_at >= recentCutoff) existing.hasRecent = true;
        if (!existing.latest || c.created_at > existing.latest.created_at) {
          existing.latest = { content: c.content, author_name: c.author_name || "Reader", created_at: c.created_at };
        }
        commentMap.set(c.article_id, existing);
      }

      for (const c of aiComments || []) {
        const existing = commentMap.get(c.article_id) || { count: 0, hasRecent: false, latest: null };
        existing.count++;
        if (c.created_at >= recentCutoff) existing.hasRecent = true;
        if (!existing.latest || c.created_at > existing.latest.created_at) {
          existing.latest = { content: c.content, author_name: "Community", created_at: c.created_at };
        }
        commentMap.set(c.article_id, existing);
      }

      if (commentMap.size === 0) return [];

      const excludeSet = new Set(excludeIds);
      const topArticleIds = [...commentMap.entries()]
        .filter(([id]) => !excludeSet.has(id))
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6)
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
            hasRecentComment: stats.hasRecent,
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
          <h2 className="headline text-[28px] md:text-[30px] font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-[hsl(var(--accent-amber,30_90%_50%))]" style={{ color: '#F28C0F' }} />
            Most Discussed
          </h2>
          <p className="text-[13px] text-muted-foreground/60 mt-1">Past 30 days</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {articles.map((article, index) => {
            const categorySlug = article.categories?.slug || "news";
            const isHot = article.totalComments > 10;
            return (
              <Link
                key={article.id}
                to={`/${categorySlug}/${article.slug}`}
                className={`group block border border-border rounded-lg hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 bg-card relative overflow-hidden p-5 ${
                  article.hasRecentComment ? 'animate-subtle-glow' : ''
                }`}
              >
                {/* Ranking number */}
                <span className="text-[28px] md:text-[32px] font-bold text-primary/80 leading-none absolute top-3 right-4 select-none">
                  {index + 1}
                </span>

                <div className="flex items-center gap-2 mb-3 pr-8 flex-wrap">
                  {article.categories && (
                    <Badge variant="secondary" className="text-xs">
                      {article.categories.name}
                    </Badge>
                  )}
                  {isHot && (
                    <Badge className="text-[10px] px-1.5 py-0 border-0 font-bold uppercase tracking-wide" style={{ backgroundColor: '#F28C0F', color: '#fff' }}>
                      <Flame className="h-3 w-3 mr-0.5 inline" />
                      Hot
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-primary ml-auto mr-6">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {article.totalComments}
                  </span>
                </div>

                <h3 className="font-semibold text-[15px] line-clamp-2 mb-3 group-hover:text-primary transition-colors leading-[1.3]">
                  {article.title}
                </h3>

                {article.latestComment && (
                  <div className="border-t border-border/50 pt-3 mt-auto">
                    <p className="text-[13px] text-muted-foreground/60 line-clamp-2 italic leading-[1.5]">
                      "{article.latestComment.content.slice(0, 80)}
                      {article.latestComment.content.length > 80 ? "…" : ""}"
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
