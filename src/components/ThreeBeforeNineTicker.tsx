import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const AMBER = "#E5A54B";

const ThreeBeforeNineTicker = memo(() => {
  const { data } = useQuery({
    queryKey: ["3b9-ticker"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: edition, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, tldr_snapshot, categories:primary_category_id(slug)")
        .eq("article_type", "three_before_nine")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return edition?.[0] || null;
    },
  });

  if (!data?.published_at) return null;

  const tldr = data.tldr_snapshot as any;
  const bullets: string[] = (tldr?.bullets || []).slice(0, 3);
  if (bullets.length === 0) return null;

  const categorySlug = (data as any).categories?.slug || "news";
  const articleUrl = `/${categorySlug}/${data.slug}`;

  // Double for seamless loop
  const items = [...bullets, ...bullets];

  return (
    <Link
      to={articleUrl}
      className="block overflow-hidden border-y group"
      style={{
        background: "linear-gradient(90deg, hsl(215 40% 9%) 0%, hsl(215 35% 12%) 100%)",
        borderColor: "hsl(0 0% 100% / 0.06)",
      }}
    >
      <div className="container mx-auto px-4 py-[7px] flex items-center gap-3 min-w-0">
        {/* Fixed label */}
        <span className="flex items-center gap-1 font-bold shrink-0 text-[14px]">
          <span style={{ color: AMBER }}>3</span>
          <span className="text-white">Before</span>
          <span style={{ color: AMBER }}>9</span>
        </span>

        <div className="h-4 w-px shrink-0" style={{ backgroundColor: "hsl(0 0% 100% / 0.12)" }} />

        {/* Scrolling signals */}
        <div className="overflow-hidden relative flex-1 min-w-0">
          <div
            className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
            style={{ background: "linear-gradient(90deg, hsl(215 38% 10%), transparent)" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
            style={{ background: "linear-gradient(270deg, hsl(215 35% 11%), transparent)" }}
          />
          <div className="flex items-center gap-0 animate-ticker-3b9 whitespace-nowrap">
            {items.map((bullet, i) => (
              <span key={i} className="flex items-center shrink-0">
                <span style={{ color: AMBER }} className="mx-3 text-sm">•</span>
                <span className="font-bold text-[13px] mr-1.5" style={{ color: AMBER }}>
                  {(i % 3) + 1}
                </span>
                <span className="text-[13px] text-white/90">{bullet}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="h-4 w-px shrink-0" style={{ backgroundColor: "hsl(0 0% 100% / 0.12)" }} />

        {/* Fixed CTA */}
        <span
          className="text-[13px] font-medium flex items-center gap-1 shrink-0 group-hover:underline"
          style={{ color: AMBER }}
        >
          Read briefing
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </span>
      </div>

      <style>{`
        @keyframes ticker-3b9 {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker-3b9 {
          display: inline-flex;
          animation: ticker-3b9 35s linear infinite;
        }
        .group:hover .animate-ticker-3b9 {
          animation-play-state: paused;
        }
      `}</style>
    </Link>
  );
});

ThreeBeforeNineTicker.displayName = "ThreeBeforeNineTicker";
export default ThreeBeforeNineTicker;
