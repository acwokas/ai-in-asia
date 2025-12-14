import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, Users, Eye, Clock, TrendingUp, TrendingDown, 
  Globe, Smartphone, Monitor, ArrowRight, ExternalLink,
  MousePointer, LogOut, Target, Zap, AlertTriangle, LineChart as LineChartIcon, DollarSign
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { SponsorAnalytics } from "@/components/analytics/SponsorAnalytics";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const SiteAnalytics = () => {
  const [dateRange, setDateRange] = useState("7");

  const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
  const endDate = endOfDay(new Date());

  // Fetch sessions data
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["analytics-sessions", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_sessions")
        .select("*")
        .gte("started_at", startDate.toISOString())
        .lte("started_at", endDate.toISOString())
        .order("started_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch pageviews data
  const { data: pageviewsData, isLoading: pageviewsLoading } = useQuery({
    queryKey: ["analytics-pageviews", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_pageviews")
        .select("*")
        .gte("viewed_at", startDate.toISOString())
        .lte("viewed_at", endDate.toISOString())
        .order("viewed_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch events data
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["analytics-events", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate metrics
  const totalSessions = sessionsData?.length || 0;
  const totalPageviews = pageviewsData?.length || 0;
  const uniqueVisitors = new Set(sessionsData?.map(s => s.user_id || s.session_id)).size;
  const avgPagesPerSession = totalSessions > 0 ? (totalPageviews / totalSessions).toFixed(1) : 0;
  const bounceRate = totalSessions > 0 
    ? ((sessionsData?.filter(s => s.is_bounce).length || 0) / totalSessions * 100).toFixed(1) 
    : 0;
  const avgSessionDuration = totalSessions > 0
    ? Math.round((sessionsData?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0) / totalSessions)
    : 0;

  // Referrer analysis
  const referrerStats = sessionsData?.reduce((acc: Record<string, number>, session) => {
    const domain = session.referrer_domain || 'Direct';
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {}) || {};

  const topReferrers = Object.entries(referrerStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Page performance
  const pageStats = pageviewsData?.reduce((acc: Record<string, { views: number; totalTime: number; exits: number }>, pv) => {
    const path = pv.page_path?.split('?')[0] || '/';
    if (!acc[path]) acc[path] = { views: 0, totalTime: 0, exits: 0 };
    acc[path].views++;
    acc[path].totalTime += pv.time_on_page_seconds || 0;
    if (pv.is_exit) acc[path].exits++;
    return acc;
  }, {}) || {};

  const topPages = Object.entries(pageStats)
    .map(([path, stats]) => ({
      path,
      views: stats.views,
      avgTime: stats.views > 0 ? Math.round(stats.totalTime / stats.views) : 0,
      exitRate: stats.views > 0 ? ((stats.exits / stats.views) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  const topExitPages = Object.entries(pageStats)
    .map(([path, stats]) => ({
      path,
      exits: stats.exits,
      exitRate: stats.views > 0 ? ((stats.exits / stats.views) * 100).toFixed(1) : 0,
    }))
    .filter(p => p.exits > 0)
    .sort((a, b) => b.exits - a.exits)
    .slice(0, 10);

  // Device breakdown
  const deviceStats = sessionsData?.reduce((acc: Record<string, number>, session) => {
    const device = session.device_type || 'unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {}) || {};

  const deviceData = Object.entries(deviceStats).map(([name, value]) => ({ name, value }));

  // Browser breakdown
  const browserStats = sessionsData?.reduce((acc: Record<string, number>, session) => {
    const browser = session.browser || 'unknown';
    acc[browser] = (acc[browser] || 0) + 1;
    return acc;
  }, {}) || {};

  const browserData = Object.entries(browserStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // UTM Campaign analysis
  const utmStats = sessionsData?.reduce((acc: Record<string, number>, session) => {
    if (session.utm_source) {
      const key = `${session.utm_source}${session.utm_medium ? ` / ${session.utm_medium}` : ''}`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {}) || {};

  const utmData = Object.entries(utmStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Daily trends
  const dailyStats = sessionsData?.reduce((acc: Record<string, { sessions: number; pageviews: number }>, session) => {
    const day = format(new Date(session.started_at), 'MMM dd');
    if (!acc[day]) acc[day] = { sessions: 0, pageviews: 0 };
    acc[day].sessions++;
    return acc;
  }, {}) || {};

  pageviewsData?.forEach(pv => {
    const day = format(new Date(pv.viewed_at), 'MMM dd');
    if (dailyStats[day]) {
      dailyStats[day].pageviews++;
    }
  });

  const trendData = Object.entries(dailyStats)
    .map(([date, stats]) => ({ date, ...stats }))
    .reverse();

  // User journeys (common paths)
  const journeyMap = new Map<string, number>();
  const sessionPageviews = pageviewsData?.reduce((acc: Record<string, string[]>, pv) => {
    if (!acc[pv.session_id]) acc[pv.session_id] = [];
    acc[pv.session_id].push(pv.page_path?.split('?')[0] || '/');
    return acc;
  }, {}) || {};

  Object.values(sessionPageviews).forEach(pages => {
    if (pages.length >= 2) {
      for (let i = 0; i < pages.length - 1; i++) {
        const journey = `${pages[i]} → ${pages[i + 1]}`;
        journeyMap.set(journey, (journeyMap.get(journey) || 0) + 1);
      }
    }
  });

  const topJourneys = Array.from(journeyMap.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Event tracking summary
  const eventStats = eventsData?.reduce((acc: Record<string, number>, event) => {
    acc[event.event_name] = (acc[event.event_name] || 0) + 1;
    return acc;
  }, {}) || {};

  const topEvents = Object.entries(eventStats)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Optimization suggestions
  const suggestions = [];
  
  const bounceRateNum = typeof bounceRate === 'string' ? parseFloat(bounceRate) : bounceRate;
  if (bounceRateNum > 60) {
    suggestions.push({
      type: 'warning',
      title: 'High Bounce Rate',
      description: `Your bounce rate is ${bounceRate}%. Consider improving landing page content and load times.`,
      action: 'Review landing pages',
    });
  }
  
  if (avgSessionDuration < 60) {
    suggestions.push({
      type: 'warning',
      title: 'Low Session Duration',
      description: `Average session is only ${avgSessionDuration}s. Add more engaging content to keep visitors longer.`,
      action: 'Add related content',
    });
  }

  const mobilePercentage = deviceStats['mobile'] ? (deviceStats['mobile'] / totalSessions * 100) : 0;
  if (mobilePercentage > 50) {
    suggestions.push({
      type: 'info',
      title: 'Mobile-First Audience',
      description: `${mobilePercentage.toFixed(0)}% of visitors use mobile. Ensure mobile experience is optimized.`,
      action: 'Test mobile UX',
    });
  }

  topExitPages.slice(0, 3).forEach(page => {
    if (parseFloat(String(page.exitRate)) > 70) {
      suggestions.push({
        type: 'warning',
        title: `High Exit Rate: ${page.path}`,
        description: `${page.exitRate}% exit rate. Consider adding CTAs or related content.`,
        action: 'Optimize page',
      });
    }
  });

  const isLoading = sessionsLoading || pageviewsLoading || eventsLoading;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Site Analytics</h1>
            <p className="text-muted-foreground">Comprehensive visitor insights and optimization recommendations</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Sessions</span>
              </div>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <p className="text-2xl font-bold">{totalSessions.toLocaleString()}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Eye className="h-4 w-4" />
                <span className="text-sm">Pageviews</span>
              </div>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <p className="text-2xl font-bold">{totalPageviews.toLocaleString()}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">Pages/Session</span>
              </div>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <p className="text-2xl font-bold">{avgPagesPerSession}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Avg Duration</span>
              </div>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <p className="text-2xl font-bold">{Math.floor(avgSessionDuration / 60)}m {avgSessionDuration % 60}s</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm">Bounce Rate</span>
              </div>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <p className="text-2xl font-bold">{bounceRate}%</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Target className="h-4 w-4" />
                <span className="text-sm">Unique Visitors</span>
              </div>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <p className="text-2xl font-bold">{uniqueVisitors.toLocaleString()}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Optimization Suggestions */}
        {suggestions.length > 0 && (
          <Card className="mb-8 border-yellow-500/50 bg-yellow-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Optimization Suggestions
              </CardTitle>
              <CardDescription>Actionable insights to improve site performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${suggestion.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`} />
                    <div className="flex-1">
                      <h4 className="font-medium">{suggestion.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                      <Button variant="link" className="p-0 h-auto mt-2 text-primary">
                        {suggestion.action} <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-9 lg:w-auto lg:inline-grid">
            <TabsTrigger value="charts" className="gap-1">
              <LineChartIcon className="h-4 w-4" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="sponsors" className="gap-1">
              <DollarSign className="h-4 w-4" />
              Sponsors
            </TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="journeys">User Journeys</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="technology">Technology</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          {/* Interactive Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            <AnalyticsCharts
              sessionsData={sessionsData || []}
              pageviewsData={pageviewsData || []}
              eventsData={eventsData || []}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Sponsor Analytics Tab */}
          <TabsContent value="sponsors" className="space-y-6">
            <SponsorAnalytics
              eventsData={eventsData || []}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Traffic Tab */}
          <TabsContent value="traffic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Trends</CardTitle>
                <CardDescription>Sessions and pageviews over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Area type="monotone" dataKey="pageviews" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Pageviews" />
                      <Area type="monotone" dataKey="sessions" stackId="2" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} name="Sessions" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top Pages
                  </CardTitle>
                  <CardDescription>Most viewed pages</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topPages.map((page, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{page.path}</p>
                            <p className="text-sm text-muted-foreground">
                              Avg {page.avgTime}s · {page.exitRate}% exit
                            </p>
                          </div>
                          <Badge variant="secondary">{page.views.toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogOut className="h-5 w-5" />
                    Top Exit Pages
                  </CardTitle>
                  <CardDescription>Where visitors leave</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topExitPages.map((page, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{page.path}</p>
                            <p className="text-sm text-muted-foreground">
                              {page.exitRate}% exit rate
                            </p>
                          </div>
                          <Badge variant="destructive">{page.exits} exits</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Journeys Tab */}
          <TabsContent value="journeys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Common User Paths
                </CardTitle>
                <CardDescription>Most frequent page-to-page transitions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : topJourneys.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Not enough data to show user journeys yet. Check back after more traffic.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topJourneys.map((journey, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <p className="font-mono text-sm truncate flex-1">{journey.path}</p>
                        <Badge variant="outline">{journey.count} times</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MousePointer className="h-5 w-5" />
                  Event Tracking
                </CardTitle>
                <CardDescription>User interactions and conversions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : topEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No events tracked yet. Events will appear as users interact with the site.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topEvents.map((event, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <p className="font-medium">{event.name}</p>
                        <Badge>{event.count.toLocaleString()}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Top Referrers
                  </CardTitle>
                  <CardDescription>Where your traffic comes from</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={topReferrers} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5" />
                    UTM Campaigns
                  </CardTitle>
                  <CardDescription>Marketing campaign performance</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : utmData.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No UTM-tagged traffic detected. Use UTM parameters in your marketing links.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {utmData.map((utm, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <p className="font-medium truncate flex-1">{utm.name}</p>
                          <Badge variant="secondary">{utm.value}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Technology Tab */}
          <TabsContent value="technology" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Device Breakdown
                  </CardTitle>
                  <CardDescription>Desktop vs Mobile vs Tablet</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={deviceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {deviceData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Browser Distribution
                  </CardTitle>
                  <CardDescription>Which browsers visitors use</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={browserData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MousePointer className="h-5 w-5" />
                    Top Events
                  </CardTitle>
                  <CardDescription>Most triggered events by type</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : topEvents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No events tracked yet. Events will appear as users interact with the site.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {topEvents.map((event, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{idx + 1}</span>
                            <p className="font-medium truncate">{event.name}</p>
                          </div>
                          <Badge variant="secondary">{event.count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Events by Category
                  </CardTitle>
                  <CardDescription>Event distribution by category</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    (() => {
                      const categoryStats = eventsData?.reduce((acc: Record<string, number>, event) => {
                        const cat = event.event_category || 'uncategorized';
                        acc[cat] = (acc[cat] || 0) + 1;
                        return acc;
                      }, {}) || {};
                      const categoryData = Object.entries(categoryStats).map(([name, value]) => ({ name, value }));
                      
                      return categoryData.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No event categories yet.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={categoryData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {categoryData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Events Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
                <CardDescription>Latest tracked events with details</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : eventsData && eventsData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Event</th>
                          <th className="text-left p-2 font-medium">Category</th>
                          <th className="text-left p-2 font-medium">Page</th>
                          <th className="text-left p-2 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventsData.slice(0, 20).map((event) => (
                          <tr key={event.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{event.event_name}</td>
                            <td className="p-2">
                              <Badge variant="outline">{event.event_category || 'none'}</Badge>
                            </td>
                            <td className="p-2 text-muted-foreground truncate max-w-[200px]">{event.page_path}</td>
                            <td className="p-2 text-muted-foreground">
                              {format(new Date(event.created_at), 'MMM d, HH:mm')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No events recorded yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="space-y-6">
            {(() => {
              const errorEvents = eventsData?.filter(e => e.event_category === 'error') || [];
              const errorsBySource = errorEvents.reduce((acc: Record<string, number>, event) => {
                const data = event.event_data as Record<string, unknown> | null;
                const source = (data?.source as string) || 'unknown';
                acc[source] = (acc[source] || 0) + 1;
                return acc;
              }, {});
              const errorSourceData = Object.entries(errorsBySource)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);

              return (
                <>
                  {/* Error Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className={errorEvents.length > 0 ? 'border-destructive/50' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <AlertTriangle className={`h-4 w-4 ${errorEvents.length > 0 ? 'text-destructive' : ''}`} />
                          <span className="text-sm">Total Errors</span>
                        </div>
                        <p className={`text-2xl font-bold ${errorEvents.length > 0 ? 'text-destructive' : ''}`}>
                          {errorEvents.length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <Target className="h-4 w-4" />
                          <span className="text-sm">Error Sources</span>
                        </div>
                        <p className="text-2xl font-bold">{Object.keys(errorsBySource).length}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <Zap className="h-4 w-4" />
                          <span className="text-sm">Error Rate</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {totalPageviews > 0 ? ((errorEvents.length / totalPageviews) * 100).toFixed(2) : 0}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Errors by Source
                        </CardTitle>
                        <CardDescription>Where errors are occurring</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <Skeleton className="h-[250px] w-full" />
                        ) : errorSourceData.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                              <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <p className="font-medium text-green-600 dark:text-green-400">No errors detected!</p>
                            <p className="text-muted-foreground text-sm mt-1">Your site is running smoothly.</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={errorSourceData}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="name" className="text-xs" />
                              <YAxis />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }} 
                              />
                              <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Globe className="h-5 w-5" />
                          Error Pages
                        </CardTitle>
                        <CardDescription>Pages with most errors</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isLoading ? (
                          <div className="space-y-3">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                          </div>
                        ) : (() => {
                          const errorsByPage = errorEvents.reduce((acc: Record<string, number>, event) => {
                            const page = event.page_path || 'unknown';
                            acc[page] = (acc[page] || 0) + 1;
                            return acc;
                          }, {});
                          const errorPageData = Object.entries(errorsByPage)
                            .map(([path, count]) => ({ path, count }))
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 10);

                          return errorPageData.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">No error pages.</p>
                          ) : (
                            <div className="space-y-3">
                              {errorPageData.map((page, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                  <p className="font-medium truncate flex-1 text-sm">{page.path}</p>
                                  <Badge variant="destructive">{page.count}</Badge>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Errors Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Errors</CardTitle>
                      <CardDescription>Latest error details for debugging</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-3">
                          {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                      ) : errorEvents.length > 0 ? (
                        <div className="space-y-4">
                          {errorEvents.slice(0, 15).map((event) => {
                            const data = event.event_data as Record<string, unknown> | null;
                            return (
                              <div key={event.id} className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-destructive truncate">
                                      {(data?.message as string) || 'Unknown error'}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      Source: {(data?.source as string) || 'unknown'} • Page: {event.page_path}
                                    </p>
                                    {data?.stack && (
                                      <pre className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded overflow-x-auto max-h-20">
                                        {(data.stack as string).slice(0, 300)}...
                                      </pre>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {format(new Date(event.created_at), 'MMM d, HH:mm')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                            <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
                          </div>
                          <p className="font-semibold text-lg text-green-600 dark:text-green-400">No errors recorded!</p>
                          <p className="text-muted-foreground mt-1">Your site is running without JavaScript errors.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SiteAnalytics;
