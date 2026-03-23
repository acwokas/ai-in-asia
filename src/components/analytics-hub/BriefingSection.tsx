import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, eachWeekOfInterval, parseISO, endOfWeek, isWithinInterval } from "date-fns";
import { EmptyDataNotice } from "./EmptyDataNotice";
import { InsightCard } from "./InsightCard";

interface Props {
  startDate: string;
  range: string;
}

export const BriefingSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-briefing", range],
    queryFn: async () => {
      const dec2025 = "2025-12-01T00:00:00.000Z";
      const chartStart = dec2025 < startDate ? dec2025 : startDate;

      const [eventsRes, pageviewsRes, editionsRes] = await Promise.all([
        supabase.from("analytics_events")
          .select("event_name, event_data, created_at")
          .in("event_name", ["briefing_view", "briefing_story_read", "briefing_complete", "briefing_outbound_click", "briefing_context_expand"])
          .gte("created_at", startDate).limit(500),
        supabase.from("analytics_sessions")
          .select("session_id, started_at, landing_page, duration_seconds")
          .like("landing_page", "%three-before-nine%")
          .gte("started_at", chartStart).order("started_at", { ascending: true }).limit(1000),
        supabase.from("newsletter_editions")
          .select("id, edition_date, subject_line")
          .eq("status", "sent").order("edition_date", { ascending: false }).limit(5),
      ]);

      const events = eventsRes.data ?? [];
      const sessions = pageviewsRes.data ?? [];
      const editions = editionsRes.data ?? [];

      const views = events.filter(e => e.event_name === "briefing_view").length;
      const storyReads = events.filter(e => e.event_name === "briefing_story_read").length;
      const completions = events.filter(e => e.event_name === "briefing_complete").length;
      const outboundClicks = events.filter(e => e.event_name === "briefing_outbound_click").length;
      const contextExpands = events.filter(e => e.event_name === "briefing_context_expand").length;
      const completionRate = views > 0 ? Math.round((completions / views) * 100) : 0;
      const storiesPerView = views > 0 ? (storyReads / views).toFixed(1) : "0";

      const parsedStart = parseISO(chartStart);
      const start = Number.isNaN(parsedStart.getTime()) ? new Date("2025-12-01") : parsedStart;
      const weeks = eachWeekOfInterval({ start, end: new Date() }, { weekStartsOn: 1 });
      const weeklyData = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const count = sessions.filter(s => {
          if (!s?.started_at) return false;
          const d = parseISO(s.started_at);
          return !Number.isNaN(d.getTime()) && isWithinInterval(d, { start: weekStart, end: weekEnd });
        }).length;
        return { week: format(weekStart, "MMM d"), sessions: count };
      });

      const totalBriefingSessions = sessions.length;
      const avgDuration = sessions.length > 0
        ? Math.round(sessions.reduce((sum, p) => sum + Math.min(p?.duration_seconds ?? 0, 1800), 0) / sessions.length) : 0;

      const recentWeeks = weeklyData.slice(-2);
      const thisWeek = recentWeeks[recentWeeks.length - 1]?.sessions ?? 0;
      const lastWeek = recentWeeks.length >= 2 ? recentWeeks[0]?.sessions ?? 0 : 0;

      return {
        views, storyReads, completions, outboundClicks, contextExpands, completionRate, storiesPerView,
        weeklyData, editions, totalBriefingSessions, avgDuration,
        hasEventData: events.length > 0, thisWeek, lastWeek,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  return (
    <div className="space-y-6">
      {!data.hasEventData && <EmptyDataNotice message="Briefing tracking events (view, story read, complete) will populate within 24–48 hours" />}

      {data.hasEventData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Briefing Views", value: data.views },
            { label: "Stories Read", value: data.storyReads },
            { label: "Completions", value: data.completions },
            { label: "Completion Rate", value: `${data.completionRate}%` },
          ].map(s => (
            <div key={s.label} className="rounded-lg border p-3 text-center">
              <p className="text-xl font-bold">{typeof s.value === "number" ? (s.value ?? 0).toLocaleString() : s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium mb-3">Weekly 3 Before 9 Sessions (since Dec 2025)</h4>
        <ChartContainer config={{ sessions: { label: "Sessions", color: "hsl(var(--primary))" } }} className="h-[220px]">
          <LineChart data={data.weeklyData}>
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
          {data.hasEventData ? (
            <div className="space-y-2">
              {[
                { label: "Outbound Clicks", value: data.outboundClicks },
                { label: "Context Expands", value: data.contextExpands },
                { label: "Stories per View", value: data.storiesPerView },
                { label: "Total Sessions", value: data.totalBriefingSessions },
                { label: "Avg Session Duration", value: `${data.avgDuration}s` },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-sm border rounded p-2">
                  <span className="text-muted-foreground">{row.label}</span>
                  <Badge variant="secondary" className="font-mono">{typeof row.value === "number" ? (row.value ?? 0).toLocaleString() : row.value}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { label: "Total Sessions", value: data.totalBriefingSessions },
                { label: "Avg Session Duration", value: `${data.avgDuration}s` },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-sm border rounded p-2">
                  <span className="text-muted-foreground">{row.label}</span>
                  <Badge variant="secondary" className="font-mono">{typeof row.value === "number" ? (row.value ?? 0).toLocaleString() : row.value}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium mb-3">Recent Editions</h4>
          <div className="space-y-1.5">
            {data.editions.length ? data.editions.map((e) => (
              <div key={e.id} className="border rounded p-2 text-xs">
                <p className="font-medium truncate">{e.subject_line || "Untitled"}</p>
                <p className="text-muted-foreground mt-0.5">{e.edition_date}</p>
              </div>
            )) : <p className="text-xs text-muted-foreground">No published editions</p>}
          </div>
        </div>
      </div>

      <InsightCard insights={(() => {
        const tips: string[] = [];
        const totalSessions = data.totalBriefingSessions;
        const thisWeek = data.thisWeek;
        const lastWeek = data.lastWeek;

        if (totalSessions === 0 && !data.hasEventData) {
          tips.push("1. No briefing sessions or events tracked yet. Verify: (a) the ThreeBeforeNineTicker component links to /three-before-nine/latest, (b) the briefing page fires briefing_view on mount via useGA4ContentTracking, and (c) briefing_story_read fires when each story card scrolls into view.");
          tips.push("2. Once tracking is active, you'll see weekly session trends, completion rates, and outbound click analysis.");
          tips.push("3. Target benchmark: well-formatted daily briefings typically see 60-80% completion rates when kept under 500 words total.");
          return tips;
        }

        // Week-over-week trend
        if (lastWeek > 0 && thisWeek > 0) {
          const changePct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
          if (changePct > 10) {
            tips.push(`1. 📈 Briefing sessions up ${changePct}% this week (${thisWeek} vs ${lastWeek} last week). Momentum is building — maintain daily publishing cadence and promote new editions via push notification within 30 minutes of publish.`);
          } else if (changePct < -10) {
            tips.push(`1. 📉 Briefing sessions dropped ${Math.abs(changePct)}% (${thisWeek} vs ${lastWeek} last week). Check: was an edition missed? Were subject lines less compelling? Review the 3 highest-traffic days and replicate what worked.`);
          } else {
            tips.push(`1. Briefing readership stable at ~${thisWeek} sessions/week. To break the plateau, try cross-promoting the briefing at the end of regular articles with a CTA like "Get tomorrow's AI signals at 9am".`);
          }
        } else if (totalSessions > 0) {
          tips.push(`1. ${(totalSessions ?? 0).toLocaleString()} total briefing sessions tracked. Week-over-week trends will show once 2+ weeks of data accumulate. Current avg session: ${data.avgDuration}s.`);
        }

        // Completion rate
        const rate = data.completionRate;
        const views = data.views;
        if (data.hasEventData && views > 0) {
          if (rate < 50) {
            tips.push(`2. ${rate}% completion rate across ${(views ?? 0).toLocaleString()} views — below the 60-80% benchmark for briefing-style content. Shorten individual signal summaries to under 200 words each, use bold headlines for scannability, and put the most compelling story first to hook readers.`);
          } else if (rate >= 80) {
            tips.push(`2. ${rate}% completion rate — excellent. Readers are consuming the full briefing. ${Number(data.storiesPerView) > 2 ? `They read an avg of ${data.storiesPerView} stories per view, showing strong engagement depth.` : 'Consider adding a 4th story to test appetite for more content.'}`);
          } else {
            tips.push(`2. ${rate}% completion rate — solid. ${(data.storyReads ?? 0).toLocaleString()} total story reads across ${(views ?? 0).toLocaleString()} views (${data.storiesPerView} stories/view avg). Experiment with story order — put opinion/analysis pieces before straight news to see if completion improves.`);
          }
        }

        // Outbound engagement
        const outbound = data.outboundClicks;
        if (views > 0 && outbound > 0) {
          const clickRate = Math.round((outbound / views) * 100);
          tips.push(`3. ${clickRate}% of briefing readers click source links (${(outbound ?? 0).toLocaleString()} clicks). ${clickRate > 20 ? 'Excellent engagement — readers trust your curation. Add sponsored/affiliate links alongside editorial ones to monetise this traffic.' : 'Make source links more prominent with styled "Read the full story →" CTAs and consider opening them in new tabs to preserve the briefing session.'}`);
        } else if (data.hasEventData && views > 0 && outbound === 0) {
          tips.push("3. No outbound clicks tracked — readers are consuming the summaries but not clicking through. Either the summaries are comprehensive enough (good) or source links aren't prominent enough. Test adding \"Read more →\" buttons with contrasting styling.");
        } else {
          const dur = data.avgDuration;
          if (dur > 0) {
            tips.push(`3. Average briefing session: ${dur}s. ${dur < 60 ? 'Readers are scanning quickly — lead with the most newsworthy story and use bullet points for rapid consumption.' : dur > 180 ? 'Deep engagement — readers are spending significant time. This is your stickiest content format.' : 'Healthy read time for a briefing format.'}`);
          }
        }

        return tips;
      })()} />
    </div>
  );
};
