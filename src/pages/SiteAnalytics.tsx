import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { 
  BarChart3, Users, Eye, Clock, TrendingUp, TrendingDown, 
  Globe, Smartphone, Monitor, ArrowRight, ExternalLink,
  MousePointer, LogOut, Target, Zap, AlertTriangle, LineChart as LineChartIcon, DollarSign,
  Activity, Scroll, FileText, ArrowUpRight, ArrowDownRight, Minus, Bug, ChevronRight
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
import { ErrorTracking } from "@/components/analytics/ErrorTracking";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

// Metric change indicator component
const MetricChange = ({ value }: { value: string | number }) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (numValue === 0 || isNaN(numValue)) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <Minus className="h-3 w-3" />
        <span>No change</span>
      </div>
    );
  }
  const isPositive = numValue > 0;
  return (
    <div className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      <span>{isPositive ? '+' : ''}{typeof value === 'number' ? value.toFixed(1) : value}%</span>
    </div>
  );
};

const SiteAnalytics = () => {
  const [dateRange, setDateRange] = useState("7");
  const [activeTab, setActiveTab] = useState("charts");

  const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
  const endDate = endOfDay(new Date());
  
  // Previous period for comparison
  const prevStartDate = startOfDay(subDays(startDate, parseInt(dateRange)));
  const prevEndDate = startOfDay(subDays(new Date(), parseInt(dateRange)));

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

  // Fetch previous period sessions for comparison
  const { data: prevSessionsData } = useQuery({
    queryKey: ["analytics-sessions-prev", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_sessions")
        .select("*")
        .gte("started_at", prevStartDate.toISOString())
        .lt("started_at", prevEndDate.toISOString());
      
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

  // Fetch previous period pageviews for comparison
  const { data: prevPageviewsData } = useQuery({
    queryKey: ["analytics-pageviews-prev", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_pageviews")
        .select("*")
        .gte("viewed_at", prevStartDate.toISOString())
        .lt("viewed_at", prevEndDate.toISOString());
      
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
  const prevTotalSessions = prevSessionsData?.length || 0;
  const totalPageviews = pageviewsData?.length || 0;
  const prevTotalPageviews = prevPageviewsData?.length || 0;
  const uniqueVisitors = new Set(sessionsData?.map(s => s.user_id || s.session_id)).size;
  const prevUniqueVisitors = new Set(prevSessionsData?.map(s => s.user_id || s.session_id)).size;
  const avgPagesPerSession = totalSessions > 0 ? (totalPageviews / totalSessions).toFixed(1) : "0";
  const prevAvgPagesPerSession = prevTotalSessions > 0 ? (prevTotalPageviews / prevTotalSessions).toFixed(1) : "0";
  const bounceRate = totalSessions > 0 
    ? ((sessionsData?.filter(s => s.is_bounce).length || 0) / totalSessions * 100).toFixed(1) 
    : "0";
  const prevBounceRate = prevTotalSessions > 0 
    ? ((prevSessionsData?.filter(s => s.is_bounce).length || 0) / prevTotalSessions * 100).toFixed(1) 
    : "0";
  const avgSessionDuration = totalSessions > 0
    ? Math.round((sessionsData?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0) / totalSessions)
    : 0;
  const prevAvgSessionDuration = prevTotalSessions > 0
    ? Math.round((prevSessionsData?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0) / prevTotalSessions)
    : 0;

  // Calculate percentage changes
  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const sessionsChange = calcChange(totalSessions, prevTotalSessions);
  const pageviewsChange = calcChange(totalPageviews, prevTotalPageviews);
  const visitorsChange = calcChange(uniqueVisitors, prevUniqueVisitors);
  const durationChange = calcChange(avgSessionDuration, prevAvgSessionDuration);

  // Calculate average scroll depth
  const avgScrollDepth = useMemo(() => {
    const pagesWithScroll = pageviewsData?.filter(p => p.scroll_depth_percent && p.scroll_depth_percent > 0) || [];
    if (pagesWithScroll.length === 0) return 0;
    return Math.round(pagesWithScroll.reduce((acc, p) => acc + (p.scroll_depth_percent || 0), 0) / pagesWithScroll.length);
  }, [pageviewsData]);

  // Active visitors (sessions in last 5 minutes)
  const activeVisitors = useMemo(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    return sessionsData?.filter(s => s.started_at > fiveMinutesAgo || (s.ended_at && s.ended_at > fiveMinutesAgo)).length || 0;
  }, [sessionsData]);

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
  // Helper to check if page is internal/admin
  const isInternalPage = (path: string) => {
    const internalPrefixes = ['/admin', '/editor', '/auth', '/profile', '/connection-test'];
    return internalPrefixes.some(prefix => path.startsWith(prefix));
  };

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
    .filter(([path]) => !isInternalPage(path))
    .map(([path, stats]) => ({
      path,
      views: stats.views,
      avgTime: stats.views > 0 ? Math.round(stats.totalTime / stats.views) : 0,
      exitRate: stats.views > 0 ? ((stats.exits / stats.views) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  const topExitPages = Object.entries(pageStats)
    .filter(([path]) => !isInternalPage(path))
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

  // User journeys (common paths) - filter out internal pages
  const journeyMap = new Map<string, number>();
  const sessionPageviews = pageviewsData?.reduce((acc: Record<string, string[]>, pv) => {
    const path = pv.page_path?.split('?')[0] || '/';
    // Skip internal pages from journey tracking
    if (isInternalPage(path)) return acc;
    if (!acc[pv.session_id]) acc[pv.session_id] = [];
    acc[pv.session_id].push(path);
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
  const suggestions: Array<{
    type: string;
    title: string;
    description: string;
    action: string;
    actionType: 'link' | 'tab' | 'info';
    target?: string;
  }> = [];
  
  const bounceRateNum = typeof bounceRate === 'string' ? parseFloat(bounceRate) : bounceRate;
  if (bounceRateNum > 60) {
    suggestions.push({
      type: 'warning',
      title: 'High Bounce Rate',
      description: `Your bounce rate is ${bounceRate}%. Consider improving landing page content and load times.`,
      action: 'Review landing pages',
      actionType: 'tab',
      target: 'pages',
    });
  }
  
  if (avgSessionDuration < 60) {
    suggestions.push({
      type: 'warning',
      title: 'Low Session Duration',
      description: `Average session is only ${avgSessionDuration}s. Add more engaging content to keep visitors longer.`,
      action: 'View content engagement',
      actionType: 'tab',
      target: 'content',
    });
  }

  const mobilePercentage = deviceStats['mobile'] ? (deviceStats['mobile'] / totalSessions * 100) : 0;
  if (mobilePercentage > 50) {
    suggestions.push({
      type: 'info',
      title: 'Mobile-First Audience',
      description: `${mobilePercentage.toFixed(0)}% of visitors use mobile. Ensure mobile experience is optimized.`,
      action: 'View device stats',
      actionType: 'tab',
      target: 'technology',
    });
  }

  topExitPages.slice(0, 3).forEach(page => {
    if (parseFloat(String(page.exitRate)) > 70) {
      suggestions.push({
        type: 'warning',
        title: `High Exit Rate: ${page.path}`,
        description: `${page.exitRate}% exit rate. Consider adding CTAs or related content.`,
        action: 'View page details',
        actionType: 'tab',
        target: 'pages',
      });
    }
  });

  const isLoading = sessionsLoading || pageviewsLoading || eventsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          <Link to="/admin" className="text-primary hover:text-primary/80 transition-colors font-medium hover:underline">
            Admin
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-semibold">Site Analytics</span>
        </nav>

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

        {/* Active Visitors Indicator */}
        {activeVisitors > 0 && (
          <Card className="mb-4 border-green-500/50 bg-green-500/5">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Activity className="h-5 w-5 text-green-500" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <span className="text-sm font-medium">
                  <span className="text-green-500 font-bold">{activeVisitors}</span> active visitor{activeVisitors !== 1 ? 's' : ''} right now
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Sessions</span>
              </div>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <>
                  <p className="text-2xl font-bold">{totalSessions.toLocaleString()}</p>
                  <MetricChange value={sessionsChange} />
                </>
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
                <>
                  <p className="text-2xl font-bold">{totalPageviews.toLocaleString()}</p>
                  <MetricChange value={pageviewsChange} />
                </>
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
                <>
                  <p className="text-2xl font-bold">{Math.floor(avgSessionDuration / 60)}m {avgSessionDuration % 60}s</p>
                  <MetricChange value={durationChange} />
                </>
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
                <>
                  <p className="text-2xl font-bold">{uniqueVisitors.toLocaleString()}</p>
                  <MetricChange value={visitorsChange} />
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Scroll className="h-4 w-4" />
                <span className="text-sm">Avg Scroll Depth</span>
              </div>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <p className="text-2xl font-bold">{avgScrollDepth}%</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Events</span>
              </div>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <p className="text-2xl font-bold">{(eventsData?.length || 0).toLocaleString()}</p>
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
                      <Button 
                        variant="link" 
                        className="p-0 h-auto mt-2 text-primary"
                        onClick={() => {
                          if (suggestion.actionType === 'tab' && suggestion.target) {
                            setActiveTab(suggestion.target);
                            // Scroll to tabs section
                            document.getElementById('analytics-tabs')?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                      >
                        {suggestion.action} <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" id="analytics-tabs">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:min-w-0 md:grid md:grid-cols-10">
              <TabsTrigger value="charts" className="gap-1 text-xs md:text-sm px-2 md:px-3">
                <LineChartIcon className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Charts</span>
              </TabsTrigger>
              <TabsTrigger value="sponsors" className="gap-1 text-xs md:text-sm px-2 md:px-3">
                <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Sponsors</span>
              </TabsTrigger>
              <TabsTrigger value="traffic" className="text-xs md:text-sm px-2 md:px-3">Traffic</TabsTrigger>
              <TabsTrigger value="content" className="text-xs md:text-sm px-2 md:px-3">Content</TabsTrigger>
              <TabsTrigger value="pages" className="text-xs md:text-sm px-2 md:px-3">Pages</TabsTrigger>
              <TabsTrigger value="journeys" className="text-xs md:text-sm px-2 md:px-3">Journeys</TabsTrigger>
              <TabsTrigger value="sources" className="text-xs md:text-sm px-2 md:px-3">Sources</TabsTrigger>
              <TabsTrigger value="technology" className="text-xs md:text-sm px-2 md:px-3">Tech</TabsTrigger>
              <TabsTrigger value="events" className="text-xs md:text-sm px-2 md:px-3">Events</TabsTrigger>
              <TabsTrigger value="errors" className="gap-1 text-xs md:text-sm px-2 md:px-3">
                <Bug className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Errors</span>
              </TabsTrigger>
            </TabsList>
          </div>

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

          {/* Content Engagement Tab */}
          <TabsContent value="content" className="space-y-6">
            {(() => {
              // Scroll depth distribution
              const scrollRanges = [
                { range: '0-25%', min: 0, max: 25 },
                { range: '26-50%', min: 26, max: 50 },
                { range: '51-75%', min: 51, max: 75 },
                { range: '76-100%', min: 76, max: 100 },
              ];
              
              const scrollDistribution = scrollRanges.map(r => {
                const count = pageviewsData?.filter(p => 
                  p.scroll_depth_percent !== null && 
                  p.scroll_depth_percent >= r.min && 
                  p.scroll_depth_percent <= r.max
                ).length || 0;
                return { name: r.range, value: count };
              });

              // Time on page distribution
              const timeRanges = [
                { range: '<10s', min: 0, max: 10 },
                { range: '10-30s', min: 10, max: 30 },
                { range: '30-60s', min: 30, max: 60 },
                { range: '1-2m', min: 60, max: 120 },
                { range: '2-5m', min: 120, max: 300 },
                { range: '>5m', min: 300, max: Infinity },
              ];

              const timeDistribution = timeRanges.map(r => {
                const count = pageviewsData?.filter(p => 
                  p.time_on_page_seconds !== null && 
                  p.time_on_page_seconds >= r.min && 
                  p.time_on_page_seconds < r.max
                ).length || 0;
                return { name: r.range, value: count };
              });

              // Best performing content (high scroll + high time)
              const contentPerformance = Object.entries(pageStats)
                .filter(([path]) => !isInternalPage(path))
                .map(([path, stats]) => {
                  const pagesWithScroll = pageviewsData?.filter(p => p.page_path?.startsWith(path) && p.scroll_depth_percent) || [];
                  const avgScroll = pagesWithScroll.length > 0 
                    ? Math.round(pagesWithScroll.reduce((acc, p) => acc + (p.scroll_depth_percent || 0), 0) / pagesWithScroll.length)
                    : 0;
                  return {
                    path,
                    views: stats.views,
                    avgTime: stats.views > 0 ? Math.round(stats.totalTime / stats.views) : 0,
                    avgScroll,
                    engagementScore: (avgScroll * 0.5) + ((stats.views > 0 ? stats.totalTime / stats.views : 0) * 0.5),
                  };
                })
                .filter(p => p.views >= 3) // Only show pages with meaningful data
                .sort((a, b) => b.engagementScore - a.engagementScore)
                .slice(0, 10);

              return (
                <>
                  {/* Content Metrics Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <Scroll className="h-4 w-4" />
                          <span className="text-sm">Avg Scroll Depth</span>
                        </div>
                        <p className="text-2xl font-bold">{avgScrollDepth}%</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {avgScrollDepth >= 70 ? 'Excellent engagement' : avgScrollDepth >= 50 ? 'Good engagement' : 'Needs improvement'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Avg Time on Page</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {(() => {
                            const pagesWithTime = pageviewsData?.filter(p => p.time_on_page_seconds && p.time_on_page_seconds > 0) || [];
                            const avgTime = pagesWithTime.length > 0 
                              ? Math.round(pagesWithTime.reduce((acc, p) => acc + (p.time_on_page_seconds || 0), 0) / pagesWithTime.length)
                              : 0;
                            return `${Math.floor(avgTime / 60)}m ${avgTime % 60}s`;
                          })()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <Target className="h-4 w-4" />
                          <span className="text-sm">Readers to 75%+</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {(() => {
                            const totalWithScroll = pageviewsData?.filter(p => p.scroll_depth_percent !== null).length || 0;
                            const deep = pageviewsData?.filter(p => p.scroll_depth_percent && p.scroll_depth_percent >= 75).length || 0;
                            return totalWithScroll > 0 ? `${Math.round((deep / totalWithScroll) * 100)}%` : '0%';
                          })()}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">Unique Pages Viewed</span>
                        </div>
                        <p className="text-2xl font-bold">{Object.keys(pageStats).length}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Scroll Depth Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Scroll className="h-5 w-5" />
                          Scroll Depth Distribution
                        </CardTitle>
                        <CardDescription>How far users scroll on pages</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={scrollDistribution}>
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
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Time on Page Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Time on Page Distribution
                        </CardTitle>
                        <CardDescription>How long users spend on pages</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={timeDistribution}>
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
                      </CardContent>
                    </Card>
                  </div>

                  {/* Best Performing Content */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Best Performing Content
                      </CardTitle>
                      <CardDescription>Pages with highest engagement (scroll depth + time on page)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {contentPerformance.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          Not enough engagement data yet. Check back after more visitors interact with your content.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {contentPerformance.map((page, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{page.path}</p>
                                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                  <span>{page.views} views</span>
                                  <span>{page.avgScroll}% scroll</span>
                                  <span>{Math.floor(page.avgTime / 60)}m {page.avgTime % 60}s avg</span>
                                </div>
                              </div>
                              <Badge variant="secondary" className="ml-2">
                                Score: {Math.round(page.engagementScore)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              );
            })()}
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
            <ErrorTracking 
              eventsData={eventsData || []} 
              isLoading={isLoading} 
              dateRange={dateRange}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SiteAnalytics;
