import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

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

      // Top completed articles by title from event_data, fallback to path
      const titleCounts: Record<string, number> = {};
      events
        .filter(e => e.event_name === "article_read_complete")
        .forEach(e => {
          const ed = e.event_data as any;
          const label = ed?.article_title || ed?.title || e.page_path || "unknown";
          titleCounts[label] = (titleCounts[label] || 0) + 1;
        });
      const topCompleted = Object.entries(titleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name: name.length > 40 ? name.slice(0, 37) + "…" : name, fullName: name, count }));

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
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  const funnelData = [
    { stage: "25%", count: data.milestones["article_read_25"] },
    { stage: "50%", count: data.milestones["article_read_50"] },
    { stage: "75%", count: data.milestones["article_read_75"] },
    { stage: "Complete", count: data.milestones["article_read_complete"] },
  ];

  return (
    <div className="space-y-6">
      {/* Funnel chart */}
      <div>
        <h4 className="text-sm font-medium mb-3">Article Read Funnel (completion rate: {data.completionRate}%)</h4>
        <ChartContainer config={{ count: { label: "Readers", color: "hsl(var(--primary))" } }} className="h-[200px]">
          <BarChart data={funnelData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="stage" className="text-xs" />
            <YAxis className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top completed bar chart + table */}
        <div>
          <h4 className="text-sm font-medium mb-3">Top 10 Completed Articles</h4>
          {data.topCompleted.length ? (
            <>
              <ChartContainer config={{ count: { label: "Completions", color: "hsl(var(--accent-foreground))" } }} className="h-[250px]">
                <BarChart data={data.topCompleted} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={115} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead className="text-right">Completions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topCompleted.map(row => (
                    <TableRow key={row.fullName}>
                      <TableCell className="text-xs truncate max-w-[250px]">{row.fullName}</TableCell>
                      <TableCell className="text-right font-medium">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No completions recorded yet</p>
          )}
        </div>

        {/* Guide stats */}
        <div>
          <h4 className="text-sm font-medium mb-3">Guide Engagement</h4>
          <div className="space-y-3">
            <StatRow label="Guide Pageviews" value={data.guideViewCount} />
            <StatRow label="Avg Scroll Depth" value={`${data.avgGuideScroll}%`} />
            <StatRow label="Avg Time on Guide" value={`${data.avgGuideTime}s`} />
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
    <Skeleton className="h-[200px] w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);
