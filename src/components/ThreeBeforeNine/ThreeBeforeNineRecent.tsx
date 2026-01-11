import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ThreeBeforeNineRecentProps {
  currentSlug: string;
}

export default function ThreeBeforeNineRecent({ currentSlug }: ThreeBeforeNineRecentProps) {
  const { data: recentEditions, isLoading } = useQuery({
    queryKey: ["three-before-nine-recent", currentSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at")
        .eq("article_type", "three_before_nine")
        .eq("status", "published")
        .neq("slug", currentSlug)
        .order("published_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Editions</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 bg-slate-800" />
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
      <h3 className="text-lg font-semibold text-white mb-4">Recent Editions</h3>
      <div className="grid gap-3">
        {recentEditions.map((edition) => {
          const date = edition.published_at ? new Date(edition.published_at) : new Date();
          return (
            <Link
              key={edition.id}
              to={`/news/${edition.slug}`}
              className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-amber-500/30 transition-all group"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                <img
                  src="/images/3-before-9-hero.png"
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-amber-400 text-xs font-medium">
                  {format(date, "EEEE, d MMMM")}
                </p>
                <p className="text-slate-300 text-sm group-hover:text-white transition-colors truncate">
                  3-Before-9
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
