import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Globe, Share2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Sankey, Rectangle, Layer
} from "recharts";

interface Session {
  session_id: string;
  referrer: string | null;
  referrer_domain: string | null;
  landing_page: string | null;
  exit_page: string | null;
}

interface ReferralFlowsProps {
  sessionsData: Session[];
  isLoading: boolean;
}

// Custom Sankey node component
const SankeyNode = ({ x, y, width, height, payload }: any) => {
  if (!payload) return null;
  return (
    <g>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill="hsl(var(--primary))"
        fillOpacity={0.8}
        radius={[4, 4, 4, 4]}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fill="hsl(var(--primary-foreground))"
        className="font-medium"
      >
        {payload.name?.slice(0, 15) || ''}
      </text>
    </g>
  );
};

export function ReferralFlows({ sessionsData, isLoading }: ReferralFlowsProps) {
  // Top referrers (where users come from)
  const topReferrers = useMemo(() => {
    const referrers: Record<string, { count: number; landingPages: Record<string, number> }> = {};
    
    sessionsData.forEach(session => {
      const domain = session.referrer_domain || 'Direct';
      if (!referrers[domain]) {
        referrers[domain] = { count: 0, landingPages: {} };
      }
      referrers[domain].count++;
      
      const landing = session.landing_page || '/';
      referrers[domain].landingPages[landing] = (referrers[domain].landingPages[landing] || 0) + 1;
    });

    return Object.entries(referrers)
      .map(([domain, data]) => ({
        domain,
        count: data.count,
        topLanding: Object.entries(data.landingPages)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([page, count]) => ({ page, count }))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [sessionsData]);

  // Exit destinations (simplified - what pages lead to exits)
  const exitDestinations = useMemo(() => {
    const exits: Record<string, number> = {};
    
    sessionsData.forEach(session => {
      if (session.exit_page) {
        exits[session.exit_page] = (exits[session.exit_page] || 0) + 1;
      }
    });

    return Object.entries(exits)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [sessionsData]);

  // Referrer to landing page flows (for Sankey-like visualization)
  const referralFlows = useMemo(() => {
    const flows: Record<string, number> = {};
    
    sessionsData.forEach(session => {
      const source = session.referrer_domain || 'Direct';
      const landing = session.landing_page?.split('/').slice(0, 2).join('/') || '/';
      const flowKey = `${source} → ${landing === '/' ? 'Homepage' : landing}`;
      flows[flowKey] = (flows[flowKey] || 0) + 1;
    });

    return Object.entries(flows)
      .map(([flow, count]) => ({ flow, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  }, [sessionsData]);

  // Landing to exit flows
  const landingToExitFlows = useMemo(() => {
    const flows: Record<string, number> = {};
    
    sessionsData.forEach(session => {
      if (session.landing_page && session.exit_page && session.landing_page !== session.exit_page) {
        const landing = session.landing_page.split('/').slice(0, 3).join('/');
        const exit = session.exit_page.split('/').slice(0, 3).join('/');
        const flowKey = `${landing} → ${exit}`;
        flows[flowKey] = (flows[flowKey] || 0) + 1;
      }
    });

    return Object.entries(flows)
      .map(([flow, count]) => ({ flow, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [sessionsData]);

  const formatDomain = (domain: string) => {
    if (domain === 'Direct') return 'Direct Traffic';
    if (domain.includes('google')) return 'Google';
    if (domain.includes('linkedin')) return 'LinkedIn';
    if (domain.includes('twitter') || domain.includes('x.com')) return 'X/Twitter';
    if (domain.includes('facebook')) return 'Facebook';
    if (domain.includes('newsletter') || domain.includes('mail')) return 'Email';
    return domain;
  };

  if (isLoading) {
    return <div className="h-[300px] bg-muted/50 animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Top Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-green-500" />
              Traffic Sources
            </CardTitle>
            <CardDescription>Where your visitors come from</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <div className="space-y-3">
                {topReferrers.map((ref, i) => (
                  <div key={ref.domain} className="p-3 rounded-lg bg-muted/50 hover:bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-6">{i + 1}.</span>
                        <span className="font-medium">{formatDomain(ref.domain)}</span>
                      </div>
                      <Badge variant="secondary">{ref.count} sessions</Badge>
                    </div>
                    <div className="ml-8 text-xs text-muted-foreground">
                      Top landing: {ref.topLanding.slice(0, 2).map(l => l.page).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Referrer → Landing Flow
            </CardTitle>
            <CardDescription>How traffic sources connect to landing pages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={referralFlows} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="flow" width={200} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Journey Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            User Journey: Entry → Exit
          </CardTitle>
          <CardDescription>How users navigate from landing page to exit (multi-page sessions only)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Top Landing → Exit Paths</h4>
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {landingToExitFlows.map((flow, i) => (
                    <div key={flow.flow} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                      <span className="font-mono text-xs truncate max-w-[280px]">{flow.flow}</span>
                      <Badge variant="outline">{flow.count}</Badge>
                    </div>
                  ))}
                  {landingToExitFlows.length === 0 && (
                    <p className="text-sm text-muted-foreground">No multi-page sessions in selected period</p>
                  )}
                </div>
              </ScrollArea>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-3">Most Common Exit Pages</h4>
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {exitDestinations.map((exit, i) => (
                    <div key={exit.page} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                        <span className="text-sm truncate max-w-[200px]">{exit.page}</span>
                      </div>
                      <Badge variant="destructive">{exit.count} exits</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
