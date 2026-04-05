import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, User, ArrowRight } from "lucide-react";

export const VoicesExpertDirectory = ({ categoryId }: { categoryId: string }) => {
  const { data: experts, isLoading } = useQuery({
    queryKey: ["voices-expert-directory", categoryId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_categories")
        .select(`articles!inner (id, authors:authors_public!articles_author_id_fkey!inner (id, name, slug, avatar_url, job_title, bio))`)
        .eq("category_id", categoryId)
        .eq("articles.status", "published");

      if (error) throw error;

      const authorMap = new Map<string, { author: any; count: number }>();
      for (const ac of data || []) {
        const a = ac.articles;
        if (!a?.authors || a.authors.name === "Intelligence Desk") continue;
        const id = a.authors.id;
        if (!authorMap.has(id)) {
          authorMap.set(id, { author: a.authors, count: 0 });
        }
        authorMap.get(id)!.count++;
      }

      return [...authorMap.values()]
        .sort((a, b) => b.count - a.count);
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (!experts || experts.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-amber-500" />
        <h2 className="font-display text-lg font-bold text-foreground">Expert Directory</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {experts.map(({ author, count }) => (
          <Link
            key={author.id}
            to={`/author/${author.slug}`}
            className="group rounded-xl border border-border/60 bg-card/60 p-4 flex flex-col items-center text-center transition-all hover:border-amber-500/40 hover:bg-amber-500/5"
          >
            {author.avatar_url ? (
              <img src={author.avatar_url} alt={author.name} className="w-12 h-12 rounded-full object-cover mb-2 border border-border" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <h3 className="text-sm font-semibold text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">
              {author.name}
            </h3>
            {author.job_title && (
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{author.job_title}</p>
            )}
            <span className="text-[10px] font-medium text-amber-500/80 mt-1.5">
              {count} {count === 1 ? "article" : "articles"}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              View all <ArrowRight className="h-2.5 w-2.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};
