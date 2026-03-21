import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  startDate: string;
  range: string;
}

export const NavigationSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-navigation", range],
    queryFn: async () => {
      const [pageviewsRes, sessionsRes, eventsRes] = await Promise.all([
        supabase
          .from("analytics_pageviews")
          .select("page_path, referrer_path, time_on_page_seconds, scroll_depth_percent, is_exit")
          .gte("viewed_at", startDate)
          .limit(1000),
        supabase
          .from("analytics_sessions")
          .select("referrer_domain, landing_page, exit_page, device_type")
          .gte("started_at", startDate)
          .limit(1000),
        supabase
          .from("analytics_events")
          .select("event_name, event_data")
          .in("event_name", ["nav_click", "nav_category_click", "search_performed", "social_share_click"])
          .gte("created_at", startDate)
          .limit(500),
      ]);

      const pageviews = pageviewsRes.data || [];
      const sessions = sessionsRes.data || [];
      const events = eventsRes.data || [];

      // Top pages
      const pageCounts: Record<string, { views: number; avgTime: number; avgScroll: number }> = {};
      pageviews.forEach(pv => {
        const p = pv.page_path;
        if (!pageCounts[p]) pageCounts[p] = { views: 0, avgTime: 0, avgScroll: 0 };
        pageCounts[p].views++;
        pageCounts[p].avgTime += pv.time_on_page_seconds || 0;
        pageCounts[p].avgScroll += pv.scroll_depth_percent || 0;
      });
      const topPages = Object.entries(pageCounts)
        .map(([path, d]) => ({
          path,
          views: d.views,
          avgTime: d.views > 0 ? Math.round(d.avgTime / d.views) : 0,
          avgScroll: d.views > 0 ? Math.round(d.avgScroll / d.views) : 0,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Top referrer domains
      const refCounts: Record<string, number> = {};
      sessions.forEach(s => {
        const r = s.referrer_domain || "direct";
        refCounts[r] = (refCounts[r] || 0) + 1;
      });
      const topReferrers = Object.entries(refCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([domain, count]) => ({ domain, count }));

      // Device breakdown
      const deviceCounts: Record<string, number> = {};
      sessions.forEach(s => {
        const d = s.device_type || "unknown";
        deviceCounts[d] = (deviceCounts[d] || 0) + 1;
      });

      // Exit pages
      const exitCounts: Record<string, number> = {};
      pageviews.filter(pv => pv.is_exit).forEach(pv => {
        exitCounts[pv.page_path] = (exitCounts[pv.page_path] || 0) + 1;
      });
      const topExits = Object.entries(exitCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([path, count]) => ({ path, count }));

      return { topPages, topReferrers, deviceCounts, topExits, navEvents: events.length };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-6">
      {/* Top Pages */}
      <div>
        <h4 className="text-sm font-medium mb-3">Top Pages</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Avg Time</TableHead>
              <TableHead className="text-right">Avg Scroll</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.topPages.map(p => (
              <TableRow key={p.path}>
                <TableCell className="font-mono text-xs truncate max-w-[200px]">{p.path}</TableCell>
                <TableCell className="text-right font-mono text-xs">{p.views}</TableCell>
                <TableCell className="text-right text-xs">{p.avgTime}s</TableCell>
                <TableCell className="text-right text-xs">{p.avgScroll}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Referrers */}
        <div>
          <h4 className="text-sm font-medium mb-2">Top Referrers</h4>
          <div className="space-y-1.5">
            {data?.topReferrers.map(r => (
              <div key={r.domain} className="flex justify-between text-xs border rounded p-2">
                <span className="truncate">{r.domain}</span>
                <Badge variant="secondary" className="text-[10px]">{r.count}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div>
          <h4 className="text-sm font-medium mb-2">Devices</h4>
          <div className="space-y-1.5">
            {Object.entries(data?.deviceCounts || {}).map(([device, count]) => (
              <div key={device} className="flex justify-between text-xs border rounded p-2">
                <span className="capitalize">{device}</span>
                <Badge variant="outline" className="text-[10px]">{count}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Exit pages */}
        <div>
          <h4 className="text-sm font-medium mb-2">Top Exit Pages</h4>
          <div className="space-y-1.5">
            {data?.topExits.map(e => (
              <div key={e.path} className="flex justify-between text-xs border rounded p-2">
                <span className="font-mono truncate max-w-[140px]">{e.path}</span>
                <Badge variant="secondary" className="text-[10px]">{e.count}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
