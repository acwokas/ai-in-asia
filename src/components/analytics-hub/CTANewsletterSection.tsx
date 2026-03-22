import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { EmptyDataNotice } from "./EmptyDataNotice";
import { InsightCard } from "./InsightCard";
import { Mail } from "lucide-react";

interface Props {
  startDate: string;
  range: string;
}

export const CTANewsletterSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-cta", range],
    queryFn: async () => {
      const [ctaEventsRes, subscribersRes, editionsRes] = await Promise.all([
        supabase.from("analytics_events")
          .select("event_name, event_data, page_path, created_at")
          .in("event_name", ["newsletter_cta_view", "newsletter_cta_click", "newsletter_signup", "newsletter_cta_submit", "cta_click"])
          .gte("created_at", startDate).order("created_at", { ascending: true }).limit(500),
        supabase.from("newsletter_subscribers")
          .select("id, subscribed_at, confirmed, unsubscribed_at").limit(1000),
        supabase.from("newsletter_editions")
          .select("id, subject_line, total_sent, total_opened, edition_date")
          .eq("status", "sent").order("edition_date", { ascending: false }).limit(5),
      ]);

      const ctaEvents = ctaEventsRes.data ?? [];
      const subscribers = (subscribersRes.data ?? []) as any[];
      const editions = editionsRes.data ?? [];

      const ctaViews = ctaEvents.filter(e => e.event_name === "newsletter_cta_view").length;
      const ctaClicks = ctaEvents.filter(e => e.event_name === "newsletter_cta_click").length;
      const submissions = ctaEvents.filter(e => ["newsletter_signup", "newsletter_cta_submit"].includes(e.event_name)).length;
      const ctaConversion = ctaViews > 0 ? Math.round((ctaClicks / ctaViews) * 100) : 0;
      const viewToSubmit = ctaViews > 0 ? Math.round((submissions / ctaViews) * 100) : 0;

      const activeSubs = subscribers.filter(s => s?.confirmed === true && !s?.unsubscribed_at).length;
      const totalSubs = subscribers.length;
      const unsubscribed = subscribers.filter(s => !!s?.unsubscribed_at).length;
      const newSubs = subscribers.filter(s => s?.subscribed_at && s.subscribed_at >= startDate).length;

      const hasCtaEvents = ctaEvents.length > 0;
      const hasEditions = editions.length > 0;
      const hasSendData = editions.some((e: any) => (e?.total_sent ?? 0) > 0);

      // Avg open rate across sent editions
      const sentEditions = editions.filter((e: any) => (e?.total_sent ?? 0) > 0);
      const avgOpenRate = sentEditions.length > 0
        ? Math.round(sentEditions.reduce((s: number, e: any) => s + ((e.total_opened ?? 0) / (e.total_sent ?? 1)) * 100, 0) / sentEditions.length)
        : 0;

      const dailySubmissions: Record<string, number> = {};
      ctaEvents.filter(e => ["newsletter_signup", "newsletter_cta_submit"].includes(e.event_name)).forEach(e => {
        if (!e?.created_at) return;
        const parsed = parseISO(e.created_at);
        if (Number.isNaN(parsed.getTime())) return;
        dailySubmissions[format(parsed, "yyyy-MM-dd")] = (dailySubmissions[format(parsed, "yyyy-MM-dd")] || 0) + 1;
      });

      const parsedStart = parseISO(startDate);
      const start = Number.isNaN(parsedStart.getTime()) ? new Date(Date.now() - 7 * 86400000) : parsedStart;
      const submissionTimeline = eachDayOfInterval({ start, end: new Date() }).map(d => {
        const key = format(d, "yyyy-MM-dd");
        return { date: format(d, "MMM d"), submissions: dailySubmissions[key] || 0 };
      });

      const pageCta: Record<string, number> = {};
      ctaEvents.filter(e => e.event_name === "newsletter_cta_click").forEach(e => {
        const p = e?.page_path || "/";
        pageCta[p] = (pageCta[p] || 0) + 1;
      });
      const topCtaPages = Object.entries(pageCta).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, count]) => ({ page, count }));

      return {
        ctaViews, ctaClicks, ctaConversion, viewToSubmit, submissions,
        activeSubs, totalSubs, newSubs, unsubscribed,
        topCtaPages, editions, submissionTimeline,
        hasCtaEvents, hasEditions, hasSendData, avgOpenRate,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  // Show clean empty state when newsletter hasn't launched
  const notLaunched = data.totalSubs === 0 && !data.hasEditions && !data.hasCtaEvents;
  if (notLaunched) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
        <Mail className="h-10 w-10 text-muted-foreground/40 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Newsletter not yet launched</p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
          Subscriber metrics, CTA conversion rates, and edition performance will appear here once a newsletter is configured and subscribers start signing up.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Active Subscribers", value: data.activeSubs },
          { label: "Total Subscribers", value: data.totalSubs },
          { label: "New (period)", value: data.newSubs },
          { label: "CTA Conversion", value: data.hasCtaEvents ? `${data.ctaConversion}%` : "—" },
          { label: "Submissions", value: data.hasCtaEvents ? data.submissions : "—" },
        ].map(s => (
          <div key={s.label} className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{typeof s.value === "number" ? (s.value ?? 0).toLocaleString() : s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {!data.hasCtaEvents && <EmptyDataNotice message="CTA tracking events (view, click, submit) will populate within 24–48 hours" />}

      {data.hasCtaEvents && (
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
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-2">Top CTA Conversion Pages</h4>
          <div className="space-y-1.5">
            {data.topCtaPages.length ? data.topCtaPages.map((p) => (
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
            {data.hasEditions ? data.editions.map((e: any) => (
              <div key={e.id} className="border rounded p-2 text-xs">
                <p className="font-medium truncate">{e.subject_line || "Untitled"}</p>
                <div className="flex gap-3 mt-1 text-muted-foreground">
                  <span>Sent: {(e?.total_sent ?? 0).toLocaleString()}</span>
                  <span>Opened: {(e?.total_opened ?? 0).toLocaleString()}</span>
                  <span>Rate: {(e?.total_sent ?? 0) > 0 ? Math.round(((e?.total_opened ?? 0) / (e?.total_sent ?? 1)) * 100) : 0}%</span>
                </div>
              </div>
            )) : (
              <EmptyDataNotice message="No newsletter editions sent yet — metrics will appear after the first send" />
            )}
          </div>
        </div>
      </div>

      <InsightCard insights={(() => {
        const tips: string[] = [];
        const active = data.activeSubs;
        const total = data.totalSubs;
        const unsub = data.unsubscribed;

        if (total === 0 && !data.hasCtaEvents) {
          tips.push("1. No subscribers and no CTA tracking events yet. Start by adding newsletter signup CTAs to your highest-traffic pages — article pages, homepage, and the 3 Before 9 briefing page are ideal placements.");
          tips.push("2. Use the EndOfContentNewsletter component at the bottom of articles and the InlineNewsletterSignup component mid-article for maximum visibility.");
          tips.push("3. Industry benchmark: well-placed CTAs on content sites convert 2-5% of page views to signups.");
          return tips;
        }

        // CTA conversion analysis
        const conv = data.ctaConversion;
        const viewToSubmit = data.viewToSubmit;
        if (data.hasCtaEvents) {
          if (conv === 0 && data.ctaViews > 0) {
            tips.push(`1. ${(data.ctaViews ?? 0).toLocaleString()} CTA views but 0 clicks — your CTA is being seen but ignored. Test: (a) change the headline from generic "Subscribe" to value-driven copy like "Get the AI briefing every morning, free", (b) add social proof ("Join 500+ readers"), (c) try a different colour that contrasts with the page background.`);
          } else if (conv < 2) {
            tips.push(`1. CTA view-to-click rate is ${conv}% (${(data.ctaClicks ?? 0).toLocaleString()} clicks from ${(data.ctaViews ?? 0).toLocaleString()} views) — below the 2-5% industry average. Reposition CTAs: place one inline at ~40% scroll depth in articles and another as a sticky footer bar on mobile. Test urgency copy like "Today's briefing drops at 9am".`);
          } else if (conv >= 5) {
            tips.push(`1. CTA conversion at ${conv}% — above the 2-5% industry average (${(data.ctaClicks ?? 0).toLocaleString()} clicks from ${(data.ctaViews ?? 0).toLocaleString()} views). Your placement and copy are working. Scale by adding CTAs to more pages, especially category landing pages and guide pages.`);
          } else {
            tips.push(`1. CTA conversion at ${conv}% — within the 2-5% industry benchmark. View-to-submit rate: ${viewToSubmit}%. To improve: reduce form friction (single email field, no name required) and add an instant confirmation with a preview of what they'll receive.`);
          }
        }

        // Newsletter performance
        if (data.hasSendData) {
          const openRate = data.avgOpenRate;
          if (openRate < 20) {
            tips.push(`2. Average open rate is ${openRate}% — below the 20-25% industry benchmark. Test subject lines: use numbers, questions, or preview the top story. Send time also matters — test Tuesday/Wednesday mornings vs current schedule.`);
          } else if (openRate >= 35) {
            tips.push(`2. ${openRate}% average open rate — excellent, well above the 20-25% industry norm. Your subject lines and send timing are resonating. Consider adding A/B testing on subject lines to push even higher.`);
          } else {
            tips.push(`2. ${openRate}% average open rate — solid, at or above the 20-25% industry benchmark. ${unsub > 0 ? `${unsub} unsubscribes (${Math.round((unsub / Math.max(total, 1)) * 100)}% churn) — monitor this after each send.` : 'No unsubscribes yet — great retention.'}`);
          }
        } else if (active > 0) {
          tips.push(`2. You have ${(active ?? 0).toLocaleString()} confirmed subscriber${active === 1 ? '' : 's'} but no editions sent yet. Send your first newsletter to establish a cadence — weekly sends see the best balance of engagement and low unsubscribe rates.`);
        }

        // Growth
        const newSubs = data.newSubs;
        if (newSubs > 0 && active > 0) {
          const growthPct = Math.round((newSubs / active) * 100);
          tips.push(`3. ${(newSubs ?? 0).toLocaleString()} new subscriber${newSubs === 1 ? '' : 's'} this period (${growthPct}% growth). ${newSubs >= 10 ? 'Strong growth — set up a 3-email welcome sequence: (1) "Here\'s what to expect", (2) "Our 3 best articles", (3) "Reply and tell us what topics you care about".' : 'Steady trickle — boost signups by adding exit-intent popups on desktop and a floating signup bar on mobile.'}`);
        } else if (newSubs === 0 && active > 0) {
          tips.push(`3. No new subscribers this period. Re-audit your CTA placements: are they visible without scrolling? Test adding a full-width signup banner between articles on the homepage and at the end of each 3 Before 9 briefing.`);
        }

        return tips;
      })()} />
    </div>
  );
};
