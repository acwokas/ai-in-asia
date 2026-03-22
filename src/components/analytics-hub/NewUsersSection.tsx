import { useQuery } from "@tanstack/react-query";
import { InsightCard } from "./InsightCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, parseISO, eachDayOfInterval } from "date-fns";

interface Props {
  startDate: string;
  range: string;
  totalSessions: number;
}

export const NewUsersSection = ({ startDate, range, totalSessions }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-new-users", range],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      const MAX_ROWS = 10000;

      const fetchSessionStarts = async () => {
        const rows: Array<{ started_at: string | null }> = [];
        let from = 0;
        while (rows.length < MAX_ROWS) {
          const { data: batch, error } = await supabase
            .from("analytics_sessions")
            .select("started_at")
            .gte("started_at", startDate)
            .order("started_at", { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          const safeBatch = batch ?? [];
          rows.push(...safeBatch);
          if (safeBatch.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return rows;
      };

      const fetchLandingPages = async () => {
        const rows: Array<{ landing_page: string | null }> = [];
        let from = 0;
        while (rows.length < MAX_ROWS) {
          const { data: batch } = await supabase.from("analytics_sessions")
            .select("landing_page").gte("started_at", startDate).not("landing_page", "is", null)
            .range(from, from + PAGE_SIZE - 1);
          const safeBatch = batch ?? [];
          rows.push(...safeBatch);
          if (safeBatch.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return rows;
      };

      const [sessionStarts, landings] = await Promise.all([
        fetchSessionStarts(),
        fetchLandingPages(),
      ]);

      const sessionsForChart = sessionStarts ?? [];

      const dailyCounts: Record<string, number> = {};
      sessionsForChart.forEach((s) => {
        if (!s?.started_at) return;
        const parsed = parseISO(s.started_at);
        if (Number.isNaN(parsed.getTime())) return;
        dailyCounts[format(parsed, "yyyy-MM-dd")] = (dailyCounts[format(parsed, "yyyy-MM-dd")] || 0) + 1;
      });

      const parsedStart = parseISO(startDate);
      const start = Number.isNaN(parsedStart.getTime()) ? new Date(Date.now() - 7 * 86400000) : parsedStart;
      const allDays = eachDayOfInterval({ start, end: new Date() });
      const dailySessions = allDays.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        return { date: format(d, "MMM d"), sessions: dailyCounts[key] || 0 };
      });

      const landingCounts: Record<string, number> = {};
      landings.forEach((l) => { const p = l?.landing_page || "/"; landingCounts[p] = (landingCounts[p] || 0) + 1; });
      const topEntryPages = Object.entries(landingCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([page, count]) => ({ page, count }));

      const dailyValues = Object.values(dailyCounts);
      const avgDaily = dailyValues.length > 0 ? Math.round(dailyValues.reduce((s, v) => s + v, 0) / dailyValues.length) : 0;
      const recentDays = dailySessions.slice(-7);
      const priorDays = dailySessions.slice(-14, -7);
      const recentAvg = recentDays.length > 0 ? Math.round(recentDays.reduce((s, d) => s + d.sessions, 0) / recentDays.length) : 0;
      const priorAvg = priorDays.length > 0 ? Math.round(priorDays.reduce((s, d) => s + d.sessions, 0) / priorDays.length) : 0;

      const peakDay = dailySessions.reduce((best, d) => d.sessions > best.sessions ? d : best, { date: "", sessions: 0 });

      return { dailySessions, topEntryPages, avgDaily, recentAvg, priorAvg, peakDay };
    },
    staleTime: 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 max-w-xs">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{totalSessions.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Sessions</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{(data.avgDaily ?? 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Avg Daily</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Daily Sessions</h4>
        <ChartContainer config={{ sessions: { label: "Sessions", color: "hsl(var(--primary))" } }} className="h-[220px]">
          <AreaChart data={data.dailySessions}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="sessions" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Top Entry Pages</h4>
        {data.topEntryPages.length ? (
          <Table>
            <TableHeader><TableRow><TableHead>Page</TableHead><TableHead className="text-right">Sessions</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.topEntryPages.map((p) => (
                <TableRow key={p.page}>
                  <TableCell className="font-mono text-xs truncate max-w-[300px]">{p.page}</TableCell>
                  <TableCell className="text-right font-medium">{(p?.count ?? 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No entry page data</p>
        )}
      </div>

      <InsightCard insights={(() => {
        const tips: string[] = [];
        const total = totalSessions;
        const recentAvg = data.recentAvg;
        const priorAvg = data.priorAvg;

        if (total === 0) {
          tips.push("1. No sessions recorded yet. Verify AnalyticsProvider is wrapping your app.");
          tips.push("2. Once tracking is active, you'll see daily session trends and entry page distribution.");
          return tips;
        }

        if (priorAvg > 0 && recentAvg > 0) {
          const changePct = Math.round(((recentAvg - priorAvg) / priorAvg) * 100);
          if (changePct > 10) {
            tips.push(`1. 📈 Traffic trending up: ${(recentAvg ?? 0).toLocaleString()} sessions/day this week vs ${(priorAvg ?? 0).toLocaleString()} last week (+${changePct}%). Identify what drove the spike and double down.`);
          } else if (changePct < -10) {
            tips.push(`1. 📉 Traffic down ${Math.abs(changePct)}%: ${(recentAvg ?? 0).toLocaleString()} sessions/day vs ${(priorAvg ?? 0).toLocaleString()} last week. Check publishing frequency and top entry pages for 404s.`);
          } else {
            tips.push(`1. Traffic stable at ~${(recentAvg ?? 0).toLocaleString()} sessions/day (±${Math.abs(changePct)}% week-over-week).`);
          }
        } else {
          tips.push(`1. ${(total ?? 0).toLocaleString()} total sessions this period, averaging ${(data.avgDaily ?? 0).toLocaleString()}/day. ${(data.peakDay?.sessions ?? 0) > ((data.avgDaily ?? 0) * 1.5) ? `Peak day was ${data.peakDay?.date ?? '—'} with ${data.peakDay?.sessions ?? 0} sessions.` : ''}`);
        }

        const top = data?.topEntryPages?.[0];
        if (top && total > 0) {
          const pct = Math.round((top.count / total) * 100);
          if (pct > 50) {
            tips.push(`2. ⚠️ ${pct}% of all sessions land on "${top.page}" — single point of failure. Prioritise SEO on other high-value pages.`);
          } else {
            tips.push(`2. Top entry page "${top.page}" captures ${pct}% of sessions (${(top.count ?? 0).toLocaleString()} visits).`);
          }
        }

        const entryCount = data?.topEntryPages?.length ?? 0;
        if (entryCount <= 3 && total > 100) {
          tips.push(`3. Only ${entryCount} entry pages across ${(total ?? 0).toLocaleString()} sessions. Invest in long-tail SEO for more entry points.`);
        } else if (entryCount >= 8) {
          tips.push(`3. ${entryCount} distinct entry pages — good SEO diversity.`);
        }

        return tips;
      })()} />
    </div>
  );
};
