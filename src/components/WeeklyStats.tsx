import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, FolderOpen, TrendingUp } from "lucide-react";

const WeeklyStats = () => {
  const { data: stats } = useQuery({
    queryKey: ["homepage-weekly-stats"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [totalRes, catRes, weekRes] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published").gte("published_at", oneWeekAgo),
      ]);

      return {
        totalArticles: totalRes.count ?? 0,
        totalCategories: catRes.count ?? 0,
        thisWeek: weekRes.count ?? 0,
      };
    },
  });

  if (!stats) return null;

  const items = [
    { label: "Total Articles", value: stats.totalArticles.toLocaleString(), icon: FileText },
    { label: "Categories", value: stats.totalCategories.toString(), icon: FolderOpen },
    { label: "This Week", value: `+${stats.thisWeek}`, icon: TrendingUp },
  ];

  return (
    <div className="flex items-center gap-6 md:gap-8">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <item.icon className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="leading-tight">
            <span className="font-display text-lg font-bold text-foreground">{item.value}</span>
            <span className="text-xs text-muted-foreground ml-1.5">{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WeeklyStats;
