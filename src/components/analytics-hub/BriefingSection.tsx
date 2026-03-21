import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, eachWeekOfInterval, parseISO, endOfWeek, isWithinInterval } from "date-fns";

interface Props {
  startDate: string;
  range: string;
}

export const BriefingSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-briefing", range],
    queryFn: async () => {
      // Query from Dec 2025 for weekly chart, but use startDate for stats
      const dec2025 = "2025-12-01T00:00:00.000Z";
      const chartStart = dec2025 < startDate ? dec2025 : startDate;

      const [eventsRes, pageviewsRes, editionsRes] = await Promise.all([
        supabase
          .from("analytics_events")
          .select("event_name, event_data, created_at")
          .in("event_name", ["briefing_view", "briefing_story_read", "briefing_complete", "briefing_outbound_click", "briefing_context_expand"])
          .gte("created_at", startDate)
          .limit(500),
        supabase
          .from("analytics_sessions")
          .select("session_id, started_at, landing_page, duration_seconds")
          .like("landing_page", "%three-before-nine%")
          .gte("started_at", chartStart)
          .order("started_at", { ascending: true })
          .limit(1000),
        supabase
          .from("newsletter_editions")
          .select("id, edition_date, subject_line")
          .eq("status", "sent")
          .order("edition_date", { ascending: false })
          .limit(5),
      ]);

      const events = eventsRes.data ?? [];
      const sessions = pageviewsRes.data ?? [];
      const editions = editionsRes.data ?? [];

      const views = (events ?? []).filter(e => e?.event_name === "briefing_view").length;
      const storyReads = (events ?? []).filter(e => e?.event_name === "briefing_story_read").length;
      const completions = (events ?? []).filter(e => e?.event_name === "briefing_complete").length;
      const outboundClicks = (events ?? []).filter(e => e?.event_name === "briefing_outbound_click").length;
      const contextExpands = (events ?? []).filter(e => e?.event_name === "briefing_context_expand").length;
      const completionRate = views > 0 ? Math.round((completions / views) * 100) : 0;

      // Weekly sessions LineChart since Dec 2025
      const parsedStart = parseISO(chartStart);
      const start = Number.isNaN(parsedStart.getTime()) ? new Date("2025-12-01T00:00:00.000Z") : parsedStart;
      const end = new Date();
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
      const weeklyData = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const count = (sessions ?? []).filter((s) => {
          if (!s?.started_at) return false;
          const d = parseISO(s.started_at);
          if (Number.isNaN(d.getTime())) return false;
          return isWithinInterval(d, { start: weekStart, end: weekEnd });
        }).length;
        return { week: format(weekStart, "MMM d"), sessions: count };
      });

      const totalBriefingSessions = (sessions ?? []).length;
      const avgDuration = sessions.length > 0
        ? Math.round((sessions ?? []).reduce((sum, p) => sum + (p?.duration_seconds ?? 0), 0) / sessions.length)
        : 0;

      return {
        views,
        storyReads,
        completions,
        outboundClicks,
        contextExpands,
        completionRate,
        weeklyData: weeklyData ?? [],
        editions: editions ?? [],
        totalBriefingSessions,
        avgDuration,
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
          { label: "Briefing Views", value: data?.views ?? 0 },
          { label: "Stories Read", value: data?.storyReads ?? 0 },
          { label: "Completions", value: data?.completions ?? 0 },
          { label: "Completion Rate", value: `${data?.completionRate ?? 0}%` },
        ].map(s => (
          <div key={s.label} className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{typeof s.value === "number" ? (s.value ?? 0).toLocaleString() : s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly sessions LineChart */}
      <div>
        <h4 className="text-sm font-medium mb-3">Weekly 3 Before 9 Sessions (since Dec 2025)</h4>
        <ChartContainer config={{ sessions: { label: "Sessions", color: "hsl(var(--primary))" } }} className="h-[220px]">
          <LineChart data={data?.weeklyData ?? []}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="week" className="text-xs" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ChartContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-3">Engagement Breakdown</h4>
          <div className="space-y-2">
            {[
              { label: "Outbound Clicks", value: data?.outboundClicks ?? 0 },
              { label: "Context Expands", value: data?.contextExpands ?? 0 },
              { label: "Total Sessions", value: data?.totalBriefingSessions ?? 0 },
              { label: "Avg Session Duration", value: `${data?.avgDuration ?? 0}s` },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center text-sm border rounded p-2">
                <span className="text-muted-foreground">{row.label}</span>
                <Badge variant="secondary" className="font-mono">{typeof row.value === "number" ? (row.value ?? 0).toLocaleString() : row.value}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3">Recent Editions</h4>
          <div className="space-y-1.5">
            {(data?.editions ?? []).length ? (data?.editions ?? []).map((e) => (
              <div key={e.id} className="border rounded p-2 text-xs">
                <p className="font-medium truncate">{e.subject_line || "Untitled"}</p>
                <p className="text-muted-foreground mt-0.5">{e.edition_date}</p>
              </div>
            )) : <p className="text-xs text-muted-foreground">No published editions</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
