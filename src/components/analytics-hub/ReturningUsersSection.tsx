import { useQuery } from "@tanstack/react-query";
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
}

export const ReturningUsersSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-returning", range],
    queryFn: async () => {
      const PAGE_SIZE = 1000;

      // Paginated fetch for sessions
      const fetchAllSessions = async () => {
        const rows: any[] = [];
        let from = 0;
        while (true) {
          const { data: batch } = await supabase
            .from("analytics_sessions")
            .select("user_id, session_id, is_bounce, duration_seconds, page_count")
            .gte("started_at", startDate)
            .range(from, from + PAGE_SIZE - 1);
          const safe = batch ?? [];
          rows.push(...safe);
          if (safe.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return rows;
      };

      // Paginated fetch for pageviews
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

      const [sessions, streaksRes, pageviews] = await Promise.all([
        fetchAllSessions(),
        supabase
          .from("reading_streaks")
          .select("user_id, current_streak, longest_streak, total_articles_read")
          .order("current_streak", { ascending: false })
          .limit(20),
        fetchAllPageviews(),
      ]);


      const streaks = streaksRes.data ?? [];

      // Sessions per user
      const userSessionCounts: Record<string, number> = {};
      (sessions ?? []).forEach((s) => {
        const key = s?.user_id || s?.session_id;
        if (!key) return;
        userSessionCounts[key] = (userSessionCounts[key] || 0) + 1;
      });

      const totalUnique = Object.keys(userSessionCounts).length;
      const returning = Object.values(userSessionCounts).filter(c => c > 1).length;
      const returnRate = totalUnique > 0 ? Math.round((returning / totalUnique) * 100) : 0;

      const bounceRate = sessions.length > 0
        ? Math.round(((sessions ?? []).filter(s => Boolean(s?.is_bounce)).length / sessions.length) * 100)
        : 0;

      const avgPages = sessions.length > 0
        ? (Number(((sessions ?? []).reduce((sum, v) => sum + (v?.page_count ?? 1), 0) / sessions.length) || 0)).toFixed(1)
        : "0";

      // Streak distribution for chart
      const streakBuckets: Record<string, number> = { "1d": 0, "2-3d": 0, "4-7d": 0, "8-14d": 0, "15-30d": 0, "30d+": 0 };
      (streaks ?? []).forEach((s) => {
        const c = s?.current_streak ?? 0;
        if (c <= 1) streakBuckets["1d"]++;
        else if (c <= 3) streakBuckets["2-3d"]++;
        else if (c <= 7) streakBuckets["4-7d"]++;
        else if (c <= 14) streakBuckets["8-14d"]++;
        else if (c <= 30) streakBuckets["15-30d"]++;
        else streakBuckets["30d+"]++;
      });
      const streakChartData = Object.entries(streakBuckets).map(([bucket, count]) => ({ bucket, count }));

      // Top revisited pages (pages viewed in multiple sessions)
      const pageSessionMap: Record<string, Set<string>> = {};
      (pageviews ?? []).forEach((pv) => {
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
        returnRate, bounceRate, avgPages, returning, totalUnique,
        topStreaks: (streaks ?? []).slice(0, 8),
        streakChartData: streakChartData ?? [],
        topRevisited: topRevisited ?? [],
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
          { label: "Return Rate", value: `${data?.returnRate ?? 0}%`, sub: `${data?.returning ?? 0}/${data?.totalUnique ?? 0}` },
          { label: "Bounce Rate", value: `${data?.bounceRate ?? 0}%` },
          { label: "Avg Pages/Session", value: data?.avgPages ?? "0" },
          { label: "Returning Visitors", value: data?.returning ?? 0 },
        ].map(s => (
          <div key={s.label} className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{typeof s.value === "number" ? (s.value ?? 0).toLocaleString() : s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            {"sub" in s && s.sub && <p className="text-[10px] text-muted-foreground">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Streak distribution chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Streak Distribution</h4>
          <ChartContainer config={{ count: { label: "Users", color: "hsl(var(--primary))" } }} className="h-[200px]">
            <BarChart data={data?.streakChartData ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="bucket" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Top revisited pages */}
        <div>
          <h4 className="text-sm font-medium mb-3">Top Revisited Pages</h4>
          {(data?.topRevisited ?? []).length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Unique Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.topRevisited ?? []).map((p) => (
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

      {/* Top streaks */}
      <div>
        <h4 className="text-sm font-medium mb-3">Top Reading Streaks</h4>
        <div className="space-y-2">
          {(data?.topStreaks ?? []).length ? (data?.topStreaks ?? []).map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-sm border rounded p-2">
              <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center rounded-full p-0">
                {i + 1}
              </Badge>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span>Current: {s?.current_streak ?? 0}d</span>
                  <span className="text-muted-foreground">Best: {s?.longest_streak ?? 0}d</span>
                </div>
                <Progress value={Math.min((((s?.current_streak ?? 0) / Math.max((s?.longest_streak ?? 0), 1)) * 100), 100)} className="h-1.5" />
              </div>
              <span className="text-xs text-muted-foreground">{(s?.total_articles_read ?? 0).toLocaleString()} read</span>
            </div>
          )) : <p className="text-xs text-muted-foreground">No streak data yet</p>}
        </div>
      </div>
    </div>
  );
};
