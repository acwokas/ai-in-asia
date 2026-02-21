import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

const AMBER = "hsl(37, 78%, 60%)";

interface ThreeBeforeNineRecentProps {
  currentSlug: string;
}

export default function ThreeBeforeNineRecent({ currentSlug }: ThreeBeforeNineRecentProps) {
  const { data: recentEditions, isLoading } = useQuery({
    queryKey: ["three-before-nine-recent", currentSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, excerpt, tldr_snapshot")
        .eq("article_type", "three_before_nine")
        .eq("status", "published")
        .neq("slug", currentSlug)
        .order("published_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div>
        <h3 className="text-2xl font-bold text-foreground mb-6 font-display">Recent Editions</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!recentEditions?.length) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-foreground font-display">Recent Editions</h3>
        <Link 
          to="/news/3-before-9"
          className="text-sm hover:opacity-80 transition-colors flex items-center gap-1"
          style={{ color: AMBER }}
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {recentEditions.map((edition) => {
          const date = edition.published_at ? new Date(edition.published_at) : new Date();
          const tldr = edition.tldr_snapshot as any;
          const bullets: string[] = tldr?.bullets || [];
          
          return (
            <Link
              key={edition.id}
              to={`/news/${edition.slug}`}
              className="group bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all"
              style={{ '--hover-border': AMBER } as any}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'hsla(37, 78%, 60%, 0.4)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
            >
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: AMBER }}>
                {format(date, "EEEE")}
              </p>
              <p className="text-foreground font-semibold text-sm mb-3">
                {format(date, "d MMMM yyyy")}
              </p>
              
              {/* Signal headlines */}
              {bullets.length > 0 ? (
                <ul className="space-y-1.5 mb-3">
                  {bullets.slice(0, 3).map((bullet, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                      <span className="font-bold shrink-0" style={{ color: AMBER }}>{i + 1}.</span>
                      <span className="line-clamp-2">{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : edition.excerpt ? (
                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3 mb-3">
                  {edition.excerpt}
                </p>
              ) : null}
              
              <span className="text-xs font-medium group-hover:underline flex items-center gap-1" style={{ color: AMBER }}>
                Read edition <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
