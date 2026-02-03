import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, AlertTriangle, FileQuestion, Link2, BookOpen, TrendingUp, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface AnalyticsEvent {
  event_name: string;
  event_data: any;
  page_path: string | null;
  created_at: string;
}

interface Article {
  id: string;
  slug: string;
  title: string;
  series_id: string | null;
  series_part: number | null;
  primary_category_id: string | null;
}

interface PageStats {
  views: number;
  uniqueSessions: Set<string>;
}

interface DiscoveryAnalyticsProps {
  articlesData: Article[];
  categoriesData: { id: string; slug: string }[];
  pageStats: Record<string, PageStats>;
  startDate: Date;
  endDate: Date;
  isLoading: boolean;
}

export function DiscoveryAnalytics({ 
  articlesData, 
  categoriesData, 
  pageStats, 
  startDate,
  endDate,
  isLoading: parentLoading 
}: DiscoveryAnalyticsProps) {
  // Fetch search events
  const { data: searchEvents, isLoading: searchLoading } = useQuery({
    queryKey: ["discovery-search-events", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_name, event_data, page_path, created_at")
        .eq("event_name", "search")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .limit(500);
      
      if (error) throw error;
      return (data || []) as AnalyticsEvent[];
    },
  });

  // Fetch 404 events
  const { data: notFoundEvents, isLoading: notFoundLoading } = useQuery({
    queryKey: ["discovery-404-events", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_name, event_data, page_path, created_at")
        .eq("event_name", "404_error")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .limit(500);
      
      if (error) throw error;
      return (data || []) as AnalyticsEvent[];
    },
  });

  const isLoading = parentLoading || searchLoading || notFoundLoading;

  // Search term analysis
  const searchTermAnalysis = useMemo(() => {
    if (!searchEvents) return { terms: [], clusters: [] };

    const termCounts: Record<string, number> = {};
    searchEvents.forEach(event => {
      const term = (event.event_data as any)?.search_term?.toLowerCase()?.trim();
      if (term && term.length > 1) {
        termCounts[term] = (termCounts[term] || 0) + 1;
      }
    });

    const terms = Object.entries(termCounts)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count);

    // Cluster similar terms
    const clusters: Record<string, string[]> = {};
    terms.forEach(({ term }) => {
      const words = term.split(/\s+/);
      words.forEach(word => {
        if (word.length >= 4) {
          if (!clusters[word]) clusters[word] = [];
          if (!clusters[word].includes(term)) clusters[word].push(term);
        }
      });
    });

    const clusterData = Object.entries(clusters)
      .filter(([, terms]) => terms.length >= 2)
      .map(([keyword, relatedTerms]) => ({
        keyword,
        count: relatedTerms.length,
        terms: relatedTerms.slice(0, 5),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { terms: terms.slice(0, 20), clusters: clusterData };
  }, [searchEvents]);

  // 404 analysis
  const notFoundAnalysis = useMemo(() => {
    if (!notFoundEvents) return { paths: [], patterns: [] };

    const pathCounts: Record<string, number> = {};
    notFoundEvents.forEach(event => {
      const path = event.page_path || (event.event_data as any)?.page_path;
      if (path) {
        pathCounts[path] = (pathCounts[path] || 0) + 1;
      }
    });

    const paths = Object.entries(pathCounts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Identify patterns in 404s
    const patterns: Record<string, number> = {};
    paths.forEach(({ path, count }) => {
      if (path.includes('old-')) patterns['Old URLs'] = (patterns['Old URLs'] || 0) + count;
      else if (path.includes('.html')) patterns['Legacy HTML'] = (patterns['Legacy HTML'] || 0) + count;
      else if (path.includes('/author/')) patterns['Author Pages'] = (patterns['Author Pages'] || 0) + count;
      else if (path.includes('/tag/')) patterns['Tag Pages'] = (patterns['Tag Pages'] || 0) + count;
      else if (path.match(/\/\d{4}\//)) patterns['Date URLs'] = (patterns['Date URLs'] || 0) + count;
      else patterns['Other'] = (patterns['Other'] || 0) + count;
    });

    return { 
      paths, 
      patterns: Object.entries(patterns).map(([pattern, count]) => ({ pattern, count })),
    };
  }, [notFoundEvents]);

  // Series completion rate
  const seriesAnalysis = useMemo(() => {
    const categoryLookup = Object.fromEntries(categoriesData.map(c => [c.id, c.slug]));
    
    // Group articles by series
    const seriesArticles: Record<string, Article[]> = {};
    articlesData.forEach(article => {
      if (article.series_id) {
        if (!seriesArticles[article.series_id]) seriesArticles[article.series_id] = [];
        seriesArticles[article.series_id].push(article);
      }
    });

    // For each series, check view progression
    const seriesStats = Object.entries(seriesArticles)
      .filter(([, articles]) => articles.length >= 2)
      .map(([seriesId, articles]) => {
        articles.sort((a, b) => (a.series_part || 0) - (b.series_part || 0));
        
        const views = articles.map(article => {
          const categorySlug = categoryLookup[article.primary_category_id || ''] || 'news';
          const path = `/${categorySlug}/${article.slug}`;
          return pageStats[path]?.views || 0;
        });

        const totalViews = views.reduce((a, b) => a + b, 0);
        const firstPartViews = views[0] || 0;
        const completionRate = firstPartViews > 0 
          ? Math.round((views[views.length - 1] / firstPartViews) * 100) 
          : 0;

        return {
          seriesId,
          parts: articles.length,
          firstTitle: articles[0]?.title || 'Unknown',
          firstPartViews,
          totalViews,
          completionRate,
          viewProgression: views,
        };
      })
      .filter(s => s.totalViews > 0)
      .sort((a, b) => b.totalViews - a.totalViews);

    const avgCompletion = seriesStats.length > 0
      ? Math.round(seriesStats.reduce((sum, s) => sum + s.completionRate, 0) / seriesStats.length)
      : 0;

    return { series: seriesStats.slice(0, 10), avgCompletion };
  }, [articlesData, categoriesData, pageStats]);

  // Top entry points for article views
  const entryPointAnalysis = useMemo(() => {
    const articlePaths = Object.entries(pageStats)
      .filter(([path]) => path.match(/^\/[a-z-]+\/[a-z0-9-]+$/) && !path.startsWith('/admin'))
      .map(([path, stats]) => ({ path, views: stats.views }))
      .sort((a, b) => b.views - a.views);

    const totalViews = articlePaths.reduce((sum, p) => sum + p.views, 0);
    const top10Views = articlePaths.slice(0, 10).reduce((sum, p) => sum + p.views, 0);

    return {
      concentration: totalViews > 0 ? Math.round((top10Views / totalViews) * 100) : 0,
      topPaths: articlePaths.slice(0, 10),
    };
  }, [pageStats]);

  if (isLoading) {
    return <div className="h-[400px] bg-muted/50 animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Search Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Top Search Terms
            </CardTitle>
            <CardDescription>What users are searching for on-site</CardDescription>
          </CardHeader>
          <CardContent>
            {searchTermAnalysis.terms.length === 0 ? (
              <p className="text-muted-foreground text-sm">No search data in this period</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {searchTermAnalysis.terms.map((item, i) => (
                    <div key={item.term} className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-6">{i + 1}.</span>
                        <span className="text-sm font-medium">"{item.term}"</span>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Search Term Clusters
            </CardTitle>
            <CardDescription>Related search patterns (content gap opportunities)</CardDescription>
          </CardHeader>
          <CardContent>
            {searchTermAnalysis.clusters.length === 0 ? (
              <p className="text-muted-foreground text-sm">Not enough search data to identify clusters</p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {searchTermAnalysis.clusters.map(cluster => (
                    <div key={cluster.keyword} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">"{cluster.keyword}"</span>
                        <Badge variant="default">{cluster.count} variations</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cluster.terms.map(term => (
                          <Badge key={term} variant="outline" className="text-xs">{term}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 404 Analysis */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            404 Patterns
          </CardTitle>
          <CardDescription>Missing content users are looking for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Top Missing Pages</h4>
              {notFoundAnalysis.paths.length === 0 ? (
                <p className="text-muted-foreground text-sm">No 404 errors recorded 🎉</p>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {notFoundAnalysis.paths.map((item, i) => (
                      <div key={item.path} className="flex items-center justify-between p-2 rounded bg-red-500/5">
                        <span className="text-sm truncate max-w-[250px]">{item.path}</span>
                        <Badge variant="destructive">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium mb-3">404 Categories</h4>
              {notFoundAnalysis.patterns.length === 0 ? (
                <p className="text-muted-foreground text-sm">No patterns detected</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={notFoundAnalysis.patterns}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      label={({ pattern, percent }) => `${pattern} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {notFoundAnalysis.patterns.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Series Completion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Series Completion Rates
          </CardTitle>
          <CardDescription>
            How many readers finish multi-part content? 
            {seriesAnalysis.avgCompletion > 0 && (
              <Badge variant="secondary" className="ml-2">Avg: {seriesAnalysis.avgCompletion}%</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {seriesAnalysis.series.length === 0 ? (
            <p className="text-muted-foreground text-sm">No multi-part series with views in this period</p>
          ) : (
            <div className="space-y-4">
              {seriesAnalysis.series.map(series => (
                <div key={series.seriesId} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium truncate max-w-[300px]">{series.firstTitle}</span>
                    <Badge variant={series.completionRate >= 50 ? "default" : "secondary"}>
                      {series.completionRate}% completion
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span>{series.parts} parts</span>
                    <span>•</span>
                    <span>{series.totalViews} total views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {series.viewProgression.map((views, i) => (
                      <div key={i} className="flex-1">
                        <div 
                          className="bg-primary rounded-sm transition-all"
                          style={{ 
                            height: `${Math.max(4, (views / Math.max(...series.viewProgression)) * 40)}px` 
                          }}
                          title={`Part ${i + 1}: ${views} views`}
                        />
                        <span className="text-xs text-muted-foreground">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traffic Concentration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Traffic Concentration
          </CardTitle>
          <CardDescription>Are a few articles getting most of the views?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{entryPointAnalysis.concentration}%</p>
              <p className="text-sm text-muted-foreground">of views go to top 10 articles</p>
            </div>
            <div className="flex-1 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm">
                {entryPointAnalysis.concentration >= 50 ? (
                  <>⚠️ High concentration. Consider promoting more content to diversify traffic.</>
                ) : entryPointAnalysis.concentration >= 30 ? (
                  <>📊 Moderate concentration. Good mix of evergreen and new content.</>
                ) : (
                  <>✅ Well-distributed traffic across your content library.</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
