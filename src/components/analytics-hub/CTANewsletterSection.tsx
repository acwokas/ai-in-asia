import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { EmptyDataNotice } from "./EmptyDataNotice";
import { InsightCard } from "./InsightCard";

interface Props {
  startDate: string;
  range: string;
}

export const CTANewsletterSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-cta", range],
    queryFn: async () => {
      const [ctaEventsRes, subscribersRes, editionsRes] = await Promise.all([
        supabase
          .from("analytics_events")
          .select("event_name, event_data, page_path, created_at")
          .in("event_name", ["newsletter_cta_view", "newsletter_cta_click", "newsletter_signup", "newsletter_cta_submit", "cta_click"])
          .gte("created_at", startDate)
          .order("created_at", { ascending: true })
          .limit(500),
        supabase
          .from("newsletter_subscribers")
          .select("id, subscribed_at, confirmed, unsubscribed_at")
          .limit(1000),
        supabase
          .from("newsletter_editions")
          .select("id, subject_line, total_sent, total_opened, edition_date")
          .eq("status", "sent")
          .order("edition_date", { ascending: false })
          .limit(5),
      ]);

      const ctaEvents = ctaEventsRes.data ?? [];
      const subscribers = (subscribersRes.data ?? []) as any[];
      const editions = editionsRes.data ?? [];

      const ctaViews = (ctaEvents ?? []).filter(e => e?.event_name === "newsletter_cta_view").length;
      const ctaClicks = (ctaEvents ?? []).filter(e => e?.event_name === "newsletter_cta_click").length;
      const submissions = (ctaEvents ?? []).filter(e => ["newsletter_signup", "newsletter_cta_submit"].includes(e?.event_name ?? "")).length;
      const ctaConversion = ctaViews > 0 ? Math.round((ctaClicks / ctaViews) * 100) : 0;

      // Active = confirmed and not unsubscribed
      const activeSubs = (subscribers ?? []).filter(s => s?.confirmed === true && !s?.unsubscribed_at).length;
      const totalSubs = (subscribers ?? []).length;

      // New subscribers within date range
      const newSubs = (subscribers ?? []).filter(s => {
        if (!s?.subscribed_at) return false;
        return s.subscribed_at >= startDate;
      }).length;

      const hasCtaEvents = ctaEvents.length > 0;

      // Submissions over time for LineChart
      const dailySubmissions: Record<string, number> = {};
      (ctaEvents ?? [])
        .filter(e => ["newsletter_signup", "newsletter_cta_submit"].includes(e?.event_name ?? ""))
        .forEach(e => {
          if (!e?.created_at) return;
          const parsed = parseISO(e.created_at);
          if (Number.isNaN(parsed.getTime())) return;
          const day = format(parsed, "yyyy-MM-dd");
          dailySubmissions[day] = (dailySubmissions[day] || 0) + 1;
        });

      const parsedStart = parseISO(startDate);
      const start = Number.isNaN(parsedStart.getTime())
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : parsedStart;
      const end = new Date();
      const allDays = eachDayOfInterval({ start, end });
      const submissionTimeline = allDays.map(d => {
        const key = format(d, "yyyy-MM-dd");
        return { date: format(d, "MMM d"), submissions: dailySubmissions[key] || 0 };
      });

      // Top CTA pages
      const pageCta: Record<string, number> = {};
      (ctaEvents ?? [])
        .filter(e => e?.event_name === "newsletter_cta_click")
        .forEach(e => {
          const p = e?.page_path || "/";
          pageCta[p] = (pageCta[p] || 0) + 1;
        });
      const topCtaPages = Object.entries(pageCta)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([page, count]) => ({ page, count }));

      return {
        ctaViews, ctaClicks, ctaConversion, submissions,
        activeSubs, totalSubs, newSubs,
        topCtaPages: topCtaPages ?? [],
        editions: editions ?? [],
        submissionTimeline: submissionTimeline ?? [],
        hasCtaEvents,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Active Subscribers", value: data?.activeSubs ?? 0 },
          { label: "Total Subscribers", value: data?.totalSubs ?? 0 },
          { label: "New (period)", value: data?.newSubs ?? 0 },
          { label: "CTA Conversion", value: `${data?.ctaConversion ?? 0}%` },
          { label: "Submissions", value: data?.submissions ?? 0 },
        ].map(s => (
          <div key={s.label} className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{typeof s.value === "number" ? (s.value ?? 0).toLocaleString() : s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {!data.hasCtaEvents && (
        <EmptyDataNotice message="CTA tracking events (view, click, submit) will populate within 24–48 hours" />
      )}

      {/* Submissions LineChart */}
      {data.hasCtaEvents && (
        <div>
          <h4 className="text-sm font-medium mb-3">Newsletter Submissions Over Time</h4>
          <ChartContainer config={{ submissions: { label: "Submissions", color: "hsl(var(--primary))" } }} className="h-[220px]">
            <LineChart data={data?.submissionTimeline ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="submissions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-2">Top CTA Conversion Pages</h4>
          <div className="space-y-1.5">
            {(data?.topCtaPages ?? []).length ? (data?.topCtaPages ?? []).map((p) => (
              <div key={p.page} className="flex justify-between text-xs border rounded p-2">
                <span className="font-mono truncate max-w-[200px]">{p.page}</span>
                <Badge variant="secondary" className="text-[10px]">{(p?.count ?? 0).toLocaleString()} clicks</Badge>
              </div>
            )) : (
              data.hasCtaEvents
                ? <p className="text-xs text-muted-foreground">No CTA clicks recorded</p>
                : <EmptyDataNotice message="CTA click data will appear once tracking events start flowing" />
            )}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Recent Newsletter Editions</h4>
          <div className="space-y-1.5">
            {(data?.editions ?? []).length ? (data?.editions ?? []).map((e: any) => (
              <div key={e.id} className="border rounded p-2 text-xs">
                <p className="font-medium truncate">{e.subject_line || "Untitled"}</p>
                <div className="flex gap-3 mt-1 text-muted-foreground">
                  <span>Sent: {(e?.total_sent ?? 0).toLocaleString()}</span>
                  <span>Opened: {(e?.total_opened ?? 0).toLocaleString()}</span>
                  <span>Rate: {(e?.total_sent ?? 0) > 0 ? Math.round((((e?.total_opened ?? 0) / (e?.total_sent ?? 1)) * 100)) : 0}%</span>
                </div>
              </div>
            )) : <p className="text-xs text-muted-foreground">No editions sent yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
