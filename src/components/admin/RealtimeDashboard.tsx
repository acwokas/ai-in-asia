import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Globe, FileText, ExternalLink, RefreshCw,
  MapPin, ChevronDown, ChevronRight,
} from "lucide-react";
import { VisitorsByLocation } from "./VisitorsByLocation";

const REFRESH_INTERVAL = 30_000; // 30 seconds

const COUNTRY_FLAGS: Record<string, { name: string; flag: string }> = {
  US: { name: "United States", flag: "🇺🇸" }, GB: { name: "United Kingdom", flag: "🇬🇧" },
  IN: { name: "India", flag: "🇮🇳" }, SG: { name: "Singapore", flag: "🇸🇬" },
  JP: { name: "Japan", flag: "🇯🇵" }, DE: { name: "Germany", flag: "🇩🇪" },
  FR: { name: "France", flag: "🇫🇷" }, AU: { name: "Australia", flag: "🇦🇺" },
  CA: { name: "Canada", flag: "🇨🇦" }, KR: { name: "South Korea", flag: "🇰🇷" },
  CN: { name: "China", flag: "🇨🇳" }, BR: { name: "Brazil", flag: "🇧🇷" },
  ID: { name: "Indonesia", flag: "🇮🇩" }, TH: { name: "Thailand", flag: "🇹🇭" },
  VN: { name: "Vietnam", flag: "🇻🇳" }, MY: { name: "Malaysia", flag: "🇲🇾" },
  PH: { name: "Philippines", flag: "🇵🇭" }, TW: { name: "Taiwan", flag: "🇹🇼" },
  HK: { name: "Hong Kong", flag: "🇭🇰" }, NL: { name: "Netherlands", flag: "🇳🇱" },
  AE: { name: "UAE", flag: "🇦🇪" }, IE: { name: "Ireland", flag: "🇮🇪" },
  IL: { name: "Israel", flag: "🇮🇱" }, IT: { name: "Italy", flag: "🇮🇹" },
  ES: { name: "Spain", flag: "🇪🇸" }, SE: { name: "Sweden", flag: "🇸🇪" },
  CH: { name: "Switzerland", flag: "🇨🇭" }, NZ: { name: "New Zealand", flag: "🇳🇿" },
  MX: { name: "Mexico", flag: "🇲🇽" }, PK: { name: "Pakistan", flag: "🇵🇰" },
  NG: { name: "Nigeria", flag: "🇳🇬" }, ZA: { name: "South Africa", flag: "🇿🇦" },
  TR: { name: "Turkey", flag: "🇹🇷" }, PL: { name: "Poland", flag: "🇵🇱" },
};

function getCountryInfo(code: string) {
  return COUNTRY_FLAGS[code?.toUpperCase()] || { name: code || "Unknown", flag: "" };
}

function categorizeReferrer(referrer: string | null): string {
  if (!referrer) return "Direct";
  const r = referrer.toLowerCase();
  if (r.includes("google") || r.includes("bing") || r.includes("yahoo") || r.includes("duckduckgo") || r.includes("baidu")) return "Search";
  if (r.includes("twitter") || r.includes("x.com") || r.includes("facebook") || r.includes("linkedin") || r.includes("instagram") || r.includes("reddit") || r.includes("threads")) return "Social";
  if (r.includes("t.co")) return "Social";
  return "Referral";
}

const SOURCE_COLORS: Record<string, string> = {
  Direct: "bg-blue-500",
  Search: "bg-green-500",
  Social: "bg-purple-500",
  Referral: "bg-amber-500",
};

