import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface Props {
  startDate: string;
  range: string;
}

export const NavigationSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-navigation", range],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      const SELF_DOMAINS = ["ai-in-asia.lovable.app", "ai-in-asia.com", "www.ai-in-asia.com"];

      const fetchAll = async (table: string, select: string, filters: (q: any) => any) => {
        const rows: any[] = [];
        let from = 0;
        while (true) {
          let q = supabase.from(table).select(select);
          q = filters(q);
          const { data: batch } = await q.range(from, from + PAGE_SIZE - 1);
          const safe = batch ?? [];
          rows.push(...safe);
          if (safe.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return rows;
      };

      const [events, pageviews, sessions] = await Promise.all([
        fetchAll("analytics_events", "event_name, event_data",
          (q: any) => q.in("event_name", ["nav_click", "nav_category_click", "cta_click", "search_performed", "social_share_click"]).gte("created_at", startDate)),
        fetchAll("analytics_pageviews", "page_path, referrer_path, time_on_page_seconds, scroll_depth_percent, is_exit",
          (q: any) => q.gte("viewed_at", startDate)),
        fetchAll("analytics_sessions", "referrer_domain, device_type",
          (q: any) => q.gte("started_at", startDate)),
      ]);




      // Clicked elements for horizontal bar chart
      const elementCounts: Record<string, number> = {};
      (events ?? []).forEach((e) => {
        const ed = e.event_data as any;
        const label = ed?.label || ed?.element || ed?.category || ed?.platform || e.event_name;
        elementCounts[label] = (elementCounts[label] || 0) + 1;
      });
      const clickedElements = Object.entries(elementCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([name, count]) => ({ name: name.length > 25 ? name.slice(0, 22) + "…" : name, count }));

      // Top pages
      const pageCounts: Record<string, { views: number; avgTime: number; avgScroll: number }> = {};
      (pageviews ?? []).forEach((pv) => {
        const p = pv?.page_path || "/";
        if (!pageCounts[p]) pageCounts[p] = { views: 0, avgTime: 0, avgScroll: 0 };
        pageCounts[p].views++;
        pageCounts[p].avgTime += pv?.time_on_page_seconds ?? 0;
        pageCounts[p].avgScroll += pv?.scroll_depth_percent ?? 0;
      });
      const topPages = Object.entries(pageCounts)
        .map(([path, d]) => ({
          path, views: d.views,
          avgTime: d.views > 0 ? Math.round(d.avgTime / d.views) : 0,
          avgScroll: d.views > 0 ? Math.round(d.avgScroll / d.views) : 0,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Referrers
      const refCounts: Record<string, number> = {};
      (sessions ?? []).forEach((s) => {
        const r = s?.referrer_domain || "direct";
        refCounts[r] = (refCounts[r] || 0) + 1;
      });
      const topReferrers = Object.entries(refCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([domain, count]) => ({ domain, count }));

      // Devices
      const deviceCounts: Record<string, number> = {};
      (sessions ?? []).forEach((s) => {
        const d = s?.device_type || "unknown";
        deviceCounts[d] = (deviceCounts[d] || 0) + 1;
      });

      // Exits
      const exitCounts: Record<string, number> = {};
      (pageviews ?? []).filter((pv) => Boolean(pv?.is_exit)).forEach((pv) => {
        const path = pv?.page_path || "/";
        exitCounts[path] = (exitCounts[path] || 0) + 1;
      });
      const topExits = Object.entries(exitCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([path, count]) => ({ path, count }));

      return {
        clickedElements: clickedElements ?? [],
        topPages: topPages ?? [],
        topReferrers: topReferrers ?? [],
        deviceCounts: deviceCounts ?? {},
        topExits: topExits ?? [],
        totalNavEvents: (events ?? []).length,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  return (
    <div className="space-y-6">
      {/* Clicked elements horizontal bar chart */}
      <div>
        <h4 className="text-sm font-medium mb-3">Most Clicked Elements ({data?.totalNavEvents ?? 0} events)</h4>
        {(data?.clickedElements ?? []).length ? (
          <ChartContainer config={{ count: { label: "Clicks", color: "hsl(var(--primary))" } }} className="h-[300px]">
            <BarChart data={data?.clickedElements ?? []} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="name" type="category" className="text-xs" width={115} tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground">No navigation events recorded</p>
        )}
      </div>

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
            {(data?.topPages ?? []).map(p => (
              <TableRow key={p.path}>
                <TableCell className="font-mono text-xs truncate max-w-[200px]">{p.path}</TableCell>
                <TableCell className="text-right font-mono text-xs">{(p?.views ?? 0).toLocaleString()}</TableCell>
                <TableCell className="text-right text-xs">{(p?.avgTime ?? 0).toLocaleString()}s</TableCell>
                <TableCell className="text-right text-xs">{(p?.avgScroll ?? 0).toLocaleString()}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-2">Top Referrers</h4>
          <div className="space-y-1.5">
            {(data?.topReferrers ?? []).map(r => (
              <div key={r.domain} className="flex justify-between text-xs border rounded p-2">
                <span className="truncate">{r.domain}</span>
                <Badge variant="secondary" className="text-[10px]">{(r?.count ?? 0).toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">Devices</h4>
          <div className="space-y-1.5">
            {Object.entries(data?.deviceCounts ?? {}).map(([device, count]) => (
              <div key={device} className="flex justify-between text-xs border rounded p-2">
                <span className="capitalize">{device}</span>
                <Badge variant="outline" className="text-[10px]">{(count ?? 0).toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">Top Exit Pages</h4>
          <div className="space-y-1.5">
            {(data?.topExits ?? []).map(e => (
              <div key={e.path} className="flex justify-between text-xs border rounded p-2">
                <span className="font-mono truncate max-w-[140px]">{e.path}</span>
                <Badge variant="secondary" className="text-[10px]">{(e?.count ?? 0).toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
