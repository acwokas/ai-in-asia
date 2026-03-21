import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, parseISO, eachDayOfInterval } from "date-fns";

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
          .from("newsletter_subscribers" as any)
          .select("id, created_at, status")
          .gte("created_at", startDate)
          .limit(500),
        supabase
          .from("newsletter_editions")
          .select("id, subject_line, total_sent, total_opened, edition_date")
          .eq("status", "sent")
          .order("edition_date", { ascending: false })
          .limit(5),
      ]);

      const ctaEvents = ctaEventsRes.data || [];
      const subscribers = (subscribersRes.data || []) as any[];
      const editions = editionsRes.data || [];

      const ctaViews = ctaEvents.filter(e => e.event_name === "newsletter_cta_view").length;
      const ctaClicks = ctaEvents.filter(e => e.event_name === "newsletter_cta_click").length;
      const submissions = ctaEvents.filter(e => ["newsletter_signup", "newsletter_cta_submit"].includes(e.event_name)).length;
      const ctaConversion = ctaViews > 0 ? Math.round((ctaClicks / ctaViews) * 100) : 0;
      const newSubs = subscribers.filter(s => s.status === "active").length;
      const totalSubs = subscribers.length;

      // Submissions over time for LineChart
      const dailySubmissions: Record<string, number> = {};
      ctaEvents
        .filter(e => ["newsletter_signup", "newsletter_cta_submit"].includes(e.event_name))
        .forEach(e => {
          const day = format(parseISO(e.created_at), "yyyy-MM-dd");
          dailySubmissions[day] = (dailySubmissions[day] || 0) + 1;
        });

      const start = parseISO(startDate);
      const end = new Date();
      const allDays = eachDayOfInterval({ start, end });
      const submissionTimeline = allDays.map(d => {
        const key = format(d, "yyyy-MM-dd");
        return { date: format(d, "MMM d"), submissions: dailySubmissions[key] || 0 };
      });

      // Top CTA pages
      const pageCta: Record<string, number> = {};
      ctaEvents
        .filter(e => e.event_name === "newsletter_cta_click")
        .forEach(e => {
          const p = e.page_path || "/";
          pageCta[p] = (pageCta[p] || 0) + 1;
        });
      const topCtaPages = Object.entries(pageCta)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([page, count]) => ({ page, count }));

      return { ctaViews, ctaClicks, ctaConversion, submissions, newSubs, totalSubs, topCtaPages, editions, submissionTimeline };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "CTA Views", value: data.ctaViews },
          { label: "CTA Clicks", value: data.ctaClicks },
          { label: "Conversion", value: `${data.ctaConversion}%` },
          { label: "Submissions", value: data.submissions },
          { label: "New Subscribers", value: data.newSubs },
        ].map(s => (
          <div key={s.label} className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Submissions LineChart */}
      <div>
        <h4 className="text-sm font-medium mb-3">Newsletter Submissions Over Time</h4>
        <ChartContainer config={{ submissions: { label: "Submissions", color: "hsl(var(--primary))" } }} className="h-[220px]">
          <LineChart data={data.submissionTimeline}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="submissions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-2">Top CTA Conversion Pages</h4>
          <div className="space-y-1.5">
            {data.topCtaPages.length ? data.topCtaPages.map(p => (
              <div key={p.page} className="flex justify-between text-xs border rounded p-2">
                <span className="font-mono truncate max-w-[200px]">{p.page}</span>
                <Badge variant="secondary" className="text-[10px]">{p.count} clicks</Badge>
              </div>
            )) : <p className="text-xs text-muted-foreground">No CTA clicks recorded</p>}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Recent Newsletter Editions</h4>
          <div className="space-y-1.5">
            {data.editions.length ? data.editions.map((e: any) => (
              <div key={e.id} className="border rounded p-2 text-xs">
                <p className="font-medium truncate">{e.subject_line || "Untitled"}</p>
                <div className="flex gap-3 mt-1 text-muted-foreground">
                  <span>Sent: {e.total_sent || 0}</span>
                  <span>Opened: {e.total_opened || 0}</span>
                  <span>Rate: {e.total_sent ? Math.round(((e.total_opened || 0) / e.total_sent) * 100) : 0}%</span>
                </div>
              </div>
            )) : <p className="text-xs text-muted-foreground">No editions sent yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
