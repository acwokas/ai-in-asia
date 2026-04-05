import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { User, BookOpen, ArrowRight, FileText } from "lucide-react";

export const VoicesFeaturedSpotlight = ({ categoryId }: { categoryId: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["voices-featured-spotlight", categoryId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data: articleCats, error } = await supabase
        .from("article_categories")
        .select(`articles!inner (id, slug, title, excerpt, featured_image_url, published_at, reading_time_minutes, authors:authors_public!articles_author_id_fkey (id, name, slug, avatar_url, bio, job_title, article_count), categories:primary_category_id (slug))`)
        .eq("category_id", categoryId)
        .eq("articles.status", "published");

      if (error) throw error;

      const articles = (articleCats || [])
        .map((ac: any) => ac.articles)
        .filter((a: any) => a?.authors?.name && a.authors.name !== "Intelligence Desk");

      const authorMap = new Map<string, { author: any; articles: any[]; count: number }>();
      for (const a of articles) {
        const authorId = a.authors?.id;
        if (!authorId) continue;
        if (!authorMap.has(authorId)) {
          authorMap.set(authorId, { author: a.authors, articles: [], count: 0 });
        }
        const entry = authorMap.get(authorId)!;
        entry.count++;
        entry.articles.push(a);
      }

      // Sort each author's articles by published_at descending, keep top 3
      for (const entry of authorMap.values()) {
        entry.articles.sort((a: any, b: any) =>
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        );
        entry.articles = entry.articles.slice(0, 3);
      }

      const sorted = [...authorMap.values()].sort((a, b) => b.count - a.count);
      return sorted[0] || null;
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (!data) return null;

  const { author, articles, count } = data;
  const expertiseTags = ["AI Commentary", "Thought Leadership", "Asia-Pacific"];

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5 text-amber-500" />
        <h2 className="font-display text-lg font-bold text-foreground">Featured Voice</h2>
      </div>
      <div className="rounded-2xl border border-amber-500/30 bg-gray-800/60 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 p-6">
          <div className="flex flex-col items-center md:items-start gap-3 md:w-60 shrink-0">
            {author.avatar_url ? (
              <img
                src={author.avatar_url}
                alt={author.name}
                className="w-24 h-24 rounded-full object-cover border-3 border-amber-500/40 shadow-lg shadow-amber-500/10"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center border-2 border-amber-500/30">
                <User className="h-10 w-10 text-amber-500" />
              </div>
            )}
            <div className="text-center md:text-left">
              <h3 className="font-display text-lg font-bold text-white">{author.name}</h3>
              {author.job_title && (
                <p className="text-sm text-gray-400 mt-0.5">{author.job_title}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FileText className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-white">{count}</span> articles published
            </div>
            <div className="flex flex-wrap gap-1.5">
              {expertiseTags.map((tag) => (
                <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25">
                  {tag}
                </span>
              ))}
            </div>
            {author.bio && (
              <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
                {author.bio}
              </p>
            )}
            <Link
              to={`/author/${author.slug}`}
              className="inline-flex items-center gap-2 mt-1 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-black transition-all hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20"
            >
              Read their work <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-4">
              <BookOpen className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Latest from {author.name.split(" ")[0]}</span>
            </div>
            <div className="space-y-3">
              {articles.map((a: any) => (
                <Link
                  key={a.id}
                  to={`/${a.categories?.slug || "voices"}/${a.slug}`}
                  className="group flex gap-4 items-start rounded-xl p-3 transition-all hover:bg-white/5"
                >
                  {a.featured_image_url && (
                    <img src={a.featured_image_url} alt="" className="w-20 h-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white line-clamp-2 group-hover:text-amber-400 transition-colors leading-snug">
                      {a.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <time>
                        {new Date(a.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </time>
                      {a.reading_time_minutes && (
                        <span>{a.reading_time_minutes} min read</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
