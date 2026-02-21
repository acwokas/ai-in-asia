import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const TrendingStrip = memo(() => {
  const { data: trending } = useQuery({
    queryKey: ["trending-strip"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, categories:primary_category_id(slug)")
        .eq("status", "published")
        .not("title", "ilike", "%3 Before 9%")
        .order("view_count", { ascending: false, nullsFirst: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  if (!trending?.length) return null;

  const truncate = (s: string, max = 45) =>
    s.length > max ? s.slice(0, max).trimEnd() + "…" : s;

  return (
    <div className="bg-muted/40 border-y border-border/40 overflow-hidden">
      <div className="container mx-auto px-4 py-1.5 flex items-center gap-2 text-[13px] min-w-0">
        <span className="font-bold text-primary shrink-0">Trending:</span>
        <div className="flex items-center gap-0 overflow-x-auto no-scrollbar min-w-0">
          {trending.map((a: any, i: number) => (
            <span key={a.id} className="flex items-center shrink-0">
              {i > 0 && <span className="text-muted-foreground/50 mx-2">·</span>}
              <Link
                to={`/${a.categories?.slug || "news"}/${a.slug}`}
                className="text-foreground hover:text-primary transition-colors whitespace-nowrap"
              >
                {truncate(a.title)}
              </Link>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

TrendingStrip.displayName = "TrendingStrip";
export default TrendingStrip;
