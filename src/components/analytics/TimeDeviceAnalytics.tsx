import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Smartphone, Monitor, Tablet, Calendar, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, PieChart, Pie
} from "recharts";
import { format, getHours, getDay } from "date-fns";

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Pageview {
  page_path: string | null;
  time_on_page_seconds: number | null;
  scroll_depth_percent: number | null;
  session_id: string;
  viewed_at: string;
}

interface Session {
  session_id: string;
  device_type: string | null;
  browser: string | null;
  started_at: string;
  page_count: number | null;
  duration_seconds: number | null;
}

interface TimeDeviceAnalyticsProps {
  pageviewsData: Pageview[];
  sessionsData: Session[];
  isLoading: boolean;
}

export function TimeDeviceAnalytics({ pageviewsData, sessionsData, isLoading }: TimeDeviceAnalyticsProps) {
  // Reading patterns by hour and day (heatmap data)
  const readingHeatmap = useMemo(() => {
    const heatmap: Record<string, { views: number; totalTime: number; totalScroll: number; count: number }> = {};
    
    // Initialize all cells
    DAYS.forEach(day => {
      HOURS.forEach(hour => {
        heatmap[`${day}-${hour}`] = { views: 0, totalTime: 0, totalScroll: 0, count: 0 };
      });
    });
    
    pageviewsData.forEach(pv => {
      const date = new Date(pv.viewed_at);
      const day = DAYS[getDay(date)];
      const hour = getHours(date);
      const key = `${day}-${hour}`;
      
      heatmap[key].views++;
      heatmap[key].totalTime += pv.time_on_page_seconds || 0;
      if (pv.scroll_depth_percent) {
        heatmap[key].totalScroll += pv.scroll_depth_percent;
        heatmap[key].count++;
      }
    });

    // Convert to array for visualization
    const data: Array<{ day: string; hour: number; views: number; avgTime: number; avgScroll: number }> = [];
    DAYS.forEach((day, dayIndex) => {
      HOURS.forEach(hour => {
        const cell = heatmap[`${day}-${hour}`];
        data.push({
          day,
          hour,
          views: cell.views,
          avgTime: cell.views > 0 ? Math.round(cell.totalTime / cell.views) : 0,
          avgScroll: cell.count > 0 ? Math.round(cell.totalScroll / cell.count) : 0,
        });
      });
    });

    return data;
  }, [pageviewsData]);

  // Peak reading times
  const peakTimes = useMemo(() => {
    const hourlyViews: Record<number, number> = {};
    HOURS.forEach(h => hourlyViews[h] = 0);
    
    pageviewsData.forEach(pv => {
      const hour = getHours(new Date(pv.viewed_at));
      hourlyViews[hour]++;
    });

    return HOURS.map(hour => ({
      hour: `${hour}:00`,
      views: hourlyViews[hour],
    }));
  }, [pageviewsData]);

  // Device breakdown with engagement
  const deviceStats = useMemo(() => {
    const devices: Record<string, { 
      sessions: number; 
      totalPages: number; 
      totalDuration: number;
      pageviews: number;
      totalTime: number;
      totalScroll: number;
      scrollCount: number;
    }> = {};

    sessionsData.forEach(session => {
      const device = session.device_type || 'unknown';
      if (!devices[device]) {
        devices[device] = { sessions: 0, totalPages: 0, totalDuration: 0, pageviews: 0, totalTime: 0, totalScroll: 0, scrollCount: 0 };
      }
      devices[device].sessions++;
      devices[device].totalPages += session.page_count || 0;
      devices[device].totalDuration += session.duration_seconds || 0;
    });

    // Add pageview metrics
    const sessionDeviceMap = new Map(sessionsData.map(s => [s.session_id, s.device_type || 'unknown']));
    pageviewsData.forEach(pv => {
      const device = sessionDeviceMap.get(pv.session_id) || 'unknown';
      if (devices[device]) {
        devices[device].pageviews++;
        devices[device].totalTime += pv.time_on_page_seconds || 0;
        if (pv.scroll_depth_percent) {
          devices[device].totalScroll += pv.scroll_depth_percent;
          devices[device].scrollCount++;
        }
      }
    });

    return Object.entries(devices)
      .filter(([device]) => device !== 'unknown')
      .map(([device, data]) => ({
        device: device.charAt(0).toUpperCase() + device.slice(1),
        sessions: data.sessions,
        avgPages: data.sessions > 0 ? (data.totalPages / data.sessions).toFixed(1) : '0',
        avgDuration: data.sessions > 0 ? Math.round(data.totalDuration / data.sessions) : 0,
        avgTimeOnPage: data.pageviews > 0 ? Math.round(data.totalTime / data.pageviews) : 0,
        avgScroll: data.scrollCount > 0 ? Math.round(data.totalScroll / data.scrollCount) : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [sessionsData, pageviewsData]);

  // Best publishing times (when new content gets most engagement)
  const publishingInsights = useMemo(() => {
    const dayViews: Record<string, number> = {};
    DAYS.forEach(d => dayViews[d] = 0);
    
    pageviewsData.forEach(pv => {
      const day = DAYS[getDay(new Date(pv.viewed_at))];
      dayViews[day]++;
    });

    const sorted = Object.entries(dayViews).sort(([,a], [,b]) => b - a);
    return {
      bestDay: sorted[0]?.[0] || 'N/A',
      worstDay: sorted[sorted.length - 1]?.[0] || 'N/A',
      data: DAYS.map(day => ({ day, views: dayViews[day] })),
    };
  }, [pageviewsData]);

  const getDeviceIcon = (device: string) => {
    const lower = device.toLowerCase();
    if (lower.includes('mobile')) return <Smartphone className="h-4 w-4" />;
    if (lower.includes('tablet')) return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  // Heatmap cell color based on intensity
  const getHeatmapColor = (views: number, max: number) => {
    if (views === 0) return 'bg-muted';
    const intensity = views / max;
    if (intensity > 0.75) return 'bg-primary';
    if (intensity > 0.5) return 'bg-primary/75';
    if (intensity > 0.25) return 'bg-primary/50';
    return 'bg-primary/25';
  };

  const maxViews = Math.max(...readingHeatmap.map(h => h.views), 1);

  if (isLoading) {
    return <div className="h-[400px] bg-muted/50 animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Reading Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Reading Patterns Heatmap
          </CardTitle>
          <CardDescription>When do users read most? (Darker = more activity)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour labels */}
              <div className="flex gap-1 mb-1 ml-12">
                {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
                  <div key={h} className="text-xs text-muted-foreground" style={{ width: '36px' }}>
                    {h}:00
                  </div>
                ))}
              </div>
              
              {/* Heatmap grid */}
              {DAYS.map(day => (
                <div key={day} className="flex items-center gap-1 mb-1">
                  <span className="text-xs text-muted-foreground w-10">{day}</span>
                  <div className="flex gap-0.5">
                    {HOURS.map(hour => {
                      const cell = readingHeatmap.find(h => h.day === day && h.hour === hour);
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={`w-3 h-6 rounded-sm cursor-pointer transition-colors ${getHeatmapColor(cell?.views || 0, maxViews)}`}
                          title={`${day} ${hour}:00 - ${cell?.views || 0} views, ${formatDuration(cell?.avgTime || 0)} avg time`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              
              {/* Legend */}
              <div className="flex items-center gap-2 mt-4 ml-12">
                <span className="text-xs text-muted-foreground">Less</span>
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 rounded-sm bg-muted" />
                  <div className="w-3 h-3 rounded-sm bg-primary/25" />
                  <div className="w-3 h-3 rounded-sm bg-primary/50" />
                  <div className="w-3 h-3 rounded-sm bg-primary/75" />
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                </div>
                <span className="text-xs text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peak Hours & Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hourly Traffic</CardTitle>
            <CardDescription>Views by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={peakTimes}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Traffic</CardTitle>
            <CardDescription>
              Best day: <Badge variant="default">{publishingInsights.bestDay}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={publishingInsights.data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                  {publishingInsights.data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.day === publishingInsights.bestDay ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Device Engagement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Device-Specific Engagement
          </CardTitle>
          <CardDescription>How engagement varies by device type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {deviceStats.map((device, i) => (
              <div key={device.device} className={`p-4 rounded-lg ${i === 0 ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {getDeviceIcon(device.device)}
                  <span className="font-semibold">{device.device}</span>
                  {i === 0 && <Badge variant="default" className="ml-auto">Top</Badge>}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sessions</span>
                    <span className="font-medium">{device.sessions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Pages/Session</span>
                    <span className="font-medium">{device.avgPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Time on Page</span>
                    <span className="font-medium">{formatDuration(device.avgTimeOnPage)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Scroll Depth</span>
                    <span className="font-medium">{device.avgScroll}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Device comparison insight */}
          {deviceStats.length >= 2 && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm">
                {deviceStats[0].avgScroll > (deviceStats[1]?.avgScroll || 0) ? (
                  <>📱 <strong>{deviceStats[0].device}</strong> users scroll deeper ({deviceStats[0].avgScroll}% vs {deviceStats[1]?.avgScroll}%)</>
                ) : (
                  <>💻 <strong>{deviceStats[1]?.device}</strong> users scroll deeper ({deviceStats[1]?.avgScroll}% vs {deviceStats[0].avgScroll}%)</>
                )}
                {parseFloat(deviceStats[0].avgPages) > parseFloat(deviceStats[1]?.avgPages || '0') && (
                  <span className="text-muted-foreground"> - but {deviceStats[0].device} views more pages per session</span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
