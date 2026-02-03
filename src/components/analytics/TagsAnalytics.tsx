import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tags, Hash, TrendingUp, Flame, Target } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Treemap
} from "recharts";

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

interface Article {
  id: string;
  title: string;
  slug: string;
  topic_tags: string[] | null;
  ai_tags: string[] | null;
  primary_category_id: string | null;
  published_at: string | null;
}

interface PageStats {
  views: number;
  uniqueSessions: Set<string>;
  totalTime: number;
  totalScroll: number;
  scrollCount: number;
  exits: number;
}

interface TagsAnalyticsProps {
  articlesData: Article[];
  categoriesData: { id: string; slug: string; name: string }[];
  pageStats: Record<string, PageStats>;
  isLoading: boolean;
}

// Custom Treemap content
const CustomTreemapContent = ({ x, y, width, height, name, value, views }: any) => {
  if (width < 40 || height < 30) return null;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={COLORS[Math.abs(name?.charCodeAt(0) || 0) % COLORS.length]}
        fillOpacity={0.9}
        rx={4}
        stroke="hsl(var(--background))"
        strokeWidth={2}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 6}
        textAnchor="middle"
        fill="white"
        fontSize={Math.min(14, width / 6)}
        fontWeight="bold"
      >
        {name?.slice(0, 12) || ''}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 10}
        textAnchor="middle"
        fill="white"
        fontSize={10}
        opacity={0.8}
      >
        {views} views
      </text>
    </g>
  );
};

