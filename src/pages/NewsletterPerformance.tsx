import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { 
  Mail, 
  MousePointerClick, 
  Eye, 
  Users, 
  TrendingUp, 
  Clock, 
  FileText,
  Home,
  ArrowUpRight,
  BarChart3,
  Target,
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

export default function NewsletterPerformance() {
  const [selectedEdition, setSelectedEdition] = useState<string | null>(null);

  // Fetch all editions with stats
  const { data: editions, isLoading: loadingEditions } = useQuery({
    queryKey: ["newsletter-editions-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_editions")
        .select("*")
        .order("edition_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Fetch aggregate stats
  const { data: aggregateStats } = useQuery({
    queryKey: ["newsletter-aggregate-stats"],
    queryFn: async () => {
      const { data: editions } = await supabase
        .from("newsletter_editions")
        .select("total_sent, total_opened, total_clicked, unique_clicks")
        .eq("status", "sent");

      if (!editions) return null;

      const totalSent = editions.reduce((acc, e) => acc + (e.total_sent || 0), 0);
      const totalOpened = editions.reduce((acc, e) => acc + (e.total_opened || 0), 0);
      const totalClicked = editions.reduce((acc, e) => acc + (e.total_clicked || 0), 0);
      const uniqueClicks = editions.reduce((acc, e) => acc + (e.unique_clicks || 0), 0);

      return {
        totalSent,
        totalOpened,
        totalClicked,
        uniqueClicks,
        avgOpenRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0,
        avgClickRate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : 0,
        editionCount: editions.length,
      };
    },
  });

  // Fetch click data by link type
  const { data: clicksByType } = useQuery({
    queryKey: ["newsletter-clicks-by-type", selectedEdition],
    queryFn: async () => {
      let query = supabase
        .from("newsletter_link_clicks")
        .select("link_type");

      if (selectedEdition) {
        query = query.eq("edition_id", selectedEdition);
      }

      const { data, error } = await query;
      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((click) => {
        const type = click.link_type || "other";
        counts[type] = (counts[type] || 0) + 1;
      });

      return Object.entries(counts).map(([name, value]) => ({
        name: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
      }));
    },
    enabled: true,
  });

  // Fetch top clicked articles
  const { data: topArticles } = useQuery({
    queryKey: ["newsletter-top-articles", selectedEdition],
    queryFn: async () => {
      let query = supabase
        .from("newsletter_link_clicks")
        .select("article_id, articles(id, title, slug)")
        .not("article_id", "is", null);

      if (selectedEdition) {
        query = query.eq("edition_id", selectedEdition);
      }

      const { data, error } = await query;
      if (error) throw error;

      const articleCounts: Record<string, { title: string; slug: string; count: number }> = {};
      data?.forEach((click: any) => {
        if (click.articles) {
          const id = click.article_id;
          if (!articleCounts[id]) {
            articleCounts[id] = { title: click.articles.title, slug: click.articles.slug, count: 0 };
          }
          articleCounts[id].count++;
        }
      });

      return Object.entries(articleCounts)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    enabled: true,
  });

  // Fetch A/B test results for selected edition
  const { data: abTestResults } = useQuery({
    queryKey: ["newsletter-ab-test", selectedEdition],
    queryFn: async () => {
      if (!selectedEdition) return null;

      const { data: sends } = await supabase
        .from("newsletter_sends")
        .select("variant, opened_at, clicked_at")
        .eq("edition_id", selectedEdition);

      if (!sends) return null;

      const results: Record<string, { sent: number; opened: number; clicked: number }> = {
        A: { sent: 0, opened: 0, clicked: 0 },
        B: { sent: 0, opened: 0, clicked: 0 },
      };

      sends.forEach((send) => {
        if (send.variant === "A" || send.variant === "B") {
          results[send.variant].sent++;
          if (send.opened_at) results[send.variant].opened++;
          if (send.clicked_at) results[send.variant].clicked++;
        }
      });

      return results;
    },
    enabled: !!selectedEdition,
  });

  // Fetch user journeys
  const { data: journeyStats } = useQuery({
    queryKey: ["newsletter-journey-stats", selectedEdition],
    queryFn: async () => {
      let query = supabase
        .from("newsletter_user_journeys")
        .select("pages_visited, total_time_seconds, articles_read");

      if (selectedEdition) {
        query = query.eq("edition_id", selectedEdition);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return null;

      const totalJourneys = data.length;
      const avgPages = data.reduce((acc, j) => acc + (j.pages_visited || 0), 0) / totalJourneys;
      const avgTime = data.reduce((acc, j) => acc + (j.total_time_seconds || 0), 0) / totalJourneys;
      const totalArticlesRead = data.reduce((acc, j) => acc + ((j.articles_read as string[])?.length || 0), 0);

      return {
        totalJourneys,
        avgPages: avgPages.toFixed(1),
        avgTimeMinutes: (avgTime / 60).toFixed(1),
        totalArticlesRead,
        avgArticlesPerSession: (totalArticlesRead / totalJourneys).toFixed(1),
      };
    },
    enabled: true,
  });

  // Performance over time chart data
  const performanceOverTime = editions?.map((e) => ({
    date: format(parseISO(e.edition_date), "MMM d"),
    sent: e.total_sent || 0,
    opened: e.total_opened || 0,
    clicked: e.total_clicked || 0,
    openRate: e.total_sent ? ((e.total_opened || 0) / e.total_sent * 100) : 0,
  })).reverse() || [];

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin">Admin</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Newsletter Performance</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Newsletter Performance</h1>
            <p className="text-muted-foreground">Comprehensive analytics for newsletter engagement</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/newsletter-manager">Manage Newsletter</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/newsletter-analytics">Subscriber Stats</Link>
            </Button>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Emails Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregateStats?.totalSent?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">{aggregateStats?.editionCount || 0} editions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{aggregateStats?.avgOpenRate || 0}%</div>
              <p className="text-xs text-muted-foreground">{aggregateStats?.totalOpened?.toLocaleString() || 0} opens</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{aggregateStats?.avgClickRate || 0}%</div>
              <p className="text-xs text-muted-foreground">{aggregateStats?.totalClicked?.toLocaleString() || 0} clicks</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Unique Clickers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aggregateStats?.uniqueClicks?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">Engaged subscribers</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="editions">Editions</TabsTrigger>
            <TabsTrigger value="content">Content Performance</TabsTrigger>
            <TabsTrigger value="journeys">User Journeys</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Over Time */}
              <Card className="col-span-1 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="sent" stroke="#6b7280" name="Sent" />
                      <Line yAxisId="left" type="monotone" dataKey="opened" stroke="#22c55e" name="Opened" />
                      <Line yAxisId="left" type="monotone" dataKey="clicked" stroke="#3b82f6" name="Clicked" />
                      <Line yAxisId="right" type="monotone" dataKey="openRate" stroke="#f59e0b" name="Open Rate %" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Clicks by Link Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Clicks by Content Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {clicksByType && clicksByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={clicksByType}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {clicksByType.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No click data available yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Clicked Articles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Top Clicked Articles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topArticles && topArticles.length > 0 ? (
                    <div className="space-y-3">
                      {topArticles.slice(0, 5).map((article, idx) => (
                        <div key={article.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-muted-foreground">#{idx + 1}</span>
                            <Link 
                              to={`/article/${article.slug}`} 
                              className="text-sm hover:underline line-clamp-1"
                            >
                              {article.title}
                            </Link>
                          </div>
                          <Badge variant="secondary">{article.count} clicks</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No article clicks tracked yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Journey Stats */}
            {journeyStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Post-Click Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{journeyStats.totalJourneys}</div>
                      <div className="text-sm text-muted-foreground">Total Sessions</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{journeyStats.avgPages}</div>
                      <div className="text-sm text-muted-foreground">Avg Pages/Visit</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{journeyStats.avgTimeMinutes}m</div>
                      <div className="text-sm text-muted-foreground">Avg Time on Site</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{journeyStats.totalArticlesRead}</div>
                      <div className="text-sm text-muted-foreground">Articles Read</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{journeyStats.avgArticlesPerSession}</div>
                      <div className="text-sm text-muted-foreground">Avg Articles/Session</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Editions Tab */}
          <TabsContent value="editions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Edition Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEditions ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-right">Sent</TableHead>
                        <TableHead className="text-right">Opened</TableHead>
                        <TableHead className="text-right">Open Rate</TableHead>
                        <TableHead className="text-right">Clicked</TableHead>
                        <TableHead className="text-right">CTR</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editions?.map((edition) => {
                        const openRate = edition.total_sent ? ((edition.total_opened || 0) / edition.total_sent * 100) : 0;
                        const ctr = edition.total_opened ? ((edition.total_clicked || 0) / edition.total_opened * 100) : 0;
                        
                        return (
                          <TableRow 
                            key={edition.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedEdition(edition.id === selectedEdition ? null : edition.id)}
                          >
                            <TableCell>
                              {format(parseISO(edition.edition_date), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {edition.subject_line}
                            </TableCell>
                            <TableCell className="text-right">{edition.total_sent || 0}</TableCell>
                            <TableCell className="text-right">{edition.total_opened || 0}</TableCell>
                            <TableCell className="text-right">
                              <span className={openRate > 30 ? "text-green-600" : openRate > 20 ? "text-yellow-600" : "text-red-600"}>
                                {openRate.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{edition.total_clicked || 0}</TableCell>
                            <TableCell className="text-right">
                              <span className={ctr > 5 ? "text-green-600" : ctr > 2 ? "text-yellow-600" : "text-muted-foreground"}>
                                {ctr.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={edition.status === "sent" ? "default" : "secondary"}>
                                {edition.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* A/B Test Results */}
            {selectedEdition && abTestResults && (
              <Card>
                <CardHeader>
                  <CardTitle>A/B Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Badge variant="outline">A</Badge>
                        Subject Line A
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Sent</span>
                          <span className="font-medium">{abTestResults.A.sent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Opened</span>
                          <span className="font-medium">{abTestResults.A.opened}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Open Rate</span>
                          <span className="font-medium text-green-600">
                            {abTestResults.A.sent ? ((abTestResults.A.opened / abTestResults.A.sent) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Clicked</span>
                          <span className="font-medium">{abTestResults.A.clicked}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Badge variant="outline">B</Badge>
                        Subject Line B
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Sent</span>
                          <span className="font-medium">{abTestResults.B.sent}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Opened</span>
                          <span className="font-medium">{abTestResults.B.opened}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Open Rate</span>
                          <span className="font-medium text-green-600">
                            {abTestResults.B.sent ? ((abTestResults.B.opened / abTestResults.B.sent) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Clicked</span>
                          <span className="font-medium">{abTestResults.B.clicked}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Content Performance Tab */}
          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Click Distribution by Content Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {clicksByType && clicksByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={clicksByType} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No click data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Articles (All Time)</CardTitle>
                </CardHeader>
                <CardContent>
                  {topArticles && topArticles.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Article</TableHead>
                          <TableHead className="text-right">Clicks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topArticles.map((article) => (
                          <TableRow key={article.id}>
                            <TableCell>
                              <Link 
                                to={`/article/${article.slug}`} 
                                className="hover:underline flex items-center gap-1"
                              >
                                {article.title}
                                <ArrowUpRight className="h-3 w-3" />
                              </Link>
                            </TableCell>
                            <TableCell className="text-right font-medium">{article.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No article data available
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
                <CardTitle>Newsletter → Site Journey Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Journey Tracking Active</h3>
                  <p className="max-w-md mx-auto">
                    User journeys are being tracked when visitors click through from newsletters. 
                    Data will populate as subscribers engage with your content.
                  </p>
                </div>

                {journeyStats && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-blue-500/5 border-blue-500/20">
                      <CardContent className="pt-6 text-center">
                        <div className="text-3xl font-bold text-blue-600">{journeyStats.avgPages}</div>
                        <div className="text-sm text-muted-foreground">Average Pages per Visit</div>
                        <p className="text-xs mt-2 text-muted-foreground">
                          Newsletter visitors browse an average of {journeyStats.avgPages} pages per session
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-500/5 border-green-500/20">
                      <CardContent className="pt-6 text-center">
                        <div className="text-3xl font-bold text-green-600">{journeyStats.avgTimeMinutes}m</div>
                        <div className="text-sm text-muted-foreground">Average Time on Site</div>
                        <p className="text-xs mt-2 text-muted-foreground">
                          Engaged reading time from newsletter visitors
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-500/5 border-purple-500/20">
                      <CardContent className="pt-6 text-center">
                        <div className="text-3xl font-bold text-purple-600">{journeyStats.avgArticlesPerSession}</div>
                        <div className="text-sm text-muted-foreground">Articles per Session</div>
                        <p className="text-xs mt-2 text-muted-foreground">
                          Newsletter readers explore beyond their landing page
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </>
  );
}
