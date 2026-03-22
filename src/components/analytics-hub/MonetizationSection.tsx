import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { InsightCard } from "./InsightCard";
import { EmptyDataNotice } from "./EmptyDataNotice";
import { Info } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Props {
  startDate: string;
  range: string;
}

const AVG_ADS_PER_PAGE = 1.5;
const RPM_LOW = 2;
const RPM_HIGH = 5;

async function fetchAllPageviews(startDate: string) {
  const rows: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("analytics_pageviews")
      .select("page_path,viewed_at")
      .gte("viewed_at", startDate)
      .range(from, from + 999);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return rows;
}

export const MonetizationSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-monetization", range],
    queryFn: async () => {
      const pageviews = await fetchAllPageviews(startDate);
      const totalPageviews = pageviews.length;
      const estImpressions = Math.round(totalPageviews * AVG_ADS_PER_PAGE);
      const days = differenceInDays(new Date(), new Date(startDate)) || 1;

      const dailyPageviews = totalPageviews / days;
      const dailyImpressions = estImpressions / days;
      const dailyRevLow = (dailyImpressions / 1000) * RPM_LOW;
      const dailyRevHigh = (dailyImpressions / 1000) * RPM_HIGH;
      const monthlyRevLow = dailyRevLow * 30;
      const monthlyRevHigh = dailyRevHigh * 30;

      // Page breakdown
      const pageCounts: Record<string, number> = {};
      for (const pv of pageviews) {
        const path = pv.page_path || "/";
        pageCounts[path] = (pageCounts[path] || 0) + 1;
      }
      const topPages = Object.entries(pageCounts)
        .map(([path, views]) => ({
          path,
          views,
          estImpressions: Math.round(views * AVG_ADS_PER_PAGE),
          estRevLow: ((views * AVG_ADS_PER_PAGE) / 1000 * RPM_LOW).toFixed(2),
          estRevHigh: ((views * AVG_ADS_PER_PAGE) / 1000 * RPM_HIGH).toFixed(2),
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 15);

      // Daily trend
      const dailyMap: Record<string, number> = {};
      for (const pv of pageviews) {
        const day = format(new Date(pv.viewed_at), "MMM dd");
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      }
      const dailyTrend = Object.entries(dailyMap)
        .map(([date, views]) => ({
          date,
          views,
          estRevLow: parseFloat(((views * AVG_ADS_PER_PAGE / 1000) * RPM_LOW).toFixed(2)),
          estRevHigh: parseFloat(((views * AVG_ADS_PER_PAGE / 1000) * RPM_HIGH).toFixed(2)),
        }));

      return {
        totalPageviews,
        estImpressions,
        dailyPageviews: Math.round(dailyPageviews),
        dailyRevLow: dailyRevLow.toFixed(2),
        dailyRevHigh: dailyRevHigh.toFixed(2),
        monthlyRevLow: monthlyRevLow.toFixed(2),
        monthlyRevHigh: monthlyRevHigh.toFixed(2),
        topPages,
        dailyTrend,
      };
    },
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>;
  if (!data) return <EmptyDataNotice message="Unable to load monetization data." />;

  const d = data;

  const tips: string[] = [];
  if (d.totalPageviews === 0) {
    tips.push("1. No pageview data available yet. Revenue estimates will appear once analytics tracking is active.");
  } else {
    tips.push(`1. At ${d.dailyPageviews.toLocaleString()} daily pageviews with ~${AVG_ADS_PER_PAGE} ad units/page, estimated daily revenue is $${d.dailyRevLow}–$${d.dailyRevHigh} (at $${RPM_LOW}–$${RPM_HIGH} RPM for AI/tech content).`);
    
    if (d.topPages.length > 0) {
      const topPath = d.topPages[0].path;
      const topViews = d.topPages[0].views;
      tips.push(`2. "${topPath}" is your highest-revenue page with ${topViews.toLocaleString()} views. Ensure optimal ad placement here — consider adding a second ad unit in the sidebar or after the first paragraph.`);
    }

    const monthLow = parseFloat(d.monthlyRevLow);
    if (monthLow < 50) {
      tips.push(`3. Projected monthly revenue ($${d.monthlyRevLow}–$${d.monthlyRevHigh}) is below the AdSense payment threshold of $100. Focus on growing organic traffic before optimizing ad placements.`);
    } else {
      tips.push(`3. Projected monthly revenue range: $${d.monthlyRevLow}–$${d.monthlyRevHigh}. To maximize RPM, focus on long-form articles (1,500+ words) which typically have 2-3x higher RPMs than short content.`);
    }
  }

  const chartConfig = {
    estRevLow: { label: "Est. Rev (Low)", color: "hsl(var(--primary) / 0.5)" },
    estRevHigh: { label: "Est. Rev (High)", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Pageviews</p>
          <p className="text-2xl font-bold">{d.totalPageviews.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Est. Ad Impressions</p>
          <p className="text-2xl font-bold">{d.estImpressions.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">~{AVG_ADS_PER_PAGE} units/page</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Est. Daily Revenue</p>
          <p className="text-2xl font-bold">${d.dailyRevLow}–${d.dailyRevHigh}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Est. Monthly Revenue</p>
          <p className="text-2xl font-bold">${d.monthlyRevLow}–${d.monthlyRevHigh}</p>
        </div>
      </div>

      {d.totalPageviews === 0 ? (
        <EmptyDataNotice message="No pageview data available for revenue estimation." />
      ) : (
        <>
          {/* Daily revenue trend */}
          {d.dailyTrend.length > 1 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Estimated Daily Revenue Trend</h4>
              <ChartContainer config={chartConfig} className="h-[220px]">
                <LineChart data={d.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="estRevHigh" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="estRevLow" stroke="hsl(var(--primary) / 0.5)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ChartContainer>
            </div>
          )}

          {/* Top pages by revenue */}
          <div>
            <h4 className="text-sm font-medium mb-3">Top Pages by Estimated Revenue</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Est. Impressions</TableHead>
                    <TableHead className="text-right">Est. Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.topPages.map((p) => (
                    <TableRow key={p.path}>
                      <TableCell className="font-medium text-xs max-w-[250px] truncate">{p.path}</TableCell>
                      <TableCell className="text-right">{p.views.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{p.estImpressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${p.estRevLow}–${p.estRevHigh}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Future enhancement note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>Connect Google AdSense API for actual revenue data, viewability metrics, and CPC breakdowns.</span>
      </div>

      <InsightCard insights={tips} variant="tip" />
    </div>
  );
};
