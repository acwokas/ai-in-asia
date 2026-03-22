import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { InsightCard } from "./InsightCard";
import { EmptyDataNotice } from "./EmptyDataNotice";
import { Info } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Props {
  startDate: string;
  range: string;
}

const SEARCH_ENGINES: Record<string, string> = {
  "google.com": "Google",
  "google.co": "Google",
  "google.co.uk": "Google",
  "google.co.in": "Google",
  "google.co.jp": "Google",
  "google.de": "Google",
  "google.fr": "Google",
  "bing.com": "Bing",
  "duckduckgo.com": "DuckDuckGo",
  "yahoo.com": "Yahoo",
  "baidu.com": "Baidu",
  "yandex.com": "Yandex",
  "ecosia.org": "Ecosia",
  "search.brave.com": "Brave",
};

const SEO_FIX_DATE = "2026-03-21";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.7)",
  "hsl(var(--primary) / 0.45)",
  "hsl(var(--primary) / 0.25)",
  "hsl(var(--muted-foreground) / 0.5)",
];

async function fetchAllSessions(startDate: string) {
  const rows: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("analytics_sessions")
      .select("referrer_domain,landing_page,started_at,duration_seconds,is_bounce,page_count")
      .gte("started_at", startDate)
      .range(from, from + 999);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }
  return rows;
}

function isOrganic(domain: string): string | null {
  const d = (domain || "").toLowerCase();
  for (const [key, name] of Object.entries(SEARCH_ENGINES)) {
    if (d.includes(key)) return name;
  }
  return null;
}

