import { useQuery } from "@tanstack/react-query";
import { InsightCard } from "./InsightCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface Props {
  startDate: string;
  range: string;
}

export const ReturningUsersSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-returning", range],
    queryFn: async () => {
      const PAGE_SIZE = 1000;

      const fetchAllSessions = async () => {
        const rows: any[] = [];
        let from = 0;
        while (true) {
          const { data: batch } = await supabase.from("analytics_sessions")
            .select("user_id, session_id, is_bounce, duration_seconds, page_count")
            .gte("started_at", startDate).range(from, from + PAGE_SIZE - 1);
          const safe = batch ?? [];
          rows.push(...safe);
          if (safe.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return rows;
      };

      const fetchAllPageviews = async () => {
        const rows: any[] = [];
        let from = 0;
        while (true) {
          const { data: batch } = await supabase.from("analytics_pageviews")
            .select("page_path, session_id").gte("viewed_at", startDate).range(from, from + PAGE_SIZE - 1);
          const safe = batch ?? [];
          rows.push(...safe);
          if (safe.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return rows;
      };

      const [sessions, streaksRes, pageviews] = await Promise.all([
        fetchAllSessions(),
        supabase.from("reading_streaks")
          .select("user_id, current_streak, longest_streak, total_articles_read")
          .order("current_streak", { ascending: false }).limit(20),
        fetchAllPageviews(),
      ]);

      const streaks = streaksRes.data ?? [];

      // ── Build per-session DISTINCT page path counts ──
      const pvPerSession: Record<string, Set<string>> = {};
      pageviews.forEach((pv) => {
        const sid = pv?.session_id;
        const path = pv?.page_path;
        if (!sid || !path) return;
        if (!pvPerSession[sid]) pvPerSession[sid] = new Set();
        pvPerSession[sid].add(path);
      });

      const sessionsWithPV = Object.keys(pvPerSession);
      const totalSessionsWithPV = sessionsWithPV.length;

      // ── Return rate ──
      const userSessionCounts: Record<string, number> = {};
      sessions.forEach((s) => {
        const key = s?.user_id || s?.session_id;
        if (!key) return;
        userSessionCounts[key] = (userSessionCounts[key] || 0) + 1;
      });

      const totalUnique = Object.keys(userSessionCounts).length;
      const returning = Object.values(userSessionCounts).filter(c => c > 1).length;
      const returnRate = totalUnique > 0 ? Math.round((returning / totalUnique) * 100) : 0;

      // ── Bounce rate: sessions with only 1 distinct page ──
      const singlePVSessions = sessionsWithPV.filter(sid => pvPerSession[sid].size === 1).length;
      const bounceRate = totalSessionsWithPV > 0
        ? Math.round((singlePVSessions / totalSessionsWithPV) * 100) : 0;

      // ── Avg distinct pages/session ──
      const totalDistinctPages = sessionsWithPV.reduce((sum, sid) => sum + pvPerSession[sid].size, 0);
      const avgPages = totalSessionsWithPV > 0
        ? (totalDistinctPages / totalSessionsWithPV).toFixed(1) : "0";

      const freqBuckets: Record<string, number> = { "1 visit": 0, "2-3 visits": 0, "4-7 visits": 0, "8+ visits": 0 };
      Object.values(userSessionCounts).forEach(c => {
        if (c === 1) freqBuckets["1 visit"]++;
        else if (c <= 3) freqBuckets["2-3 visits"]++;
        else if (c <= 7) freqBuckets["4-7 visits"]++;
        else freqBuckets["8+ visits"]++;
      });
      const powerUsers = freqBuckets["8+ visits"];

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
        if (!path || !sessionId) return;
        if (!pageSessionMap[path]) pageSessionMap[path] = new Set();
        pageSessionMap[path].add(sessionId);
      });
      const topRevisited = Object.entries(pageSessionMap)
        .map(([path, sessionSet]) => ({ path, uniqueSessions: sessionSet.size }))
        .filter(p => p.uniqueSessions > 1)
        .sort((a, b) => b.uniqueSessions - a.uniqueSessions)
        .slice(0, 8);

      return {
        returnRate, bounceRate, avgPages, returning, totalUnique, powerUsers,
        topStreaks: streaks.slice(0, 8), streakChartData, topRevisited,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Return Rate", value: `${data.returnRate}%`, sub: `${data.returning}/${data.totalUnique}` },
          { label: "Bounce Rate", value: `${data.bounceRate}%` },
          { label: "Avg Pages/Session", value: data.avgPages, sub: parseFloat(data.avgPages) > 10 ? "Distinct paths only — high value may indicate bot traffic" : "Distinct page paths per session" },
          { label: "Returning Visitors", value: data.returning },
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
        const rate = data.returnRate;
        const returning = data.returning;
        const totalUnique = data.totalUnique;
        const bounce = data.bounceRate;
        const power = data.powerUsers;

        if (totalUnique === 0) {
          tips.push("1. No visitor data yet. Return rate, bounce rate, and reading streaks will populate as sessions are tracked. Ensure useAnalyticsTracking is firing on every page.");
          tips.push("2. Once data flows, aim for a 20%+ return rate and <50% bounce rate as healthy baselines for a content site.");
          return tips;
        }

        // Return rate
        if (rate < 15) {
          tips.push(`1. Only ${(returning ?? 0).toLocaleString()} of ${(totalUnique ?? 0).toLocaleString()} visitors returned (${rate}% — well below the 25-30% benchmark for content sites). Three fixes: (a) add a "Continue Reading" section on the homepage for returning visitors, (b) enable browser push notifications for new articles, (c) launch a weekly email digest summarising the best content.`);
        } else if (rate < 30) {
          tips.push(`1. ${rate}% return rate (${(returning ?? 0).toLocaleString()} returning visitors) — approaching the 25-30% benchmark. Focus on converting these returners to newsletter subscribers: they've already shown intent, a well-placed inline signup form could capture 5-10% of them.`);
        } else {
          tips.push(`1. Strong ${rate}% return rate with ${(returning ?? 0).toLocaleString()} returning visitors — above the 25-30% content site benchmark. Your audience is developing a reading habit. Consider launching a members-only section or premium newsletter for your most loyal readers.`);
        }

        // Bounce rate
        if (bounce > 60) {
          tips.push(`2. ⚠️ ${bounce}% bounce rate (industry average for content sites: 40-60%). Over half of visitors leave after one page. Immediate actions: add a "Read Next" recommendation at 75% scroll depth, show related articles in the sidebar, and ensure mobile load time is under 3 seconds.`);
        } else if (bounce <= 40) {
          tips.push(`2. ${bounce}% bounce rate — excellent, well below the 40-60% industry average. Visitors are exploring multiple pages per session (${data.avgPages} avg). This indicates strong internal linking and content relevance.`);
        } else {
          tips.push(`2. ${bounce}% bounce rate — within the 40-60% industry norm. To improve: test adding a "Trending Now" sidebar widget or a persistent "Related Articles" strip at article end.`);
        }

        // Power users + streaks
        const bestStreak = (data?.topStreaks?.[0] as any)?.longest_streak ?? 0;
        if (power > 0 && bestStreak >= 7) {
          tips.push(`3. ${(power ?? 0).toLocaleString()} power users (8+ visits) with a top reading streak of ${bestStreak} days. These readers are your most valuable audience — they're ${rate > 20 ? '3-5x' : '2-3x'} more likely to subscribe or share. Create exclusive early-access content or a "Reader of the Week" feature to reward and retain them.`);
        } else if (power > 0) {
          tips.push(`3. ${(power ?? 0).toLocaleString()} power user${power === 1 ? '' : 's'} (8+ visits), best streak: ${bestStreak} days. Build on this: add streak reminders via push notifications and a visible streak counter on the profile page to gamify daily reading.`);
        } else if (totalUnique > 50) {
          tips.push(`3. No power users (8+ visits) detected yet among ${(totalUnique ?? 0).toLocaleString()} visitors. To build habitual readers: publish on a consistent schedule (same time, same days), add a "Daily Pick" feature, and send push notification reminders.`);
        }

        return tips;
      })()} />
    </div>
  );
};
