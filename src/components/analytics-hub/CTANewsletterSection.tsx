import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
          .select("event_name, event_data, page_path")
          .in("event_name", ["newsletter_cta_view", "newsletter_cta_click", "newsletter_signup", "cta_click"])
          .gte("created_at", startDate)
          .limit(500),
        supabase
          .from("newsletter_subscribers" as any)
          .select("id, created_at, status")
          .gte("created_at", startDate)
          .limit(500),
        supabase
          .from("newsletter_editions")
          .select("id, subject, total_sent, total_opened, sent_at")
          .not("sent_at", "is", null)
          .order("sent_at", { ascending: false })
          .limit(5),
      ]);

      const ctaEvents = ctaEventsRes.data || [];
      const subscribers = (subscribersRes.data || []) as any[];
      const editions = editionsRes.data || [];

      const ctaViews = ctaEvents.filter(e => e.event_name === "newsletter_cta_view").length;
      const ctaClicks = ctaEvents.filter(e => e.event_name === "newsletter_cta_click").length;
      const signups = ctaEvents.filter(e => e.event_name === "newsletter_signup").length;
      const ctaConversion = ctaViews > 0 ? Math.round((ctaClicks / ctaViews) * 100) : 0;

      const newSubs = subscribers.filter(s => s.status === "active").length;

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

      return { ctaViews, ctaClicks, ctaConversion, signups, newSubs, topCtaPages, editions };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "CTA Views", value: data?.ctaViews ?? 0 },
          { label: "CTA Clicks", value: data?.ctaClicks ?? 0 },
          { label: "Conversion", value: `${data?.ctaConversion ?? 0}%` },
          { label: "Signups (event)", value: data?.signups ?? 0 },
          { label: "New Subscribers", value: data?.newSubs ?? 0 },
        ].map(s => (
          <div key={s.label} className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-2">Top CTA Conversion Pages</h4>
          <div className="space-y-1.5">
            {data?.topCtaPages.length ? data.topCtaPages.map(p => (
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
            {data?.editions.length ? data.editions.map(e => (
              <div key={e.id} className="border rounded p-2 text-xs">
                <p className="font-medium truncate">{e.subject || "Untitled"}</p>
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
