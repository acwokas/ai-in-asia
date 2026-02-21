import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isWeekend, isToday, isYesterday } from "date-fns";

const AMBER_ACCENT = "hsl(37, 78%, 60%)";

const ThreeBeforeNineLanding = memo(() => {
  const { user } = useAuth();

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
        .limit(2);

      if (error) throw error;
      return editions || [];
    },
  });

  const { data: hasRead } = useQuery({
    queryKey: ["3b9-read-status", user?.id, data?.[0]?.id],
    enabled: !!user?.id && !!data?.[0]?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: history } = await supabase
        .from("reading_history")
        .select("id")
        .eq("user_id", user!.id)
        .eq("article_id", data![0].id)
        .maybeSingle();
      return !!history;
    },
  });

  if (!data?.length) return null;

  const latest = data[0];
  const previous = data[1];
  const pubDate = new Date(latest.published_at!);
  const now = new Date();

  const isRecent = isToday(pubDate) || isYesterday(pubDate);
  const isWeekendNow = isWeekend(now);

  if (!isRecent && !isWeekendNow) return null;

  const tldr = latest.tldr_snapshot as any;
  const bullets: string[] = tldr?.bullets || [];
  const thumbnails: string[] = tldr?.thumbnails || [];
  const categorySlug = (latest as any).categories?.slug || "news";
  const showWeekendNote = isWeekendNow && !isToday(pubDate);
  const fallbackImage = latest.featured_image_url;

  return (
    <section className="container mx-auto px-4 py-3 md:py-4">
      <div
        className="rounded-xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, hsl(215 40% 8%) 0%, hsl(220 35% 11%) 50%, hsl(215 38% 9%) 100%)',
          border: `2px solid transparent`,
          borderImage: `linear-gradient(90deg, ${AMBER_ACCENT}, hsla(37, 78%, 60%, 0.15)) 1`,
          borderRadius: '12px',
        }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, ${AMBER_ACCENT} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }} />

        <div className="px-5 py-5 sm:px-6 sm:py-5 relative">

          {/* Header row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-[28px] leading-none tracking-tight" style={{ color: AMBER_ACCENT }}>3</span>
                <span className="text-muted-foreground text-[13px] font-normal mx-0.5">Before</span>
                <span className="font-bold text-[28px] leading-none tracking-tight" style={{ color: AMBER_ACCENT }}>9</span>
              </div>
              <div className="h-5 w-px bg-border" />
              <span className="text-muted-foreground text-[14px]">
                {format(pubDate, "EEEE, d MMMM yyyy")}
              </span>
              {user && hasRead && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  <Check className="h-3 w-3" />
                  Read
                </span>
              )}
            </div>
            <Link
              to={`/${categorySlug}/${latest.slug}`}
              className="text-[13px] font-medium flex items-center gap-1 hover:underline group"
              style={{ color: AMBER_ACCENT }}
            >
              Read full briefing
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Explainer */}
          <p className="mt-1.5 mb-1.5 text-[13px] font-normal text-muted-foreground">
            Three AI signals that matter, delivered before your first cup of coffee
          </p>

          {/* Divider */}
          <div className="h-px bg-border/50 mb-3" />

          {/* The three signals — with larger thumbnails and numbered circles */}
          {bullets.length > 0 && (
            <div className="space-y-2">
              {bullets.slice(0, 3).map((bullet, i) => (
                <Link
                  key={i}
                  to={`/${categorySlug}/${latest.slug}`}
                  className="flex gap-3 items-center group hover:bg-foreground/5 -mx-2 px-2 py-2 rounded-md transition-colors"
                >
                  {/* Numbered circle */}
                  <span
                    className="flex items-center justify-center font-bold text-[20px] leading-none shrink-0 rounded-full"
                    style={{
                      color: AMBER_ACCENT,
                      backgroundColor: 'hsla(37, 78%, 60%, 0.1)',
                      width: '40px',
                      height: '40px',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-foreground text-[15px] leading-[1.5] flex-1 group-hover:opacity-80 transition-opacity">
                    {bullet}
                  </span>
                  {(thumbnails[i] || fallbackImage) && (
                    <div className="hidden sm:block shrink-0 relative">
                      <img
                        src={thumbnails[i] || fallbackImage}
                        alt=""
                        className="w-[120px] h-[80px] rounded-lg object-cover"
                        loading="lazy"
                        style={{ boxShadow: `0 4px 16px hsla(37, 78%, 60%, 0.15)` }}
                      />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-border/50 my-3" />

          {/* Footer — all on one line */}
          <div className="flex items-center flex-wrap gap-3">
            <Button
              asChild
              size="sm"
              className="font-semibold gap-1.5 text-white hover:opacity-90 h-8 text-[13px]"
              style={{ backgroundColor: AMBER_ACCENT }}
            >
              <Link to={`/${categorySlug}/${latest.slug}`}>
                Read Today's Briefing
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>

            {previous && (
              <Link
                to={`/${(previous as any).categories?.slug || "news"}/${previous.slug}`}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Yesterday's briefing →
              </Link>
            )}

            {showWeekendNote && (
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground ml-auto">
                <Clock className="h-3 w-3" />
                Next briefing: Monday morning
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});

ThreeBeforeNineLanding.displayName = "ThreeBeforeNineLanding";

export default ThreeBeforeNineLanding;
