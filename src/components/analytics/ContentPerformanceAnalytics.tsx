import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Image, AlignLeft, TrendingUp, TrendingDown, Scale, Target, Ruler } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, LineChart, Line
} from "recharts";

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface Article {
  id: string;
  title: string;
  slug: string;
  featured_image_url: string | null;
  reading_time_minutes: number | null;
  primary_category_id: string | null;
  published_at: string | null;
  content: any;
  article_type: string | null;
}

interface PageStats {
  views: number;
  uniqueSessions: Set<string>;
  totalTime: number;
  totalScroll: number;
  scrollCount: number;
}

interface ContentPerformanceAnalyticsProps {
  articlesData: Article[];
  categoriesData: { id: string; slug: string; name: string }[];
  pageStats: Record<string, PageStats>;
  isLoading: boolean;
}

// Rough word count from JSON content
const getWordCount = (content: any): number => {
  if (!content) return 0;
  const text = JSON.stringify(content);
  // Remove HTML tags and count words
  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/[{}[\]"]/g, ' ');
  const words = cleanText.split(/\s+/).filter(word => word.length > 2);
  return words.length;
};

export function ContentPerformanceAnalytics({ 
  articlesData, 
  categoriesData, 
  pageStats, 
  isLoading 
}: ContentPerformanceAnalyticsProps) {
  const categoryLookup = useMemo(() => 
    Object.fromEntries(categoriesData.map(c => [c.id, c.slug])),
    [categoriesData]
  );

  // Helper to get article path based on type
  const getArticlePath = (article: Article) => {
    const categorySlug = categoryLookup[article.primary_category_id || ''] || 'news';
    if (article.article_type === 'policy_article') {
      return `/ai-policy-atlas/${categorySlug}/${article.slug}`;
    }
    return `/${categorySlug}/${article.slug}`;
  };

  // Image vs No-Image performance
  const imageImpact = useMemo(() => {
    const withImage = { count: 0, views: 0, totalTime: 0, totalScroll: 0, scrollCount: 0 };
    const withoutImage = { count: 0, views: 0, totalTime: 0, totalScroll: 0, scrollCount: 0 };

    articlesData.forEach(article => {
      const articlePath = getArticlePath(article);
      const stats = pageStats[articlePath];
      
      const target = article.featured_image_url ? withImage : withoutImage;
      target.count++;
      if (stats) {
        target.views += stats.views;
        target.totalTime += stats.totalTime;
        target.totalScroll += stats.totalScroll;
        target.scrollCount += stats.scrollCount;
      }
    });

    return {
      withImage: {
        count: withImage.count,
        avgViews: withImage.count > 0 ? Math.round(withImage.views / withImage.count) : 0,
        avgTime: withImage.views > 0 ? Math.round(withImage.totalTime / withImage.views) : 0,
        avgScroll: withImage.scrollCount > 0 ? Math.round(withImage.totalScroll / withImage.scrollCount) : 0,
      },
      withoutImage: {
        count: withoutImage.count,
        avgViews: withoutImage.count > 0 ? Math.round(withoutImage.views / withoutImage.count) : 0,
        avgTime: withoutImage.views > 0 ? Math.round(withoutImage.totalTime / withoutImage.views) : 0,
        avgScroll: withoutImage.scrollCount > 0 ? Math.round(withoutImage.totalScroll / withoutImage.scrollCount) : 0,
      },
      winner: withImage.count > 0 && withoutImage.count > 0 
        ? (withImage.views / withImage.count > withoutImage.views / withoutImage.count ? 'with' : 'without')
        : 'unknown',
    };
  }, [articlesData, categoryLookup, pageStats]);

  // Article length vs engagement correlation
  const lengthPerformance = useMemo(() => {
    const buckets: Record<string, { count: number; views: number; totalTime: number; totalScroll: number; scrollCount: number }> = {
      'Short (<3 min)': { count: 0, views: 0, totalTime: 0, totalScroll: 0, scrollCount: 0 },
      'Medium (3-7 min)': { count: 0, views: 0, totalTime: 0, totalScroll: 0, scrollCount: 0 },
      'Long (7-15 min)': { count: 0, views: 0, totalTime: 0, totalScroll: 0, scrollCount: 0 },
      'Very Long (15+ min)': { count: 0, views: 0, totalTime: 0, totalScroll: 0, scrollCount: 0 },
    };

    articlesData.forEach(article => {
      const readTime = article.reading_time_minutes || 3;
      let bucket: string;
      if (readTime < 3) bucket = 'Short (<3 min)';
      else if (readTime <= 7) bucket = 'Medium (3-7 min)';
      else if (readTime <= 15) bucket = 'Long (7-15 min)';
      else bucket = 'Very Long (15+ min)';

      const articlePath = getArticlePath(article);
      const stats = pageStats[articlePath];

      buckets[bucket].count++;
      if (stats) {
        buckets[bucket].views += stats.views;
        buckets[bucket].totalTime += stats.totalTime;
        buckets[bucket].totalScroll += stats.totalScroll;
        buckets[bucket].scrollCount += stats.scrollCount;
      }
    });

    return Object.entries(buckets).map(([length, data]) => ({
      length,
      count: data.count,
      avgViews: data.count > 0 ? Math.round(data.views / data.count) : 0,
      avgTime: data.views > 0 ? Math.round(data.totalTime / data.views) : 0,
      avgScroll: data.scrollCount > 0 ? Math.round(data.totalScroll / data.scrollCount) : 0,
    }));
  }, [articlesData, categoryLookup, pageStats]);

  // Scatter plot data for length vs views correlation
  const scatterData = useMemo(() => {
    return articlesData
      .map(article => {
        const articlePath = getArticlePath(article);
        const stats = pageStats[articlePath];
        return {
          readTime: article.reading_time_minutes || 3,
          views: stats?.views || 0,
          title: article.title,
        };
      })
      .filter(a => a.views > 0)
      .slice(0, 100); // Limit for performance
  }, [articlesData, categoryLookup, pageStats, getArticlePath]);

  // Related articles effectiveness (inferred from sessions that visit multiple articles)
  const relatedArticlesEffectiveness = useMemo(() => {
    // Group pageviews by session
    const sessionArticles: Record<string, string[]> = {};
    
    Object.entries(pageStats).forEach(([path, stats]) => {
      if (path.match(/^\/[a-z-]+\/[a-z0-9-]+$/) && !path.startsWith('/admin')) {
        stats.uniqueSessions.forEach(sessionId => {
          if (!sessionArticles[sessionId]) sessionArticles[sessionId] = [];
          sessionArticles[sessionId].push(path);
        });
      }
    });

    const multiArticleSessions = Object.values(sessionArticles).filter(articles => articles.length >= 2);
    const totalSessions = Object.keys(sessionArticles).length;

    return {
      totalSessions,
      multiArticleSessions: multiArticleSessions.length,
      rate: totalSessions > 0 ? Math.round((multiArticleSessions.length / totalSessions) * 100) : 0,
      avgArticlesInMulti: multiArticleSessions.length > 0 
        ? (multiArticleSessions.reduce((sum, a) => sum + a.length, 0) / multiArticleSessions.length).toFixed(1)
        : '0',
    };
  }, [pageStats]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  if (isLoading) {
    return <div className="h-[400px] bg-muted/50 animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Image Impact */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Featured Image Impact
          </CardTitle>
          <CardDescription>Do articles with images perform better?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* With Image */}
            <div className={`p-4 rounded-lg ${imageImpact.winner === 'with' ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted/50'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Image className="h-5 w-5 text-green-500" />
                <h4 className="font-semibold">With Featured Image</h4>
                {imageImpact.winner === 'with' && <Badge className="ml-auto bg-green-500">Winner</Badge>}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Articles</span>
                  <span className="font-medium">{imageImpact.withImage.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Views</span>
                  <span className="font-medium">{imageImpact.withImage.avgViews}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Time</span>
                  <span className="font-medium">{formatDuration(imageImpact.withImage.avgTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Scroll</span>
                  <span className="font-medium">{imageImpact.withImage.avgScroll}%</span>
                </div>
              </div>
            </div>

            {/* Without Image */}
            <div className={`p-4 rounded-lg ${imageImpact.winner === 'without' ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted/50'}`}>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5" />
                <h4 className="font-semibold">No Featured Image</h4>
                {imageImpact.winner === 'without' && <Badge className="ml-auto bg-green-500">Winner</Badge>}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Articles</span>
                  <span className="font-medium">{imageImpact.withoutImage.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Views</span>
                  <span className="font-medium">{imageImpact.withoutImage.avgViews}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Time</span>
                  <span className="font-medium">{formatDuration(imageImpact.withoutImage.avgTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Scroll</span>
                  <span className="font-medium">{imageImpact.withoutImage.avgScroll}%</span>
                </div>
              </div>
            </div>
          </div>

          {imageImpact.winner !== 'unknown' && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                {imageImpact.winner === 'with' ? (
                  <>🖼️ Articles <strong>with images</strong> get {Math.round((imageImpact.withImage.avgViews / Math.max(imageImpact.withoutImage.avgViews, 1) - 1) * 100)}% more views on average</>
                ) : (
                  <>📝 Interestingly, articles <strong>without images</strong> perform slightly better in this period</>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Article Length Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Optimal Article Length
            </CardTitle>
            <CardDescription>Performance by reading time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={lengthPerformance}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="length" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-3 text-sm shadow-lg">
                          <p className="font-medium">{data.length}</p>
                          <p>{data.count} articles</p>
                          <p>Avg views: {data.avgViews}</p>
                          <p>Avg scroll: {data.avgScroll}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgViews" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-4 space-y-2">
              {lengthPerformance.map((bucket, i) => (
                <div key={bucket.length} className="flex items-center gap-2 text-sm">
                  <span className="w-32 truncate">{bucket.length}</span>
                  <Progress value={bucket.avgViews / Math.max(...lengthPerformance.map(b => b.avgViews)) * 100} className="flex-1 h-2" />
                  <span className="w-12 text-right text-muted-foreground">{bucket.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Length vs Views Correlation
            </CardTitle>
            <CardDescription>Each dot is an article</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number" 
                  dataKey="readTime" 
                  name="Read Time" 
                  unit=" min"
                  label={{ value: 'Reading Time (min)', position: 'bottom', offset: 0 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="views" 
                  name="Views"
                  label={{ value: 'Views', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-2 text-xs shadow-lg max-w-[200px]">
                          <p className="font-medium truncate">{data.title}</p>
                          <p>{data.readTime} min • {data.views} views</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={scatterData} fill="hsl(var(--primary))" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Related Articles Effectiveness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Content Discovery Effectiveness
          </CardTitle>
          <CardDescription>How well do related articles drive multi-article sessions?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold">{relatedArticlesEffectiveness.totalSessions}</p>
              <p className="text-sm text-muted-foreground">Total Sessions</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 text-center">
              <p className="text-3xl font-bold">{relatedArticlesEffectiveness.multiArticleSessions}</p>
              <p className="text-sm text-muted-foreground">Multi-Article</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 text-center">
              <p className="text-3xl font-bold text-green-600">{relatedArticlesEffectiveness.rate}%</p>
              <p className="text-sm text-muted-foreground">Discovery Rate</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-3xl font-bold">{relatedArticlesEffectiveness.avgArticlesInMulti}</p>
              <p className="text-sm text-muted-foreground">Avg Articles/Session</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">
              {relatedArticlesEffectiveness.rate >= 30 ? (
                <>✅ Good discovery rate! {relatedArticlesEffectiveness.rate}% of sessions view 2+ articles</>
              ) : relatedArticlesEffectiveness.rate >= 15 ? (
                <>⚠️ Moderate discovery rate. Consider improving related content suggestions</>
              ) : (
                <>🔴 Low discovery rate ({relatedArticlesEffectiveness.rate}%). Related articles may need optimization</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
