import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Props {
  startDate: string;
  range: string;
}

export const BriefingSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-briefing", range],
    queryFn: async () => {
      const [eventsRes, pageviewsRes, editionsRes] = await Promise.all([
        supabase
          .from("analytics_events")
          .select("event_name, event_data")
          .in("event_name", ["briefing_view", "briefing_story_read", "briefing_complete", "briefing_outbound_click", "briefing_context_expand"])
          .gte("created_at", startDate)
          .limit(500),
        supabase
          .from("analytics_pageviews")
          .select("page_path, time_on_page_seconds, scroll_depth_percent")
          .like("page_path", "%three-before-nine%")
          .gte("viewed_at", startDate)
          .limit(200),
        supabase
          .from("newsletter_editions")
          .select("id, edition_date, subject_line")
          .eq("status", "sent")
          .order("edition_date", { ascending: false })
          .limit(5),
      ]);

      const events = eventsRes.data || [];
      const pageviews = pageviewsRes.data || [];
      const editions = editionsRes.data || [];

      const views = events.filter(e => e.event_name === "briefing_view").length;
      const storyReads = events.filter(e => e.event_name === "briefing_story_read").length;
      const completions = events.filter(e => e.event_name === "briefing_complete").length;
      const outboundClicks = events.filter(e => e.event_name === "briefing_outbound_click").length;
      const contextExpands = events.filter(e => e.event_name === "briefing_context_expand").length;

      const avgTime = pageviews.length > 0
        ? Math.round(pageviews.reduce((s, p) => s + (p.time_on_page_seconds || 0), 0) / pageviews.length)
        : 0;
      const avgScroll = pageviews.length > 0
        ? Math.round(pageviews.reduce((s, p) => s + (p.scroll_depth_percent || 0), 0) / pageviews.length)
        : 0;

      const completionRate = views > 0 ? Math.round((completions / views) * 100) : 0;

      return { views, storyReads, completions, outboundClicks, contextExpands, avgTime, avgScroll, completionRate, editions, pageviewCount: pageviews.length };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

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
            <p className="text-xl font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-3">Engagement Breakdown</h4>
          <div className="space-y-2">
            {[
              { label: "Outbound Clicks", value: data?.outboundClicks ?? 0 },
              { label: "Context Expands", value: data?.contextExpands ?? 0 },
              { label: "Page Views", value: data?.pageviewCount ?? 0 },
              { label: "Avg Time on Page", value: `${data?.avgTime ?? 0}s` },
              { label: "Avg Scroll Depth", value: `${data?.avgScroll ?? 0}%` },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center text-sm border rounded p-2">
                <span className="text-muted-foreground">{row.label}</span>
                <Badge variant="secondary" className="font-mono">{typeof row.value === "number" ? row.value.toLocaleString() : row.value}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3">Recent Editions</h4>
          <div className="space-y-1.5">
            {data?.editions.length ? data.editions.map(e => (
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
