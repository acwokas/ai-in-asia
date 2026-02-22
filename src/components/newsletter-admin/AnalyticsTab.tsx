import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import {
  Mail, MousePointerClick, Eye, Users, TrendingUp, Clock,
  FileText, ArrowUpRight, BarChart3, Target,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

export default function AnalyticsTab() {
  const [selectedEdition, setSelectedEdition] = useState<string | null>(null);

  const { data: editions, isLoading: loadingEditions } = useQuery({
    queryKey: ["newsletter-editions-performance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("newsletter_editions").select("*").order("edition_date", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: aggregateStats } = useQuery({
    queryKey: ["newsletter-aggregate-stats"],
    queryFn: async () => {
      const { data: eds } = await supabase.from("newsletter_editions").select("total_sent, total_opened, total_clicked, unique_clicks").eq("status", "sent");
      if (!eds) return null;
      const totalSent = eds.reduce((a, e) => a + (e.total_sent || 0), 0);
      const totalOpened = eds.reduce((a, e) => a + (e.total_opened || 0), 0);
      const totalClicked = eds.reduce((a, e) => a + (e.total_clicked || 0), 0);
      const uniqueClicks = eds.reduce((a, e) => a + (e.unique_clicks || 0), 0);
      return {
        totalSent, totalOpened, totalClicked, uniqueClicks,
        avgOpenRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0,
        avgClickRate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : 0,
        editionCount: eds.length,
      };
    },
  });

  const { data: clicksByType } = useQuery({
    queryKey: ["newsletter-clicks-by-type", selectedEdition],
    queryFn: async () => {
      let query = supabase.from("newsletter_link_clicks").select("link_type");
      if (selectedEdition) query = query.eq("edition_id", selectedEdition);
      const { data, error } = await query;
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(c => { const t = c.link_type || "other"; counts[t] = (counts[t] || 0) + 1; });
      return Object.entries(counts).map(([name, value]) => ({
        name: name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), value,
      }));
    },
  });

  const { data: topArticles } = useQuery({
    queryKey: ["newsletter-top-articles", selectedEdition],
    queryFn: async () => {
      let query = supabase.from("newsletter_link_clicks").select("article_id, articles(id, title, slug)").not("article_id", "is", null);
      if (selectedEdition) query = query.eq("edition_id", selectedEdition);
      const { data, error } = await query;
      if (error) throw error;
      const articleCounts: Record<string, { title: string; slug: string; count: number }> = {};
      data?.forEach((click: any) => {
        if (click.articles) {
          const id = click.article_id;
          if (!articleCounts[id]) articleCounts[id] = { title: click.articles.title, slug: click.articles.slug, count: 0 };
          articleCounts[id].count++;
        }
      });
      return Object.entries(articleCounts).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.count - a.count).slice(0, 10);
    },
  });

  const { data: abTestResults } = useQuery({
    queryKey: ["newsletter-ab-test", selectedEdition],
    queryFn: async () => {
      if (!selectedEdition) return null;
      const { data: sends } = await supabase.from("newsletter_sends").select("variant, opened_at, clicked_at").eq("edition_id", selectedEdition);
      if (!sends) return null;
      const results: Record<string, { sent: number; opened: number; clicked: number }> = { A: { sent: 0, opened: 0, clicked: 0 }, B: { sent: 0, opened: 0, clicked: 0 } };
      sends.forEach(s => {
        if (s.variant === "A" || s.variant === "B") {
          results[s.variant].sent++;
          if (s.opened_at) results[s.variant].opened++;
          if (s.clicked_at) results[s.variant].clicked++;
        }
      });
      return results;
    },
    enabled: !!selectedEdition,
  });

  const { data: journeyStats } = useQuery({
    queryKey: ["newsletter-journey-stats", selectedEdition],
    queryFn: async () => {
      let query = supabase.from("newsletter_user_journeys").select("pages_visited, total_time_seconds, articles_read");
      if (selectedEdition) query = query.eq("edition_id", selectedEdition);
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const total = data.length;
      const avgPages = data.reduce((a, j) => a + (j.pages_visited || 0), 0) / total;
      const avgTime = data.reduce((a, j) => a + (j.total_time_seconds || 0), 0) / total;
      const totalArticles = data.reduce((a, j) => a + ((j.articles_read as string[])?.length || 0), 0);
      return { totalJourneys: total, avgPages: avgPages.toFixed(1), avgTimeMinutes: (avgTime / 60).toFixed(1), totalArticlesRead: totalArticles, avgArticlesPerSession: (totalArticles / total).toFixed(1) };
    },
  });

  const performanceOverTime = editions?.map(e => ({
    date: format(parseISO(e.edition_date), "MMM d"),
    sent: e.total_sent || 0, opened: e.total_opened || 0, clicked: e.total_clicked || 0,
    openRate: e.total_sent ? ((e.total_opened || 0) / e.total_sent * 100) : 0,
  })).reverse() || [];

  return (
    <div className="space-y-6">
      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Sent</CardTitle><Mail className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{aggregateStats?.totalSent?.toLocaleString() || 0}</div><p className="text-xs text-muted-foreground">{aggregateStats?.editionCount || 0} editions</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle><Eye className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{aggregateStats?.avgOpenRate || 0}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle><MousePointerClick className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{aggregateStats?.avgClickRate || 0}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Unique Clickers</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{aggregateStats?.uniqueClicks?.toLocaleString() || 0}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="editions">Editions</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="journeys">Journeys</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5" />Performance Over Time</CardTitle></CardHeader>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5" />Clicks by Type</CardTitle></CardHeader>
              <CardContent>
                {clicksByType && clicksByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={clicksByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {clicksByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">No click data yet</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5" />Top Clicked Articles</CardTitle></CardHeader>
              <CardContent>
                {topArticles && topArticles.length > 0 ? (
                  <div className="space-y-3">
                    {topArticles.slice(0, 5).map((a, i) => (
                      <div key={a.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                          <Link to={`/article/${a.slug}`} className="text-sm hover:underline line-clamp-1">{a.title}</Link>
                        </div>
                        <Badge variant="secondary">{a.count} clicks</Badge>
                      </div>
                    ))}
                  </div>
                ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No article clicks yet</div>}
              </CardContent>
            </Card>
          </div>

          {journeyStats && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="h-5 w-5" />Post-Click Engagement</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { val: journeyStats.totalJourneys, label: "Sessions" },
                    { val: journeyStats.avgPages, label: "Avg Pages" },
                    { val: `${journeyStats.avgTimeMinutes}m`, label: "Avg Time" },
                    { val: journeyStats.totalArticlesRead, label: "Articles Read" },
                    { val: journeyStats.avgArticlesPerSession, label: "Avg/Session" },
                  ].map(({ val, label }) => (
                    <div key={label} className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{val}</div>
                      <div className="text-sm text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="editions">
          <Card>
            <CardHeader><CardTitle className="text-base">Edition Performance</CardTitle></CardHeader>
            <CardContent>
              {loadingEditions ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Sent</TableHead>
                      <TableHead className="text-right">Opened</TableHead>
                      <TableHead className="text-right">Open %</TableHead>
                      <TableHead className="text-right">Clicked</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editions?.map(ed => {
                      const openRate = ed.total_sent ? ((ed.total_opened || 0) / ed.total_sent * 100) : 0;
                      return (
                        <TableRow key={ed.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEdition(ed.id === selectedEdition ? null : ed.id)}>
                          <TableCell>{format(parseISO(ed.edition_date), "MMM d, yyyy")}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{ed.subject_line}</TableCell>
                          <TableCell className="text-right">{ed.total_sent || 0}</TableCell>
                          <TableCell className="text-right">{ed.total_opened || 0}</TableCell>
                          <TableCell className="text-right">
                            <span className={openRate > 30 ? "text-green-600" : openRate > 20 ? "text-yellow-600" : "text-red-600"}>{openRate.toFixed(1)}%</span>
                          </TableCell>
                          <TableCell className="text-right">{ed.total_clicked || 0}</TableCell>
                          <TableCell><Badge variant={ed.status === "sent" ? "default" : "secondary"}>{ed.status}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {selectedEdition && abTestResults && (
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">A/B Test Results</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  {(['A', 'B'] as const).map(v => (
                    <div key={v} className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3 flex items-center gap-2"><Badge variant="outline">{v}</Badge>Subject Line {v}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Sent</span><span className="font-medium">{abTestResults[v].sent}</span></div>
                        <div className="flex justify-between"><span>Opened</span><span className="font-medium">{abTestResults[v].opened}</span></div>
                        <div className="flex justify-between"><span>Open Rate</span><span className="font-medium text-green-600">{abTestResults[v].sent ? ((abTestResults[v].opened / abTestResults[v].sent) * 100).toFixed(1) : 0}%</span></div>
                        <div className="flex justify-between"><span>Clicked</span><span className="font-medium">{abTestResults[v].clicked}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Click Distribution</CardTitle></CardHeader>
              <CardContent>
                {clicksByType && clicksByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={clicksByType} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={100} /><Tooltip /><Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Top Articles (All Time)</CardTitle></CardHeader>
              <CardContent>
                {topArticles && topArticles.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Article</TableHead><TableHead className="text-right">Clicks</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {topArticles.map(a => (
                        <TableRow key={a.id}>
                          <TableCell><Link to={`/article/${a.slug}`} className="hover:underline flex items-center gap-1">{a.title}<ArrowUpRight className="h-3 w-3" /></Link></TableCell>
                          <TableCell className="text-right font-medium">{a.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="journeys">
          <Card>
            <CardHeader><CardTitle className="text-base">Newsletter → Site Journeys</CardTitle></CardHeader>
            <CardContent>
              {journeyStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-500/5 border-blue-500/20"><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-blue-600">{journeyStats.avgPages}</div><div className="text-sm text-muted-foreground">Avg Pages/Visit</div></CardContent></Card>
                  <Card className="bg-green-500/5 border-green-500/20"><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-green-600">{journeyStats.avgTimeMinutes}m</div><div className="text-sm text-muted-foreground">Avg Time on Site</div></CardContent></Card>
                  <Card className="bg-purple-500/5 border-purple-500/20"><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-purple-600">{journeyStats.avgArticlesPerSession}</div><div className="text-sm text-muted-foreground">Articles/Session</div></CardContent></Card>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Journey Tracking Active</h3>
                  <p className="max-w-md mx-auto text-sm">Data will populate as subscribers engage.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
