import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Users, FileText, Mail, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, eachDayOfInterval, startOfDay } from "date-fns";
import type { QuarterInfo } from "@/hooks/useDashboardTimePeriod";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", IN: "India", SG: "Singapore",
  JP: "Japan", AU: "Australia", DE: "Germany", FR: "France", CA: "Canada",
  KR: "South Korea", CN: "China", HK: "Hong Kong", TW: "Taiwan",
  TH: "Thailand", ID: "Indonesia", MY: "Malaysia", PH: "Philippines",
  VN: "Vietnam", NL: "Netherlands", BR: "Brazil", AE: "UAE",
};

function countryLabel(code: string) {
  return COUNTRY_NAMES[code] || code;
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  const pct = pctChange(current, previous);
  if (pct === 0) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${pct > 0 ? "text-green-500" : "text-red-500"}`}>
      {pct > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(pct)}%
    </span>
  );
}

interface Props {
  currentQuarter: QuarterInfo;
  comparisonQuarter: QuarterInfo;
}

export function QuarterComparisonDashboard({ currentQuarter, comparisonQuarter }: Props) {
  const [showAllPages, setShowAllPages] = useState(false);
  const [showAllGeo, setShowAllGeo] = useState(false);

  const cStart = currentQuarter.start.toISOString();
  const cEnd = currentQuarter.end.toISOString();
  const pStart = comparisonQuarter.start.toISOString();
  const pEnd = comparisonQuarter.end.toISOString();

  // Metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["quarter-compare-metrics", cStart, pStart],
    queryFn: async () => {
      const fetchMetrics = async (s: string, e: string) => {
        const [pvRes, sessRes, articlesRes, subsRes] = await Promise.all([
          supabase.from("analytics_pageviews").select("session_id", { count: "exact" }).gte("viewed_at", s).lte("viewed_at", e),
          supabase.from("analytics_sessions").select("visitor_id", { count: "exact" }).gte("started_at", s).lte("started_at", e),
          supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published").gte("published_at", s).lte("published_at", e),
          supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).gte("subscribed_at", s).lte("subscribed_at", e),
        ]);

        const uniqueVisitors = new Set((pvRes.data || []).map((r: any) => r.session_id)).size;

        return {
          pageviews: pvRes.count || 0,
          uniqueVisitors,
          sessions: sessRes.count || 0,
          articles: articlesRes.count || 0,
          subscribers: subsRes.count || 0,
        };
      };

      const [current, comparison] = await Promise.all([
        fetchMetrics(cStart, cEnd),
        fetchMetrics(pStart, pEnd),
      ]);
      return { current, comparison };
    },
  });

  // Daily trend data
  const { data: trendData } = useQuery({
    queryKey: ["quarter-compare-trend", cStart, pStart],
    queryFn: async () => {
      const fetchDaily = async (s: string, e: string) => {
        const { data } = await supabase.from("analytics_pageviews")
          .select("viewed_at").gte("viewed_at", s).lte("viewed_at", e);
        const counts: Record<string, number> = {};
        (data || []).forEach((r: any) => {
          const day = format(new Date(r.viewed_at), "yyyy-MM-dd");
          counts[day] = (counts[day] || 0) + 1;
        });
        return counts;
      };

      const [currentDaily, compDaily] = await Promise.all([
        fetchDaily(cStart, cEnd),
        fetchDaily(pStart, pEnd),
      ]);
      return { currentDaily, compDaily };
    },
  });

  // Top pages
  const { data: pagesData } = useQuery({
    queryKey: ["quarter-compare-pages", cStart, pStart],
    queryFn: async () => {
      const fetchPages = async (s: string, e: string) => {
        const { data } = await supabase.from("analytics_pageviews")
          .select("page_path, session_id").gte("viewed_at", s).lte("viewed_at", e);
        const map: Record<string, { views: number; visitors: Set<string> }> = {};
        (data || []).forEach((r: any) => {
          if (!map[r.page_path]) map[r.page_path] = { views: 0, visitors: new Set() };
          map[r.page_path].views++;
          map[r.page_path].visitors.add(r.session_id);
        });
        return Object.entries(map).map(([path, d]) => ({ path, views: d.views, visitors: d.visitors.size }))
          .sort((a, b) => b.views - a.views);
      };
      const [cur, comp] = await Promise.all([fetchPages(cStart, cEnd), fetchPages(pStart, pEnd)]);
      return { current: cur, comparison: comp };
    },
  });

  // Geo
  const { data: geoData } = useQuery({
    queryKey: ["quarter-compare-geo", cStart, pStart],
    queryFn: async () => {
      const fetchGeo = async (s: string, e: string) => {
        const { data } = await supabase.from("analytics_sessions")
          .select("country").gte("started_at", s).lte("started_at", e).not("country", "is", null);
        const map: Record<string, number> = {};
        (data || []).forEach((r: any) => { map[r.country] = (map[r.country] || 0) + 1; });
        return Object.entries(map).map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count);
      };
      const [cur, comp] = await Promise.all([fetchGeo(cStart, cEnd), fetchGeo(pStart, pEnd)]);
      return { current: cur, comparison: comp };
    },
  });

  // Build trend chart data
  const chartData = useMemo(() => {
    if (!trendData) return [];
    const now = new Date();
    const currentEnd = currentQuarter.end < now ? currentQuarter.end : now;
    const currentDays = eachDayOfInterval({ start: currentQuarter.start, end: currentEnd });
    const compDays = eachDayOfInterval({ start: comparisonQuarter.start, end: comparisonQuarter.end });
    const maxLen = Math.max(currentDays.length, compDays.length);

    return Array.from({ length: maxLen }, (_, i) => {
      const cDay = currentDays[i] ? format(currentDays[i], "yyyy-MM-dd") : null;
      const pDay = compDays[i] ? format(compDays[i], "yyyy-MM-dd") : null;
      return {
        day: i + 1,
        current: cDay ? (trendData.currentDaily[cDay] || 0) : 0,
        comparison: pDay ? (trendData.compDaily[pDay] || 0) : 0,
      };
    });
  }, [trendData, currentQuarter, comparisonQuarter]);

  // Merged pages table
  const mergedPages = useMemo(() => {
    if (!pagesData) return [];
    const compMap = new Map(pagesData.comparison.map(p => [p.path, p.views]));
    const allPaths = new Set([...pagesData.current.map(p => p.path), ...pagesData.comparison.map(p => p.path)]);
    return Array.from(allPaths).map(path => {
      const cur = pagesData.current.find(p => p.path === path);
      const comp = compMap.get(path) || 0;
      return { path, currentViews: cur?.views || 0, compViews: comp, isNew: comp === 0 && (cur?.views || 0) > 0 };
    }).sort((a, b) => b.currentViews - a.currentViews);
  }, [pagesData]);

  // Merged geo
  const mergedGeo = useMemo(() => {
    if (!geoData) return [];
    const compMap = new Map(geoData.comparison.map(g => [g.code, g.count]));
    const allCodes = new Set([...geoData.current.map(g => g.code), ...geoData.comparison.map(g => g.code)]);
    return Array.from(allCodes).map(code => {
      const cur = geoData.current.find(g => g.code === code)?.count || 0;
      const comp = compMap.get(code) || 0;
      return { code, current: cur, comparison: comp };
    }).sort((a, b) => b.current - a.current);
  }, [geoData]);

  const metricCards = metrics ? [
    { label: "Page Views", icon: Eye, cur: metrics.current.pageviews, comp: metrics.comparison.pageviews },
    { label: "Unique Visitors", icon: Users, cur: metrics.current.uniqueVisitors, comp: metrics.comparison.uniqueVisitors },
    { label: "Articles Published", icon: FileText, cur: metrics.current.articles, comp: metrics.comparison.articles },
    { label: "New Subscribers", icon: Mail, cur: metrics.current.subscribers, comp: metrics.comparison.subscribers },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Quarter labels */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary font-medium">
          {currentQuarter.label} <span className="text-xs text-muted-foreground">(current)</span>
        </div>
        <span className="text-muted-foreground">vs</span>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent text-accent-foreground font-medium">
          {comparisonQuarter.label}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          metricCards.map(({ label, icon: Icon, cur, comp }) => (
            <Card key={label}>
              <CardHeader className="pb-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold">{cur.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">vs {comp.toLocaleString()}</p>
                  </div>
                  <ChangeIndicator current={cur} previous={comp} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Page Views</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} label={{ value: "Day of quarter", position: "insideBottom", offset: -5, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend />
                <Area type="monotone" dataKey="current" name={currentQuarter.label} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="comparison" name={comparisonQuarter.label} stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top pages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Pages Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Page</TableHead>
                  <TableHead className="text-xs text-right">{currentQuarter.label}</TableHead>
                  <TableHead className="text-xs text-right">{comparisonQuarter.label}</TableHead>
                  <TableHead className="text-xs text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showAllPages ? mergedPages : mergedPages.slice(0, 10)).map(({ path, currentViews, compViews, isNew }) => (
                  <TableRow key={path}>
                    <TableCell className="text-xs font-mono truncate max-w-[200px]">
                      {path}
                      {isNew && <span className="ml-1 text-[10px] text-green-500 font-medium">NEW</span>}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">{currentViews.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">{compViews.toLocaleString()}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator current={currentViews} previous={compViews} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {mergedPages.length > 10 && (
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setShowAllPages(!showAllPages)}>
                {showAllPages ? <><ChevronUp className="h-3 w-3 mr-1" /> Show less</> : <><ChevronDown className="h-3 w-3 mr-1" /> Show all {mergedPages.length}</>}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Geo comparison */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Geo Comparison</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Country</TableHead>
                  <TableHead className="text-xs text-right">{currentQuarter.label}</TableHead>
                  <TableHead className="text-xs text-right">{comparisonQuarter.label}</TableHead>
                  <TableHead className="text-xs text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showAllGeo ? mergedGeo : mergedGeo.slice(0, 10)).map(({ code, current, comparison }) => (
                  <TableRow key={code}>
                    <TableCell className="text-xs">{countryLabel(code)}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{current.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">{comparison.toLocaleString()}</TableCell>
                    <TableCell className="text-right"><ChangeIndicator current={current} previous={comparison} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {mergedGeo.length > 10 && (
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setShowAllGeo(!showAllGeo)}>
                {showAllGeo ? <><ChevronUp className="h-3 w-3 mr-1" /> Show less</> : <><ChevronDown className="h-3 w-3 mr-1" /> Show all {mergedGeo.length}</>}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
