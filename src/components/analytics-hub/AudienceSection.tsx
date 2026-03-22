import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { InsightCard } from "./InsightCard";
import { EmptyDataNotice } from "./EmptyDataNotice";
import { Progress } from "@/components/ui/progress";

interface Props {
  startDate: string;
  range: string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.75)",
  "hsl(var(--primary) / 0.5)",
  "hsl(var(--primary) / 0.35)",
  "hsl(var(--primary) / 0.2)",
];

const SELF_DOMAINS = ["lovable.app", "lovable.dev", "lovableproject.com", "ai-in-asia.lovable.app", "aiinasia.com", "www.aiinasia.com", "ai-in-asia.com", "www.ai-in-asia.com"];

const SOCIAL_DOMAINS = ["t.co", "twitter.com", "x.com", "facebook.com", "linkedin.com", "reddit.com", "threads.net", "instagram.com", "youtube.com", "tiktok.com", "pinterest.com"];
const SEARCH_DOMAINS = ["google.com", "google.co", "bing.com", "duckduckgo.com", "yahoo.com", "baidu.com", "yandex.com", "ecosia.org", "search.brave.com"];

function categorizeReferrer(domain: string): "Direct" | "Organic Search" | "Social Media" | "Other Sites" {
  if (domain === "direct") return "Direct";
  if (SEARCH_DOMAINS.some(s => domain.includes(s))) return "Organic Search";
  if (SOCIAL_DOMAINS.some(s => domain.includes(s))) return "Social Media";
  return "Other Sites";
}

