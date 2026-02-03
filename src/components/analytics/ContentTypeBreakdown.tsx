import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Layers, Search, User, Tag, Mail, Calendar, BookOpen, HelpCircle } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];

interface PageStats {
  views: number;
  uniqueSessions: Set<string>;
  totalTime: number;
}

interface ContentTypeBreakdownProps {
  pageStats: Record<string, PageStats>;
  staticPages: { path: string; name: string }[];
  categoryPages: { path: string; name: string }[];
  isLoading: boolean;
}

const CONTENT_TYPES = {
  'Homepage': { icon: Layers, pattern: /^\/$/ },
  'Articles': { icon: BookOpen, pattern: /^\/[a-z-]+\/[a-z0-9-]+$/ },
  'Categories': { icon: Layers, pattern: null }, // Custom logic
  'Search': { icon: Search, pattern: /^\/search/ },
  'Authors': { icon: User, pattern: /^\/author\// },
  'Tags': { icon: Tag, pattern: /^\/tag\// },
  'Newsletter': { icon: Mail, pattern: /^\/newsletter/ },
  'Events': { icon: Calendar, pattern: /^\/events/ },
  'Guides': { icon: BookOpen, pattern: /^\/guides/ },
  'Tools/Prompts': { icon: Layers, pattern: /^\/(tools|prompts)/ },
  'Static Pages': { icon: Layers, pattern: null }, // Custom logic
  'Auth': { icon: User, pattern: /^\/auth/ },
  'Profile': { icon: User, pattern: /^\/profile/ },
  'Saved': { icon: BookOpen, pattern: /^\/saved/ },
  'Other': { icon: HelpCircle, pattern: null },
} as const;

export function ContentTypeBreakdown({ 
  pageStats, 
  staticPages, 
  categoryPages, 
  isLoading 
}: ContentTypeBreakdownProps) {
  // Enhanced content type breakdown
  const contentTypeBreakdown = useMemo(() => {
    const types: Record<string, { views: number; paths: string[] }> = {};
    
    Object.keys(CONTENT_TYPES).forEach(type => {
      types[type] = { views: 0, paths: [] };
    });

    const staticPaths = new Set(staticPages.map(s => s.path));
    const categoryPaths = new Set(categoryPages.map(c => c.path));

    Object.entries(pageStats).forEach(([pagePath, stats]) => {
      if (pagePath.startsWith('/admin') || pagePath.startsWith('/editor')) return;

      let matched = false;

      // Check specific patterns first
      if (pagePath === '/') {
        types['Homepage'].views += stats.views;
        types['Homepage'].paths.push(pagePath);
        matched = true;
      } else if (categoryPaths.has(pagePath)) {
        types['Categories'].views += stats.views;
        types['Categories'].paths.push(pagePath);
        matched = true;
      } else if (staticPaths.has(pagePath)) {
        types['Static Pages'].views += stats.views;
        types['Static Pages'].paths.push(pagePath);
        matched = true;
      } else {
        // Check regex patterns
        for (const [typeName, typeConfig] of Object.entries(CONTENT_TYPES)) {
          if (typeConfig.pattern && typeConfig.pattern.test(pagePath)) {
            // Special check: Articles pattern should exclude admin/author paths
            if (typeName === 'Articles') {
              if (pagePath.startsWith('/author') || pagePath.startsWith('/admin') || 
                  pagePath.startsWith('/search') || pagePath.startsWith('/tag')) {
                continue;
              }
            }
            types[typeName].views += stats.views;
            types[typeName].paths.push(pagePath);
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        types['Other'].views += stats.views;
        types['Other'].paths.push(pagePath);
      }
    });

    return Object.entries(types)
      .filter(([, data]) => data.views > 0)
      .map(([name, data]) => ({ 
        name, 
        value: data.views, 
        paths: data.paths,
        icon: CONTENT_TYPES[name as keyof typeof CONTENT_TYPES]?.icon || HelpCircle 
      }))
      .sort((a, b) => b.value - a.value);
  }, [pageStats, staticPages, categoryPages]);

  // "Other" breakdown
  const otherBreakdown = useMemo(() => {
    const other = contentTypeBreakdown.find(t => t.name === 'Other');
    if (!other || other.paths.length === 0) return [];

    const grouped: Record<string, { count: number; views: number; samples: string[] }> = {};
    
    other.paths.forEach(path => {
      // Try to categorize by first segment
      const segments = path.split('/').filter(Boolean);
      let category = segments[0] || 'root';
      
      // Group similar paths
      if (path.includes('3-before-9')) category = 'Three Before Nine';
      else if (path.includes('policy') || path.includes('atlas')) category = 'Policy/Atlas';
      else if (path.includes('bulk') || path.includes('migration')) category = 'Admin Tools';
      else if (segments.length > 1 && !['news', 'business', 'life', 'learn', 'create', 'voices'].includes(segments[0])) {
        category = segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
      }

      if (!grouped[category]) {
        grouped[category] = { count: 0, views: 0, samples: [] };
      }
      grouped[category].count++;
      grouped[category].views += pageStats[path]?.views || 0;
      if (grouped[category].samples.length < 3) {
        grouped[category].samples.push(path);
      }
    });

    return Object.entries(grouped)
      .map(([category, data]) => ({
        category,
        count: data.count,
        views: data.views,
        samples: data.samples,
      }))
      .sort((a, b) => b.views - a.views);
  }, [contentTypeBreakdown, pageStats]);

  if (isLoading) {
    return <div className="h-[300px] bg-muted/50 animate-pulse rounded-lg" />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Main Content Type Pie */}
      <Card>
        <CardHeader>
          <CardTitle>Content Type Breakdown</CardTitle>
          <CardDescription>Where are your pageviews going?</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={contentTypeBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => percent > 0.03 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                outerRadius={100}
                dataKey="value"
              >
                {contentTypeBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg p-3 text-sm shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <p>{data.value.toLocaleString()} views</p>
                        <p className="text-muted-foreground">{data.paths.length} unique paths</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {contentTypeBreakdown.slice(0, 8).map((type, i) => {
              const Icon = type.icon;
              return (
                <Badge key={type.name} variant="outline" className="gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <Icon className="h-3 w-3" />
                  {type.name}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* "Other" Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            "Other" Category Breakdown
          </CardTitle>
          <CardDescription>What's in the miscellaneous traffic</CardDescription>
        </CardHeader>
        <CardContent>
          {otherBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No "Other" traffic in this period
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {otherBreakdown.map((item, i) => (
                  <div key={item.category} className="p-3 rounded-lg bg-muted/50 hover:bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{item.category}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{item.count} pages</Badge>
                        <Badge variant="outline">{item.views} views</Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.samples.slice(0, 2).map(s => (
                        <span key={s} className="block truncate">{s}</span>
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
  );
}
