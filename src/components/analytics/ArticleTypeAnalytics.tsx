import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { List, FileText, Scale, Clock, TrendingUp, TrendingDown, Target, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

interface Article {
  id: string;
  title: string;
  slug: string;
  article_type: string;
  primary_category_id: string | null;
  published_at: string | null;
  view_count: number | null;
}

interface PageStats {
  views: number;
  uniqueSessions: Set<string>;
  totalTime: number;
  totalScroll: number;
  scrollCount: number;
  exits: number;
}

interface ArticleTypeAnalyticsProps {
  articlesData: Article[];
  categoriesData: { id: string; slug: string; name: string }[];
  pageStats: Record<string, PageStats>;
  isLoading: boolean;
}

export function ArticleTypeAnalytics({ 
  articlesData, 
  categoriesData, 
  pageStats, 
  isLoading 
}: ArticleTypeAnalyticsProps) {
  const categoryLookup = useMemo(() => 
    Object.fromEntries(categoriesData.map(c => [c.id, c.slug])),
    [categoriesData]
  );

  // Article type breakdown with performance
  const articleTypeStats = useMemo(() => {
    const types: Record<string, { 
      count: number; 
      views: number; 
      totalTime: number; 
      totalScroll: number;
      scrollCount: number;
      sessions: Set<string>;
    }> = {};

    articlesData.forEach(article => {
      const type = article.article_type || 'standard';
      const categorySlug = categoryLookup[article.primary_category_id || ''] || 'news';
      const articlePath = `/${categorySlug}/${article.slug}`;
      const stats = pageStats[articlePath];

      if (!types[type]) {
        types[type] = { count: 0, views: 0, totalTime: 0, totalScroll: 0, scrollCount: 0, sessions: new Set() };
      }

      types[type].count++;
      if (stats) {
        types[type].views += stats.views;
        types[type].totalTime += stats.totalTime;
        types[type].totalScroll += stats.totalScroll;
        types[type].scrollCount += stats.scrollCount;
        stats.uniqueSessions.forEach(s => types[type].sessions.add(s));
      }
    });

    return Object.entries(types).map(([type, data]) => ({
      type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      rawType: type,
      count: data.count,
      views: data.views,
      avgViews: data.count > 0 ? Math.round(data.views / data.count) : 0,
      avgTime: data.views > 0 ? Math.round(data.totalTime / data.views) : 0,
      avgScroll: data.scrollCount > 0 ? Math.round(data.totalScroll / data.scrollCount) : 0,
      uniqueVisitors: data.sessions.size,
    })).sort((a, b) => b.views - a.views);
  }, [articlesData, categoryLookup, pageStats]);

  // Listicle vs Standard comparison
  const listicleComparison = useMemo(() => {
    const listicles = articleTypeStats.find(t => t.rawType === 'top_list');
    const standard = articleTypeStats.find(t => t.rawType === 'standard');

    if (!listicles || !standard) return null;

    return {
      listicles: {
        count: listicles.count,
        avgViews: listicles.avgViews,
        avgTime: listicles.avgTime,
        avgScroll: listicles.avgScroll,
      },
      standard: {
        count: standard.count,
        avgViews: standard.avgViews,
        avgTime: standard.avgTime,
        avgScroll: standard.avgScroll,
      },
      viewsWinner: listicles.avgViews > standard.avgViews ? 'listicles' : 'standard',
      engagementWinner: listicles.avgScroll > standard.avgScroll ? 'listicles' : 'standard',
    };
  }, [articleTypeStats]);

  // Radar chart data for article type comparison
  const radarData = useMemo(() => {
    const maxViews = Math.max(...articleTypeStats.map(t => t.avgViews), 1);
    const maxTime = Math.max(...articleTypeStats.map(t => t.avgTime), 1);
    const maxScroll = Math.max(...articleTypeStats.map(t => t.avgScroll), 1);
    const maxCount = Math.max(...articleTypeStats.map(t => t.count), 1);

    return [
      { metric: 'Avg Views', ...Object.fromEntries(articleTypeStats.map(t => [t.type, Math.round((t.avgViews / maxViews) * 100)])) },
      { metric: 'Avg Time', ...Object.fromEntries(articleTypeStats.map(t => [t.type, Math.round((t.avgTime / maxTime) * 100)])) },
      { metric: 'Scroll Depth', ...Object.fromEntries(articleTypeStats.map(t => [t.type, Math.round((t.avgScroll / maxScroll) * 100)])) },
      { metric: 'Volume', ...Object.fromEntries(articleTypeStats.map(t => [t.type, Math.round((t.count / maxCount) * 100)])) },
    ];
  }, [articleTypeStats]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const getTypeIcon = (type: string) => {
    if (type === 'top_list') return <List className="h-4 w-4" />;
    if (type === 'review') return <Scale className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  if (isLoading) {
    return <div className="h-[300px] bg-muted/50 animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Listicle vs Full Articles comparison */}
      {listicleComparison && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Listicles vs Full Articles
            </CardTitle>
            <CardDescription>Head-to-head performance comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* Listicles */}
              <div className={`p-4 rounded-lg ${listicleComparison.viewsWinner === 'listicles' ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <List className="h-5 w-5" />
                  <h4 className="font-semibold">Listicles (Top Lists)</h4>
                  {listicleComparison.viewsWinner === 'listicles' && (
                    <Badge variant="default" className="ml-auto bg-green-500">Winner</Badge>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Articles</span>
                    <span className="font-medium">{listicleComparison.listicles.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Views</span>
                    <span className="font-medium">{listicleComparison.listicles.avgViews}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Time</span>
                    <span className="font-medium">{formatDuration(listicleComparison.listicles.avgTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Scroll Depth</span>
                    <span className="font-medium">{listicleComparison.listicles.avgScroll}%</span>
                  </div>
                </div>
              </div>

              {/* Standard */}
              <div className={`p-4 rounded-lg ${listicleComparison.viewsWinner === 'standard' ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5" />
                  <h4 className="font-semibold">Full Articles</h4>
                  {listicleComparison.viewsWinner === 'standard' && (
                    <Badge variant="default" className="ml-auto bg-green-500">Winner</Badge>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Articles</span>
                    <span className="font-medium">{listicleComparison.standard.count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Views</span>
                    <span className="font-medium">{listicleComparison.standard.avgViews}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Time</span>
                    <span className="font-medium">{formatDuration(listicleComparison.standard.avgTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Scroll Depth</span>
                    <span className="font-medium">{listicleComparison.standard.avgScroll}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                {listicleComparison.viewsWinner === 'listicles' ? (
                  <>📊 <strong>Listicles outperform</strong> standard articles by <strong>{Math.round((listicleComparison.listicles.avgViews / Math.max(listicleComparison.standard.avgViews, 1) - 1) * 100)}%</strong> in average views</>
                ) : (
                  <>📝 <strong>Full articles outperform</strong> listicles by <strong>{Math.round((listicleComparison.standard.avgViews / Math.max(listicleComparison.listicles.avgViews, 1) - 1) * 100)}%</strong> in average views</>
                )}
                {listicleComparison.engagementWinner !== listicleComparison.viewsWinner && (
                  <span className="text-muted-foreground"> — but {listicleComparison.engagementWinner === 'listicles' ? 'listicles' : 'full articles'} have better engagement</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Article Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance by Article Type
            </CardTitle>
            <CardDescription>Views per article type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={articleTypeStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-3 text-sm shadow-lg">
                          <p className="font-medium">{data.type}</p>
                          <p>Total: {data.views.toLocaleString()} views</p>
                          <p>Articles: {data.count}</p>
                          <p>Avg: {data.avgViews} views/article</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Article Type Distribution</CardTitle>
            <CardDescription>Content mix by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={articleTypeStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  dataKey="count"
                >
                  {articleTypeStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Article Type Performance Details</CardTitle>
          <CardDescription>Comprehensive metrics by content type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Type</th>
                  <th className="text-right py-3">Articles</th>
                  <th className="text-right py-3">Total Views</th>
                  <th className="text-right py-3">Avg Views</th>
                  <th className="text-right py-3">Avg Time</th>
                  <th className="text-right py-3">Scroll %</th>
                  <th className="text-right py-3">Visitors</th>
                </tr>
              </thead>
              <tbody>
                {articleTypeStats.map((type) => (
                  <tr key={type.rawType} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 font-medium flex items-center gap-2">
                      {getTypeIcon(type.rawType)}
                      {type.type}
                    </td>
                    <td className="text-right py-3">{type.count}</td>
                    <td className="text-right py-3">{type.views.toLocaleString()}</td>
                    <td className="text-right py-3">
                      <Badge variant={type.avgViews > 10 ? "default" : "secondary"}>
                        {type.avgViews}
                      </Badge>
                    </td>
                    <td className="text-right py-3 text-muted-foreground">{formatDuration(type.avgTime)}</td>
                    <td className="text-right py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={type.avgScroll} className="w-12 h-2" />
                        <span className="w-10">{type.avgScroll}%</span>
                      </div>
                    </td>
                    <td className="text-right py-3 text-muted-foreground">{type.uniqueVisitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
