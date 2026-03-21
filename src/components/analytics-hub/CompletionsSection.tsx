import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Props {
  startDate: string;
  range: string;
}

export const CompletionsSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-completions", range],
    queryFn: async () => {
      const [completionsRes, guideViewsRes] = await Promise.all([
        supabase
          .from("analytics_events")
          .select("event_name, event_data, page_path, created_at")
          .in("event_name", ["article_read_complete", "article_read_75", "article_read_50", "article_read_25"])
          .gte("created_at", startDate)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("analytics_pageviews")
          .select("page_path, guide_id, time_on_page_seconds, scroll_depth_percent")
          .not("guide_id", "is", null)
          .gte("viewed_at", startDate)
          .limit(500),
      ]);

      const events = completionsRes.data || [];
      const guideViews = guideViewsRes.data || [];

      const milestones = {
        "article_read_25": events.filter(e => e.event_name === "article_read_25").length,
        "article_read_50": events.filter(e => e.event_name === "article_read_50").length,
        "article_read_75": events.filter(e => e.event_name === "article_read_75").length,
        "article_read_complete": events.filter(e => e.event_name === "article_read_complete").length,
      };

      // Top completed articles by path
      const pathCounts: Record<string, number> = {};
      events
        .filter(e => e.event_name === "article_read_complete")
        .forEach(e => {
          const p = e.page_path || "unknown";
          pathCounts[p] = (pathCounts[p] || 0) + 1;
        });
      const topCompleted = Object.entries(pathCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count }));

      // Guide engagement
      const avgGuideScroll = guideViews.length > 0
        ? Math.round(guideViews.reduce((s, g) => s + (g.scroll_depth_percent || 0), 0) / guideViews.length)
        : 0;
      const avgGuideTime = guideViews.length > 0
        ? Math.round(guideViews.reduce((s, g) => s + (g.time_on_page_seconds || 0), 0) / guideViews.length)
        : 0;

      const completionRate = milestones["article_read_25"] > 0
        ? Math.round((milestones["article_read_complete"] / milestones["article_read_25"]) * 100)
        : 0;

      return { milestones, topCompleted, avgGuideScroll, avgGuideTime, guideViewCount: guideViews.length, completionRate };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <SectionSkeleton />;

  return (
    <div className="space-y-6">
      {/* Funnel */}
      <div>
        <h4 className="text-sm font-medium mb-3">Article Read Funnel</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "25%", value: data?.milestones["article_read_25"] ?? 0, color: "bg-yellow-500" },
            { label: "50%", value: data?.milestones["article_read_50"] ?? 0, color: "bg-orange-500" },
            { label: "75%", value: data?.milestones["article_read_75"] ?? 0, color: "bg-blue-500" },
            { label: "Complete", value: data?.milestones["article_read_complete"] ?? 0, color: "bg-green-500" },
            { label: "Rate", value: `${data?.completionRate ?? 0}%`, color: "bg-purple-500" },
          ].map(item => (
            <div key={item.label} className="rounded-lg border p-3 text-center">
              <div className={`h-1.5 w-8 mx-auto rounded-full mb-2 ${item.color}`} />
              <p className="text-lg font-bold">{typeof item.value === "number" ? item.value.toLocaleString() : item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top completed */}
        <div>
          <h4 className="text-sm font-medium mb-3">Top Completed Articles</h4>
          {data?.topCompleted.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead className="text-right">Completions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topCompleted.map(row => (
                  <TableRow key={row.path}>
                    <TableCell className="font-mono text-xs truncate max-w-[200px]">{row.path}</TableCell>
                    <TableCell className="text-right font-medium">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No completions recorded yet</p>
          )}
        </div>

        {/* Guide stats */}
        <div>
          <h4 className="text-sm font-medium mb-3">Guide Engagement</h4>
          <div className="space-y-3">
            <StatRow label="Guide Pageviews" value={data?.guideViewCount ?? 0} />
            <StatRow label="Avg Scroll Depth" value={`${data?.avgGuideScroll ?? 0}%`} />
            <StatRow label="Avg Time on Guide" value={`${data?.avgGuideTime ?? 0}s`} />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between items-center p-2 rounded border">
    <span className="text-sm text-muted-foreground">{label}</span>
    <Badge variant="secondary" className="font-mono">{typeof value === "number" ? value.toLocaleString() : value}</Badge>
  </div>
);

const SectionSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-48" />
    <div className="grid grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
    </div>
    <Skeleton className="h-32 w-full" />
  </div>
);
