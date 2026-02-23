import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

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
      className="block overflow-hidden border-y group ticker-3b9-strip"
    >
      <div className="container mx-auto px-4 py-[7px] flex items-center gap-3 min-w-0">
        {/* Fixed label */}
        <span className="flex items-center gap-1 font-bold shrink-0 text-[14px]">
          <span className="ticker-3b9-amber">3</span>
          <span className="ticker-3b9-text">Before</span>
          <span className="ticker-3b9-amber">9</span>
        </span>

        <div className="h-4 w-px shrink-0 ticker-3b9-divider" />

        {/* Scrolling signals — wraps on mobile, scrolls on desktop */}
        <div className="overflow-hidden relative flex-1 min-w-0">
          <div className="block ticker-3b9-fade-left" />
          <div className="block ticker-3b9-fade-right" />
          <div className="inline-flex items-center gap-0 animate-ticker-3b9 whitespace-nowrap">
            {items.map((bullet, i) => (
              <span key={i} className="flex items-center shrink-0">
                <span className="ticker-3b9-amber mx-3 text-sm">•</span>
                <span className="font-bold text-[13px] mr-1.5 ticker-3b9-amber">
                  {(i % 3) + 1}
                </span>
                <span className="text-[13px] ticker-3b9-bullet">{bullet}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="h-4 w-px shrink-0 ticker-3b9-divider" />

        {/* Fixed CTA */}
        <span
          className="text-[13px] font-medium flex items-center gap-1 shrink-0 group-hover:underline ticker-3b9-amber"
        >
          <span className="hidden sm:inline">Read briefing</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </span>
      </div>

      <style>{`
        /* ---- Dark mode (default) ---- */
        .dark .ticker-3b9-strip,
        :root:not(.light) .ticker-3b9-strip {
          background: linear-gradient(90deg, hsl(215 40% 9%) 0%, hsl(215 35% 12%) 100%);
          border-color: hsl(0 0% 100% / 0.06);
        }
        .dark .ticker-3b9-amber,
        :root:not(.light) .ticker-3b9-amber { color: #E5A54B; }
        .dark .ticker-3b9-text,
        :root:not(.light) .ticker-3b9-text { color: #fff; }
        .dark .ticker-3b9-bullet,
        :root:not(.light) .ticker-3b9-bullet { color: rgba(255,255,255,0.9); }
        .dark .ticker-3b9-divider,
        :root:not(.light) .ticker-3b9-divider { background-color: hsl(0 0% 100% / 0.12); }
        .dark .ticker-3b9-fade-left,
        :root:not(.light) .ticker-3b9-fade-left {
          position: absolute; left: 0; top: 0; bottom: 0; width: 2rem; z-index: 10; pointer-events: none;
          background: linear-gradient(90deg, hsl(215 38% 10%), transparent);
        }
        .dark .ticker-3b9-fade-right,
        :root:not(.light) .ticker-3b9-fade-right {
          position: absolute; right: 0; top: 0; bottom: 0; width: 2rem; z-index: 10; pointer-events: none;
          background: linear-gradient(270deg, hsl(215 35% 11%), transparent);
        }

        /* ---- Light mode ---- */
        :root:not(.dark) .ticker-3b9-strip,
        .light .ticker-3b9-strip {
          background: linear-gradient(90deg, hsl(37 40% 97%) 0%, hsl(37 30% 95%) 100%);
          border-color: hsl(37 30% 85%);
        }
        :root:not(.dark) .ticker-3b9-amber,
        .light .ticker-3b9-amber { color: #b07d2e; }
        :root:not(.dark) .ticker-3b9-text,
        .light .ticker-3b9-text { color: hsl(215 30% 20%); }
        :root:not(.dark) .ticker-3b9-bullet,
        .light .ticker-3b9-bullet { color: hsl(215 20% 30%); }
        :root:not(.dark) .ticker-3b9-divider,
        .light .ticker-3b9-divider { background-color: hsl(37 30% 80%); }
        :root:not(.dark) .ticker-3b9-fade-left,
        .light .ticker-3b9-fade-left {
          position: absolute; left: 0; top: 0; bottom: 0; width: 2rem; z-index: 10; pointer-events: none;
          background: linear-gradient(90deg, hsl(37 40% 97%), transparent);
        }
        :root:not(.dark) .ticker-3b9-fade-right,
        .light .ticker-3b9-fade-right {
          position: absolute; right: 0; top: 0; bottom: 0; width: 2rem; z-index: 10; pointer-events: none;
          background: linear-gradient(270deg, hsl(37 30% 95%), transparent);
        }

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
