import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { EmptyDataNotice } from "./EmptyDataNotice";
import { InsightCard } from "./InsightCard";

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

      const events = completionsRes.data ?? [];
      const guideViews = guideViewsRes.data ?? [];

      const milestones = {
        "article_read_25": events.filter(e => e.event_name === "article_read_25").length,
        "article_read_50": events.filter(e => e.event_name === "article_read_50").length,
        "article_read_75": events.filter(e => e.event_name === "article_read_75").length,
        "article_read_complete": events.filter(e => e.event_name === "article_read_complete").length,
      };

      const titleCounts: Record<string, number> = {};
      (events ?? [])
        .filter(e => e.event_name === "article_read_complete")
        .forEach(e => {
          const ed = e.event_data as any;
          const label = ed?.article_title || ed?.title || e.page_path || "unknown";
          titleCounts[label] = (titleCounts[label] || 0) + 1;
        });
      const topCompleted = Object.entries(titleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({
          name: (name ?? "unknown").length > 40 ? (name ?? "unknown").slice(0, 37) + "…" : (name ?? "unknown"),
          fullName: name ?? "unknown",
          count: count ?? 0,
        }));

      const avgGuideScroll = guideViews.length > 0
        ? Math.round((guideViews ?? []).reduce((s, g) => s + (g?.scroll_depth_percent ?? 0), 0) / guideViews.length)
        : 0;
      const avgGuideTime = guideViews.length > 0
        ? Math.round((guideViews ?? []).reduce((s, g) => s + (g?.time_on_page_seconds ?? 0), 0) / guideViews.length)
        : 0;

      const completionRate = milestones["article_read_25"] > 0
        ? Math.round((milestones["article_read_complete"] / milestones["article_read_25"]) * 100)
        : 0;

      // Drop-off between stages
      const dropoff25to50 = milestones["article_read_25"] > 0
        ? Math.round(((milestones["article_read_25"] - milestones["article_read_50"]) / milestones["article_read_25"]) * 100)
        : 0;
      const dropoff50to75 = milestones["article_read_50"] > 0
        ? Math.round(((milestones["article_read_50"] - milestones["article_read_75"]) / milestones["article_read_50"]) * 100)
        : 0;

      const hasData = events.length > 0;

      return {
        milestones,
        topCompleted: topCompleted ?? [],
        avgGuideScroll,
        avgGuideTime,
        guideViewCount: (guideViews ?? []).length,
        completionRate,
        dropoff25to50,
        dropoff50to75,
        hasData,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <SectionSkeleton />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  if (!data.hasData) {
    return (
      <div className="space-y-4">
        <EmptyDataNotice message="Article read milestone events (25%, 50%, 75%, complete) will populate within 24–48 hours of tracking setup" />
        <EmptyDataNotice variant="coming-soon" message="Guide completion tracking — integration coming soon" />
        <InsightCard insights={[
          "Start tracking: once readers begin visiting articles, scroll-depth milestones will automatically appear here.",
          "Tip: articles under 800 words with a strong opening hook typically achieve 40%+ completion rates.",
        ]} />
      </div>
    );
  }

  const funnelData = [
    { stage: "25%", count: data?.milestones?.["article_read_25"] ?? 0 },
    { stage: "50%", count: data?.milestones?.["article_read_50"] ?? 0 },
    { stage: "75%", count: data?.milestones?.["article_read_75"] ?? 0 },
    { stage: "Complete", count: data?.milestones?.["article_read_complete"] ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">Article Read Funnel (completion rate: {data?.completionRate ?? 0}%)</h4>
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
        <div>
          <h4 className="text-sm font-medium mb-3">Top 10 Completed Articles</h4>
          {(data?.topCompleted ?? []).length ? (
            <>
              <ChartContainer config={{ count: { label: "Completions", color: "hsl(var(--accent-foreground))" } }} className="h-[250px]">
                <BarChart data={data?.topCompleted ?? []} layout="vertical" margin={{ left: 120 }}>
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
                  {(data?.topCompleted ?? []).map(row => (
                    <TableRow key={row.fullName}>
                      <TableCell className="text-xs truncate max-w-[250px]">{row.fullName}</TableCell>
                      <TableCell className="text-right font-medium">{(row?.count ?? 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : (
            <EmptyDataNotice message="No article completions recorded yet — events will appear as readers finish articles" />
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3">Guide Engagement</h4>
          {data.guideViewCount > 0 ? (
            <div className="space-y-3">
              <StatRow label="Guide Pageviews" value={data?.guideViewCount ?? 0} />
              <StatRow label="Avg Scroll Depth" value={`${data?.avgGuideScroll ?? 0}%`} />
              <StatRow label="Avg Time on Guide" value={`${data?.avgGuideTime ?? 0}s`} />
            </div>
          ) : (
            <EmptyDataNotice variant="coming-soon" message="Guide scroll depth and time tracking — integration coming soon" />
          )}
        </div>
      </div>

      <InsightCard insights={(() => {
        const tips: string[] = [];
        const rate = data?.completionRate ?? 0;
        const total25 = data?.milestones?.["article_read_25"] ?? 0;
        const totalComplete = data?.milestones?.["article_read_complete"] ?? 0;

        if (total25 > 0 && rate < 25) {
          tips.push(`${totalComplete.toLocaleString()} of ${total25.toLocaleString()} readers who hit 25% finish the article (${rate}% completion). The biggest drop-off is 25→50% (${data?.dropoff25to50 ?? 0}% lost). Try adding a compelling question or stat in the first 2 paragraphs to hook readers past the fold.`);
        } else if (rate >= 25 && rate < 50) {
          tips.push(`${rate}% completion rate across ${total25.toLocaleString()} readers. ${data?.dropoff50to75 ?? 0}% drop off between 50–75% — consider breaking long articles into sections with subheadings or adding mid-article callouts.`);
        } else if (rate >= 50) {
          tips.push(`Excellent ${rate}% completion rate — ${totalComplete.toLocaleString()} readers finish out of ${total25.toLocaleString()} who start. Your content is keeping readers engaged to the end.`);
        }

        const topArticle = (data?.topCompleted ?? [])[0];
        if (topArticle && topArticle.count >= 3) {
          tips.push(`"${topArticle.fullName.length > 50 ? topArticle.fullName.slice(0, 47) + '…' : topArticle.fullName}" leads with ${topArticle.count.toLocaleString()} completions. Analyse what makes this article sticky and replicate the format.`);
        }

        const guideScroll = data?.avgGuideScroll ?? 0;
        if (guideScroll > 0 && guideScroll < 40) {
          tips.push(`Guides average only ${guideScroll}% scroll depth. Try adding a persistent table of contents or splitting guides into shorter, focused steps.`);
        } else if (guideScroll >= 70) {
          tips.push(`Guides are performing well with ${guideScroll}% avg scroll depth — readers are consuming most of the content.`);
        }

        return tips;
      })()} />
    </div>
  );
};

const StatRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex justify-between items-center p-2 rounded border">
    <span className="text-sm text-muted-foreground">{label}</span>
    <Badge variant="secondary" className="font-mono">{typeof value === "number" ? (value ?? 0).toLocaleString() : value}</Badge>
  </div>
);

const SectionSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-48" />
    <Skeleton className="h-[200px] w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);