import { useQuery } from "@tanstack/react-query";
import { InsightCard } from "./InsightCard";
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
      const MAX_ROWS = 10000;
      const SELF_DOMAINS = ["lovable.app", "lovable.dev", "lovableproject.com", "ai-in-asia.lovable.app", "aiinasia.com", "www.aiinasia.com", "ai-in-asia.com", "www.ai-in-asia.com"];

      const fetchAllEvents = async () => {
        const rows: any[] = [];
        let from = 0;
        while (rows.length < MAX_ROWS) {
          const { data: batch } = await supabase.from("analytics_events")
            .select("event_name, event_data")
            .in("event_name", ["nav_click", "nav_category_click", "cta_click", "search_performed", "social_share_click"])
            .gte("created_at", startDate).range(from, from + PAGE_SIZE - 1);
          const safe = batch ?? [];
          rows.push(...safe);
          if (safe.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return rows;
      };

      const fetchAllPageviews = async () => {
        const rows: any[] = [];
        let from = 0;
        while (rows.length < MAX_ROWS) {
          const { data: batch } = await supabase.from("analytics_pageviews")
            .select("page_path, referrer_path, time_on_page_seconds, scroll_depth_percent, is_exit")
            .gte("viewed_at", startDate).range(from, from + PAGE_SIZE - 1);
          const safe = batch ?? [];
          rows.push(...safe);
          if (safe.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return rows;
      };

      const fetchAllSessions = async () => {
        const rows: any[] = [];
        let from = 0;
        while (rows.length < MAX_ROWS) {
          const { data: batch } = await supabase.from("analytics_sessions")
            .select("referrer_domain, device_type")
            .gte("started_at", startDate).range(from, from + PAGE_SIZE - 1);
          const safe = batch ?? [];
          rows.push(...safe);
          if (safe.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return rows;
      };

      const [events, pageviews, sessions] = await Promise.all([fetchAllEvents(), fetchAllPageviews(), fetchAllSessions()]);

      const elementCounts: Record<string, number> = {};
      events.forEach((e) => {
        const ed = e.event_data as any;
        const label = ed?.label || ed?.element || ed?.category || ed?.platform || e.event_name;
        elementCounts[label] = (elementCounts[label] || 0) + 1;
      });
      const clickedElements = Object.entries(elementCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 12)
        .map(([name, count]) => ({ name: name.length > 25 ? name.slice(0, 22) + "…" : name, fullName: name, count }));

      const pageCounts: Record<string, { views: number; avgTime: number; avgScroll: number }> = {};
      pageviews.forEach((pv) => {
        const p = pv?.page_path || "/";
        if (!pageCounts[p]) pageCounts[p] = { views: 0, avgTime: 0, avgScroll: 0 };
        pageCounts[p].views++;
        pageCounts[p].avgTime += Math.min(pv?.time_on_page_seconds ?? 0, 1800);
        pageCounts[p].avgScroll += pv?.scroll_depth_percent ?? 0;
      });
      const topPages = Object.entries(pageCounts)
        .map(([path, d]) => ({
          path, views: d.views,
          avgTime: d.views > 0 ? Math.round(d.avgTime / d.views) : 0,
          avgScroll: d.views > 0 ? Math.round(d.avgScroll / d.views) : 0,
        }))
        .sort((a, b) => b.views - a.views).slice(0, 10);

      const refCounts: Record<string, number> = {};
      sessions.forEach((s) => {
        const r = s?.referrer_domain || "direct";
        if (SELF_DOMAINS.some(d => r.includes(d))) return;
        refCounts[r] = (refCounts[r] || 0) + 1;
      });
      const topReferrers = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([domain, count]) => ({ domain, count }));

      const deviceCounts: Record<string, number> = {};
      sessions.forEach((s) => { const d = s?.device_type || "unknown"; deviceCounts[d] = (deviceCounts[d] || 0) + 1; });

      const exitCounts: Record<string, number> = {};
      pageviews.filter((pv) => Boolean(pv?.is_exit)).forEach((pv) => {
        const path = pv?.page_path || "/";
        exitCounts[path] = (exitCounts[path] || 0) + 1;
      });
      const topExits = Object.entries(exitCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([path, count]) => ({ path, count }));

      return {
        clickedElements, topPages, topReferrers, deviceCounts, topExits,
        totalNavEvents: events.length, totalPageviews: pageviews.length,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">Most Clicked Elements ({(data.totalNavEvents ?? 0).toLocaleString()} events)</h4>
        {data.clickedElements.length ? (
          <ChartContainer config={{ count: { label: "Clicks", color: "hsl(var(--primary))" } }} className="h-[300px]">
            <BarChart data={data.clickedElements} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="name" type="category" className="text-xs" width={115} tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground">No navigation events recorded yet</p>
        )}
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Top Pages ({(data.totalPageviews ?? 0).toLocaleString()} pageviews)</h4>
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
            {data.topPages.map(p => (
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
            {data.topReferrers.map(r => (
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
            {Object.entries(data.deviceCounts).map(([device, count]) => (
              <div key={device} className="flex justify-between text-xs border rounded p-2">
                <span className="capitalize">{device}</span>
                <Badge variant="outline" className="text-[10px]">{((count as number) ?? 0).toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">Top Exit Pages</h4>
          <div className="space-y-1.5">
            {data.topExits.map(e => (
              <div key={e.path} className="flex justify-between text-xs border rounded p-2">
                <span className="font-mono truncate max-w-[140px]">{e.path}</span>
                <Badge variant="secondary" className="text-[10px]">{(e?.count ?? 0).toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <InsightCard insights={(() => {
        const tips: string[] = [];
        const totalNav = data.totalNavEvents;
        const totalPV = data.totalPageviews;

        if (totalNav === 0 && totalPV === 0) {
          tips.push("1. No navigation or pageview events recorded. Ensure useGA4NavigationTracking fires nav_click events on header/footer link clicks and that analytics_pageviews rows are being inserted on each page view.");
          tips.push("2. Once active, this section reveals which nav elements, pages, and exit points shape your user journey.");
          return tips;
        }

        // Top clicked element
        const topEl = data.clickedElements[0];
        if (topEl && totalNav > 0) {
          const pct = Math.round((topEl.count / totalNav) * 100);
          tips.push(`1. "${topEl.fullName}" captures ${pct}% of all nav interactions (${(topEl?.count ?? 0).toLocaleString()} clicks). This is your most-used navigation element - ensure your highest-priority content (flagship articles, conversion pages) is accessible from this position.`);
        }

        // Low scroll depth on top page
        const lowScrollPages = data.topPages.filter(p => p.avgScroll < 30 && p.views > 20);
        if (lowScrollPages.length > 0) {
          const worst = lowScrollPages[0];
           tips.push(`2. "${worst.path}" gets ${(worst?.views ?? 0).toLocaleString()} views but only ${worst.avgScroll}% avg scroll depth. Readers aren't engaging beyond the fold. Restructure: move the key value proposition or most compelling content higher, reduce hero image height, and add a visible "Read more" indicator.`);
        } else if (data.topPages.length > 0) {
          const bestScroll = data.topPages.reduce((best, p) => p.avgScroll > best.avgScroll ? p : best, data.topPages[0]);
           tips.push(`2. Best scroll depth: "${bestScroll.path}" at ${bestScroll.avgScroll}% across ${(bestScroll?.views ?? 0).toLocaleString()} views. Use this page's content structure as a template for other pages.`);
        }

        // Exit pages
        const topExit = data.topExits[0];
        if (topExit && totalPV > 0) {
          const exitPct = Math.round((topExit.count / totalPV) * 100);
          tips.push(`3. Top exit page: "${topExit.path}" accounts for ${(topExit?.count ?? 0).toLocaleString()} exits (${exitPct}% of pageviews). Reduce drop-off by adding a "You might also like" section, a newsletter signup CTA, or a sticky "Next Article" bar at the bottom.`);
        }

        return tips;
      })()} />
    </div>
  );
};
