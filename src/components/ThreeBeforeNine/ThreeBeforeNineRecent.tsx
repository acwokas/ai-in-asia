import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

interface ThreeBeforeNineRecentProps {
  currentSlug: string;
}

export default function ThreeBeforeNineRecent({ currentSlug }: ThreeBeforeNineRecentProps) {
  const { data: recentEditions, isLoading } = useQuery({
    queryKey: ["three-before-nine-recent", currentSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, excerpt")
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
        <h3 className="text-2xl font-bold text-foreground mb-6">Recent Editions</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
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
        <h3 className="text-2xl font-bold text-foreground">Recent Editions</h3>
        <Link 
          to="/news/3-before-9"
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {recentEditions.map((edition) => {
          const date = edition.published_at ? new Date(edition.published_at) : new Date();
          return (
            <Link
              key={edition.id}
              to={`/news/${edition.slug}`}
              className="group bg-card rounded-xl border border-border p-5 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <p className="text-primary text-xs font-semibold uppercase tracking-wide mb-2">
                {format(date, "EEEE")}
              </p>
              <p className="text-foreground font-semibold text-sm mb-2">
                {format(date, "d MMMM yyyy")}
              </p>
              {edition.excerpt && (
                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3 mb-3">
                  {edition.excerpt}
                </p>
              )}
              <span className="text-primary text-xs font-medium group-hover:underline flex items-center gap-1">
                Read edition <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
