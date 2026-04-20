import { useQuery } from "@tanstack/react-query";
import { InsightCard } from "./InsightCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Props {
  startDate: string;
  range: string;
  totalSessions: number;
  uniqueVisitors: number;
}

const formatNumber = (value: unknown, fallback = "0") => {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num.toLocaleString() : fallback;
};

// The date tracking started (visitor_id column added)
const TRACKING_START_DATE = "2026-03-23";

export const ReturningUsersSection = ({ startDate, range, totalSessions, uniqueVisitors }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-returning", range],
    queryFn: async () => {
      const PAGE_SIZE = 1000;

      const fetchAllPageviews = async () => {
        const rows: any[] = [];
        let from = 0;
        while (true) {
          const { data: batch } = await supabase
            .from("analytics_pageviews")
            .select("page_path, session_id")
            .gte("viewed_at", startDate)
            .range(from, from + PAGE_SIZE - 1);
          const safe = batch ?? [];
          rows.push(...safe);
          if (safe.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return rows;
      };

      // Fetch visitor_id data for return rate
      const fetchVisitorSessions = async () => {
        const rows: any[] = [];
        let from = 0;
        while (true) {
          const { data: batch } = await supabase
            .from("analytics_sessions")
            .select("visitor_id, started_at")
            .gte("started_at", startDate)
            .not("visitor_id", "is", null)
            .range(from, from + PAGE_SIZE - 1);
          const safe = batch ?? [];
          rows.push(...safe);
          if (safe.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return rows;
      };

      const [streaksRes, pageviews, visitorSessions] = await Promise.all([
        supabase.from("reading_streaks")
          .select("user_id, current_streak, longest_streak, total_articles_read")
          .order("current_streak", { ascending: false }).limit(20),
        fetchAllPageviews(),
        fetchVisitorSessions(),
      ]);

      const streaks = streaksRes.data ?? [];

      // --- Visitor-based return rate ---
      const visitorDates: Record<string, Set<string>> = {};
      visitorSessions.forEach((s: any) => {
        const vid = s?.visitor_id;
        if (!vid) return;
        const day = (s.started_at ?? "").slice(0, 10);
        if (!day) return;
        if (!visitorDates[vid]) visitorDates[vid] = new Set();
        visitorDates[vid].add(day);
      });
      const totalUniqueVisitors = Object.keys(visitorDates).length;
      const returningVisitors = Object.values(visitorDates).filter(dates => dates.size >= 2).length;
      const visitorReturnRate = totalUniqueVisitors > 0
        ? Math.round((returningVisitors / totalUniqueVisitors) * 100) : 0;

      // Build per-session pageview counts
      const pvPerSessionCount: Record<string, number> = {};
      pageviews.forEach((pv) => {
        const sid = pv?.session_id;
        if (!sid) return;
        pvPerSessionCount[sid] = (pvPerSessionCount[sid] || 0) + 1;
      });

      const distinctSessions = Object.keys(pvPerSessionCount);
      const totalSessionsWithPV = distinctSessions.length;

      // Bounce rate: sessions with exactly 1 pageview row
      const singlePVSessions = distinctSessions.filter(sid => pvPerSessionCount[sid] === 1).length;
      const bounceRate = totalSessionsWithPV > 0
        ? Math.round((singlePVSessions / totalSessionsWithPV) * 100) : 0;

      // Avg pages/session: total pageview rows / distinct sessions with PV
      const totalPVCount = pageviews.length;
      const avgPages = totalSessionsWithPV > 0
        ? (totalPVCount / totalSessionsWithPV).toFixed(1) : "0";

      const streakBuckets: Record<string, number> = { "1d": 0, "2-3d": 0, "4-7d": 0, "8-14d": 0, "15-30d": 0, "30d+": 0 };
      streaks.forEach((s) => {
        const c = s?.current_streak ?? 0;
        if (c <= 1) streakBuckets["1d"]++;
        else if (c <= 3) streakBuckets["2-3d"]++;
        else if (c <= 7) streakBuckets["4-7d"]++;
        else if (c <= 14) streakBuckets["8-14d"]++;
        else if (c <= 30) streakBuckets["15-30d"]++;
        else streakBuckets["30d+"]++;
      });
      const streakChartData = Object.entries(streakBuckets).map(([bucket, count]) => ({ bucket, count }));

      const pageSessionMap: Record<string, Set<string>> = {};
      pageviews.forEach((pv) => {
        const path = pv?.page_path;
        const sessionId = pv?.session_id;
        if (!path || !sessionId || path.includes("__lovable")) return;
        if (!pageSessionMap[path]) pageSessionMap[path] = new Set();
        pageSessionMap[path].add(sessionId);
      });
      const topRevisited = Object.entries(pageSessionMap)
        .map(([path, sessionSet]) => ({ path, uniqueSessions: sessionSet.size }))
        .filter(p => p.uniqueSessions > 1)
        .sort((a, b) => b.uniqueSessions - a.uniqueSessions)
        .slice(0, 8);

      return {
        bounceRate, avgPages,
        topStreaks: streaks.slice(0, 8), streakChartData, topRevisited,
        totalUniqueVisitors, returningVisitors, visitorReturnRate,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  const totalUniqueVisitors = data?.totalUniqueVisitors ?? 0;
  const returningVisitors = data?.returningVisitors ?? 0;
  const visitorReturnRate = data?.visitorReturnRate ?? 0;
  const bounceRate = data?.bounceRate ?? 0;
  const avgPages = data?.avgPages ?? "0";
  const topRevisited = data?.topRevisited ?? [];
  const topStreaks = data?.topStreaks ?? [];
  const streakChartData = data?.streakChartData ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Return Rate (cookie)",
            value: totalUniqueVisitors > 0 ? `${visitorReturnRate}%` : "N/A",
            sub: totalUniqueVisitors > 0
              ? `${formatNumber(returningVisitors)} returning / ${formatNumber(totalUniqueVisitors)} unique visitors`
              : "No visitor_id data yet",
          },
          { label: "Bounce Rate", value: `${bounceRate}%` },
          { label: "Avg Pages/Session", value: avgPages, sub: parseFloat(avgPages) > 10 ? "High value - may include bot traffic" : "Total pageviews ÷ sessions with PV" },
          { label: "Unique Visitors", value: uniqueVisitors },
        ].map(s => (
          <div key={s.label} className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{typeof s.value === "number" ? (s.value ?? 0).toLocaleString() : s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            {"sub" in s && s.sub && <p className="text-[10px] text-muted-foreground">{s.sub}</p>}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
        Visitor tracking started {format(new Date(TRACKING_START_DATE), "MMM d, yyyy")} - return rate will become meaningful after 7+ days of data collection.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-3">Streak Distribution</h4>
          <ChartContainer config={{ count: { label: "Users", color: "hsl(var(--primary))" } }} className="h-[200px]">
            <BarChart data={streakChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="bucket" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3">Top Revisited Pages</h4>
          {topRevisited.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Page</TableHead><TableHead className="text-right">Unique Sessions</TableHead></TableRow></TableHeader>
              <TableBody>
                {topRevisited.map((p) => (
                  <TableRow key={p.path}>
                    <TableCell className="font-mono text-xs truncate max-w-[200px]">{p.path}</TableCell>
                    <TableCell className="text-right font-medium">{formatNumber(p?.uniqueSessions)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No revisited pages found</p>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Top Reading Streaks</h4>
        <div className="space-y-2">
          {topStreaks.length ? topStreaks.map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-3 text-sm border rounded p-2">
              <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center rounded-full p-0">{i + 1}</Badge>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span>Current: {s?.current_streak ?? 0}d</span>
                  <span className="text-muted-foreground">Best: {s?.longest_streak ?? 0}d</span>
                </div>
                <Progress value={Math.min(((s?.current_streak ?? 0) / Math.max(s?.longest_streak ?? 0, 1)) * 100, 100)} className="h-1.5" />
              </div>
              <span className="text-xs text-muted-foreground">{formatNumber(s?.total_articles_read)} read</span>
            </div>
          )) : <p className="text-xs text-muted-foreground">No streak data yet</p>}
        </div>
      </div>

      <InsightCard insights={(() => {
        const tips: string[] = [];
        const rate = visitorReturnRate;
        const bounce = bounceRate;

        if (totalUniqueVisitors === 0) {
          tips.push("1. No visitor_id data yet. Cookie-based return rate tracking started - results will appear within 24-48 hours.");
          tips.push("2. Once data flows, aim for a 20%+ return rate and <50% bounce rate as healthy baselines.");
          return tips;
        }

        if (rate < 15) {
          tips.push(`1. Only ${formatNumber(returningVisitors)} returning visitors out of ${formatNumber(totalUniqueVisitors)} (${rate}%). Three fixes: (a) add a "Continue Reading" section, (b) enable push notifications, (c) launch a weekly email digest.`);
        } else if (rate < 30) {
          tips.push(`1. ${rate}% return rate (${formatNumber(returningVisitors)} returning visitors) - approaching the 25-30% benchmark. Focus on converting returners to newsletter subscribers.`);
        } else {
          tips.push(`1. Strong ${rate}% return rate with ${formatNumber(returningVisitors)} returning visitors - above the 25-30% benchmark. Consider a members-only section for loyal readers.`);
        }

        if (bounce > 60) {
          tips.push(`2. ${bounce}% bounce rate (industry average: 40-60%). Add "Read Next" recommendations at 75% scroll depth and related articles in the sidebar.`);
        } else if (bounce <= 40) {
          tips.push(`2. ${bounce}% bounce rate - excellent, well below the 40-60% industry average. Visitors are exploring ${avgPages} pages per session.`);
        } else {
          tips.push(`2. ${bounce}% bounce rate - within the 40-60% industry norm. Test adding a "Trending Now" sidebar widget.`);
        }

        const bestStreak = (topStreaks?.[0] as any)?.longest_streak ?? 0;
        if (bestStreak >= 7) {
          tips.push(`3. Top reading streak of ${bestStreak} days. Reward these readers with exclusive early-access content.`);
        } else if (totalUniqueVisitors > 50) {
          tips.push(`3. Best streak: ${bestStreak} days among ${formatNumber(totalUniqueVisitors)} visitors. Publish on a consistent schedule and add push notification reminders.`);
        }

        return tips;
      })()} />
    </div>
  );
};
