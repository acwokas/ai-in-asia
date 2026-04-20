import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye, Users, Activity, Clock, ArrowUp, ArrowDown, Minus,
  FileText, ExternalLink, ChevronDown, ChevronRight, Globe,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { VisitorsByLocation } from "./VisitorsByLocation";
import { format, subHours, subDays, startOfHour, startOfDay } from "date-fns";

type PeriodKind = "24h" | "7d";

interface Props {
  period: PeriodKind;
}

// ─── helpers ────────────────────────────────────────────────

function categorizeReferrer(ref: string | null | undefined): string {
  if (!ref) return "Direct";
  const r = ref.toLowerCase();
  if (r.includes("google") || r.includes("bing") || r.includes("yahoo") || r.includes("duckduckgo") || r.includes("baidu")) return "Google Search";
  if (r.includes("twitter") || r.includes("x.com") || r.includes("t.co") || r.includes("facebook") || r.includes("linkedin") || r.includes("instagram") || r.includes("reddit") || r.includes("threads")) return "Social";
  return "Other Referrals";
}

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

// ─── component ──────────────────────────────────────────────

export function PeriodAnalyticsDashboard({ period }: Props) {
  const [showAllPages, setShowAllPages] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  const now = useMemo(() => new Date(), [period]); // reset on period change
  const currentStart = period === "24h"
    ? subHours(now, 24).toISOString()
    : subDays(now, 7).toISOString();
  const previousStart = period === "24h"
    ? subHours(now, 48).toISOString()
    : subDays(now, 14).toISOString();
  const currentEnd = now.toISOString();
  const previousEnd = currentStart; // previous period ends where current starts

  // ─── main query ─────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ["period-analytics", period],
    queryFn: async () => {
      // Fetch sessions for current + previous periods
      const [curSessions, prevSessions, curPageviews, prevPageviews] = await Promise.all([
        supabase.from("analytics_sessions")
          .select("session_id, visitor_id, duration_seconds, is_bounce, referrer, referrer_domain, country, city, started_at")
          .gte("started_at", currentStart).lte("started_at", currentEnd).limit(1000),
        supabase.from("analytics_sessions")
          .select("session_id, visitor_id, duration_seconds, is_bounce")
          .gte("started_at", previousStart).lte("started_at", previousEnd).limit(1000),
        supabase.from("analytics_pageviews")
          .select("page_path, session_id, viewed_at")
          .gte("viewed_at", currentStart).lte("viewed_at", currentEnd).limit(1000),
        supabase.from("analytics_pageviews")
          .select("id", { count: "exact", head: true })
          .gte("viewed_at", previousStart).lte("viewed_at", previousEnd),
      ]);

      const cs = curSessions.data || [];
      const ps = prevSessions.data || [];
      const cpv = curPageviews.data || [];

      // ── Summary metrics ──
      const totalPageviews = cpv.length;
      const prevPageviewCount = prevPageviews.count || 0;

      const uniqueVisitors = new Set(cs.map((s) => s.visitor_id || s.session_id)).size;
      const prevUniqueVisitors = new Set(ps.map((s) => s.visitor_id || s.session_id)).size;

      const totalSessions = cs.length;
      const prevTotalSessions = ps.length;

      const durationsValid = cs.filter((s) => s.duration_seconds != null && s.duration_seconds > 0 && s.duration_seconds < 1800);
      const avgDuration = durationsValid.length > 0
        ? Math.round(durationsValid.reduce((a, s) => a + (s.duration_seconds || 0), 0) / durationsValid.length)
        : null;
      const prevDurValid = ps.filter((s) => s.duration_seconds != null && s.duration_seconds > 0 && s.duration_seconds < 1800);
      const prevAvgDuration = prevDurValid.length > 0
        ? Math.round(prevDurValid.reduce((a, s) => a + (s.duration_seconds || 0), 0) / prevDurValid.length)
        : null;

      const bounces = cs.filter((s) => s.is_bounce).length;
      const bounceRate = totalSessions > 0 ? Math.round((bounces / totalSessions) * 100) : null;
      const prevBounces = ps.filter((s) => s.is_bounce).length;
      const prevBounceRate = prevTotalSessions > 0 ? Math.round((prevBounces / prevTotalSessions) * 100) : null;

      // ── Trend chart ──
      const trendMap = new Map<string, number>();
      if (period === "24h") {
        // 24 hourly buckets
        for (let i = 23; i >= 0; i--) {
          const h = startOfHour(subHours(now, i));
          trendMap.set(format(h, "HH:00"), 0);
        }
        for (const pv of cpv) {
          const key = format(new Date(pv.viewed_at), "HH:00");
          if (trendMap.has(key)) trendMap.set(key, trendMap.get(key)! + 1);
        }
      } else {
        // 7 daily buckets
        for (let i = 6; i >= 0; i--) {
          const d = startOfDay(subDays(now, i));
          trendMap.set(format(d, "MMM dd"), 0);
        }
        for (const pv of cpv) {
          const key = format(new Date(pv.viewed_at), "MMM dd");
          if (trendMap.has(key)) trendMap.set(key, trendMap.get(key)! + 1);
        }
      }
      const trendData = Array.from(trendMap.entries()).map(([label, views]) => ({ label, views }));

      // ── Top pages ──
      const pageMap = new Map<string, { views: number; sessions: Set<string> }>();
      for (const pv of cpv) {
        if (!pv.page_path) continue;
        if (!pageMap.has(pv.page_path)) pageMap.set(pv.page_path, { views: 0, sessions: new Set() });
        const e = pageMap.get(pv.page_path)!;
        e.views++;
        e.sessions.add(pv.session_id);
      }
      const topPages = Array.from(pageMap.entries())
        .map(([path, { views, sessions }]) => ({
          path,
          views,
          uniques: sessions.size,
          pct: totalPageviews > 0 ? Math.round((views / totalPageviews) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.views - a.views);

      // ── Traffic sources ──
      const sourceMap = new Map<string, { count: number; urls: Map<string, number> }>();
      for (const s of cs) {
        const cat = categorizeReferrer(s.referrer || s.referrer_domain);
        if (!sourceMap.has(cat)) sourceMap.set(cat, { count: 0, urls: new Map() });
        const entry = sourceMap.get(cat)!;
        entry.count++;
        const url = s.referrer_domain || s.referrer || "(none)";
        if (cat !== "Direct") entry.urls.set(url, (entry.urls.get(url) || 0) + 1);
      }
      const sources = Array.from(sourceMap.entries())
        .map(([source, { count, urls }]) => ({
          source,
          count,
          pct: totalSessions > 0 ? Math.round((count / totalSessions) * 1000) / 10 : 0,
          topUrls: Array.from(urls.entries())
            .map(([url, cnt]) => ({ url, count: cnt }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
        }))
        .sort((a, b) => b.count - a.count);

      return {
        summary: {
          totalPageviews, prevPageviewCount,
          uniqueVisitors, prevUniqueVisitors,
          totalSessions, prevTotalSessions,
          avgDuration, prevAvgDuration,
          bounceRate, prevBounceRate,
        },
        trendData,
        topPages,
        sources,
      };
    },
    staleTime: 60_000,
  });

  const s = data?.summary;
  const displayedPages = showAllPages ? data?.topPages : data?.topPages?.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* ── Summary Metrics ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard icon={Eye} label="Page Views" value={s?.totalPageviews} prev={s?.prevPageviewCount} loading={isLoading} />
        <MetricCard icon={Users} label="Unique Visitors" value={s?.uniqueVisitors} prev={s?.prevUniqueVisitors} loading={isLoading} />
        <MetricCard icon={Activity} label="Sessions" value={s?.totalSessions} prev={s?.prevTotalSessions} loading={isLoading} />
        {s?.avgDuration != null && (
          <MetricCard icon={Clock} label="Avg Duration" value={s.avgDuration} prev={s.prevAvgDuration} loading={isLoading} suffix="s" />
        )}
        {s?.bounceRate != null && (
          <MetricCard icon={ArrowDown} label="Bounce Rate" value={s.bounceRate} prev={s.prevBounceRate} loading={isLoading} suffix="%" invertTrend />
        )}
      </div>

      {/* ── Trend Chart ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Page Views - {period === "24h" ? "Hourly" : "Daily"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area
                  type="monotone" dataKey="views" stroke="hsl(var(--primary))"
                  fill="url(#pvGrad)" strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Top Pages ────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Top Pages</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : !displayedPages?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No page view data</p>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_60px_60px_50px] text-xs text-muted-foreground font-medium px-2 pb-1.5">
                  <span>Page</span>
                  <span className="text-right">Views</span>
                  <span className="text-right">Uniq</span>
                  <span className="text-right">%</span>
                </div>
                <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
                  {displayedPages.map((p) => (
                    <div key={p.path} className="grid grid-cols-[1fr_60px_60px_50px] items-center px-2 py-1.5 rounded-md hover:bg-accent/50 text-sm">
                      <span className="truncate pr-2 text-xs">{p.path}</span>
                      <span className="text-right font-mono text-xs">{p.views}</span>
                      <span className="text-right font-mono text-xs text-muted-foreground">{p.uniques}</span>
                      <span className="text-right text-xs text-muted-foreground">{p.pct}%</span>
                    </div>
                  ))}
                </div>
                {(data?.topPages?.length || 0) > 10 && (
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setShowAllPages(!showAllPages)}>
                    {showAllPages ? "Show less" : `Show all ${data?.topPages?.length} pages`}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Traffic Sources ──────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Traffic Sources</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !data?.sources?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No traffic data</p>
            ) : (
              <div className="space-y-1">
                {data.sources.map((src) => {
                  const isOpen = expandedSource === src.source;
                  return (
                    <div key={src.source}>
                      <button
                        onClick={() => setExpandedSource(isOpen ? null : src.source)}
                        className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-accent/50 transition-colors text-sm"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          {src.topUrls.length > 0 ? (
                            isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : <span className="w-3.5" />}
                          {src.source}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="font-mono text-xs">{src.count}</span>
                          <span className="text-xs text-muted-foreground w-10 text-right">{src.pct}%</span>
                        </span>
                      </button>

                      {/* Progress bar */}
                      <div className="mx-2 mb-1">
                        <div className="h-1.5 rounded-full bg-accent/30 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${src.pct}%` }} />
                        </div>
                      </div>

                      {isOpen && src.topUrls.length > 0 && (
                        <div className="ml-8 mb-2 space-y-0.5">
                          {src.topUrls.map((u) => (
                            <div key={u.url} className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
                              <span className="truncate max-w-[200px]">{u.url}</span>
                              <span className="font-mono">{u.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Geo Breakdown ──────────────────────────────────────── */}
      <VisitorsByLocation startDate={currentStart} endDate={currentEnd} />
    </div>
  );
}

// ─── MetricCard ─────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, prev, loading, suffix = "", invertTrend = false }: {
  icon: React.ElementType;
  label: string;
  value: number | null | undefined;
  prev: number | null | undefined;
  loading: boolean;
  suffix?: string;
  invertTrend?: boolean;
}) {
  const change = value != null && prev != null ? pctChange(value, prev) : null;
  // For bounce rate, lower is better so we invert the color
  const isPositive = change != null ? (invertTrend ? change <= 0 : change >= 0) : null;

  return (
    <Card>
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground truncate">{label}</span>
            </div>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold tabular-nums">
                {value != null ? value.toLocaleString() : "N/A"}{suffix}
              </p>
              {change !== null && (
                <span className={`flex items-center gap-0.5 text-xs font-medium pb-0.5 ${isPositive ? "text-green-500" : "text-red-500"}`}>
                  {change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(change)}%
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