export function TagsAnalytics({ 
  articlesData, 
  categoriesData, 
  pageStats, 
  isLoading 
}: TagsAnalyticsProps) {
  const categoryLookup = useMemo(() => 
    Object.fromEntries(categoriesData.map(c => [c.id, c.slug])),
    [categoriesData]
  );

  // Tag performance aggregation
  const tagStats = useMemo(() => {
    const tags: Record<string, { 
      count: number; 
      views: number; 
      articles: string[];
      totalTime: number;
      sessions: Set<string>;
    }> = {};

    articlesData.forEach(article => {
      const allTags = [...(article.topic_tags || []), ...(article.ai_tags || [])];
      const categorySlug = categoryLookup[article.primary_category_id || ''] || 'news';
      const articlePath = `/${categorySlug}/${article.slug}`;
      const stats = pageStats[articlePath];

      allTags.forEach(tag => {
        const normalizedTag = tag.toLowerCase().trim();
        if (!normalizedTag) return;

        if (!tags[normalizedTag]) {
          tags[normalizedTag] = { count: 0, views: 0, articles: [], totalTime: 0, sessions: new Set() };
        }

        tags[normalizedTag].count++;
        tags[normalizedTag].articles.push(article.title);
        if (stats) {
          tags[normalizedTag].views += stats.views;
          tags[normalizedTag].totalTime += stats.totalTime;
          stats.uniqueSessions.forEach(s => tags[normalizedTag].sessions.add(s));
        }
      });
    });

    return Object.entries(tags)
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        views: data.views,
        avgViews: data.count > 0 ? Math.round(data.views / data.count) : 0,
        avgTime: data.views > 0 ? Math.round(data.totalTime / data.views) : 0,
        articles: data.articles,
        uniqueVisitors: data.sessions.size,
      }))
      .filter(t => t.count >= 2) // Only tags with 2+ articles
      .sort((a, b) => b.views - a.views);
  }, [articlesData, categoryLookup, pageStats]);

  // Top performing tags
  const topTags = useMemo(() => tagStats.slice(0, 20), [tagStats]);

  // High-efficiency tags (high avg views per article)
  const efficientTags = useMemo(() => 
    [...tagStats]
      .filter(t => t.count >= 3) // At least 3 articles
      .sort((a, b) => b.avgViews - a.avgViews)
      .slice(0, 10),
    [tagStats]
  );

  // Underperforming tags (low avg views despite having articles)
  const underperformingTags = useMemo(() =>
    [...tagStats]
      .filter(t => t.count >= 3 && t.avgViews < 5)
      .sort((a, b) => a.avgViews - b.avgViews)
      .slice(0, 10),
    [tagStats]
  );

  // Treemap data
  const treemapData = useMemo(() => 
    topTags.slice(0, 15).map(t => ({
      name: t.tag,
      value: t.count,
      views: t.views,
    })),
    [topTags]
  );

  // Tag clusters (commonly co-occurring tags)
  const tagClusters = useMemo(() => {
    const coOccurrence: Record<string, Record<string, number>> = {};

    articlesData.forEach(article => {
      const allTags = [...(article.topic_tags || []), ...(article.ai_tags || [])]
        .map(t => t.toLowerCase().trim())
        .filter(Boolean);

      for (let i = 0; i < allTags.length; i++) {
        for (let j = i + 1; j < allTags.length; j++) {
          const pair = [allTags[i], allTags[j]].sort().join(' + ');
          if (!coOccurrence[pair]) coOccurrence[pair] = {};
          coOccurrence[pair] = { count: (coOccurrence[pair].count || 0) + 1 };
        }
      }
    });

    return Object.entries(coOccurrence)
      .map(([pair, data]: [string, any]) => ({ pair, count: data.count }))
      .filter(p => p.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [articlesData]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  if (isLoading) {
    return <div className="h-[300px] bg-muted/50 animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Tag Treemap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Topic Tag Landscape
          </CardTitle>
          <CardDescription>Size = article count, showing views</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <Treemap
              data={treemapData}
              dataKey="value"
              aspectRatio={4 / 3}
              stroke="hsl(var(--background))"
              content={<CustomTreemapContent />}
            />
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Efficient vs Underperforming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Flame className="h-5 w-5" />
              High-Performing Tags
            </CardTitle>
            <CardDescription>Tags with best avg views per article (3+ articles)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {efficientTags.map((tag, i) => (
                  <div key={tag.tag} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 hover:bg-green-500/10">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6">{i + 1}.</span>
                      <div>
                        <span className="font-medium">#{tag.tag}</span>
                        <p className="text-xs text-muted-foreground">{tag.count} articles</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="default" className="bg-green-500">{tag.avgViews} avg</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{tag.views} total</p>
                    </div>
                  </div>
                ))}
                {efficientTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags with 3+ articles yet</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <Target className="h-5 w-5" />
              Opportunity Tags
            </CardTitle>
            <CardDescription>Tags with room for improvement (3+ articles, &lt;5 avg views)</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {underperformingTags.map((tag, i) => (
                  <div key={tag.tag} className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/5 hover:bg-yellow-500/10">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6">{i + 1}.</span>
                      <div>
                        <span className="font-medium">#{tag.tag}</span>
                        <p className="text-xs text-muted-foreground">{tag.count} articles</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{tag.avgViews} avg</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{tag.views} total</p>
                    </div>
                  </div>
                ))}
                {underperformingTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">All tags performing well!</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Tag Co-occurrence & Top by Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Top Tags by Total Views
            </CardTitle>
            <CardDescription>Which topics drive the most traffic</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topTags.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="tag" width={100} tick={{ fontSize: 11 }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-3 text-sm shadow-lg">
                          <p className="font-medium">#{data.tag}</p>
                          <p>{data.views} views</p>
                          <p>{data.count} articles</p>
                          <p>Avg: {data.avgViews} views/article</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tag Clusters
            </CardTitle>
            <CardDescription>Tags that frequently appear together</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {tagClusters.map((cluster, i) => (
                  <div key={cluster.pair} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-6">{i + 1}.</span>
                      <span className="text-sm font-mono">{cluster.pair}</span>
                    </div>
                    <Badge variant="outline">{cluster.count} articles</Badge>
                  </div>
                ))}
                {tagClusters.length === 0 && (
                  <p className="text-sm text-muted-foreground">Not enough tag co-occurrence data yet</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Summary insight */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Tags className="h-5 w-5 mt-0.5 text-primary" />
            <div>
              <p className="text-sm">
                <strong>{tagStats.length}</strong> unique tags across your content. 
                {efficientTags[0] && (
                  <> Top performer: <strong>#{efficientTags[0].tag}</strong> averaging {efficientTags[0].avgViews} views/article.</>
                )}
                {underperformingTags.length > 0 && (
                  <> Consider refreshing content tagged with <strong>#{underperformingTags[0]?.tag}</strong>.</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
