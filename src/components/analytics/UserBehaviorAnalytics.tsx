import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, UserCheck, UserX, ArrowRight, TrendingUp, Star, Zap, RotateCcw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface Session {
  session_id: string;
  user_id: string | null;
  landing_page: string | null;
  exit_page: string | null;
  page_count: number | null;
  duration_seconds: number | null;
  is_bounce: boolean | null;
}

interface Pageview {
  page_path: string | null;
  time_on_page_seconds: number | null;
  scroll_depth_percent: number | null;
  session_id: string;
}

interface UserBehaviorAnalyticsProps {
  sessionsData: Session[];
  pageviewsData: Pageview[];
  isLoading: boolean;
}

export function UserBehaviorAnalytics({ sessionsData, pageviewsData, isLoading }: UserBehaviorAnalyticsProps) {
  // New vs Returning visitors
  const visitorBreakdown = useMemo(() => {
    const userIds = new Set<string>();
    const sessionsByUser: Record<string, number> = {};
    
    sessionsData.forEach(session => {
      const id = session.user_id || session.session_id;
      sessionsByUser[id] = (sessionsByUser[id] || 0) + 1;
      userIds.add(id);
    });

    const returning = Object.values(sessionsByUser).filter(count => count > 1).length;
    const newUsers = userIds.size - returning;

    return {
      new: newUsers,
      returning,
      total: userIds.size,
      returningPct: userIds.size > 0 ? Math.round((returning / userIds.size) * 100) : 0,
      data: [
        { name: 'New Visitors', value: newUsers },
        { name: 'Returning Visitors', value: returning },
      ]
    };
  }, [sessionsData]);

  // Bounce recovery analysis
  const bounceRecovery = useMemo(() => {
    const bouncesByPage: Record<string, { bounces: number; recoveries: number }> = {};
    
    sessionsData.forEach(session => {
      const landing = session.landing_page || '/';
      if (!bouncesByPage[landing]) {
        bouncesByPage[landing] = { bounces: 0, recoveries: 0 };
      }
      
      if (session.is_bounce) {
        bouncesByPage[landing].bounces++;
      } else if ((session.page_count || 0) >= 2) {
        bouncesByPage[landing].recoveries++;
      }
    });

    return Object.entries(bouncesByPage)
      .filter(([path]) => !path.startsWith('/admin'))
      .map(([page, data]) => ({
        page,
        bounces: data.bounces,
        recoveries: data.recoveries,
        total: data.bounces + data.recoveries,
        recoveryRate: data.bounces + data.recoveries > 0 
          ? Math.round((data.recoveries / (data.bounces + data.recoveries)) * 100) 
          : 0,
      }))
      .filter(p => p.total >= 5) // Min 5 sessions
      .sort((a, b) => b.recoveryRate - a.recoveryRate);
  }, [sessionsData]);

  // High-value sessions (deep engagement)
  const highValueSessions = useMemo(() => {
    const sessionMetrics: Record<string, { 
      pages: number; 
      totalTime: number; 
      totalScroll: number; 
      scrollCount: number;
      paths: string[];
    }> = {};

    pageviewsData.forEach(pv => {
      const path = pv.page_path?.split('?')[0] || '/';
      if (path.startsWith('/admin')) return;
      
      if (!sessionMetrics[pv.session_id]) {
        sessionMetrics[pv.session_id] = { pages: 0, totalTime: 0, totalScroll: 0, scrollCount: 0, paths: [] };
      }
      
      sessionMetrics[pv.session_id].pages++;
      sessionMetrics[pv.session_id].totalTime += pv.time_on_page_seconds || 0;
      sessionMetrics[pv.session_id].paths.push(path);
      if (pv.scroll_depth_percent) {
        sessionMetrics[pv.session_id].totalScroll += pv.scroll_depth_percent;
        sessionMetrics[pv.session_id].scrollCount++;
      }
    });

    // High-value = 4+ pages OR 3+ mins total OR 70%+ avg scroll
    const highValue = Object.entries(sessionMetrics)
      .map(([sessionId, data]) => ({
        sessionId,
        pages: data.pages,
        totalTime: data.totalTime,
        avgScroll: data.scrollCount > 0 ? Math.round(data.totalScroll / data.scrollCount) : 0,
        paths: data.paths,
        isHighValue: data.pages >= 4 || data.totalTime >= 180 || 
          (data.scrollCount > 0 && data.totalScroll / data.scrollCount >= 70),
      }))
      .filter(s => s.isHighValue);

    // Common patterns in high-value sessions
    const landingPages: Record<string, number> = {};
    highValue.forEach(s => {
      if (s.paths[0]) {
        landingPages[s.paths[0]] = (landingPages[s.paths[0]] || 0) + 1;
      }
    });

    return {
      count: highValue.length,
      percentage: Object.keys(sessionMetrics).length > 0 
        ? Math.round((highValue.length / Object.keys(sessionMetrics).length) * 100) 
        : 0,
      avgPages: highValue.length > 0 
        ? (highValue.reduce((sum, s) => sum + s.pages, 0) / highValue.length).toFixed(1) 
        : '0',
      avgTime: highValue.length > 0 
        ? Math.round(highValue.reduce((sum, s) => sum + s.totalTime, 0) / highValue.length) 
        : 0,
      topLandingPages: Object.entries(landingPages)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([page, count]) => ({ page, count })),
    };
  }, [pageviewsData]);

  // Category hopping patterns
  const categoryHopping = useMemo(() => {
    const sessionPaths: Record<string, string[]> = {};
    
    pageviewsData.forEach(pv => {
      const path = pv.page_path?.split('?')[0] || '/';
      if (!sessionPaths[pv.session_id]) sessionPaths[pv.session_id] = [];
      sessionPaths[pv.session_id].push(path);
    });

    const categoryTransitions: Record<string, number> = {};
    const categories = ['news', 'business', 'life', 'learn', 'create', 'voices'];

    Object.values(sessionPaths).forEach(paths => {
      for (let i = 0; i < paths.length - 1; i++) {
        const fromCat = categories.find(c => paths[i].startsWith(`/${c}`));
        const toCat = categories.find(c => paths[i + 1].startsWith(`/${c}`));
        
        if (fromCat && toCat && fromCat !== toCat) {
          const key = `${fromCat} → ${toCat}`;
          categoryTransitions[key] = (categoryTransitions[key] || 0) + 1;
        }
      }
    });

    return Object.entries(categoryTransitions)
      .map(([transition, count]) => ({ transition, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [pageviewsData]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  if (isLoading) {
    return <div className="h-[400px] bg-muted/50 animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* New vs Returning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Visitor Type Breakdown
            </CardTitle>
            <CardDescription>New vs returning visitors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={visitorBreakdown.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                  >
                    {visitorBreakdown.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">New Visitors</p>
                    <p className="text-2xl font-bold">{visitorBreakdown.new.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium">Returning</p>
                    <p className="text-2xl font-bold">{visitorBreakdown.returning.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{visitorBreakdown.returningPct}% of total</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              High-Value Sessions
            </CardTitle>
            <CardDescription>Sessions with 4+ pages, 3+ mins, or 70%+ scroll</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <p className="text-sm text-muted-foreground">Count</p>
                <p className="text-2xl font-bold">{highValueSessions.count}</p>
                <p className="text-xs text-muted-foreground">{highValueSessions.percentage}% of sessions</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Avg Pages</p>
                <p className="text-2xl font-bold">{highValueSessions.avgPages}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Top entry points for high-value sessions:</p>
              <div className="space-y-1">
                {highValueSessions.topLandingPages.slice(0, 3).map(lp => (
                  <div key={lp.page} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[200px]">{lp.page}</span>
                    <Badge variant="secondary">{lp.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bounce Recovery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Bounce Recovery by Landing Page
          </CardTitle>
          <CardDescription>Which pages convert single-page visitors into multi-page sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best recovery rates */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Best Recovery Rates
              </h4>
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {bounceRecovery.slice(0, 10).map((page, i) => (
                    <div key={page.page} className="p-3 rounded-lg bg-green-500/5 hover:bg-green-500/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm truncate max-w-[200px]">{page.page}</span>
                        <Badge variant="default" className="bg-green-500">{page.recoveryRate}%</Badge>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{page.recoveries} continued</span>
                        <span>•</span>
                        <span>{page.bounces} bounced</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Worst recovery rates */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-500" />
                Needs Improvement
              </h4>
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {bounceRecovery.slice(-10).reverse().map((page, i) => (
                    <div key={page.page} className="p-3 rounded-lg bg-red-500/5 hover:bg-red-500/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm truncate max-w-[200px]">{page.page}</span>
                        <Badge variant="destructive">{page.recoveryRate}%</Badge>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{page.bounces} bounced</span>
                        <span>•</span>
                        <span>{page.recoveries} continued</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Hopping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Category Cross-Navigation
          </CardTitle>
          <CardDescription>How users move between different content categories</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryHopping.length === 0 ? (
            <p className="text-muted-foreground text-sm">Not enough cross-category navigation data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryHopping} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="transition" width={150} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          
          {categoryHopping.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                🔄 Most common category hop: <strong>{categoryHopping[0]?.transition}</strong> ({categoryHopping[0]?.count} times)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