export function RealtimeDashboard() {
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const thirtyMinAgo = () => new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const nowIso = () => new Date().toISOString();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["realtime-dashboard"],
    queryFn: async () => {
      const since = thirtyMinAgo();

      const { data: sessions, error } = await supabase
        .from("analytics_sessions")
        .select("session_id, country, city, referrer, referrer_domain, landing_page, started_at")
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const { data: pageviews } = await supabase
        .from("analytics_pageviews")
        .select("page_path, session_id")
        .gte("viewed_at", since)
        .limit(1000);

      // Active visitors count
      const activeCount = sessions?.length ?? 0;

      // Country breakdown
      const countryMap = new Map<string, { count: number; cities: Map<string, number> }>();
      for (const s of sessions || []) {
        const cc = s.country?.toUpperCase() || "XX";
        if (!countryMap.has(cc)) countryMap.set(cc, { count: 0, cities: new Map() });
        const entry = countryMap.get(cc)!;
        entry.count++;
        if (s.city) entry.cities.set(s.city, (entry.cities.get(s.city) || 0) + 1);
      }
      const countries = Array.from(countryMap.entries())
        .map(([code, { count, cities }]) => ({
          code, count,
          cities: Array.from(cities.entries())
            .map(([city, cnt]) => ({ city, count: cnt }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
        }))
        .sort((a, b) => b.count - a.count);

      // Page breakdown
      const pageMap = new Map<string, number>();
      for (const pv of pageviews || []) {
        if (pv.page_path) {
          pageMap.set(pv.page_path, (pageMap.get(pv.page_path) || 0) + 1);
        }
      }
      const pages = Array.from(pageMap.entries())
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // Traffic sources
      const sourceMap = new Map<string, number>();
      for (const s of sessions || []) {
        const cat = categorizeReferrer(s.referrer || s.referrer_domain);
        sourceMap.set(cat, (sourceMap.get(cat) || 0) + 1);
      }
      const sources = Array.from(sourceMap.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      return { activeCount, countries, pages, sources };
    },
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 10_000,
  });

  // Track last updated time
  useEffect(() => {
    if (!isLoading) setLastUpdated(new Date());
  }, [data, isLoading]);

  // Tick seconds ago
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const totalSources = data?.sources.reduce((s, x) => s + x.count, 0) || 1;
  const maxPageCount = data?.pages[0]?.count || 1;

  return (
    <div className="space-y-6">
      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span>Live — updated {secondsAgo}s ago</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-xs gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Active Visitors Hero */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-8 flex flex-col items-center justify-center">
          {isLoading ? (
            <Skeleton className="h-16 w-24" />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500" />
                </span>
                <span className="text-6xl font-bold tabular-nums">{data?.activeCount ?? 0}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {data?.activeCount === 0 ? "No active visitors" : "Active visitors in the last 30 minutes"}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {data?.activeCount === 0 && !isLoading ? (
        <p className="text-center text-muted-foreground py-8">No visitor activity in the last 30 minutes.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Where They're From */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Where They're From</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : !data?.countries.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No location data</p>
              ) : (
                <CountryList countries={data.countries} />
              )}
            </CardContent>
          </Card>

          {/* What They're Doing */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">What They're Viewing</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : !data?.pages.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No page data</p>
              ) : (
                <div className="space-y-1.5">
                  {data.pages.map((page) => (
                    <div key={page.path} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="relative h-7 rounded bg-accent/30 overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-primary/15 rounded"
                            style={{ width: `${(page.count / maxPageCount) * 100}%` }}
                          />
                          <span className="relative z-10 text-xs px-2 leading-7 truncate block">
                            {page.path}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-8 text-right shrink-0">
                        {page.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Traffic Sources</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : !data?.sources.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No traffic data</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["Direct", "Search", "Social", "Referral"].map((src) => {
                    const entry = data.sources.find((s) => s.source === src);
                    const count = entry?.count ?? 0;
                    const pct = Math.round((count / totalSources) * 100);
                    return (
                      <div key={src} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{src}</span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-accent/30 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${SOURCE_COLORS[src] || "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-lg font-bold">{count}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Country list with expandable cities ──────────────────

function CountryList({ countries }: { countries: { code: string; count: number; cities: { city: string; count: number }[] }[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? countries : countries.slice(0, 8);

  return (
    <div className="space-y-0.5">
      {displayed.map((row) => {
        const info = getCountryInfo(row.code);
        const isOpen = expanded === row.code;
        return (
          <div key={row.code}>
            <button
              onClick={() => setExpanded(isOpen ? null : row.code)}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors text-sm"
            >
              <span className="flex items-center gap-2">
                {row.cities.length > 0 ? (
                  isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                ) : <span className="w-3" />}
                <span>{info.flag}</span>
                <span className="font-medium">{info.name}</span>
              </span>
              <span className="font-mono text-xs">{row.count}</span>
            </button>
            {isOpen && row.cities.length > 0 && (
              <div className="ml-9 space-y-0.5 mb-1">
                {row.cities.map((c) => (
                  <div key={c.city} className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{c.city}</span>
                    <span className="font-mono">{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {countries.length > 8 && (
        <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show less" : `Show all ${countries.length} countries`}
        </Button>
      )}
    </div>
  );
}
