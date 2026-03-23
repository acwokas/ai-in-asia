import { useQuery } from "@tanstack/react-query";
import { InsightCard } from "./InsightCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  startDate: string;
  range: string;
  totalSessions: number;
  uniqueVisitors: number;
}

export const ReturningUsersSection = ({ startDate, range, totalSessions, uniqueVisitors }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-returning", range],
    queryFn: async () => {
      console.log("ReturningUsersSection v3 loaded");
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

      const [streaksRes, pageviews] = await Promise.all([
        supabase.from("reading_streaks")
          .select("user_id, current_streak, longest_streak, total_articles_read")
          .order("current_streak", { ascending: false }).limit(20),
        fetchAllPageviews(),
      ]);

      const streaks = streaksRes.data ?? [];

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
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Return rate derived from shared session stats
  const returning = uniqueVisitors > 0 ? Math.max(0, totalSessions - uniqueVisitors) : 0;
  const returnRate = uniqueVisitors > 0 ? Math.round((returning / totalSessions) * 100) : 0;

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Return Rate", value: `${returnRate}%`, sub: `${returning.toLocaleString()} repeat / ${totalSessions.toLocaleString()} total` },
          { label: "Bounce Rate", value: `${data.bounceRate}%` },
          { label: "Avg Pages/Session", value: data.avgPages, sub: parseFloat(data.avgPages) > 10 ? "High value — may include bot traffic" : "Total pageviews ÷ sessions with PV" },
          { label: "Unique Visitors", value: uniqueVisitors },
        ].map(s => (
          <div key={s.label} className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{typeof s.value === "number" ? (s.value ?? 0).toLocaleString() : s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            {"sub" in s && s.sub && <p className="text-[10px] text-muted-foreground">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-3">Streak Distribution</h4>
          <ChartContainer config={{ count: { label: "Users", color: "hsl(var(--primary))" } }} className="h-[200px]">
            <BarChart data={data.streakChartData}>
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
          {data.topRevisited.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Page</TableHead><TableHead className="text-right">Unique Sessions</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.topRevisited.map((p) => (
                  <TableRow key={p.path}>
                    <TableCell className="font-mono text-xs truncate max-w-[200px]">{p.path}</TableCell>
                    <TableCell className="text-right font-medium">{(p?.uniqueSessions ?? 0).toLocaleString()}</TableCell>
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
          {data.topStreaks.length ? data.topStreaks.map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-3 text-sm border rounded p-2">
              <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center rounded-full p-0">{i + 1}</Badge>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span>Current: {s?.current_streak ?? 0}d</span>
                  <span className="text-muted-foreground">Best: {s?.longest_streak ?? 0}d</span>
                </div>
                <Progress value={Math.min(((s?.current_streak ?? 0) / Math.max(s?.longest_streak ?? 0, 1)) * 100, 100)} className="h-1.5" />
              </div>
              <span className="text-xs text-muted-foreground">{(s?.total_articles_read ?? 0).toLocaleString()} read</span>
            </div>
          )) : <p className="text-xs text-muted-foreground">No streak data yet</p>}
        </div>
      </div>

      <InsightCard insights={(() => {
        const tips: string[] = [];
        const rate = returnRate;
        const bounce = data.bounceRate;

        if (uniqueVisitors === 0) {
          tips.push("1. No visitor data yet. Return rate, bounce rate, and reading streaks will populate as sessions are tracked.");
          tips.push("2. Once data flows, aim for a 20%+ return rate and <50% bounce rate as healthy baselines.");
          return tips;
        }

        if (rate < 15) {
          tips.push(`1. Only ${returning.toLocaleString()} repeat sessions out of ${totalSessions.toLocaleString()} (${rate}%). Three fixes: (a) add a "Continue Reading" section, (b) enable push notifications, (c) launch a weekly email digest.`);
        } else if (rate < 30) {
          tips.push(`1. ${rate}% return rate (${returning.toLocaleString()} repeat sessions) — approaching the 25-30% benchmark. Focus on converting returners to newsletter subscribers.`);
        } else {
          tips.push(`1. Strong ${rate}% return rate with ${returning.toLocaleString()} repeat sessions — above the 25-30% benchmark. Consider a members-only section for loyal readers.`);
        }

        if (bounce > 60) {
          tips.push(`2. ⚠️ ${bounce}% bounce rate (industry average: 40-60%). Add "Read Next" recommendations at 75% scroll depth and related articles in the sidebar.`);
        } else if (bounce <= 40) {
          tips.push(`2. ${bounce}% bounce rate — excellent, well below the 40-60% industry average. Visitors are exploring ${data.avgPages} pages per session.`);
        } else {
          tips.push(`2. ${bounce}% bounce rate — within the 40-60% industry norm. Test adding a "Trending Now" sidebar widget.`);
        }

        const bestStreak = (data?.topStreaks?.[0] as any)?.longest_streak ?? 0;
        if (bestStreak >= 7) {
          tips.push(`3. Top reading streak of ${bestStreak} days. Reward these readers with exclusive early-access content.`);
        } else if (uniqueVisitors > 50) {
          tips.push(`3. Best streak: ${bestStreak} days among ${uniqueVisitors.toLocaleString()} visitors. Publish on a consistent schedule and add push notification reminders.`);
        }

        return tips;
      })()} />
    </div>
  );
};
