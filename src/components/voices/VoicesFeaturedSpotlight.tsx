import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { User, BookOpen } from "lucide-react";

export const VoicesFeaturedSpotlight = ({ categoryId }: { categoryId: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["voices-featured-spotlight", categoryId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      // Get all voices articles with authors
      const { data: articleCats, error } = await supabase
        .from("article_categories")
        .select(`articles!inner (id, slug, title, excerpt, featured_image_url, published_at, authors!inner (id, name, slug, avatar_url, bio, job_title, article_count), categories:primary_category_id (slug))`)
        .eq("category_id", categoryId)
        .eq("articles.status", "published");

      if (error) throw error;

      const articles = (articleCats || [])
        .map((ac: any) => ac.articles)
        .filter((a: any) => a?.authors?.name !== "Intelligence Desk");

      // Count articles per author
      const authorMap = new Map<string, { author: any; articles: any[]; count: number }>();
      for (const a of articles) {
        const authorId = a.authors?.id;
        if (!authorId) continue;
        if (!authorMap.has(authorId)) {
          authorMap.set(authorId, { author: a.authors, articles: [], count: 0 });
        }
        const entry = authorMap.get(authorId)!;
        entry.count++;
        if (entry.articles.length < 3) entry.articles.push(a);
      }

      // Pick most prolific
      const sorted = [...authorMap.values()].sort((a, b) => b.count - a.count);
      return sorted[0] || null;
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (!data) return null;

  const { author, articles } = data;
  const expertiseTags = ["AI Commentary", "Thought Leadership", "Asia-Pacific"];

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5 text-amber-500" />
        <h2 className="font-display text-lg font-bold text-foreground">Featured Voice</h2>
      </div>
      <div className="rounded-2xl border border-amber-500/20 bg-card/60 backdrop-blur-sm overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 p-6">
          {/* Author photo & info */}
          <div className="flex flex-col items-center md:items-start gap-3 md:w-56 shrink-0">
            {author.avatar_url ? (
              <img
                src={author.avatar_url}
                alt={author.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-amber-500/40"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
                <User className="h-8 w-8 text-amber-500" />
              </div>
            )}
            <div className="text-center md:text-left">
              <Link to={`/author/${author.slug}`} className="font-display text-base font-bold text-foreground hover:text-amber-500 transition-colors">
                {author.name}
              </Link>
              {author.job_title && (
                <p className="text-xs text-muted-foreground mt-0.5">{author.job_title}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {expertiseTags.map((tag) => (
                <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {tag}
                </span>
              ))}
            </div>
            {author.bio && (
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {author.bio}
              </p>
            )}
          </div>

          {/* Latest articles */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-3">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Latest from {author.name.split(" ")[0]}</span>
            </div>
            <div className="space-y-3">
              {articles.map((a: any) => (
                <Link
                  key={a.id}
                  to={`/${a.categories?.slug || "voices"}/${a.slug}`}
                  className="group flex gap-3 items-start rounded-lg p-2 -mx-2 transition-colors hover:bg-amber-500/5"
                >
                  {a.featured_image_url && (
                    <img src={a.featured_image_url} alt="" className="w-16 h-12 rounded-md object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-amber-500 transition-colors leading-snug">
                      {a.title}
                    </h3>
                    <time className="text-[10px] text-muted-foreground">
                      {new Date(a.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </time>
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
