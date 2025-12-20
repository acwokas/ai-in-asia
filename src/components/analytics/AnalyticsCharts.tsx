import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
  ComposedChart, Scatter
} from "recharts";
import { CalendarIcon, Search } from "lucide-react";
import { format, eachDayOfInterval, parseISO } from "date-fns";
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

interface ChartDataPoint {
  date: string;
  sessions: number;
  pageviews: number;
  bounces: number;
  avgDuration: number;
  uniqueVisitors: number;
}

interface AnalyticsChartsProps {
  sessionsData: any[];
  pageviewsData: any[];
  eventsData: any[];
  isLoading: boolean;
  startDate: Date;
  endDate: Date;
}

export const AnalyticsCharts = ({ sessionsData, pageviewsData, eventsData, isLoading, startDate, endDate }: AnalyticsChartsProps) => {
  const isMobile = useIsMobile();
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [metric, setMetric] = useState<'all' | 'sessions' | 'pageviews' | 'bounces'>('all');
  const [groupBy, setGroupBy] = useState<'day' | 'hour' | 'week'>('day');
  // Use parent's date range instead of internal state
  const dateRange = { from: startDate, to: endDate };
  const [searchFilter, setSearchFilter] = useState('');
  
  // Responsive chart heights
  const mainChartHeight = isMobile ? 250 : 350;
  const secondaryChartHeight = isMobile ? 220 : 300;
  const yAxisWidth = isMobile ? 80 : 150;
  const truncateLength = isMobile ? 10 : 20;

  // Process data for time-series charts
  const timeSeriesData = useMemo(() => {
    if (!sessionsData || !pageviewsData) return [];

    const dateMap = new Map<string, ChartDataPoint>();
    
    // Generate all dates in range
    const allDates = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    allDates.forEach(date => {
      const key = format(date, 'yyyy-MM-dd');
      dateMap.set(key, {
        date: format(date, 'MMM dd'),
        sessions: 0,
        pageviews: 0,
        bounces: 0,
        avgDuration: 0,
        uniqueVisitors: 0
      });
    });

    // Aggregate sessions
    sessionsData.forEach(session => {
      const sessionDate = parseISO(session.started_at);
      if (sessionDate >= dateRange.from && sessionDate <= dateRange.to) {
        const key = format(sessionDate, 'yyyy-MM-dd');
        const existing = dateMap.get(key);
        if (existing) {
          existing.sessions++;
          if (session.is_bounce) existing.bounces++;
          existing.avgDuration += session.duration_seconds || 0;
        }
      }
    });

    // Aggregate pageviews
    pageviewsData.forEach(pv => {
      const pvDate = parseISO(pv.viewed_at);
      if (pvDate >= dateRange.from && pvDate <= dateRange.to) {
        const key = format(pvDate, 'yyyy-MM-dd');
        const existing = dateMap.get(key);
        if (existing) {
          existing.pageviews++;
        }
      }
    });

    // Calculate averages
    dateMap.forEach(value => {
      if (value.sessions > 0) {
        value.avgDuration = Math.round(value.avgDuration / value.sessions);
      }
    });

    return Array.from(dateMap.values());
  }, [sessionsData, pageviewsData, dateRange]);

  // Hourly breakdown data
  const hourlyData = useMemo(() => {
    if (!sessionsData) return [];

    const hourMap = new Map<number, { hour: string; sessions: number; pageviews: number }>();
    
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, { hour: `${i.toString().padStart(2, '0')}:00`, sessions: 0, pageviews: 0 });
    }

    sessionsData.forEach(session => {
      const hour = new Date(session.started_at).getHours();
      const existing = hourMap.get(hour);
      if (existing) existing.sessions++;
    });

    pageviewsData?.forEach(pv => {
      const hour = new Date(pv.viewed_at).getHours();
      const existing = hourMap.get(hour);
      if (existing) existing.pageviews++;
    });

    return Array.from(hourMap.values());
  }, [sessionsData, pageviewsData]);

  // Page performance data with filtering
  const pagePerformanceData = useMemo(() => {
    if (!pageviewsData) return [];

    const pageMap = new Map<string, { path: string; views: number; avgTime: number; totalTime: number; exits: number }>();

    pageviewsData.forEach(pv => {
      const path = pv.page_path?.split('?')[0] || '/';
      if (searchFilter && !path.toLowerCase().includes(searchFilter.toLowerCase())) return;
      
      if (!pageMap.has(path)) {
        pageMap.set(path, { path, views: 0, avgTime: 0, totalTime: 0, exits: 0 });
      }
      const existing = pageMap.get(path)!;
      existing.views++;
      existing.totalTime += pv.time_on_page_seconds || 0;
      if (pv.is_exit) existing.exits++;
    });

    return Array.from(pageMap.values())
      .map(p => ({
        ...p,
        avgTime: p.views > 0 ? Math.round(p.totalTime / p.views) : 0,
        exitRate: p.views > 0 ? Math.round((p.exits / p.views) * 100) : 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);
  }, [pageviewsData, searchFilter]);

  // Helper to format referrer domains to friendly names
  const formatReferrerDomain = (domain: string): string => {
    if (!domain || domain === 'Direct') return 'Direct';
    
    // Handle Lovable preview URLs
    if (domain.includes('lovableproject.com') || domain.includes('lovable.app')) {
      return 'Lovable Preview';
    }
    if (domain.includes('lovable.dev')) {
      return 'Lovable';
    }
    
    // Clean up common domains
    const cleanDomain = domain
      .replace(/^www\./, '')
      .replace(/\.com$|\.org$|\.net$|\.io$/, '');
    
    // Capitalize first letter
    return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
  };

  // Referrer data
  const referrerData = useMemo(() => {
    if (!sessionsData) return [];

    const refMap = new Map<string, number>();
    sessionsData.forEach(session => {
      const rawDomain = session.referrer_domain || 'Direct';
      const friendlyName = formatReferrerDomain(rawDomain);
      refMap.set(friendlyName, (refMap.get(friendlyName) || 0) + 1);
    });

    return Array.from(refMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [sessionsData]);

  // Event funnel data
  const eventFunnelData = useMemo(() => {
    if (!eventsData) return [];

    const eventMap = new Map<string, number>();
    eventsData.forEach(event => {
      eventMap.set(event.event_name, (eventMap.get(event.event_name) || 0) + 1);
    });

    return Array.from(eventMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [eventsData]);

  // Device vs Browser scatter data
  const deviceBrowserData = useMemo(() => {
    if (!sessionsData) return [];

    const combos = new Map<string, { device: string; browser: string; count: number }>();
    sessionsData.forEach(session => {
      const key = `${session.device_type || 'unknown'}-${session.browser || 'unknown'}`;
      if (!combos.has(key)) {
        combos.set(key, { device: session.device_type || 'unknown', browser: session.browser || 'unknown', count: 0 });
      }
      combos.get(key)!.count++;
    });

    return Array.from(combos.values()).filter(c => c.count > 0);
  }, [sessionsData]);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  const renderChart = () => {
    const data = groupBy === 'hour' ? hourlyData : timeSeriesData;
    const xKey = groupBy === 'hour' ? 'hour' : 'date';

    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xKey} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {(metric === 'all' || metric === 'sessions') && (
              <Line type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            )}
            {(metric === 'all' || metric === 'pageviews') && (
              <Line type="monotone" dataKey="pageviews" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
            )}
            {(metric === 'all' || metric === 'bounces') && (
              <Line type="monotone" dataKey="bounces" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            )}
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xKey} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {(metric === 'all' || metric === 'sessions') && (
              <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            )}
            {(metric === 'all' || metric === 'pageviews') && (
              <Bar dataKey="pageviews" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        );
      default:
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="sessions-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pageviews-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={xKey} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            {(metric === 'all' || metric === 'sessions') && (
              <Area type="monotone" dataKey="sessions" stroke="hsl(var(--primary))" fill="url(#sessions-gradient)" />
            )}
            {(metric === 'all' || metric === 'pageviews') && (
              <Area type="monotone" dataKey="pageviews" stroke="hsl(var(--accent))" fill="url(#pageviews-gradient)" />
            )}
          </AreaChart>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Interactive Analytics</CardTitle>
              <CardDescription>Query and visualize your data with customizable charts</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Show current date range (controlled by parent) */}
              <Badge variant="outline" className="gap-2">
                <CalendarIcon className="h-3 w-3" />
                {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Select value={chartType} onValueChange={(v: 'area' | 'line' | 'bar') => setChartType(v)}>
              <SelectTrigger className="w-[110px] md:w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
              </SelectContent>
            </Select>

            <Select value={metric} onValueChange={(v: 'all' | 'sessions' | 'pageviews' | 'bounces') => setMetric(v)}>
              <SelectTrigger className="w-[110px] md:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metrics</SelectItem>
                <SelectItem value="sessions">Sessions</SelectItem>
                <SelectItem value="pageviews">Pageviews</SelectItem>
                <SelectItem value="bounces">Bounces</SelectItem>
              </SelectContent>
            </Select>

            <Select value={groupBy} onValueChange={(v: 'day' | 'hour' | 'week') => setGroupBy(v)}>
              <SelectTrigger className="w-[100px] md:w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">By Day</SelectItem>
                <SelectItem value="hour">By Hour</SelectItem>
              </SelectContent>
            </Select>

            <div className="hidden md:flex items-center gap-2 ml-auto">
              <Badge variant="outline" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Sessions
              </Badge>
              <Badge variant="outline" className="gap-1">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Pageviews
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="min-w-[300px]">
              <ResponsiveContainer width="100%" height={mainChartHeight}>
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Page Performance Chart */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base md:text-lg">Page Performance</CardTitle>
                <CardDescription className="text-xs md:text-sm">Views, time on page, and exit rates</CardDescription>
              </div>
              <div className="relative w-full md:w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter pages..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <div className="min-w-[280px]">
                <ResponsiveContainer width="100%" height={secondaryChartHeight}>
                  <ComposedChart data={pagePerformanceData.slice(0, isMobile ? 5 : 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis 
                      dataKey="path" 
                      type="category" 
                      width={yAxisWidth} 
                      className="text-xs"
                      tick={{ fontSize: isMobile ? 9 : 12 }}
                      tickFormatter={(value) => value.length > truncateLength ? value.slice(0, truncateLength) + '...' : value}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Views" />
                    <Scatter dataKey="avgTime" fill="#10b981" name="Avg Time (s)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources Pie */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Traffic Sources</CardTitle>
            <CardDescription className="text-xs md:text-sm">Where your visitors come from</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={secondaryChartHeight}>
              <PieChart>
                <Pie
                  data={referrerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 40 : 60}
                  outerRadius={isMobile ? 70 : 100}
                  paddingAngle={2}
                  dataKey="value"
                  label={isMobile ? false : ({ name, percent }) => `${name.slice(0, 12)} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {referrerData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend 
                  wrapperStyle={{ fontSize: isMobile ? 10 : 12 }}
                  formatter={(value: string) => value.length > 12 ? value.slice(0, 12) + '...' : value}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Event Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Event Funnel</CardTitle>
            <CardDescription className="text-xs md:text-sm">Top tracked events by frequency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <div className="min-w-[280px]">
                <ResponsiveContainer width="100%" height={secondaryChartHeight}>
                  <BarChart data={eventFunnelData.slice(0, isMobile ? 5 : 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={yAxisWidth} 
                      className="text-xs"
                      tick={{ fontSize: isMobile ? 9 : 12 }}
                      tickFormatter={(value) => value.length > truncateLength ? value.slice(0, truncateLength) + '...' : value}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]}>
                      {eventFunnelData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Traffic Heatmap */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Hourly Traffic Pattern</CardTitle>
            <CardDescription className="text-xs md:text-sm">When your visitors are most active</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <div className="min-w-[280px]">
                <ResponsiveContainer width="100%" height={secondaryChartHeight}>
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="hourly-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="hour" 
                      className="text-xs" 
                      tick={{ fontSize: isMobile ? 9 : 12 }}
                      interval={isMobile ? 3 : 1}
                    />
                    <YAxis className="text-xs" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area 
                      type="monotone" 
                      dataKey="sessions" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#hourly-gradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Charts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">Session Duration vs Pageviews</CardTitle>
          <CardDescription className="text-xs md:text-sm">Correlation between engagement metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="min-w-[300px]">
              <ResponsiveContainer width="100%" height={secondaryChartHeight}>
                <ComposedChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: isMobile ? 9 : 12 }} />
                  <YAxis yAxisId="left" className="text-xs" tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                  <Bar yAxisId="left" dataKey="pageviews" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Pageviews" />
                  <Line yAxisId="right" type="monotone" dataKey="avgDuration" stroke="#10b981" strokeWidth={2} name="Avg Duration (s)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
