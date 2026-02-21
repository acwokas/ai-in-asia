import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { format } from "date-fns";

const AMBER = "hsl(37, 78%, 60%)";

const ThreeBeforeNineLanding = memo(() => {
  const { data } = useQuery({
    queryKey: ["3b9-homepage"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: editions, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, tldr_snapshot, featured_image_url, categories:primary_category_id(slug)")
        .eq("article_type", "three_before_nine")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return editions?.[0] || null;
    },
  });

  if (!data) return null;

  const pubDate = new Date(data.published_at!);
  const tldr = data.tldr_snapshot as any;
  const bullets: string[] = tldr?.bullets || [];
  const thumbnails: string[] = tldr?.thumbnails || [];
  const categorySlug = (data as any).categories?.slug || "news";
  const articleUrl = `/${categorySlug}/${data.slug}`;

  // Collect unique thumbnails, falling back to featured image
  const uniqueThumbs = [
    ...new Set([
      ...(thumbnails.filter(Boolean)),
      data.featured_image_url,
    ].filter(Boolean))
  ].slice(0, 3) as string[];

  return (
    <section className="container mx-auto px-4 py-2">
      <Link
        to={articleUrl}
        className="block group rounded-[10px] overflow-hidden transition-all duration-200 hover:brightness-110"
        style={{
          background: 'linear-gradient(135deg, hsla(37, 30%, 10%, 0.6) 0%, hsl(215, 40%, 8%) 40%, hsl(220, 35%, 10%) 100%)',
          border: `1px solid hsla(37, 78%, 60%, 0.15)`,
          borderLeft: `3px solid ${AMBER}`,
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 px-5 py-4 md:py-0 md:h-[100px]">

          {/* LEFT — Typographic lockup + date */}
          <div className="shrink-0 md:w-[18%] flex flex-col items-start">
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[36px] leading-none tracking-tight" style={{ color: AMBER }}>3</span>
              <span className="text-muted-foreground text-[18px] font-normal mx-0.5">Before</span>
              <span className="font-bold text-[36px] leading-none tracking-tight" style={{ color: AMBER }}>9</span>
            </div>
            <span className="text-muted-foreground text-[13px] mt-0.5">
              {format(pubDate, "EEEE, d MMM")}
            </span>
          </div>

          {/* MIDDLE — Three signal headlines */}
          <div className="flex-1 min-w-0 space-y-0">
            {bullets.slice(0, 3).map((bullet, i) => (
              <div key={i} className="flex items-start gap-2 leading-[1.8]">
                <span className="font-bold text-[13px] shrink-0 mt-px" style={{ color: AMBER }}>{i + 1}</span>
                <span className="text-[13px] text-foreground truncate block">{bullet}</span>
              </div>
            ))}
          </div>

          {/* RIGHT — Thumbnails + CTA */}
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {uniqueThumbs.length > 0 && (
              <div className="flex items-center gap-1.5">
                {uniqueThumbs.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="w-[70px] h-[50px] rounded-md object-cover"
                    loading="lazy"
                    style={{ border: '1px solid hsla(37, 78%, 60%, 0.1)' }}
                  />
                ))}
              </div>
            )}
            <span
              className="text-[13px] font-medium flex items-center gap-1 group-hover:underline"
              style={{ color: AMBER }}
            >
              Read today's briefing
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </div>

        </div>
      </Link>
    </section>
  );
});

ThreeBeforeNineLanding.displayName = "ThreeBeforeNineLanding";

export default ThreeBeforeNineLanding;
