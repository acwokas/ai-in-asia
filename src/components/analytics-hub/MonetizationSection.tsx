import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { InsightCard } from "./InsightCard";
import { EmptyDataNotice } from "./EmptyDataNotice";
import { Info, ExternalLink, CheckCircle2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useGoogleOAuthStatus, startGoogleOAuth } from "@/hooks/useGoogleOAuthStatus";

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

async function fetchAdSenseData(startDate: string, endDate: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/google-adsense-data?start_date=${startDate}&end_date=${endDate}`,
    { headers: { Authorization: `Bearer ${session.access_token}` } }
  );

  if (!res.ok) return null;
  return res.json();
}

const safeNum = (v: any): number => (typeof v === "number" && isFinite(v) ? v : 0);
const fmtN = (v: any): string => safeNum(v).toLocaleString();
const fmtD = (v: any, d = 2): string => safeNum(v).toFixed(d);

export const MonetizationSection = ({ startDate, range }: Props) => {
  const { data: oauthStatus } = useGoogleOAuthStatus();
  const isAdSenseConnected = oauthStatus?.connected?.adsense === true;

  const endDateStr = format(new Date(), "yyyy-MM-dd");
  const startDateStr = format(new Date(startDate), "yyyy-MM-dd");

  // Fetch real AdSense data when connected
  const { data: adsenseData } = useQuery({
    queryKey: ["adsense-data", range],
    queryFn: () => fetchAdSenseData(startDateStr, endDateStr),
    enabled: isAdSenseConnected,
    staleTime: 5 * 60 * 1000,
  });

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

      const pageCounts: Record<string, number> = {};
      for (const pv of pageviews) {
        const path = pv.page_path || "/";
        if (path.includes("__lovable")) continue;
        pageCounts[path] = (pageCounts[path] || 0) + 1;
      }
      const topPages = Object.entries(pageCounts)
        .map(([path, views]) => ({
          path, views,
          estImpressions: Math.round(views * AVG_ADS_PER_PAGE),
          estRevLow: ((views * AVG_ADS_PER_PAGE) / 1000 * RPM_LOW).toFixed(2),
          estRevHigh: ((views * AVG_ADS_PER_PAGE) / 1000 * RPM_HIGH).toFixed(2),
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 15);

      const dailyMap: Record<string, number> = {};
      for (const pv of pageviews) {
        const day = format(new Date(pv.viewed_at), "MMM dd");
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      }
      const dailyTrend = Object.entries(dailyMap)
        .map(([date, views]) => ({
          date, views,
          estRevLow: parseFloat(((views * AVG_ADS_PER_PAGE / 1000) * RPM_LOW).toFixed(2)),
          estRevHigh: parseFloat(((views * AVG_ADS_PER_PAGE / 1000) * RPM_HIGH).toFixed(2)),
        }));

      return {
        totalPageviews, estImpressions,
        dailyPageviews: Math.round(dailyPageviews),
        dailyRevLow: dailyRevLow.toFixed(2),
        dailyRevHigh: dailyRevHigh.toFixed(2),
        monthlyRevLow: monthlyRevLow.toFixed(2),
        monthlyRevHigh: monthlyRevHigh.toFixed(2),
        topPages, dailyTrend,
      };
    },
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>;
  if (!data) return <EmptyDataNotice message="Unable to load monetization data." />;

  const d = data;
  const hasRealData = isAdSenseConnected && adsenseData?.connected;

  const tips: string[] = [];
  if (hasRealData) {
    const totalEarnings = safeNum(adsenseData?.totals?.ESTIMATED_EARNINGS);
    tips.push(`1. Real AdSense earnings for this period: $${fmtD(totalEarnings)} from account "${adsenseData?.account ?? "unknown"}".`);
  } else if (d.totalPageviews === 0) {
    tips.push("1. No pageview data available yet. Revenue estimates will appear once analytics tracking is active.");
  } else {
    tips.push(`1. At ${(d.dailyPageviews ?? 0).toLocaleString()} daily pageviews with ~${AVG_ADS_PER_PAGE} ad units/page, estimated daily revenue is $${d.dailyRevLow}–$${d.dailyRevHigh} (at $${RPM_LOW}–$${RPM_HIGH} RPM for AI/tech content).`);
    if (d.topPages.length > 0) {
      const topPath = d?.topPages?.[0]?.path ?? "/";
      const topViews = d?.topPages?.[0]?.views ?? 0;
      tips.push(`2. "${topPath}" is your highest-revenue page with ${(topViews ?? 0).toLocaleString()} views. Ensure optimal ad placement here.`);
    }
    const monthLow = Number(d.monthlyRevLow ?? 0);
    if (monthLow < 50) {
      tips.push(`3. Projected monthly revenue ($${d.monthlyRevLow}–$${d.monthlyRevHigh}) is below the AdSense payment threshold of $100. Focus on growing organic traffic.`);
    } else {
      tips.push(`3. Projected monthly revenue range: $${d.monthlyRevLow}–$${d.monthlyRevHigh}. Focus on long-form articles (1,500+ words) for higher RPMs.`);
    }
  }

  const chartConfig = {
    estRevLow: { label: "Est. Rev (Low)", color: "hsl(var(--primary) / 0.5)" },
    estRevHigh: { label: "Est. Rev (High)", color: "hsl(var(--primary))" },
    earnings: { label: "Earnings", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      {/* AdSense Connection Status */}
      {!isAdSenseConnected ? (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Google AdSense</p>
            <p className="text-xs text-muted-foreground">Connect to see actual revenue, RPM, CPC, and click data</p>
          </div>
          <Button size="sm" onClick={() => startGoogleOAuth("adsense")} className="gap-2">
            <ExternalLink className="h-3.5 w-3.5" />
            Connect AdSense
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">Google AdSense connected — showing real data</span>
        </div>
      )}

      {/* Real AdSense Data */}
      {hasRealData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold">${fmtD(adsenseData?.totals?.ESTIMATED_EARNINGS)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Impressions</p>
              <p className="text-2xl font-bold">{fmtN(adsenseData?.totals?.IMPRESSIONS)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Clicks</p>
              <p className="text-2xl font-bold">{fmtN(adsenseData?.totals?.CLICKS)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Page RPM</p>
              <p className="text-2xl font-bold">${(adsenseData.totals?.PAGE_VIEWS_RPM ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">CPC</p>
              <p className="text-2xl font-bold">${(adsenseData.totals?.COST_PER_CLICK ?? 0).toFixed(2)}</p>
            </div>
          </div>

          {adsenseData.rows?.length > 1 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Daily AdSense Earnings</h4>
              <ChartContainer config={chartConfig} className="h-[220px]">
                <LineChart data={adsenseData.rows}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="DATE" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="ESTIMATED_EARNINGS" name="Earnings" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </div>
          )}
        </div>
      )}

      {/* Estimated Data (always shown as supplementary) */}
      <div>
        <h4 className="text-sm font-medium mb-3">{hasRealData ? "Estimated Breakdown (Internal Analytics)" : "Estimated Revenue"}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Pageviews</p>
            <p className="text-2xl font-bold">{(d.totalPageviews ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Est. Ad Impressions</p>
            <p className="text-2xl font-bold">{(d.estImpressions ?? 0).toLocaleString()}</p>
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
      </div>

      {d.totalPageviews === 0 ? (
        <EmptyDataNotice message="No pageview data available for revenue estimation." />
      ) : (
        <>
          {!hasRealData && d.dailyTrend.length > 1 && (
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
                      <TableCell className="text-right">{(p?.views ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{(p?.estImpressions ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">${p.estRevLow}–${p.estRevHigh}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {!isAdSenseConnected && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>Connect Google AdSense API for actual revenue data, viewability metrics, and CPC breakdowns.</span>
        </div>
      )}

      <InsightCard insights={tips} variant="tip" />
    </div>
  );
};
