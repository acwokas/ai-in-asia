import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";

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

export const AudienceSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-audience", range],
    queryFn: async () => {
      const [sessionsRes] = await Promise.all([
        supabase
          .from("analytics_sessions")
          .select("country, city, device_type, browser, os, referrer_domain, utm_source, utm_medium")
          .gte("started_at", startDate)
          .limit(1000),
      ]);

      const sessions = sessionsRes.data ?? [];

      // Country breakdown
      const countryCounts: Record<string, number> = {};
      (sessions ?? []).forEach((s) => {
        const c = s?.country || "Unknown";
        countryCounts[c] = (countryCounts[c] || 0) + 1;
      });
      const topCountries = Object.entries(countryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([country, count]) => ({ country, count }));

      // Device breakdown
      const deviceCounts: Record<string, number> = {};
      (sessions ?? []).forEach((s) => {
        const d = s?.device_type || "unknown";
        deviceCounts[d] = (deviceCounts[d] || 0) + 1;
      });
      const deviceData = Object.entries(deviceCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Browser breakdown
      const browserCounts: Record<string, number> = {};
      (sessions ?? []).forEach((s) => {
        const b = s?.browser || "Unknown";
        browserCounts[b] = (browserCounts[b] || 0) + 1;
      });
      const topBrowsers = Object.entries(browserCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([browser, count]) => ({ browser, count }));

      // OS breakdown
      const osCounts: Record<string, number> = {};
      (sessions ?? []).forEach((s) => {
        const o = s?.os || "Unknown";
        osCounts[o] = (osCounts[o] || 0) + 1;
      });
      const topOS = Object.entries(osCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([os, count]) => ({ os, count }));

      // Top referrers
      const refCounts: Record<string, number> = {};
      (sessions ?? []).forEach((s) => {
        const r = s?.referrer_domain || "direct";
        refCounts[r] = (refCounts[r] || 0) + 1;
      });
      const topReferrers = Object.entries(refCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count }));

      // UTM sources
      const utmCounts: Record<string, number> = {};
      (sessions ?? []).forEach((s) => {
        if (!s?.utm_source) return;
        const key = s.utm_medium ? `${s.utm_source} / ${s.utm_medium}` : s.utm_source;
        utmCounts[key] = (utmCounts[key] || 0) + 1;
      });
      const topUTM = Object.entries(utmCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([source, count]) => ({ source, count }));

      return {
        totalSessions: (sessions ?? []).length,
        topCountries: topCountries ?? [],
        deviceData: deviceData ?? [],
        topBrowsers: topBrowsers ?? [],
        topOS: topOS ?? [],
        topReferrers: topReferrers ?? [],
        topUTM: topUTM ?? [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">No data available</p>;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Countries bar chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Top Countries</h4>
          {(data?.topCountries ?? []).length ? (
            <ChartContainer config={{ count: { label: "Sessions", color: "hsl(var(--primary))" } }} className="h-[280px]">
              <BarChart data={data?.topCountries ?? []} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="country" type="category" className="text-xs" width={75} tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No country data recorded</p>
          )}
        </div>

        {/* Device pie chart */}
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

      <div className="grid md:grid-cols-3 gap-6">
        {/* Referrers */}
        <div>
          <h4 className="text-sm font-medium mb-2">Top Referrers</h4>
          <div className="space-y-1.5">
            {(data?.topReferrers ?? []).length ? (data?.topReferrers ?? []).map((r) => (
              <div key={r.domain} className="flex justify-between text-xs border rounded p-2">
                <span className="truncate max-w-[140px]">{r.domain}</span>
                <Badge variant="secondary" className="text-[10px]">{(r?.count ?? 0).toLocaleString()}</Badge>
              </div>
            )) : <p className="text-xs text-muted-foreground">No referrer data</p>}
          </div>
        </div>

        {/* Browsers */}
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

        {/* OS */}
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

      {/* UTM Sources */}
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
    </div>
  );
};
