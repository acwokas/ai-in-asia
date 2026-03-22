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
}

const PAGE_SIZE = 1000;

export const NewUsersSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-new-users", range],
    queryFn: async () => {
      const fetchAllSessionStarts = async () => {
        const rows: Array<{ started_at: string | null }> = [];
        let from = 0;

        while (true) {
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

      const [sessionsCountRes, sessionStarts, recentSessionsRes, landingRes] = await Promise.all([
        supabase
          .from("analytics_sessions")
          .select("*", { count: "exact", head: true })
          .gte("started_at", startDate),
        fetchAllSessionStarts(),
        supabase
          .from("analytics_sessions")
          .select("session_id, user_id, started_at, landing_page, device_type, referrer_domain")
          .gte("started_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
          .order("started_at", { ascending: false })
          .limit(50),
        // Use paginated fetch for landing pages too
        (async () => {
          const rows: Array<{ landing_page: string | null }> = [];
          let from = 0;
          while (true) {
            const { data: batch } = await supabase
              .from("analytics_sessions")
              .select("landing_page")
              .gte("started_at", startDate)
              .not("landing_page", "is", null)
              .range(from, from + PAGE_SIZE - 1);
            const safeBatch = batch ?? [];
            rows.push(...safeBatch);
            if (safeBatch.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
          }
          return { data: rows };
        })(),
      ]);

      const sessionsForChart = sessionStarts ?? [];
      const recentSessions = recentSessionsRes.data ?? [];
      const landings = landingRes.data ?? [];

      const dailyCounts: Record<string, number> = {};
      sessionsForChart.forEach((s) => {
        if (!s?.started_at) return;
        const parsed = parseISO(s.started_at);
        if (Number.isNaN(parsed.getTime())) return;
        const day = format(parsed, "yyyy-MM-dd");
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      });

      const parsedStart = parseISO(startDate);
      const start = Number.isNaN(parsedStart.getTime())
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : parsedStart;
      const end = new Date();
      const allDays = eachDayOfInterval({ start, end });
      const dailySessions = allDays.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        return { date: format(d, "MMM d"), sessions: dailyCounts[key] || 0 };
      });

      const landingCounts: Record<string, number> = {};
      landings.forEach((l) => {
        const p = l?.landing_page || "/";
        landingCounts[p] = (landingCounts[p] || 0) + 1;
      });
      const topEntryPages = Object.entries(landingCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, count]) => ({ page, count }));

      return {
        totalSessions: sessionsCountRes.count ?? 0,
        activeNow: recentSessions.length,
        dailySessions,
        topEntryPages,
      };
    },
    staleTime: 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 max-w-sm">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{(data?.totalSessions ?? 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Sessions</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{(data?.activeNow ?? 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Active (15 min)</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Daily Sessions</h4>
        <ChartContainer config={{ sessions: { label: "Sessions", color: "hsl(var(--primary))" } }} className="h-[220px]">
          <AreaChart data={data?.dailySessions ?? []}>
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
        {data?.topEntryPages?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.topEntryPages ?? []).map((p) => (
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
    </div>
  );
};
