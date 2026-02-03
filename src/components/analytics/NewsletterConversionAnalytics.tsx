import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, TrendingUp, Target, Zap, ArrowRight, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { format, subDays } from "date-fns";

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface AnalyticsEvent {
  event_name: string;
  event_data: any;
  page_path: string | null;
  session_id: string;
  created_at: string;
}

interface PageStats {
  views: number;
  uniqueSessions: Set<string>;
}

interface NewsletterConversionAnalyticsProps {
  pageStats: Record<string, PageStats>;
  startDate: Date;
  endDate: Date;
  isLoading: boolean;
}

export function NewsletterConversionAnalytics({ 
  pageStats, 
  startDate,
  endDate,
  isLoading: parentLoading 
}: NewsletterConversionAnalyticsProps) {
  // Fetch newsletter signup events
  const { data: signupEvents, isLoading: signupsLoading } = useQuery({
    queryKey: ["newsletter-signup-events", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_name, event_data, page_path, session_id, created_at")
        .eq("event_name", "newsletter_signup")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .limit(1000);
      
      if (error) throw error;
      return (data || []) as AnalyticsEvent[];
    },
  });

  // Fetch all sessions with newsletter page visits
  const { data: newsletterPageviews, isLoading: pageviewsLoading } = useQuery({
    queryKey: ["newsletter-pageviews", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_pageviews")
        .select("page_path, session_id, viewed_at")
        .like("page_path", "%newsletter%")
        .gte("viewed_at", startDate.toISOString())
        .lte("viewed_at", endDate.toISOString())
        .limit(1000);
      
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = parentLoading || signupsLoading || pageviewsLoading;

  // Signup location analysis
  const signupLocations = useMemo(() => {
    if (!signupEvents) return [];

    const locations: Record<string, number> = {};
    signupEvents.forEach(event => {
      const location = (event.event_data as any)?.signup_location || 'unknown';
      locations[location] = (locations[location] || 0) + 1;
    });

    return Object.entries(locations)
      .map(([location, count]) => ({ 
        location: location.charAt(0).toUpperCase() + location.slice(1).replace(/_/g, ' '),
        count 
      }))
      .sort((a, b) => b.count - a.count);
  }, [signupEvents]);

  // Conversion paths - which pages lead to signups
  const conversionPaths = useMemo(() => {
    if (!signupEvents) return [];

    const pageCounts: Record<string, number> = {};
    signupEvents.forEach(event => {
      const path = event.page_path || '/';
      pageCounts[path] = (pageCounts[path] || 0) + 1;
    });

    return Object.entries(pageCounts)
      .map(([page, signups]) => {
        const views = pageStats[page]?.views || 1;
        return {
          page,
          signups,
          views,
          conversionRate: Math.round((signups / views) * 100 * 100) / 100, // 2 decimal places
        };
      })
      .sort((a, b) => b.signups - a.signups)
      .slice(0, 15);
  }, [signupEvents, pageStats]);

  // Signups over time
  const signupsOverTime = useMemo(() => {
    if (!signupEvents) return [];

    const dailyCounts: Record<string, number> = {};
    signupEvents.forEach(event => {
      const day = format(new Date(event.created_at), 'MMM dd');
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    // Fill in missing days
    const days: { day: string; signups: number }[] = [];
    for (let i = parseInt((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + ''); i >= 0; i--) {
      const date = subDays(endDate, i);
      const day = format(date, 'MMM dd');
      days.push({ day, signups: dailyCounts[day] || 0 });
    }

    return days;
  }, [signupEvents, startDate, endDate]);

  // Total metrics
  const metrics = useMemo(() => {
    const totalSignups = signupEvents?.length || 0;
    const uniqueSessions = new Set(signupEvents?.map(e => e.session_id) || []).size;
    const newsletterPageSessions = new Set(newsletterPageviews?.map(p => p.session_id) || []).size;
    
    // Calculate conversion rate from newsletter page visits
    const conversionRate = newsletterPageSessions > 0 
      ? Math.round((totalSignups / newsletterPageSessions) * 100) 
      : 0;

    return {
      totalSignups,
      uniqueSessions,
      newsletterPageSessions,
      conversionRate,
    };
  }, [signupEvents, newsletterPageviews]);

  // Best performing content for conversions
  const topConvertingContent = useMemo(() => {
    return conversionPaths
      .filter(p => p.views >= 10) // Min 10 views for reliable rate
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10);
  }, [conversionPaths]);

  if (isLoading) {
    return <div className="h-[400px] bg-muted/50 animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Total Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalSignups}</div>
            <p className="text-xs text-muted-foreground mt-1">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Newsletter Page Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.newsletterPageSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Page Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Newsletter page → signup</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Best Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{signupLocations[0]?.location || 'N/A'}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {signupLocations[0]?.count || 0} signups ({signupLocations[0] && metrics.totalSignups > 0 
                ? Math.round((signupLocations[0].count / metrics.totalSignups) * 100) 
                : 0}%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Signups Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Signups Over Time
          </CardTitle>
          <CardDescription>Daily newsletter signup trend</CardDescription>
        </CardHeader>
        <CardContent>
          {signupsOverTime.length === 0 || metrics.totalSignups === 0 ? (
            <p className="text-muted-foreground text-sm">No signup data in this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={signupsOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="signups" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.2} 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Signup Locations & Conversion Paths */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Signup Locations
            </CardTitle>
            <CardDescription>Where do users sign up from?</CardDescription>
          </CardHeader>
          <CardContent>
            {signupLocations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No location data available</p>
            ) : (
              <div className="space-y-3">
                {signupLocations.map((loc, i) => (
                  <div key={loc.location} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{loc.location}</span>
                      <span className="text-muted-foreground">{loc.count} ({Math.round((loc.count / metrics.totalSignups) * 100)}%)</span>
                    </div>
                    <Progress value={(loc.count / signupLocations[0].count) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Top Converting Pages
            </CardTitle>
            <CardDescription>Pages with highest signup rate (min 10 views)</CardDescription>
          </CardHeader>
          <CardContent>
            {topConvertingContent.length === 0 ? (
              <p className="text-muted-foreground text-sm">Not enough data for conversion rates</p>
            ) : (
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {topConvertingContent.map((page, i) => (
                    <div key={page.page} className="p-3 rounded-lg bg-muted/50 hover:bg-muted">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm truncate max-w-[200px]">{page.page}</span>
                        <Badge variant="default">{page.conversionRate}%</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {page.signups} signups from {page.views} views
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Path Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Content → Newsletter Funnel</CardTitle>
          <CardDescription>Which articles drive the most signups?</CardDescription>
        </CardHeader>
        <CardContent>
          {conversionPaths.length === 0 ? (
            <p className="text-muted-foreground text-sm">No conversion path data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionPaths.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="page" width={200} tick={{ fontSize: 10 }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-3 text-sm shadow-lg">
                          <p className="font-medium truncate max-w-[250px]">{data.page}</p>
                          <p>{data.signups} signups</p>
                          <p>{data.views} views</p>
                          <p className="text-primary">Conv. rate: {data.conversionRate}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="signups" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 mt-0.5 text-primary" />
            <div className="text-sm space-y-1">
              {metrics.totalSignups === 0 ? (
                <p>No newsletter signups tracked in this period. Ensure tracking is enabled.</p>
              ) : (
                <>
                  <p>
                    <strong>{metrics.totalSignups}</strong> signups from <strong>{signupLocations[0]?.location || 'various'}</strong> primarily.
                  </p>
                  {topConvertingContent[0] && (
                    <p>
                      Best converting content: <strong>{topConvertingContent[0].page}</strong> at {topConvertingContent[0].conversionRate}% conversion rate.
                    </p>
                  )}
                  {metrics.conversionRate < 5 && (
                    <p className="text-yellow-600">
                      💡 Conversion rate is below 5%. Consider A/B testing signup form placement or copy.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
