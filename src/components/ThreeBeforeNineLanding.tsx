import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isWeekend, previousFriday, isToday, isYesterday } from "date-fns";

const ThreeBeforeNineLanding = memo(() => {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["3b9-homepage"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: editions, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, tldr_snapshot, categories:primary_category_id(slug)")
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

  // Only show if latest edition is from today, yesterday, or it's a weekend showing Friday's
  const isRecent = isToday(pubDate) || isYesterday(pubDate);
  const isWeekendNow = isWeekend(now);

  if (!isRecent && !isWeekendNow) return null;

  const tldr = latest.tldr_snapshot as any;
  const bullets: string[] = tldr?.bullets || [];
  const categorySlug = (latest as any).categories?.slug || "news";

  const showWeekendNote = isWeekendNow && !isToday(pubDate);

  return (
    <section className="container mx-auto px-4 pt-6 pb-2">
      <div className="rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-700/50 overflow-hidden">
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-editorial font-bold text-xl tracking-tight">3</span>
                <span className="text-slate-400 text-sm font-medium">Before</span>
                <span className="text-editorial font-bold text-xl tracking-tight">9</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-slate-400 text-sm">
                {format(pubDate, "EEEE, d MMMM yyyy")}
              </span>
            </div>
            {user && hasRead && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Read
              </span>
            )}
          </div>

          {/* Headlines */}
          {bullets.length > 0 && (
            <ol className="space-y-2.5 mb-5">
              {bullets.slice(0, 3).map((bullet, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="text-editorial/80 font-bold text-sm mt-0.5 shrink-0">
                    {i + 1}.
                  </span>
                  <span className="text-slate-200 text-sm leading-relaxed line-clamp-2">
                    {bullet}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {/* Actions */}
          <div className="flex items-center flex-wrap gap-3">
            <Button
              asChild
              size="sm"
              className="bg-editorial hover:bg-editorial/90 text-editorial-foreground font-semibold gap-1.5"
            >
              <Link to={`/${categorySlug}/${latest.slug}`}>
                Read Today's Briefing
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>

            {previous && (
              <Link
                to={`/${(previous as any).categories?.slug || "news"}/${previous.slug}`}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Yesterday's briefing →
              </Link>
            )}
          </div>

          {/* Weekend note */}
          {showWeekendNote && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
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
