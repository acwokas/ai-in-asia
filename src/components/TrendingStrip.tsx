import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

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
        .limit(8);
      if (error) throw error;
      return data || [];
    },
  });

  if (!trending?.length) return null;

  const truncate = (s: string, max = 50) =>
    s.length > max ? s.slice(0, max).trimEnd() + "…" : s;

  // Double the items for seamless loop
  const items = [...trending, ...trending];

  return (
    <div
      className="overflow-hidden border-y"
      style={{
        background: "linear-gradient(90deg, hsl(215 40% 9%) 0%, hsl(215 35% 12%) 100%)",
        borderColor: "hsl(0 0% 100% / 0.06)",
      }}
    >
      <div className="container mx-auto px-4 py-[7px] flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1.5 font-bold shrink-0 text-[13px] text-primary">
          <TrendingUp className="h-3.5 w-3.5" />
          Trending
        </span>
        <div className="h-4 w-px bg-border/50 shrink-0" />
        <div className="overflow-hidden relative flex-1 min-w-0">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, hsl(215 38% 10%), transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, hsl(215 35% 11%), transparent)' }} />
          <div className="flex items-center gap-0 animate-ticker whitespace-nowrap">
            {items.map((a: any, i: number) => (
              <span key={`${a.id}-${i}`} className="flex items-center shrink-0">
                <span className="text-muted-foreground/40 mx-3">·</span>
                <Link
                  to={`/${a.categories?.slug || "news"}/${a.slug}`}
                  className="text-[14px] text-foreground/80 hover:text-primary transition-colors"
                >
                  {truncate(a.title)}
                </Link>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

TrendingStrip.displayName = "TrendingStrip";
export default TrendingStrip;
