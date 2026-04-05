import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Quote, Clock, User } from "lucide-react";

export const VoicesPerspectivesCarousel = ({ categoryId }: { categoryId: string }) => {
  const { data: quotes, isLoading } = useQuery({
    queryKey: ["voices-perspectives", categoryId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_categories")
        .select(`articles!inner (id, slug, title, excerpt, reading_time_minutes, featured_image_url, authors (name, avatar_url), categories:primary_category_id (slug))`)
        .eq("category_id", categoryId)
        .eq("articles.status", "published");

      if (error) throw error;

      const articles = (data || [])
        .map((ac: any) => ac.articles)
        .filter((a: any) => {
          const authorName = a?.authors?.name || '';
          return authorName && authorName !== 'Intelligence Desk' && a?.excerpt;
        });

      return articles
        .sort(() => Math.random() - 0.5)
        .slice(0, 8)
        .map((a: any) => ({
          id: a.id,
          slug: a.slug,
          categorySlug: a.categories?.slug || "voices",
          title: a.title,
          quote: a.excerpt.length > 140 ? a.excerpt.slice(0, 137) + "…" : a.excerpt,
          author: a.authors.name,
          authorAvatar: a.authors?.avatar_url || null,
          readingTime: a.reading_time_minutes || null,
          image: a.featured_image_url || null,
        }));
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (!quotes || quotes.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Quote className="h-5 w-5 text-amber-500" />
        <h2 className="font-display text-lg font-bold text-foreground">Perspectives</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {quotes.map((q) => (
          <Link
            key={q.id}
            to={`/${q.categorySlug}/${q.slug}`}
            className="group snap-start shrink-0 w-80 rounded-xl border-l-4 border-amber-500 bg-gray-800/60 overflow-hidden transition-all hover:bg-gray-700/60 hover:shadow-lg hover:shadow-amber-500/5"
          >
            {q.image && (
              <img src={q.image} alt="" className="w-full h-28 object-cover" />
            )}
            <div className="p-5">
              <p className="text-sm text-white/90 italic leading-relaxed line-clamp-3 mb-4">
                "{q.quote}"
              </p>
              <div className="flex items-center gap-3 border-t border-white/10 pt-3">
                {q.authorAvatar ? (
                  <img src={q.authorAvatar} alt={q.author} className="w-8 h-8 rounded-full object-cover border border-amber-500/30" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center">
                    <User className="h-4 w-4 text-amber-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-amber-500 truncate">{q.author}</p>
                  <p className="text-xs text-gray-400 line-clamp-1">{q.title}</p>
                </div>
                {q.readingTime && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                    <Clock className="h-3 w-3" />
                    {q.readingTime}m
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