export const AudienceSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-audience", range],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      const MAX_ROWS = 10000;

      const rows: any[] = [];
      let from = 0;
      while (rows.length < MAX_ROWS) {
        const { data: batch } = await supabase
          .from("analytics_sessions")
          .select("country, city, device_type, browser, os, referrer_domain, utm_source, utm_medium")
          .gte("started_at", startDate)
          .range(from, from + PAGE_SIZE - 1);
        const safe = batch ?? [];
        rows.push(...safe);
        if (safe.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const sessions = rows;
      const totalSessions = sessions.length;

      // Country breakdown
      const countryCounts: Record<string, number> = {};
      let unknownCount = 0;
      sessions.forEach((s) => {
        const c = s?.country;
        if (!c || c === "Unknown") { unknownCount++; } else { countryCounts[c] = (countryCounts[c] || 0) + 1; }
      });
      const topCountries = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([country, count]) => ({ country, count }));

      const countryDataCoverage = totalSessions > 0
        ? Math.round(((totalSessions - unknownCount) / totalSessions) * 100) : 0;

      // Device breakdown
      const deviceCounts: Record<string, number> = {};
      sessions.forEach((s) => { const d = s?.device_type || "unknown"; deviceCounts[d] = (deviceCounts[d] || 0) + 1; });
      const deviceData = Object.entries(deviceCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      // Browser breakdown
      const browserCounts: Record<string, number> = {};
      sessions.forEach((s) => { const b = s?.browser || "Unknown"; browserCounts[b] = (browserCounts[b] || 0) + 1; });
      const topBrowsers = Object.entries(browserCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([browser, count]) => ({ browser, count }));

      // OS breakdown
      const osCounts: Record<string, number> = {};
      sessions.forEach((s) => { const o = s?.os || "Unknown"; osCounts[o] = (osCounts[o] || 0) + 1; });
      const topOS = Object.entries(osCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([os, count]) => ({ os, count }));

      // Referrers — filter self-referrals, build ranked list + categories
      const refCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = { "Direct": 0, "Organic Search": 0, "Social Media": 0, "Other Sites": 0 };
      sessions.forEach((s) => {
        const r = s?.referrer_domain || "direct";
        if (SELF_DOMAINS.some(d => r.includes(d))) return;
        refCounts[r] = (refCounts[r] || 0) + 1;
        categoryCounts[categorizeReferrer(r)]++;
      });
      const filteredTotal = Object.values(refCounts).reduce((s, v) => s + v, 0);
      const topReferrers = Object.entries(refCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([domain, count]) => ({
          domain,
          count,
          pct: filteredTotal > 0 ? Math.round((count / filteredTotal) * 100) : 0,
          category: categorizeReferrer(domain),
        }));
      const referralCategories = Object.entries(categoryCounts)
        .map(([name, value]) => ({ name, value, pct: filteredTotal > 0 ? Math.round((value / filteredTotal) * 100) : 0 }))
        .sort((a, b) => b.value - a.value);

      // UTM sources
      const utmCounts: Record<string, number> = {};
      sessions.forEach((s) => {
        if (!s?.utm_source) return;
        const key = s.utm_medium ? `${s.utm_source} / ${s.utm_medium}` : s.utm_source;
        utmCounts[key] = (utmCounts[key] || 0) + 1;
      });
      const topUTM = Object.entries(utmCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([source, count]) => ({ source, count }));

      return {
        totalSessions, filteredTotal, topCountries, countryDataCoverage, unknownCount,
        deviceData, topBrowsers, topOS, topReferrers, referralCategories, topUTM,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  const hasCountryData = (data?.topCountries ?? []).length > 0;

  return (
    <div className="space-y-6">
      {/* ─── REFERRALS (prominent) ─── */}
      <div>
        <h4 className="text-sm font-semibold mb-4">Traffic Sources</h4>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Referral category breakdown */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-3">Channel Breakdown</h5>
            <div className="space-y-2.5">
              {(data?.referralCategories ?? []).map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-muted-foreground">{(cat?.value ?? 0).toLocaleString()} ({cat?.pct ?? 0}%)</span>
                  </div>
                  <Progress value={cat.pct} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Referral bar chart */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-3">Top Referrers</h5>
            {(data?.topReferrers ?? []).length > 0 ? (
              <ChartContainer config={{ count: { label: "Sessions", color: "hsl(var(--primary))" } }} className="h-[280px]">
                <BarChart data={(data?.topReferrers ?? []).slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="domain" type="category" className="text-xs" width={95} tick={{ fontSize: 9 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-xs text-muted-foreground">No referrer data yet</p>
            )}
          </div>
        </div>

        {/* Referrer ranked table */}
        {(data?.topReferrers ?? []).length > 0 && (
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.topReferrers ?? []).map((r, i) => (
                  <TableRow key={r.domain}>
                    <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[180px]">{r.domain}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.category}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs">{(r?.count ?? 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r?.pct ?? 0}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ─── GEO + DEVICES ─── */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-3">Top Countries</h4>
          {hasCountryData ? (
            <>
              <ChartContainer config={{ count: { label: "Sessions", color: "hsl(var(--primary))" } }} className="h-[280px]">
                <BarChart data={data?.topCountries ?? []} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="country" type="category" className="text-xs" width={75} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
              {(data?.countryDataCoverage ?? 0) < 80 && (
                <EmptyDataNotice message={`Country data available for ${data?.countryDataCoverage ?? 0}% of sessions — coverage will improve over the next 24–48 hours as new sessions are geo-located`} />
              )}
            </>
          ) : (
            <EmptyDataNotice message="Country data is being collected via IP geolocation — it will populate as new sessions are created over the next 24–48 hours" />
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3">Devices</h4>
          {(data?.deviceData ?? []).length ? (
            <ChartContainer config={{ value: { label: "Sessions" } }} className="h-[280px]">
              <PieChart>
                <Pie data={data?.deviceData ?? []} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                  {(data?.deviceData ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No device data</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-2">Browsers</h4>
          <div className="space-y-1.5">
            {(data?.topBrowsers ?? []).map((b) => (
              <div key={b.browser} className="flex justify-between text-xs border rounded p-2">
                <span>{b.browser}</span>
                <Badge variant="outline" className="text-[10px]">{(b?.count ?? 0).toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">Operating Systems</h4>
          <div className="space-y-1.5">
            {(data?.topOS ?? []).map((o) => (
              <div key={o.os} className="flex justify-between text-xs border rounded p-2">
                <span>{o.os}</span>
                <Badge variant="outline" className="text-[10px]">{(o?.count ?? 0).toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {(data?.topUTM ?? []).length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">UTM Sources</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(data?.topUTM ?? []).map((u) => (
              <div key={u.source} className="border rounded p-2 text-center">
                <p className="text-sm font-bold">{(u?.count ?? 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground truncate">{u.source}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <InsightCard insights={(() => {
        const tips: string[] = [];
        const total = data?.filteredTotal ?? 0;

        if (total === 0) {
          tips.push("1. No session data yet — set up analytics tracking by ensuring the AnalyticsProvider component wraps your app and useAnalyticsTracking fires on page load.");
          tips.push("2. Once sessions flow, this section will show traffic sources, geographic breakdown, and device mix automatically.");
          return tips;
        }

        // Referral channel analysis
        const direct = data?.referralCategories?.find(c => c.name === "Direct");
        const organic = data?.referralCategories?.find(c => c.name === "Organic Search");
        const social = data?.referralCategories?.find(c => c.name === "Social Media");
        const directPct = direct?.pct ?? 0;
        const organicPct = organic?.pct ?? 0;
        const socialPct = social?.pct ?? 0;

        if (directPct > 70) {
          tips.push(`1. Direct traffic is ${directPct}% of sessions (${(direct?.value ?? 0).toLocaleString()} visits) — heavy reliance on direct/bookmarked visits. Diversify acquisition: target 3-5 long-tail keywords for organic search, share articles on LinkedIn/X within 1 hour of publish, and add UTM tags to newsletter links to measure email-driven traffic.`);
        } else if (organicPct > 40) {
          tips.push(`1. Organic search drives ${organicPct}% of traffic (${(organic?.value ?? 0).toLocaleString()} sessions) — strong SEO foundation. Double down by updating meta descriptions on your top 10 articles and targeting featured snippet formats (listicles, how-tos, comparison tables).`);
        } else {
          tips.push(`1. Traffic mix: Direct ${directPct}%, Search ${organicPct}%, Social ${socialPct}%. ${organicPct < 15 ? 'Organic search is underperforming — audit your top 20 articles for missing focus keyphrases and internal linking gaps.' : 'Healthy distribution across channels.'}`);
        }

        // Top external referrer
        const topExtRef = (data?.topReferrers ?? []).find(r => r.domain !== "direct");
        if (topExtRef) {
          const ratio = topExtRef.count > 0 && total > 0 ? Math.round((topExtRef.count / total) * 100) : 0;
          tips.push(`2. Top external referrer "${topExtRef.domain}" drives ${(topExtRef.count ?? 0).toLocaleString()} sessions (${ratio}% of traffic). ${ratio > 15 ? 'Strong channel — create content specifically for this audience and consider a partnership or guest posting exchange.' : 'Moderate contribution — test sharing more content on this platform to see if traffic scales linearly.'}`);
        } else {
          tips.push(`2. No significant external referrers detected. Start building backlinks: submit guest articles to industry publications, get listed on AI tool directories, and share on LinkedIn with a compelling hook (question or surprising stat).`);
        }

        // Geographic + device
        const topCountry = (data?.topCountries ?? [])[0];
        const mobile = (data?.deviceData ?? []).find(d => d.name === "mobile");
        const mobilePct = mobile && total > 0 ? Math.round((mobile.value / total) * 100) : 0;
        const geoNote = topCountry
          ? `Top market: ${topCountry.country} (${Math.round((((topCountry?.count ?? 0)) / total) * 100)}%).`
          : (hasCountryData ? "" : "Geo data populating — check back in 24-48h.");
        const deviceNote = mobilePct > 60
          ? `${mobilePct}% mobile — ensure CTAs, newsletter forms, and article layouts are touch-optimised.`
          : mobilePct < 30
            ? `Only ${mobilePct}% mobile (desktop-heavy audience) — optimise for widescreen reading with sidebar content.`
            : `${mobilePct}% mobile — balanced device mix.`;
        tips.push(`3. ${geoNote} ${deviceNote}`);

        return tips;
      })()} />
    </div>
  );
};