export const SEOPerformanceSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-seo-performance", range],
    queryFn: async () => {
      const sessions = await fetchAllSessions(startDate);
      const totalSessions = sessions.length;
      const days = differenceInDays(new Date(), new Date(startDate)) || 1;

      const organicSessions: typeof sessions = [];
      const engineCounts: Record<string, number> = {};
      const landingPageCounts: Record<string, number> = {};
      const dailyOrganic: Record<string, number> = {};
      const dailyTotal: Record<string, number> = {};

      for (const s of sessions) {
        const day = format(new Date(s.started_at), "MMM dd");
        dailyTotal[day] = (dailyTotal[day] || 0) + 1;

        const engine = isOrganic(s.referrer_domain || "");
        if (engine) {
          organicSessions.push(s);
          engineCounts[engine] = (engineCounts[engine] || 0) + 1;
          dailyOrganic[day] = (dailyOrganic[day] || 0) + 1;
          const lp = s.landing_page || "/";
          landingPageCounts[lp] = (landingPageCounts[lp] || 0) + 1;
        }
      }

      const totalOrganic = organicSessions.length;
      const organicPct = totalSessions > 0 ? ((totalOrganic / totalSessions) * 100).toFixed(1) : "0";
      const organicAvgDuration = totalOrganic > 0
        ? Math.round(organicSessions.reduce((s, x) => s + (x.duration_seconds ?? 0), 0) / totalOrganic)
        : 0;
      const organicBounceRate = totalOrganic > 0
        ? Math.round((organicSessions.filter(x => x.is_bounce).length / totalOrganic) * 100)
        : 0;

      const engines = Object.entries(engineCounts)
        .map(([name, count]) => ({ name, count, pct: totalOrganic > 0 ? Math.round((count / totalOrganic) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);

      const topLandingPages = Object.entries(landingPageCounts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // Daily trend for chart
      const allDays = Object.keys(dailyTotal).sort();
      const dailyTrend = allDays.map((day) => ({
        date: day,
        organic: dailyOrganic[day] || 0,
        other: (dailyTotal[day] || 0) - (dailyOrganic[day] || 0),
      }));

      // Pre/post SEO fix comparison
      const preFix = organicSessions.filter(s => s.started_at < SEO_FIX_DATE).length;
      const postFix = organicSessions.filter(s => s.started_at >= SEO_FIX_DATE).length;
      const preFixDays = Math.max(1, differenceInDays(new Date(SEO_FIX_DATE), new Date(startDate)));
      const postFixDays = Math.max(1, differenceInDays(new Date(), new Date(SEO_FIX_DATE)));
      const preFixDaily = preFix / preFixDays;
      const postFixDaily = postFix / postFixDays;
      const recoveryPctChange = preFixDaily > 0
        ? Math.round(((postFixDaily - preFixDaily) / preFixDaily) * 100)
        : postFixDaily > 0 ? 100 : 0;

      return {
        totalSessions,
        totalOrganic,
        organicPct,
        organicAvgDuration,
        organicBounceRate,
        engines,
        topLandingPages,
        dailyTrend,
        recoveryPctChange,
        preFixDaily: Math.round(preFixDaily * 10) / 10,
        postFixDaily: Math.round(postFixDaily * 10) / 10,
      };
    },
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>;
  if (!data) return <EmptyDataNotice message="Unable to load SEO data." />;

  const d = data;

  const pieData = d.totalSessions > 0
    ? [
        { name: "Organic", value: d.totalOrganic, fill: "hsl(var(--primary))" },
        { name: "Non-Organic", value: d.totalSessions - d.totalOrganic, fill: "hsl(var(--muted-foreground) / 0.3)" },
      ]
    : [];

  const chartConfig = {
    organic: { label: "Organic", color: "hsl(var(--primary))" },
    other: { label: "Other Traffic", color: "hsl(var(--muted-foreground) / 0.3)" },
  };

  // Build insights
  const tips: string[] = [];
  if (d.totalOrganic === 0) {
    tips.push("1. No organic search traffic detected. The prerender fix deployed March 21, 2026 enables Google indexing — expect organic sessions to appear within 2-4 weeks as pages are crawled and indexed.");
    tips.push("2. Submit your sitemap to Google Search Console and Bing Webmaster Tools to accelerate discovery.");
  } else {
    tips.push(`1. Organic search accounts for ${d.organicPct}% of traffic (${d.totalOrganic.toLocaleString()} sessions). ${parseFloat(d.organicPct) < 30 ? "Industry benchmark for content sites is 40-60% organic — focus on SEO-optimized titles and meta descriptions." : "This is a healthy organic share. Maintain momentum with regular content updates."}`);

    if (d.recoveryPctChange !== 0) {
      const direction = d.recoveryPctChange > 0 ? "📈" : "📉";
      tips.push(`2. Post-prerender fix (Mar 21): organic traffic ${d.recoveryPctChange > 0 ? "increased" : "decreased"} ${direction} by ${Math.abs(d.recoveryPctChange)}% (${d.preFixDaily}/day → ${d.postFixDaily}/day). ${d.recoveryPctChange > 0 ? "Recovery is on track — full indexing typically takes 4-8 weeks." : "Allow 4-8 weeks for full re-indexing. Monitor Search Console for crawl errors."}`);
    }

    if (d.topLandingPages.length > 0) {
      const topPage = d.topLandingPages[0];
      tips.push(`3. Top organic landing page "${topPage.path}" has ${topPage.count} sessions. Strengthen this page with internal links from related articles, and add structured data (FAQ schema, HowTo) to boost SERP visibility.`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Organic Sessions</p>
          <p className="text-2xl font-bold">{d.totalOrganic.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{d.organicPct}% of total</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Organic Avg Duration</p>
          <p className="text-2xl font-bold">{d.organicAvgDuration}s</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Organic Bounce Rate</p>
          <p className="text-2xl font-bold">{d.organicBounceRate}%</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">SEO Recovery</p>
          <p className="text-2xl font-bold">{d.recoveryPctChange > 0 ? "+" : ""}{d.recoveryPctChange}%</p>
          <p className="text-xs text-muted-foreground">vs pre-fix daily avg</p>
        </div>
      </div>

      {d.totalOrganic === 0 ? (
        <EmptyDataNotice message="No organic search sessions detected yet. Allow 2-4 weeks after the prerender fix for Google to index your pages." />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Organic vs other pie */}
          <div>
            <h4 className="text-sm font-medium mb-3">Organic vs Non-Organic Split</h4>
            <ChartContainer config={chartConfig} className="h-[220px]">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                  <span>{entry.name}: {entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Search engine breakdown */}
          <div>
            <h4 className="text-sm font-medium mb-3">Search Engine Breakdown</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Engine</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.engines.map((e) => (
                  <TableRow key={e.name}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="text-right">{e.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{e.pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Daily organic trend */}
      {d.dailyTrend.length > 1 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Daily Organic Traffic Trend</h4>
          <ChartContainer config={chartConfig} className="h-[220px]">
            <LineChart data={d.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="organic" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      )}

      {/* Top landing pages */}
      {d.topLandingPages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Top Organic Landing Pages</h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Organic Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.topLandingPages.map((p) => (
                  <TableRow key={p.path}>
                    <TableCell className="font-medium text-xs max-w-[300px] truncate">{p.path}</TableCell>
                    <TableCell className="text-right">{p.count.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Future enhancement note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>Connect Google Search Console API for keyword data, CTR, average position, and crawl analytics.</span>
      </div>

      <InsightCard insights={tips} variant="highlight" />
    </div>
  );
};
