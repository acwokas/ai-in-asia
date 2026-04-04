import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Quote } from "lucide-react";

export const VoicesPerspectivesCarousel = ({ categoryId }: { categoryId: string }) => {
  const { data: quotes, isLoading } = useQuery({
    queryKey: ["voices-perspectives", categoryId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_categories")
        .select(`articles!inner (id, slug, title, excerpt, authors (name), categories:primary_category_id (slug))`)
        .eq("category_id", categoryId)
        .eq("articles.status", "published");

      if (error) throw error;

      return (data || [])
        .map((ac: any) => ac.articles)
        .filter((a: any) => a?.authors?.name !== "Intelligence Desk" && a?.excerpt)
        .sort((a: any, b: any) => Math.random() - 0.5)
        .slice(0, 8)
        .map((a: any) => ({
          id: a.id,
          slug: a.slug,
          categorySlug: a.categories?.slug || "voices",
          title: a.title,
          quote: a.excerpt.length > 140 ? a.excerpt.slice(0, 137) + "…" : a.excerpt,
          author: a.authors?.name || "Anonymous",
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
            className="group snap-start shrink-0 w-72 rounded-xl border-l-[3px] border-amber-500 bg-card/80 p-4 transition-all hover:bg-card hover:shadow-lg hover:shadow-amber-500/5"
          >
            <p className="text-sm text-foreground/90 italic leading-relaxed line-clamp-4 mb-3">
              "{q.quote}"
            </p>
            <div className="border-t border-border/50 pt-2">
              <p className="text-xs font-semibold text-amber-500">{q.author}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{q.title}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
