import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { MousePointer, Eye, TrendingUp, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const CHART_COLORS = [
  'hsl(var(--primary))', 
  'hsl(var(--accent))', 
  '#10b981', 
  '#f59e0b', 
  '#ef4444', 
  '#8b5cf6', 
  '#06b6d4', 
  '#ec4899'
];

interface SponsorAnalyticsProps {
  eventsData: any[];
  isLoading: boolean;
}

const PLACEMENT_LABELS: Record<string, string> = {
  'prompt_and_go_banner': 'Prompt & Go Banner',
  'prompt_and_go_sidebar': 'Prompt & Go Sidebar',
  'business_in_a_byte_mpu': 'Business in a Byte MPU',
  'perplexity_comet_homepage': 'Perplexity Comet (Home)',
  'perplexity_comet_tools': 'Perplexity Comet (Tools)',
  'category_sponsor': 'Category Sponsor',
  'newsletter_sponsor': 'Newsletter Sponsor',
  'google_ad_sidebar': 'Google Ad (Sidebar)',
  'google_ad_in_article': 'Google Ad (In-Article)',
  'google_ad_footer': 'Google Ad (Footer)',
  'google_ad_mpu': 'Google Ad (MPU)',
};

export const SponsorAnalytics = ({ eventsData, isLoading }: SponsorAnalyticsProps) => {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 200 : 250;
  const yAxisWidth = isMobile ? 100 : 140;
  const truncateLength = isMobile ? 12 : 20;

  // Filter sponsor events
  const sponsorEvents = useMemo(() => {
    return eventsData?.filter(e => e.event_category === 'sponsorship') || [];
  }, [eventsData]);

  const clickEvents = useMemo(() => {
    return sponsorEvents.filter(e => e.event_name === 'sponsor_click');
  }, [sponsorEvents]);

  const impressionEvents = useMemo(() => {
    return sponsorEvents.filter(e => e.event_name === 'sponsor_impression');
  }, [sponsorEvents]);

  // Clicks by placement
  const clicksByPlacement = useMemo(() => {
    const map = new Map<string, number>();
    clickEvents.forEach(event => {
      const data = event.event_data as Record<string, unknown> | null;
      const placement = (data?.placement as string) || 'unknown';
      map.set(placement, (map.get(placement) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([placement, clicks]) => ({ 
        placement, 
        label: PLACEMENT_LABELS[placement] || placement,
        clicks 
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [clickEvents]);

  // Impressions by placement
  const impressionsByPlacement = useMemo(() => {
    const map = new Map<string, number>();
    impressionEvents.forEach(event => {
      const data = event.event_data as Record<string, unknown> | null;
      const placement = (data?.placement as string) || 'unknown';
      map.set(placement, (map.get(placement) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([placement, impressions]) => ({ 
        placement, 
        label: PLACEMENT_LABELS[placement] || placement,
        impressions 
      }))
      .sort((a, b) => b.impressions - a.impressions);
  }, [impressionEvents]);

  // Click-through rate by placement
  const ctrByPlacement = useMemo(() => {
    const impressionMap = new Map<string, number>();
    const clickMap = new Map<string, number>();

    impressionEvents.forEach(event => {
      const data = event.event_data as Record<string, unknown> | null;
      const placement = (data?.placement as string) || 'unknown';
      impressionMap.set(placement, (impressionMap.get(placement) || 0) + 1);
    });

    clickEvents.forEach(event => {
      const data = event.event_data as Record<string, unknown> | null;
      const placement = (data?.placement as string) || 'unknown';
      clickMap.set(placement, (clickMap.get(placement) || 0) + 1);
    });

    const results: { placement: string; label: string; impressions: number; clicks: number; ctr: number }[] = [];
    impressionMap.forEach((impressions, placement) => {
      const clicks = clickMap.get(placement) || 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      results.push({
        placement,
        label: PLACEMENT_LABELS[placement] || placement,
        impressions,
        clicks,
        ctr: parseFloat(ctr.toFixed(2))
      });
    });

    return results.sort((a, b) => b.ctr - a.ctr);
  }, [impressionEvents, clickEvents]);

  // Clicks by sponsor
  const clicksBySponsor = useMemo(() => {
    const map = new Map<string, number>();
    clickEvents.forEach(event => {
      const data = event.event_data as Record<string, unknown> | null;
      const sponsor = (data?.sponsor_name as string) || 'Unknown';
      map.set(sponsor, (map.get(sponsor) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [clickEvents]);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  const totalClicks = clickEvents.length;
  const totalImpressions = impressionEvents.length;
  const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0';

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading sponsor analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm">Impressions</span>
            </div>
            <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MousePointer className="h-4 w-4" />
              <span className="text-sm">Clicks</span>
            </div>
            <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">CTR</span>
            </div>
            <p className="text-2xl font-bold">{overallCTR}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Active Sponsors</span>
            </div>
            <p className="text-2xl font-bold">{clicksBySponsor.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Clicks by Placement */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <MousePointer className="h-4 w-4 md:h-5 md:w-5" />
              Clicks by Placement
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Which ad placements drive the most clicks</CardDescription>
          </CardHeader>
          <CardContent>
            {clicksByPlacement.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sponsor clicks tracked yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <div className="min-w-[280px]">
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={clicksByPlacement} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                      <YAxis 
                        dataKey="label" 
                        type="category" 
                        width={yAxisWidth} 
                        className="text-xs"
                        tick={{ fontSize: isMobile ? 9 : 12 }}
                        tickFormatter={(v) => v.length > truncateLength ? v.slice(0, truncateLength) + '...' : v}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clicks by Sponsor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Clicks by Sponsor</CardTitle>
            <CardDescription className="text-xs md:text-sm">Performance breakdown by sponsor</CardDescription>
          </CardHeader>
          <CardContent>
            {clicksBySponsor.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sponsor data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
                  <Pie
                    data={clicksBySponsor}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 35 : 50}
                    outerRadius={isMobile ? 60 : 90}
                    paddingAngle={2}
                    dataKey="value"
                    label={isMobile ? false : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {clicksBySponsor.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend 
                    wrapperStyle={{ fontSize: isMobile ? 10 : 12 }}
                    formatter={(value: string) => value.length > 15 ? value.slice(0, 15) + '...' : value}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CTR by Placement Table */}
      <Card>
        <CardHeader>
          <CardTitle>Click-Through Rate by Placement</CardTitle>
          <CardDescription>Performance metrics for each ad placement</CardDescription>
        </CardHeader>
        <CardContent>
          {ctrByPlacement.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No placement data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Placement</th>
                    <th className="text-right p-3 font-medium">Impressions</th>
                    <th className="text-right p-3 font-medium">Clicks</th>
                    <th className="text-right p-3 font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {ctrByPlacement.map((item, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{item.label}</td>
                      <td className="p-3 text-right text-muted-foreground">{item.impressions.toLocaleString()}</td>
                      <td className="p-3 text-right text-muted-foreground">{item.clicks.toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <Badge variant={item.ctr >= 1 ? "default" : item.ctr >= 0.5 ? "secondary" : "outline"}>
                          {item.ctr}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
