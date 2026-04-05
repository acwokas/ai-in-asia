import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, ChevronDown, ChevronRight, MapPin } from "lucide-react";

const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
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
  IT: { name: "Italy", flag: "🇮🇹" }, ES: { name: "Spain", flag: "🇪🇸" },
  SE: { name: "Sweden", flag: "🇸🇪" }, CH: { name: "Switzerland", flag: "🇨🇭" },
  NZ: { name: "New Zealand", flag: "🇳🇿" }, AE: { name: "UAE", flag: "🇦🇪" },
  IE: { name: "Ireland", flag: "🇮🇪" }, IL: { name: "Israel", flag: "🇮🇱" },
  MX: { name: "Mexico", flag: "🇲🇽" }, PK: { name: "Pakistan", flag: "🇵🇰" },
  BD: { name: "Bangladesh", flag: "🇧🇩" }, NG: { name: "Nigeria", flag: "🇳🇬" },
  ZA: { name: "South Africa", flag: "🇿🇦" }, KE: { name: "Kenya", flag: "🇰🇪" },
  PL: { name: "Poland", flag: "🇵🇱" }, AT: { name: "Austria", flag: "🇦🇹" },
  BE: { name: "Belgium", flag: "🇧🇪" }, DK: { name: "Denmark", flag: "🇩🇰" },
  FI: { name: "Finland", flag: "🇫🇮" }, NO: { name: "Norway", flag: "🇳🇴" },
  PT: { name: "Portugal", flag: "🇵🇹" }, RU: { name: "Russia", flag: "🇷🇺" },
  SA: { name: "Saudi Arabia", flag: "🇸🇦" }, AR: { name: "Argentina", flag: "🇦🇷" },
  CL: { name: "Chile", flag: "🇨🇱" }, CO: { name: "Colombia", flag: "🇨🇴" },
  EG: { name: "Egypt", flag: "🇪🇬" }, TR: { name: "Turkey", flag: "🇹🇷" },
  UA: { name: "Ukraine", flag: "🇺🇦" }, RO: { name: "Romania", flag: "🇷🇴" },
  CZ: { name: "Czech Republic", flag: "🇨🇿" }, GR: { name: "Greece", flag: "🇬🇷" },
  HU: { name: "Hungary", flag: "🇭🇺" }, LK: { name: "Sri Lanka", flag: "🇱🇰" },
  MM: { name: "Myanmar", flag: "🇲🇲" }, KH: { name: "Cambodia", flag: "🇰🇭" },
  LA: { name: "Laos", flag: "🇱🇦" }, NP: { name: "Nepal", flag: "🇳🇵" },
};

function getCountryInfo(code: string) {
  const entry = COUNTRY_MAP[code?.toUpperCase()];
  return entry || { name: code || "Unknown", flag: "" };
}

interface CountryRow {
  country: string;
  count: number;
  pct: number;
  cities: { city: string; count: number }[];
}

interface VisitorsByLocationProps {
  startDate: string;
  endDate: string;
}

export function VisitorsByLocation({ startDate, endDate }: VisitorsByLocationProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["visitors-by-location", startDate, endDate],
    queryFn: async () => {
      // Fetch sessions with country + city, grouped client-side
      const { data: sessions, error } = await supabase
        .from("analytics_sessions")
        .select("country, city")
        .gte("started_at", startDate)
        .lte("started_at", endDate)
        .not("country", "is", null);

      if (error) throw error;
      if (!sessions || sessions.length === 0) return [];

      // Aggregate by country
      const countryMap = new Map<string, { count: number; cities: Map<string, number> }>();
      for (const s of sessions) {
        const cc = s.country?.toUpperCase() || "XX";
        if (!countryMap.has(cc)) countryMap.set(cc, { count: 0, cities: new Map() });
        const entry = countryMap.get(cc)!;
        entry.count++;
        if (s.city) {
          entry.cities.set(s.city, (entry.cities.get(s.city) || 0) + 1);
        }
      }

      const total = sessions.length;
      const rows: CountryRow[] = Array.from(countryMap.entries())
        .map(([country, { count, cities }]) => ({
          country,
          count,
          pct: Math.round((count / total) * 1000) / 10,
          cities: Array.from(cities.entries())
            .map(([city, cnt]) => ({ city, count: cnt }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
        }))
        .sort((a, b) => b.count - a.count);

      return rows;
    },
    staleTime: 2 * 60 * 1000,
  });

  const displayed = showAll ? data : data?.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Visitors by Location</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No location data for this period</p>
        ) : (
          <>
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_60px] text-xs text-muted-foreground font-medium px-2 pb-1">
                <span>Country</span>
                <span className="text-right">Visitors</span>
                <span className="text-right">%</span>
              </div>

              {displayed?.map((row) => {
                const info = getCountryInfo(row.country);
                const isExpanded = expandedCountry === row.country;

                return (
                  <div key={row.country}>
                    <button
                      onClick={() => setExpandedCountry(isExpanded ? null : row.country)}
                      className="w-full grid grid-cols-[1fr_80px_60px] items-center px-2 py-2 rounded-md hover:bg-accent/50 transition-colors text-sm"
                    >
                      <span className="flex items-center gap-2 text-left">
                        {row.cities.length > 0 ? (
                          isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <span className="w-3.5" />
                        )}
                        <span className="text-base">{info.flag}</span>
                        <span className="font-medium">{info.name}</span>
                      </span>
                      <span className="text-right font-mono">{row.count.toLocaleString()}</span>
                      <span className="text-right text-muted-foreground">{row.pct}%</span>
                    </button>

                    {isExpanded && row.cities.length > 0 && (
                      <div className="ml-10 mb-1 space-y-0.5">
                        {row.cities.map((city) => (
                          <div
                            key={city.city}
                            className="grid grid-cols-[1fr_80px_60px] items-center px-2 py-1 text-xs text-muted-foreground"
                          >
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              {city.city}
                            </span>
                            <span className="text-right font-mono">{city.count.toLocaleString()}</span>
                            <span />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {data.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Show less" : `Show all ${data.length} countries`}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
