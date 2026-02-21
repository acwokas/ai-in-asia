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
    <section className="container mx-auto px-4 py-8 md:py-12">
      <div
        className="rounded-xl overflow-hidden dark:bg-gradient-to-br dark:from-[hsl(215,40%,8%)] dark:to-[hsl(215,35%,11%)] bg-[hsl(220,20%,97%)]"
        style={{ border: `1px solid hsla(37, 78%, 60%, 0.2)` }}
      >
        <div className="p-6 sm:p-8 md:p-10">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {/* Typographic lockup */}
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-[36px] leading-none tracking-tight" style={{ color: AMBER_ACCENT }}>3</span>
                <span className="text-muted-foreground text-[15px] font-normal mx-0.5">Before</span>
                <span className="font-bold text-[36px] leading-none tracking-tight" style={{ color: AMBER_ACCENT }}>9</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <span className="text-muted-foreground text-[16px]">
                {format(pubDate, "EEEE, d MMMM yyyy")}
              </span>
              {user && hasRead && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                  <Check className="h-3.5 w-3.5" />
                  Read
                </span>
              )}
            </div>
            <Link
              to={`/${categorySlug}/${latest.slug}`}
              className="text-[15px] font-medium flex items-center gap-1.5 hover:underline group"
              style={{ color: AMBER_ACCENT }}
            >
              Read full briefing
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Explainer */}
          <p className="mt-3 mb-3 text-[14px] font-normal" style={{ color: "#8899AA" }}>
            Three AI signals that matter, delivered before your first cup of coffee
          </p>

          {/* Divider */}
          <div className="h-px bg-border/50 mb-5" />

          {/* The three signals */}
          {bullets.length > 0 && (
            <div className="space-y-4">
              {bullets.slice(0, 3).map((bullet, i) => (
                <Link
                  key={i}
                  to={`/${categorySlug}/${latest.slug}`}
                  className="flex gap-4 items-start group hover:bg-foreground/5 -mx-3 px-3 py-2 rounded-lg transition-colors"
                >
                  <span className="font-bold text-[28px] leading-none mt-0.5 shrink-0 w-8 text-center" style={{ color: AMBER_ACCENT }}>
                    {i + 1}
                  </span>
                  <span className="text-foreground text-[17px] leading-[1.6] flex-1 group-hover:opacity-80 transition-opacity">
                    {bullet}
                  </span>
                  {/* Thumbnail */}
                  {(thumbnails[i] || fallbackImage) && (
                    <img
                      src={thumbnails[i] || fallbackImage}
                      alt=""
                      className="hidden sm:block w-[80px] h-[80px] rounded-lg object-cover shrink-0"
                      loading="lazy"
                    />
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-border/50 my-5" />

          {/* Footer */}
          <div className="flex items-center flex-wrap gap-4">
            <Button
              asChild
              className="font-semibold gap-2 text-white hover:opacity-90"
              style={{ backgroundColor: AMBER_ACCENT }}
            >
              <Link to={`/${categorySlug}/${latest.slug}`}>
                Read Today's Briefing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            {previous && (
              <Link
                to={`/${(previous as any).categories?.slug || "news"}/${previous.slug}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Yesterday's briefing →
              </Link>
            )}
          </div>

          {showWeekendNote && (
            <p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Next briefing: Monday morning
            </p>
          )}
        </div>
      </div>
    </section>
  );
});

ThreeBeforeNineLanding.displayName = "ThreeBeforeNineLanding";

export default ThreeBeforeNineLanding;
