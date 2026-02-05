import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Header from "@/components/Header";
import { ReferralFlows } from "@/components/analytics/ReferralFlows";
import { ArticleTypeAnalytics } from "@/components/analytics/ArticleTypeAnalytics";
import { TagsAnalytics } from "@/components/analytics/TagsAnalytics";
import { ContentTypeBreakdown } from "@/components/analytics/ContentTypeBreakdown";
import { TimeDeviceAnalytics } from "@/components/analytics/TimeDeviceAnalytics";
import { UserBehaviorAnalytics } from "@/components/analytics/UserBehaviorAnalytics";
import { ContentPerformanceAnalytics } from "@/components/analytics/ContentPerformanceAnalytics";
import { DiscoveryAnalytics } from "@/components/analytics/DiscoveryAnalytics";
import { NewsletterConversionAnalytics } from "@/components/analytics/NewsletterConversionAnalytics";
import { 
  TrendingUp, TrendingDown, Eye, EyeOff, Clock, FileText, 
  AlertTriangle, ArrowRight, Flame, Snowflake, BarChart3, RefreshCw,
  ChevronRight, ExternalLink, Target, Zap, Users, Activity,
  ArrowUpRight, ArrowDownRight, Minus, Ghost, Map, Link2, Shuffle, Layers, Tags, List, Globe,
  Copy, Check, Play
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, differenceInDays } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

// Content health status based on views and recency
const getContentHealth = (views: number, avgViews: number, daysSincePublish: number) => {
  const viewRatio = views / Math.max(avgViews, 1);
  
  if (views === 0) return { status: 'dead', color: 'bg-gray-500', label: 'Never Viewed', icon: Ghost };
  if (daysSincePublish < 7 && views > 0) return { status: 'new', color: 'bg-blue-500', label: 'New Content', icon: Zap };
  if (viewRatio > 2) return { status: 'hot', color: 'bg-red-500', label: 'Hot', icon: Flame };
  if (viewRatio > 1) return { status: 'performing', color: 'bg-green-500', label: 'Performing Well', icon: TrendingUp };
  if (viewRatio > 0.5) return { status: 'average', color: 'bg-yellow-500', label: 'Average', icon: Minus };
  return { status: 'cold', color: 'bg-cyan-500', label: 'Cold', icon: Snowflake };
};

const ContentInsights = () => {
  const [dateRange, setDateRange] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");
  const [hotDialogOpen, setHotDialogOpen] = useState(false);
  const [coldDialogOpen, setColdDialogOpen] = useState(false);
  const [neverViewedDialogOpen, setNeverViewedDialogOpen] = useState(false);
  const [engagementDialogOpen, setEngagementDialogOpen] = useState(false);
  const [selectedEngagementSegment, setSelectedEngagementSegment] = useState<{ name: string; articles: Array<{ path: string; count: number }> } | null>(null);
  
  // Recommendation dialog states
  const [promoteDeadDialogOpen, setPromoteDeadDialogOpen] = useState(false);
  const [refreshColdDialogOpen, setRefreshColdDialogOpen] = useState(false);
  const [doubleDownDialogOpen, setDoubleDownDialogOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
  const endDate = endOfDay(new Date());

  // Fetch all pageviews with aggregation - paginated to overcome 1000 row limit
  const { data: pageviewsData, isLoading: pageviewsLoading, refetch: refetchPageviews } = useQuery({
    queryKey: ["content-insights-pageviews", dateRange],
    queryFn: async () => {
      const allData: Array<{
        page_path: string | null;
        time_on_page_seconds: number | null;
        scroll_depth_percent: number | null;
        session_id: string;
        viewed_at: string;
        is_exit: boolean | null;
      }> = [];
      
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("analytics_pageviews")
          .select("page_path, time_on_page_seconds, scroll_depth_percent, session_id, viewed_at, is_exit")
          .gte("viewed_at", startDate.toISOString())
          .lte("viewed_at", endDate.toISOString())
          .order("viewed_at", { ascending: false })
          .range(offset, offset + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
        
        // Safety limit to prevent infinite loops
        if (offset > 50000) break;
      }
      
      return allData;
    },
  });

  // Fetch all published articles to identify never-viewed ones
  const { data: articlesData, isLoading: articlesLoading, refetch: refetchArticles } = useQuery({
    queryKey: ["content-insights-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, view_count, primary_category_id, article_type, topic_tags, ai_tags, featured_image_url, reading_time_minutes, content")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch sessions data for referral analysis
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ["content-insights-sessions", dateRange],
    queryFn: async () => {
      const allData: Array<{
        session_id: string;
        referrer: string | null;
        referrer_domain: string | null;
        landing_page: string | null;
        exit_page: string | null;
        device_type: string | null;
        browser: string | null;
        page_count: number | null;
        duration_seconds: number | null;
        user_id: string | null;
        is_bounce: boolean | null;
      }> = [];
      
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from("analytics_sessions")
          .select("session_id, referrer, referrer_domain, landing_page, exit_page, device_type, browser, page_count, duration_seconds, user_id, is_bounce")
          .gte("started_at", startDate.toISOString())
          .lte("started_at", endDate.toISOString())
          .range(offset, offset + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData.push(...data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
        
        if (offset > 20000) break;
      }
      
      return allData;
    },
  });

  // Fetch categories for mapping
  const { data: categoriesData } = useQuery({
    queryKey: ["content-insights-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Static pages to track
  const staticPages = [
    { path: '/privacy', name: 'Privacy Policy', expected: 'low' },
    { path: '/terms', name: 'Terms of Service', expected: 'low' },
    { path: '/cookie-policy', name: 'Cookie Policy', expected: 'low' },
    { path: '/about', name: 'About', expected: 'medium' },
    { path: '/contact', name: 'Contact', expected: 'medium' },
    { path: '/editorial-standards', name: 'Editorial Standards', expected: 'low' },
    { path: '/media-and-partners', name: 'Media & Partners', expected: 'low' },
    { path: '/contribute', name: 'Contribute', expected: 'low' },
    { path: '/newsletter', name: 'Newsletter', expected: 'medium' },
    { path: '/guides', name: 'Guides', expected: 'medium' },
    { path: '/tools', name: 'AI Tools', expected: 'medium' },
    { path: '/prompts', name: 'Prompts', expected: 'medium' },
    { path: '/events', name: 'Events', expected: 'low' },
    { path: '/ai-policy-atlas', name: 'AI Policy Atlas', expected: 'medium' },
  ];

  // Category pages to track - main site sections
  const categoryPages = [
    { path: '/', name: 'Home', slug: 'home' },
    { path: '/news', name: 'News', slug: 'news' },
    { path: '/business', name: 'Business', slug: 'business' },
    { path: '/life', name: 'Life', slug: 'life' },
    { path: '/learn', name: 'Learn', slug: 'learn' },
    { path: '/create', name: 'Create', slug: 'create' },
    { path: '/voices', name: 'Voices', slug: 'voices' },
    { path: '/guides', name: 'Guides', slug: 'guides' },
    { path: '/prompts', name: 'Prompts', slug: 'prompts' },
    { path: '/tools', name: 'Tools', slug: 'tools' },
    { path: '/events', name: 'Events', slug: 'events' },
    { path: '/ai-policy-atlas', name: 'Policy Atlas', slug: 'policy-atlas' },
  ];

  // Aggregate pageview data
  const pageStats = useMemo(() => {
    const stats: Record<string, { 
      views: number; 
      uniqueSessions: Set<string>; 
      totalTime: number; 
      totalScroll: number; 
      scrollCount: number;
      exits: number;
    }> = {};
    
    pageviewsData?.forEach(pv => {
      const path = pv.page_path?.split('?')[0] || '/';
      if (!stats[path]) {
        stats[path] = { 
          views: 0, 
          uniqueSessions: new Set(), 
          totalTime: 0, 
          totalScroll: 0,
          scrollCount: 0,
          exits: 0
        };
      }
      stats[path].views++;
      stats[path].uniqueSessions.add(pv.session_id);
      stats[path].totalTime += pv.time_on_page_seconds || 0;
      if (pv.scroll_depth_percent && pv.scroll_depth_percent > 0) {
        stats[path].totalScroll += pv.scroll_depth_percent;
        stats[path].scrollCount++;
      }
      if (pv.is_exit) stats[path].exits++;
    });
    
    return stats;
  }, [pageviewsData]);

  // Calculate average views for comparison
  const avgArticleViews = useMemo(() => {
    const articlePaths = Object.entries(pageStats)
      .filter(([path]) => path.match(/^\/[^/]+\/[^/]+$/) && !path.startsWith('/admin') && !path.startsWith('/editor'))
      .map(([, stats]) => stats.views);
    
    if (articlePaths.length === 0) return 1;
    return articlePaths.reduce((a, b) => a + b, 0) / articlePaths.length;
  }, [pageStats]);

  // Get static page performance
  const staticPageStats = useMemo(() => {
    return staticPages.map(page => {
      const stats = pageStats[page.path];
      return {
        ...page,
        views: stats?.views || 0,
        uniqueVisitors: stats?.uniqueSessions?.size || 0,
        avgTime: stats?.views ? Math.round(stats.totalTime / stats.views) : 0,
        avgScroll: stats?.scrollCount ? Math.round(stats.totalScroll / stats.scrollCount) : 0,
      };
    }).sort((a, b) => b.views - a.views);
  }, [pageStats]);

  // Get category page performance - aggregate article views by category
  const categoryPageStats = useMemo(() => {
    if (!articlesData) return [];
    
    // Create category lookup from DB categories
    const categoryLookup = Object.fromEntries(
      (categoriesData || []).map(c => [c.id, c.slug])
    );
    
    // Initialize all tracked categories
    const categoryViews: Record<string, { views: number; articles: number; totalTime: number; sessions: Set<string> }> = {};
    categoryPages.forEach(cat => {
      categoryViews[cat.slug] = { views: 0, articles: 0, totalTime: 0, sessions: new Set() };
    });
    
    // Aggregate article views by category
    articlesData.forEach(article => {
      const categorySlug = categoryLookup[article.primary_category_id || ''] || 'uncategorized';
      const articlePath = `/${categorySlug}/${article.slug}`;
      const stats = pageStats[articlePath];
      
      // Only count if this category is in our tracked list
      if (categoryViews[categorySlug]) {
        categoryViews[categorySlug].articles++;
        if (stats) {
          categoryViews[categorySlug].views += stats.views;
          categoryViews[categorySlug].totalTime += stats.totalTime;
          stats.uniqueSessions.forEach(s => categoryViews[categorySlug].sessions.add(s));
        }
      }
    });
    
    // Add landing page views for each category
    categoryPages.forEach(page => {
      const stats = pageStats[page.path];
      if (stats && categoryViews[page.slug]) {
        categoryViews[page.slug].views += stats.views;
        stats.uniqueSessions.forEach(s => categoryViews[page.slug].sessions.add(s));
      }
    });
    
    // Add views for sub-paths (e.g., /guides/*, /prompts/*, /tools/*, /events/*)
    const specialSections = ['guides', 'prompts', 'tools', 'events'];
    Object.entries(pageStats).forEach(([path, stats]) => {
      specialSections.forEach(section => {
        if (path.startsWith(`/${section}/`) && categoryViews[section]) {
          categoryViews[section].views += stats.views;
          categoryViews[section].articles++; // Count as content items
          stats.uniqueSessions.forEach(s => categoryViews[section].sessions.add(s));
        }
      });
      // Policy atlas sub-paths
      if ((path.startsWith('/ai-policy-atlas/') || path.startsWith('/policy/')) && categoryViews['policy-atlas']) {
        categoryViews['policy-atlas'].views += stats.views;
        categoryViews['policy-atlas'].articles++;
        stats.uniqueSessions.forEach(s => categoryViews['policy-atlas'].sessions.add(s));
      }
    });
    
    // Map to array with names from categoryPages
    const categoryNameMap = Object.fromEntries(categoryPages.map(c => [c.slug, c.name]));
    
    return Object.entries(categoryViews)
      .filter(([slug]) => slug !== 'home') // Exclude home to avoid skewing chart scale
      .map(([slug, data]) => ({
        name: categoryNameMap[slug] || slug.charAt(0).toUpperCase() + slug.slice(1),
        slug,
        views: data.views,
        articles: data.articles,
        avgViewsPerArticle: data.articles > 0 ? Math.round(data.views / data.articles) : 0,
        uniqueVisitors: data.sessions.size,
      }))
      .sort((a, b) => b.views - a.views);
  }, [pageStats, articlesData, categoriesData]);

  // Get top performing articles
  const topArticles = useMemo(() => {
    // Build article path to publish date and view_count lookup
    const categoryMapData = categoriesData?.map(c => [c.id, c.slug] as const) || [];
    const categoryLookup = Object.fromEntries(categoryMapData);
    const articlePathToData: Record<string, { daysSince: number; publishedAt: string | null; viewCount: number }> = {};
    articlesData?.forEach(article => {
      const categorySlug = categoryLookup[article.primary_category_id || ''] || 'news';
      const path = `/${categorySlug}/${article.slug}`;
      const daysSince = article.published_at 
        ? differenceInDays(new Date(), new Date(article.published_at))
        : 999;
      articlePathToData[path] = {
        daysSince,
        publishedAt: article.published_at || null,
        viewCount: article.view_count || 0,
      };
    });

    return Object.entries(pageStats)
      .filter(([path]) => {
        // Match article paths like /category/slug
        return path.match(/^\/[^/]+\/[^/]+$/) && 
               !path.startsWith('/admin') && 
               !path.startsWith('/editor') &&
               !path.startsWith('/author');
      })
      .map(([path, stats]) => {
        const articleData = articlePathToData[path];
        const daysSincePublish = articleData?.daysSince ?? 999;
        return {
          path,
          views: stats.views,
          uniqueVisitors: stats.uniqueSessions.size,
          avgTime: stats.views > 0 ? Math.round(stats.totalTime / stats.views) : 0,
          avgScroll: stats.scrollCount > 0 ? Math.round(stats.totalScroll / stats.scrollCount) : 0,
          exitRate: stats.views > 0 ? ((stats.exits / stats.views) * 100).toFixed(1) : '0',
          daysSincePublish,
          publishedAt: articleData?.publishedAt || null,
          totalReads: articleData?.viewCount || 0,
          health: getContentHealth(stats.views, avgArticleViews, daysSincePublish),
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 50);
  }, [pageStats, avgArticleViews, articlesData, categoriesData]);

  // Get cold/neglected articles - filter by recency (3-180 days old)
  const coldArticles = useMemo(() => {
    if (!articlesData) return [];
    
    const categoryMapData = categoriesData?.map(c => [c.id, c.slug] as const) || [];
    const categoryLookup = Object.fromEntries(categoryMapData);
    
    // Build a map of article paths to their publish dates
    const articlePathToDate: Record<string, number> = {};
    articlesData.forEach(article => {
      const categorySlug = categoryLookup[article.primary_category_id || ''] || 'news';
      const path = `/${categorySlug}/${article.slug}`;
      const daysSince = article.published_at 
        ? differenceInDays(new Date(), new Date(article.published_at))
        : 999;
      articlePathToDate[path] = daysSince;
    });
    
    return Object.entries(pageStats)
      .filter(([path]) => {
        return path.match(/^\/[^/]+\/[^/]+$/) && 
               !path.startsWith('/admin') && 
               !path.startsWith('/editor');
      })
      .map(([path, stats]) => {
        const daysSincePublish = articlePathToDate[path] ?? 999;
        return {
          path,
          views: stats.views,
          daysSincePublish,
          health: getContentHealth(stats.views, avgArticleViews, daysSincePublish),
        };
      })
      // Filter: must be 3-180 days old (not too new, not too old)
      .filter(a => a.health.status === 'cold' && a.daysSincePublish >= 3 && a.daysSincePublish <= 180)
      .sort((a, b) => a.views - b.views)
      .slice(0, 50);
  }, [pageStats, avgArticleViews, articlesData, categoriesData]);

  // Get never-viewed articles (from articles table) - filter by recency (3-180 days old)
  const neverViewedArticles = useMemo(() => {
    if (!articlesData) return [];
    
    const viewedPaths = new Set(Object.keys(pageStats));
    const categoryMapData = categoriesData?.map(c => [c.id, c.slug] as const) || [];
    const categoryLookup = Object.fromEntries(categoryMapData);
    return articlesData
      .filter(article => {
        const categorySlug = categoryLookup[article.primary_category_id || ''] || 'news';
        const articlePath = `/${categorySlug}/${article.slug}`;
        const daysSincePublish = article.published_at 
          ? differenceInDays(new Date(), new Date(article.published_at))
          : 999;
        // Filter: not viewed, no view count, AND 3-180 days old
        return !viewedPaths.has(articlePath) && 
               (article.view_count === 0 || article.view_count === null) &&
               daysSincePublish >= 3 && 
               daysSincePublish <= 180;
      })
      .map(article => {
        const categorySlug = categoryLookup[article.primary_category_id || ''] || 'news';
        const daysSincePublish = article.published_at 
          ? differenceInDays(new Date(), new Date(article.published_at))
          : 999;
        return {
          ...article,
          path: `/${categorySlug}/${article.slug}`,
          daysSincePublish,
        };
      })
      .slice(0, 50);
  }, [articlesData, pageStats, categoriesData]);

  // Content type breakdown
  const contentTypeBreakdown = useMemo(() => {
    const types: Record<string, number> = {
      'Homepage': 0,
      'Articles': 0,
      'Categories': 0,
      'Static Pages': 0,
      'Guides': 0,
      'Tools/Prompts': 0,
      'Other': 0,
    };

    Object.entries(pageStats).forEach(([pagePath, stats]) => {
      if (pagePath === '/') types['Homepage'] += stats.views;
      else if (pagePath.match(/^\/[^/]+\/[^/]+$/) && !pagePath.startsWith('/admin')) types['Articles'] += stats.views;
      else if (categoryPages.some(c => c.path === pagePath)) types['Categories'] += stats.views;
      else if (staticPages.some(s => s.path === pagePath)) types['Static Pages'] += stats.views;
      else if (pagePath.startsWith('/guides')) types['Guides'] += stats.views;
      else if (pagePath.startsWith('/tools') || pagePath.startsWith('/prompts')) types['Tools/Prompts'] += stats.views;
      else if (!pagePath.startsWith('/admin') && !pagePath.startsWith('/editor')) types['Other'] += stats.views;
    });

    return Object.entries(types)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [pageStats]);

  // Session data for cross-pollination analysis
  const sessionAnalysis = useMemo(() => {
    const sessionPages: Record<string, Array<{ path: string; time: string; scroll: number; timeOnPage: number }>> = {};
    
    pageviewsData?.forEach(pv => {
      const path = pv.page_path?.split('?')[0] || '/';
      if (path.startsWith('/admin') || path.startsWith('/editor')) return;
      
      if (!sessionPages[pv.session_id]) sessionPages[pv.session_id] = [];
      sessionPages[pv.session_id].push({ 
        path, 
        time: pv.viewed_at,
        scroll: pv.scroll_depth_percent || 0,
        timeOnPage: pv.time_on_page_seconds || 0
      });
    });

    // Sort each session's pages by time
    Object.values(sessionPages).forEach(pages => {
      pages.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    });

    return sessionPages;
  }, [pageviewsData]);

  // User flow patterns
  const userFlows = useMemo(() => {
    const flowCounts: Record<string, number> = {};
    
    Object.values(sessionAnalysis).forEach(pages => {
      if (pages.length >= 2) {
        for (let i = 0; i < Math.min(pages.length - 1, 3); i++) {
          const flow = `${pages[i].path} → ${pages[i + 1].path}`;
          flowCounts[flow] = (flowCounts[flow] || 0) + 1;
        }
      }
    });

    return Object.entries(flowCounts)
      .map(([flow, count]) => ({ flow, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [sessionAnalysis]);

  // Article-to-article flows (cross-pollination)
  const articleToArticleFlows = useMemo(() => {
    const flowCounts: Record<string, number> = {};
    
    Object.values(sessionAnalysis).forEach(pages => {
      // Filter to only article pages
      const articlePages = pages.filter(p => 
        p.path.match(/^\/[^/]+\/[^/]+$/) && 
        !p.path.startsWith('/admin') && 
        !p.path.startsWith('/author')
      );
      
      if (articlePages.length >= 2) {
        for (let i = 0; i < articlePages.length - 1; i++) {
          const flow = `${articlePages[i].path} → ${articlePages[i + 1].path}`;
          flowCounts[flow] = (flowCounts[flow] || 0) + 1;
        }
      }
    });

    return Object.entries(flowCounts)
      .map(([flow, count]) => ({ flow, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [sessionAnalysis]);

  // Session depth distribution
  const sessionDepthDistribution = useMemo(() => {
    const depths = { '1 page': 0, '2-3 pages': 0, '4-5 pages': 0, '6+ pages': 0 };
    
    Object.values(sessionAnalysis).forEach(pages => {
      const count = pages.length;
      if (count === 1) depths['1 page']++;
      else if (count <= 3) depths['2-3 pages']++;
      else if (count <= 5) depths['4-5 pages']++;
      else depths['6+ pages']++;
    });

    return Object.entries(depths).map(([name, value]) => ({ name, value }));
  }, [sessionAnalysis]);

  // Engagement quality matrix
  const engagementQualityData = useMemo(() => {
    const quality: Record<string, { count: number; articles: Record<string, number> }> = { 
      'Scanners': { count: 0, articles: {} },
      'Skimmers': { count: 0, articles: {} },
      'Readers': { count: 0, articles: {} },
      'Lingerers': { count: 0, articles: {} }
    };
    
    pageviewsData?.forEach(pv => {
      const path = pv.page_path?.split('?')[0] || '/';
      if (!path.match(/^\/[^/]+\/[^/]+$/) || path.startsWith('/admin')) return;
      
      const scroll = pv.scroll_depth_percent || 0;
      const time = pv.time_on_page_seconds || 0;
      const highScroll = scroll >= 50;
      const highTime = time >= 60; // 1 minute
      
      let segment: string;
      if (!highScroll && !highTime) segment = 'Scanners';
      else if (highScroll && !highTime) segment = 'Skimmers';
      else if (highScroll && highTime) segment = 'Readers';
      else segment = 'Lingerers';
      
      quality[segment].count++;
      quality[segment].articles[path] = (quality[segment].articles[path] || 0) + 1;
    });

    return quality;
  }, [pageviewsData]);

  const engagementQuality = useMemo(() => {
    return Object.entries(engagementQualityData).map(([name, data]) => ({ 
      name, 
      value: data.count,
      articles: Object.entries(data.articles)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50)
    }));
  }, [engagementQualityData]);

  // Content age vs performance
  const contentAgePerformance = useMemo(() => {
    if (!articlesData || !categoriesData) return [];
    
    const categoryLookup = Object.fromEntries(
      categoriesData.map(c => [c.id, c.slug])
    );
    
    const ageGroups: Record<string, { views: number; count: number }> = {
      'Last 7 days': { views: 0, count: 0 },
      '1-4 weeks': { views: 0, count: 0 },
      '1-3 months': { views: 0, count: 0 },
      '3-6 months': { views: 0, count: 0 },
      '6+ months': { views: 0, count: 0 },
    };
    
    articlesData.forEach(article => {
      if (!article.published_at) return;
      
      const daysSincePublish = differenceInDays(new Date(), new Date(article.published_at));
      const categorySlug = categoryLookup[article.primary_category_id || ''] || 'news';
      const articlePath = `/${categorySlug}/${article.slug}`;
      const views = pageStats[articlePath]?.views || 0;
      
      let group: string;
      if (daysSincePublish <= 7) group = 'Last 7 days';
      else if (daysSincePublish <= 28) group = '1-4 weeks';
      else if (daysSincePublish <= 90) group = '1-3 months';
      else if (daysSincePublish <= 180) group = '3-6 months';
      else group = '6+ months';
      
      ageGroups[group].views += views;
      ageGroups[group].count++;
    });

    return Object.entries(ageGroups).map(([name, data]) => ({
      name,
      views: data.views,
      articles: data.count,
      avgViews: data.count > 0 ? Math.round(data.views / data.count) : 0
    }));
  }, [articlesData, categoriesData, pageStats]);

  // Pages that drive internal navigation
  const navigationDrivers = useMemo(() => {
    const drivers: Record<string, { outbound: number; inbound: number }> = {};
    
    Object.values(sessionAnalysis).forEach(pages => {
      for (let i = 0; i < pages.length; i++) {
        if (!drivers[pages[i].path]) {
          drivers[pages[i].path] = { outbound: 0, inbound: 0 };
        }
        if (i < pages.length - 1) drivers[pages[i].path].outbound++;
        if (i > 0) drivers[pages[i].path].inbound++;
      }
    });

    return Object.entries(drivers)
      .filter(([path]) => path.match(/^\/[^/]+\/[^/]+$/) && !path.startsWith('/admin'))
      .map(([path, data]) => ({
        path,
        outbound: data.outbound,
        inbound: data.inbound,
        ratio: data.inbound > 0 ? (data.outbound / data.inbound).toFixed(2) : 'N/A'
      }))
      .sort((a, b) => b.outbound - a.outbound)
      .slice(0, 15);
  }, [sessionAnalysis]);

  // Entry/landing pages
  const landingPages = useMemo(() => {
    const landings: Record<string, number> = {};
    const sessionFirstPages: Record<string, { path: string; time: string }> = {};
    
    pageviewsData?.forEach(pv => {
      const path = pv.page_path?.split('?')[0] || '/';
      if (path.startsWith('/admin') || path.startsWith('/editor')) return;
      
      if (!sessionFirstPages[pv.session_id] || 
          new Date(pv.viewed_at) < new Date(sessionFirstPages[pv.session_id].time)) {
        sessionFirstPages[pv.session_id] = { path, time: pv.viewed_at };
      }
    });

    Object.values(sessionFirstPages).forEach(({ path }) => {
      landings[path] = (landings[path] || 0) + 1;
    });

    return Object.entries(landings)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [pageviewsData]);

  // Exit pages
  const exitPages = useMemo(() => {
    const exits: Record<string, number> = {};
    
    Object.entries(pageStats).forEach(([pagePath, stats]) => {
      if (!pagePath.startsWith('/admin') && !pagePath.startsWith('/editor') && stats.exits > 0) {
        exits[pagePath] = stats.exits;
      }
    });

    return Object.entries(exits)
      .map(([exitPath, count]) => ({ path: exitPath, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [pageStats]);

  const isLoading = pageviewsLoading || articlesLoading || sessionsLoading;

  // Summary stats
  const totalViews = Object.values(pageStats).reduce((sum, s) => sum + s.views, 0);
  const totalArticleViews = topArticles.reduce((sum, a) => sum + a.views, 0);
  const neverViewedCount = neverViewedArticles.length;
  const coldContentCount = coldArticles.length;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Generate AI prompts for recommendations
  const generatePromoteDeadPrompt = useCallback(() => {
    const articleList = neverViewedArticles.slice(0, 10).map(a => `- ${a.title} (${a.path})`).join('\n');
    return `I have ${neverViewedArticles.length} articles on my AI news site (aiinasia.com) that have never been viewed. Please help me create a promotion strategy.

**Never-viewed articles (sample of top 10):**
${articleList}

**Tasks:**
1. **Social Media Posts**: Create 3 engaging social media posts (Twitter/LinkedIn) for the most promising articles. Use hooks, emojis where appropriate, and include a call-to-action.

2. **Newsletter Feature**: Write a short teaser paragraph (50 words max) to feature one of these articles in our next newsletter.

3. **Content Audit**: Identify which articles might need headline improvements to increase click-through rates. Suggest improved headlines for 3 articles.

4. **Internal Linking**: Suggest which popular pages on the site could link to these dead articles to give them initial traffic.

Please provide actionable, copy-paste-ready content.`;
  }, [neverViewedArticles]);

  const generateRefreshColdPrompt = useCallback(() => {
    const articleList = coldArticles.slice(0, 10).map(a => `- ${a.path} (${a.views} views)`).join('\n');
    return `I have ${coldArticles.length} underperforming articles on my AI news site (aiinasia.com) that are getting below-average engagement. Please help me refresh them.

**Cold content (sample of top 10 lowest performers):**
${articleList}

**Tasks:**
1. **Headline Analysis**: Review the URLs and suggest more compelling, click-worthy headlines for 5 articles. Focus on curiosity gaps, numbers, and power words.

2. **SEO Quick Wins**: Suggest meta description improvements and focus keyphrases for 3 articles based on their topics.

3. **Content Updates**: Identify what type of updates would make these articles more valuable:
   - Add recent statistics/data
   - Include expert quotes
   - Add comparison tables
   - Update with 2024/2025 developments

4. **Internal Linking Strategy**: Suggest which of our hot/trending articles should link to these cold articles to boost their visibility.

Please provide specific, actionable recommendations.`;
  }, [coldArticles]);

  const generateDoubleDownPrompt = useCallback(() => {
    const hotArticleList = topArticles
      .filter(a => a.health.status === 'hot')
      .slice(0, 5)
      .map(a => `- ${a.path} (${a.views} views, ${formatDuration(a.avgTime)} avg time)`).join('\n');
    
    return `I have several high-performing articles on my AI news site (aiinasia.com). I want to capitalize on these proven topics to create more successful content.

**Top performing articles:**
${hotArticleList}

**Tasks:**

## 1. Find Related Keywords
For each winning article, identify:
- 3-5 long-tail keyword variations we could target
- Related questions people are searching for (People Also Ask style)
- Emerging subtopics we haven't covered yet

## 2. Internal Linking Suggestions
Identify which OTHER articles on the site should link TO these winners to:
- Pass SEO authority
- Improve topic clusters
- Create content hubs around winning themes

Suggest specific anchor text phrases to use.

## 3. Follow-up Content Ideas
For each winner, suggest 2-3 follow-up article ideas:
- A deeper dive into a specific aspect
- An updated version with new developments
- A practical guide/how-to based on the topic
- An opinion/analysis piece on implications

## 4. Social Repurposing Ideas
For each winning article, provide:
- 3 Twitter/X thread angles (first tweet hook + thread structure)
- 1 LinkedIn carousel concept (slide titles)
- 2 newsletter snippet ideas (subject line + teaser)
- 1 short-form video script outline (30-60 seconds)

## 5. Content Calendar
Create a 2-week content calendar that strategically schedules:
- The follow-up articles
- Social media promotion
- Newsletter features
- Internal linking updates

Please be specific and provide copy-paste-ready content where possible.`;
  }, [topArticles, formatDuration]);

  const copyPromptToClipboard = useCallback(async (prompt: string, type: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(type);
      toast.success("Prompt copied to clipboard!");
      setTimeout(() => setCopiedPrompt(null), 2000);
    } catch (err) {
      toast.error("Failed to copy prompt");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
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
              <BreadcrumbPage>Content Insights</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Content Insights
            </h1>
            <p className="text-muted-foreground mt-1">
              Understand what content performs, what's neglected, and how users flow through your site
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                refetchPageviews();
                refetchArticles();
                refetchSessions();
                toast.success("Refreshing data...");
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button variant="outline" asChild>
              <Link to="/admin/site-analytics">
                Full Analytics <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Total Pageviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Last {dateRange} days</p>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:border-orange-500/50 transition-colors"
            onClick={() => setHotDialogOpen(true)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Hot Articles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{topArticles.filter(a => a.health.status === 'hot').length}</div>
              <p className="text-xs text-muted-foreground mt-1">Performing 2x+ above average</p>
              <p className="text-xs text-primary mt-2">Click to view list →</p>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:border-cyan-500/50 transition-colors"
            onClick={() => setColdDialogOpen(true)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Snowflake className="h-4 w-4 text-cyan-500" />
                Cold Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{coldContentCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Below average engagement</p>
              <p className="text-xs text-primary mt-2">Click to view list →</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border-red-500/20 bg-red-500/5 cursor-pointer hover:border-red-500/50 transition-colors"
            onClick={() => setNeverViewedDialogOpen(true)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <Ghost className="h-4 w-4" />
                Never Viewed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{neverViewedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Published but zero views</p>
              <p className="text-xs text-red-600 mt-2">Click to view list →</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="time-device" className="gap-1">Time & Device</TabsTrigger>
            <TabsTrigger value="referrals" className="gap-1"><Globe className="h-3 w-3" />Referrals</TabsTrigger>
            <TabsTrigger value="behavior" className="gap-1">Behavior</TabsTrigger>
            <TabsTrigger value="cross-pollination" className="gap-1"><Shuffle className="h-3 w-3" />Cross-Pollination</TabsTrigger>
            <TabsTrigger value="content-perf" className="gap-1">Content Perf</TabsTrigger>
            <TabsTrigger value="article-types" className="gap-1"><List className="h-3 w-3" />Article Types</TabsTrigger>
            <TabsTrigger value="tags" className="gap-1"><Tags className="h-3 w-3" />Tags</TabsTrigger>
            <TabsTrigger value="discovery">Discovery</TabsTrigger>
            <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="dead">Dead Content</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Enhanced Content Type Breakdown */}
            <ContentTypeBreakdown 
              pageStats={pageStats}
              staticPages={staticPages}
              categoryPages={categoryPages}
              isLoading={isLoading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                  <CardDescription>How each category is performing</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[400px]" />
                  ) : (
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={categoryPageStats} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tickFormatter={(value) => value.toLocaleString()} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={100} 
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                        />
                        <Tooltip 
                          formatter={(value: number) => [value.toLocaleString(), 'Views']}
                          contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Mix</CardTitle>
                  <CardDescription>Article types breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px]" />
                  ) : (
                    <div className="space-y-4">
                      {/* Homepage views */}
                      {(() => {
                        const homeStats = pageStats['/'];
                        const homeViews = homeStats?.views || 0;
                        const totalViews = Object.values(pageStats).reduce((sum, s) => sum + s.views, 0);
                        const homePercent = totalViews > 0 ? Math.round(homeViews / totalViews * 100) : 0;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">Homepage</span>
                              <span className="text-muted-foreground">{homeViews.toLocaleString()} views ({homePercent}%)</span>
                            </div>
                            <Progress value={homePercent} className="h-2" />
                          </div>
                        );
                      })()}
                      
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs text-muted-foreground mb-3">Article Types</p>
                        {articlesData && (() => {
                          const typeCounts: Record<string, number> = {};
                          articlesData.forEach(a => {
                            const type = a.article_type || 'standard';
                            typeCounts[type] = (typeCounts[type] || 0) + 1;
                          });
                          const total = articlesData.length;
                          return Object.entries(typeCounts)
                            .sort(([,a], [,b]) => b - a)
                            .map(([type, count]) => (
                              <div key={type} className="space-y-1 mb-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                                  <span className="text-muted-foreground">{count} ({Math.round(count/total*100)}%)</span>
                                </div>
                                <Progress value={count/total*100} className="h-2" />
                              </div>
                            ));
                        })()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Entry & Exit Points */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-green-500" />
                    Top Entry Points
                  </CardTitle>
                  <CardDescription>Where users land first</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {landingPages.map((page, i) => (
                        <div key={page.path} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm w-6">{i + 1}.</span>
                            <span className="text-sm truncate max-w-[200px]">{page.path}</span>
                          </div>
                          <Badge variant="secondary">{page.count} entries</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownRight className="h-5 w-5 text-red-500" />
                    Top Exit Points
                  </CardTitle>
                  <CardDescription>Where users leave</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {exitPages.map((page, i) => (
                        <div key={page.path} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm w-6">{i + 1}.</span>
                            <span className="text-sm truncate max-w-[200px]">{page.path}</span>
                          </div>
                          <Badge variant="destructive">{page.count} exits</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Time & Device Tab */}
          <TabsContent value="time-device" className="space-y-6">
            <TimeDeviceAnalytics 
              pageviewsData={pageviewsData || []}
              sessionsData={(sessionsData || []) as any}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-6">
            <ReferralFlows 
              sessionsData={sessionsData || []}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Behavior Tab */}
          <TabsContent value="behavior" className="space-y-6">
            <UserBehaviorAnalytics 
              sessionsData={(sessionsData || []) as any}
              pageviewsData={pageviewsData || []}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Content Performance Tab */}
          <TabsContent value="content-perf" className="space-y-6">
            <ContentPerformanceAnalytics 
              articlesData={(articlesData || []) as any}
              categoriesData={categoriesData || []}
              pageStats={pageStats}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Discovery Tab */}
          <TabsContent value="discovery" className="space-y-6">
            <DiscoveryAnalytics 
              articlesData={(articlesData || []) as any}
              categoriesData={categoriesData || []}
              pageStats={pageStats}
              startDate={startDate}
              endDate={endDate}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Newsletter Tab */}
          <TabsContent value="newsletter" className="space-y-6">
            <NewsletterConversionAnalytics 
              pageStats={pageStats}
              startDate={startDate}
              endDate={endDate}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Cross-Pollination Tab */}
          <TabsContent value="cross-pollination" className="space-y-6">
            {/* Session Depth & Engagement Quality */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Session Depth
                  </CardTitle>
                  <CardDescription>How many pages do users view per session?</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px]" />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={sessionDepthDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {sessionDepthDistribution.map((_, index) => (
                              <Cell key={`depth-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>{sessionDepthDistribution.find(d => d.name !== '1 page')?.value || 0}</strong> sessions viewed 2+ pages — opportunity for cross-pollination
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Engagement Quality
                  </CardTitle>
                  <CardDescription>Reader behavior on articles</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px]" />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart 
                          data={engagementQuality}
                          onClick={(data) => {
                            if (data && data.activePayload && data.activePayload[0]) {
                              const segment = data.activePayload[0].payload;
                              setSelectedEngagementSegment(segment);
                              setEngagementDialogOpen(true);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover border rounded-lg p-2 text-sm">
                                  <p className="font-medium">{data.name}</p>
                                  <p>{data.value.toLocaleString()} pageviews</p>
                                  <p className="text-xs text-primary mt-1">Click to view articles →</p>
                                </div>
                              );
                            }
                            return null;
                          }} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {engagementQuality.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.name === 'Readers' ? '#10b981' : 'hsl(var(--primary))'} 
                                className="cursor-pointer hover:opacity-80"
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div 
                          className="p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => {
                            const segment = engagementQuality.find(e => e.name === 'Scanners');
                            if (segment) { setSelectedEngagementSegment(segment); setEngagementDialogOpen(true); }
                          }}
                        >
                          <strong>Scanners:</strong> &lt;50% scroll, &lt;1min
                        </div>
                        <div 
                          className="p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => {
                            const segment = engagementQuality.find(e => e.name === 'Skimmers');
                            if (segment) { setSelectedEngagementSegment(segment); setEngagementDialogOpen(true); }
                          }}
                        >
                          <strong>Skimmers:</strong> 50%+ scroll, &lt;1min
                        </div>
                        <div 
                          className="p-2 bg-green-500/10 rounded cursor-pointer hover:bg-green-500/20 transition-colors"
                          onClick={() => {
                            const segment = engagementQuality.find(e => e.name === 'Readers');
                            if (segment) { setSelectedEngagementSegment(segment); setEngagementDialogOpen(true); }
                          }}
                        >
                          <strong>Readers:</strong> 50%+ scroll, 1min+ ✓
                        </div>
                        <div 
                          className="p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => {
                            const segment = engagementQuality.find(e => e.name === 'Lingerers');
                            if (segment) { setSelectedEngagementSegment(segment); setEngagementDialogOpen(true); }
                          }}
                        >
                          <strong>Lingerers:</strong> &lt;50% scroll, 1min+
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">Click any bar or label to view articles</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Article-to-Article Flows */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shuffle className="h-5 w-5 text-primary" />
                  Article-to-Article Navigation
                </CardTitle>
                <CardDescription>
                  Which articles drive readers to other articles? This shows cross-pollination patterns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px]" />
                ) : articleToArticleFlows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="font-medium">Limited cross-pollination detected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Most sessions view only one article. Consider adding more internal links.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {articleToArticleFlows.map((flow, i) => (
                        <div key={flow.flow} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-muted-foreground font-medium w-6 flex-shrink-0">{i + 1}.</span>
                            <span className="text-sm font-mono truncate">{flow.flow}</span>
                          </div>
                          <Badge className="flex-shrink-0">{flow.count} times</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Navigation Drivers & Content Age */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Navigation Drivers
                  </CardTitle>
                  <CardDescription>Articles that send users to other content</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px]" />
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Article</th>
                            <th className="text-right py-2">Outbound</th>
                            <th className="text-right py-2">Inbound</th>
                          </tr>
                        </thead>
                        <tbody>
                          {navigationDrivers.map((item) => (
                            <tr key={item.path} className="border-b last:border-0">
                              <td className="py-2 truncate max-w-[180px]">
                                <Link to={item.path} className="hover:text-primary text-xs">
                                  {item.path}
                                </Link>
                              </td>
                              <td className="text-right py-2">
                                <Badge variant="secondary" className="text-xs">{item.outbound}</Badge>
                              </td>
                              <td className="text-right py-2">
                                <Badge variant="outline" className="text-xs">{item.inbound}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Content Age vs Performance
                  </CardTitle>
                  <CardDescription>Are newer or older articles getting more traffic?</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px]" />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={contentAgePerformance}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-popover border rounded-lg p-2 text-sm">
                                    <p className="font-medium">{data.name}</p>
                                    <p>{data.views} views from {data.articles} articles</p>
                                    <p className="text-muted-foreground">Avg: {data.avgViews} views/article</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="avgViews" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Avg Views" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                        {contentAgePerformance.length > 0 && (
                          <p className="text-muted-foreground">
                            {contentAgePerformance[0].avgViews > contentAgePerformance[contentAgePerformance.length - 1].avgViews
                              ? "📈 Newer content is performing better — keep publishing fresh articles"
                              : "📚 Older content has strong evergreen value — consider updating with fresh info"}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Category Cross-Navigation */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance Detail</CardTitle>
                <CardDescription>Views per category with article breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[200px]" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3">Category</th>
                          <th className="text-right py-3">Total Views</th>
                          <th className="text-right py-3">Articles</th>
                          <th className="text-right py-3">Avg/Article</th>
                          <th className="text-right py-3">Unique Visitors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryPageStats.map((cat) => (
                          <tr key={cat.slug} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="py-3 font-medium">
                              <Link to={`/${cat.slug}`} className="hover:text-primary flex items-center gap-1">
                                {cat.name}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </td>
                            <td className="text-right py-3">{cat.views.toLocaleString()}</td>
                            <td className="text-right py-3 text-muted-foreground">{cat.articles}</td>
                            <td className="text-right py-3">
                              <Badge variant={cat.avgViewsPerArticle > avgArticleViews ? "default" : "secondary"}>
                                {cat.avgViewsPerArticle}
                              </Badge>
                            </td>
                            <td className="text-right py-3 text-muted-foreground">{cat.uniqueVisitors}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Article Types Tab */}
          <TabsContent value="article-types" className="space-y-6">
            <ArticleTypeAnalytics 
              articlesData={articlesData || []}
              categoriesData={categoriesData || []}
              pageStats={pageStats}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags" className="space-y-6">
            <TagsAnalytics 
              articlesData={articlesData || []}
              categoriesData={categoriesData || []}
              pageStats={pageStats}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Articles Tab */}
          <TabsContent value="articles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Articles</CardTitle>
                <CardDescription>Your best content by pageviews with engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px]" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Article</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Published</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Total Reads</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Views</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Unique</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Avg Time</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Scroll %</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Exit Rate</th>
                          <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topArticles.map((article) => {
                          const HealthIcon = article.health.icon;
                          return (
                            <tr key={article.path} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2">
                                <Link 
                                  to={article.path} 
                                  className="text-sm hover:text-primary flex items-center gap-1 max-w-[300px] truncate"
                                >
                                  {article.path}
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </Link>
                              </td>
                              <td className="text-right py-3 px-2 text-muted-foreground text-xs">
                                {article.publishedAt ? format(new Date(article.publishedAt), 'MMM d, yyyy') : '—'}
                              </td>
                              <td className="text-right py-3 px-2 font-medium text-primary">{article.totalReads.toLocaleString()}</td>
                              <td className="text-right py-3 px-2 font-medium">{article.views}</td>
                              <td className="text-right py-3 px-2 text-muted-foreground">{article.uniqueVisitors}</td>
                              <td className="text-right py-3 px-2 text-muted-foreground">{formatDuration(article.avgTime)}</td>
                              <td className="text-right py-3 px-2">
                                <div className="flex items-center justify-end gap-2">
                                  <Progress value={article.avgScroll} className="w-16 h-2" />
                                  <span className="text-sm text-muted-foreground w-10">{article.avgScroll}%</span>
                                </div>
                              </td>
                              <td className="text-right py-3 px-2 text-muted-foreground">{article.exitRate}%</td>
                              <td className="text-center py-3 px-2">
                                <Badge className={`${article.health.color} text-white`}>
                                  <HealthIcon className="h-3 w-3 mr-1" />
                                  {article.health.label}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Static Pages Tab */}
          <TabsContent value="static" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Static & Utility Pages</CardTitle>
                <CardDescription>Performance of non-article pages like Privacy Policy, About, Contact, etc.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px]" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Page</th>
                          <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Path</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Views</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Unique</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Avg Time</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Scroll %</th>
                          <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Expected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staticPageStats.map((page) => (
                          <tr key={page.path} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2 font-medium">{page.name}</td>
                            <td className="py-3 px-2">
                              <Link 
                                to={page.path} 
                                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                              >
                                {page.path}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </td>
                            <td className="text-right py-3 px-2 font-medium">
                              {page.views === 0 ? (
                                <span className="text-red-500">0</span>
                              ) : (
                                page.views
                              )}
                            </td>
                            <td className="text-right py-3 px-2 text-muted-foreground">{page.uniqueVisitors}</td>
                            <td className="text-right py-3 px-2 text-muted-foreground">{formatDuration(page.avgTime)}</td>
                            <td className="text-right py-3 px-2">
                              <div className="flex items-center justify-end gap-2">
                                <Progress value={page.avgScroll} className="w-16 h-2" />
                                <span className="text-sm text-muted-foreground w-10">{page.avgScroll}%</span>
                              </div>
                            </td>
                            <td className="text-center py-3 px-2">
                              <Badge variant={page.expected === 'low' ? 'secondary' : 'default'}>
                                {page.expected}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Insights</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {staticPageStats.filter(p => p.views === 0).length > 0 && (
                          <li className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            {staticPageStats.filter(p => p.views === 0).length} static pages have zero views in the selected period
                          </li>
                        )}
                        {staticPageStats.find(p => p.path === '/privacy' && p.views === 0) && (
                          <li className="flex items-center gap-2">
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                            Privacy Policy has no views - this is common as users rarely visit policy pages
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Flows Tab */}
          <TabsContent value="flows" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  User Journey Patterns
                </CardTitle>
                <CardDescription>Most common page-to-page navigation flows</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px]" />
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {userFlows.map((flow, i) => (
                        <div key={flow.flow} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium w-8">{i + 1}.</span>
                            <span className="text-sm font-mono">{flow.flow}</span>
                          </div>
                          <Badge variant="outline">{flow.count} times</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Flow Visualization placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Top User Paths</CardTitle>
                <CardDescription>Visual representation of how users navigate</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={userFlows.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="flow" width={250} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dead Content Tab */}
          <TabsContent value="dead" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Never Viewed */}
              <Card className="border-red-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Ghost className="h-5 w-5" />
                    Never Viewed Articles
                  </CardTitle>
                  <CardDescription>Published content with zero pageviews</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[400px]" />
                  ) : neverViewedArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Zap className="h-12 w-12 text-green-500 mb-4" />
                      <p className="font-medium">All content has been viewed!</p>
                      <p className="text-sm text-muted-foreground">Great job on content distribution</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {neverViewedArticles.map((article) => (
                          <div key={article.id} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                            <Link 
                              to={article.path}
                              className="font-medium text-sm hover:text-primary line-clamp-2"
                            >
                              {article.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{article.path}</span>
                              <span>•</span>
                              <span>{article.daysSincePublish} days old</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Cold Content */}
              <Card className="border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-cyan-600">
                    <Snowflake className="h-5 w-5" />
                    Cold Content
                  </CardTitle>
                  <CardDescription>Articles with below-average engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[400px]" />
                  ) : coldArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Flame className="h-12 w-12 text-orange-500 mb-4" />
                      <p className="font-medium">All content is performing well!</p>
                      <p className="text-sm text-muted-foreground">No cold content detected</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {coldArticles.map((article) => (
                          <div key={article.path} className="flex items-center justify-between p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                            <Link 
                              to={article.path}
                              className="text-sm hover:text-primary truncate max-w-[200px]"
                            >
                              {article.path}
                            </Link>
                            <Badge variant="secondary">{article.views} views</Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {neverViewedArticles.length > 5 && (
                    <div 
                      className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors"
                      onClick={() => setPromoteDeadDialogOpen(true)}
                    >
                      <AlertTriangle className="h-6 w-6 text-red-500 mb-2" />
                      <h4 className="font-medium">Promote Dead Content</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {neverViewedArticles.length} articles have never been viewed. Consider sharing on social media or featuring in newsletters.
                      </p>
                      <p className="text-xs text-primary mt-2">Click for actions →</p>
                    </div>
                  )}
                  
                  {coldArticles.length > 10 && (
                    <div 
                      className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20 cursor-pointer hover:bg-cyan-500/20 transition-colors"
                      onClick={() => setRefreshColdDialogOpen(true)}
                    >
                      <Snowflake className="h-6 w-6 text-cyan-500 mb-2" />
                      <h4 className="font-medium">Refresh Cold Content</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Consider updating headlines, adding internal links, or improving SEO for underperforming articles.
                      </p>
                      <p className="text-xs text-primary mt-2">Click for actions →</p>
                    </div>
                  )}
                  
                  <div 
                    className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 cursor-pointer hover:bg-green-500/20 transition-colors"
                    onClick={() => setDoubleDownDialogOpen(true)}
                  >
                    <TrendingUp className="h-6 w-6 text-green-500 mb-2" />
                    <h4 className="font-medium">Double Down on Winners</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create follow-up content for your top-performing articles to capitalize on proven topics.
                    </p>
                    <p className="text-xs text-primary mt-2">Click for actions →</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Hot Articles Dialog */}
        <Dialog open={hotDialogOpen} onOpenChange={setHotDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Hot Articles
              </DialogTitle>
              <DialogDescription>
                Articles performing 2x or more above average engagement
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-2">
                {topArticles
                  .filter(a => a.health.status === 'hot')
                  .map((article, i) => (
                    <div key={article.path} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-muted-foreground text-sm w-6 flex-shrink-0">{i + 1}.</span>
                        <Link 
                          to={article.path} 
                          className="text-sm hover:text-primary truncate flex-1"
                          onClick={() => setHotDialogOpen(false)}
                        >
                          {article.path}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{article.daysSincePublish}d live</span>
                        <Badge variant="secondary">{article.views} views</Badge>
                        <span className="text-xs text-muted-foreground">{formatDuration(article.avgTime)} avg</span>
                      </div>
                    </div>
                  ))}
                {topArticles.filter(a => a.health.status === 'hot').length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No hot articles in this time period</p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Cold Content Dialog */}
        <Dialog open={coldDialogOpen} onOpenChange={setColdDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Snowflake className="h-5 w-5 text-cyan-500" />
                Cold Content
              </DialogTitle>
              <DialogDescription>
                Articles with below average engagement that could use attention
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-2">
                {coldArticles.map((article, i) => (
                  <div key={article.path} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-muted-foreground text-sm w-6 flex-shrink-0">{i + 1}.</span>
                      <Link 
                        to={article.path} 
                        className="text-sm hover:text-primary truncate flex-1"
                        onClick={() => setColdDialogOpen(false)}
                      >
                        {article.path}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{article.daysSincePublish}d live</span>
                      <Badge variant="outline">{article.views} views</Badge>
                    </div>
                  </div>
                ))}
                {coldArticles.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No cold content found</p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Never Viewed Dialog */}
        <Dialog open={neverViewedDialogOpen} onOpenChange={setNeverViewedDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Ghost className="h-5 w-5" />
                Never Viewed Articles
              </DialogTitle>
              <DialogDescription>
                Published articles with zero recorded views — consider promoting or reviewing
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-2">
                {neverViewedArticles.map((article, i) => (
                  <div key={article.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-muted-foreground text-sm w-6 flex-shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={article.path} 
                          className="text-sm hover:text-primary block truncate"
                          onClick={() => setNeverViewedDialogOpen(false)}
                        >
                          {article.title}
                        </Link>
                        <span className="text-xs text-muted-foreground">{article.path}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0 text-muted-foreground">
                      {article.daysSincePublish}d ago
                    </Badge>
                  </div>
                ))}
                {neverViewedArticles.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">All articles have been viewed!</p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
        {/* Engagement Segment Dialog */}
        <Dialog open={engagementDialogOpen} onOpenChange={setEngagementDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {selectedEngagementSegment?.name} Articles
              </DialogTitle>
              <DialogDescription>
                {selectedEngagementSegment?.name === 'Scanners' && 'Low scroll depth (<50%), short time (<1min) — users leave quickly'}
                {selectedEngagementSegment?.name === 'Skimmers' && 'High scroll depth (50%+), short time (<1min) — users scroll fast without reading'}
                {selectedEngagementSegment?.name === 'Readers' && 'High scroll depth (50%+), longer time (1min+) — engaged readers ✓'}
                {selectedEngagementSegment?.name === 'Lingerers' && 'Low scroll depth (<50%), longer time (1min+) — stuck at top or distracted'}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-2">
                {selectedEngagementSegment?.articles.map((article, i) => (
                  <div key={article.path} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-muted-foreground text-sm w-6 flex-shrink-0">{i + 1}.</span>
                      <Link 
                        to={article.path} 
                        className="text-sm hover:text-primary truncate flex-1"
                        onClick={() => setEngagementDialogOpen(false)}
                      >
                        {article.path}
                      </Link>
                    </div>
                    <Badge variant="secondary" className="flex-shrink-0">{article.count} pageviews</Badge>
                  </div>
                ))}
                {(!selectedEngagementSegment?.articles || selectedEngagementSegment.articles.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No articles in this segment</p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Promote Dead Content Dialog */}
        <Dialog open={promoteDeadDialogOpen} onOpenChange={setPromoteDeadDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Promote Dead Content
              </DialogTitle>
              <DialogDescription>
                {neverViewedArticles.length} articles have never been viewed. Choose an action below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => copyPromptToClipboard(generatePromoteDeadPrompt(), 'promoteDead')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {copiedPrompt === 'promoteDead' ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-primary" />}
                      <h4 className="font-medium">Copy AI Prompt</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Copy a detailed prompt to paste into ChatGPT/Claude. Includes article list and specific tasks for social posts, newsletter teasers, and headline improvements.
                    </p>
                  </CardContent>
                </Card>
                
                <Link to="/admin/newsletter-manager" onClick={() => setPromoteDeadDialogOpen(false)} className="block">
                  <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Play className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">Add to Newsletter</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Open the Newsletter Manager to feature these articles in your next newsletter issue.
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
              
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium mb-2 text-sm">Sample Articles to Promote:</h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {neverViewedArticles.slice(0, 15).map((article) => (
                      <div key={article.path} className="flex items-center justify-between text-sm">
                        <Link 
                          to={article.path} 
                          className="hover:text-primary truncate max-w-[400px]"
                          onClick={() => setPromoteDeadDialogOpen(false)}
                        >
                          {article.title}
                        </Link>
                        <span className="text-muted-foreground text-xs">{article.path}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Refresh Cold Content Dialog */}
        <Dialog open={refreshColdDialogOpen} onOpenChange={setRefreshColdDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Snowflake className="h-5 w-5 text-cyan-500" />
                Refresh Cold Content
              </DialogTitle>
              <DialogDescription>
                {coldArticles.length} articles are underperforming. Choose an action below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => copyPromptToClipboard(generateRefreshColdPrompt(), 'refreshCold')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {copiedPrompt === 'refreshCold' ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-primary" />}
                      <h4 className="font-medium">Copy AI Prompt</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Copy a detailed prompt for headline analysis, SEO quick wins, content updates, and internal linking strategy.
                    </p>
                  </CardContent>
                </Card>
                
                <Link to="/admin/bulk-seo" onClick={() => setRefreshColdDialogOpen(false)} className="block">
                  <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Play className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">Bulk SEO Generation</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Open the bulk SEO tool to regenerate meta titles and descriptions for these articles.
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
              
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium mb-2 text-sm">Cold Articles (lowest engagement):</h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {coldArticles.slice(0, 15).map((article) => (
                      <div key={article.path} className="flex items-center justify-between text-sm">
                        <Link 
                          to={article.path} 
                          className="hover:text-primary truncate max-w-[350px]"
                          onClick={() => setRefreshColdDialogOpen(false)}
                        >
                          {article.path}
                        </Link>
                        <Badge variant="secondary" className="text-xs">{article.views} views</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Double Down on Winners Dialog */}
        <Dialog open={doubleDownDialogOpen} onOpenChange={setDoubleDownDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Double Down on Winners
              </DialogTitle>
              <DialogDescription>
                Capitalize on your top-performing content. Choose an action below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => copyPromptToClipboard(generateDoubleDownPrompt(), 'doubleDown')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {copiedPrompt === 'doubleDown' ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-primary" />}
                      <h4 className="font-medium">Copy AI Prompt</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive prompt including: related keywords, internal linking suggestions, follow-up content ideas, social repurposing (threads, carousels, video scripts), and a 2-week content calendar.
                    </p>
                  </CardContent>
                </Card>
                
                <Link to="/editor" onClick={() => setDoubleDownDialogOpen(false)} className="block">
                  <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Play className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">Create New Article</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Open the editor to start creating a follow-up article based on your winning content.
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </div>
              
              <div className="border rounded-lg p-4 bg-green-500/5">
                <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Your Top Performers:
                </h4>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {topArticles
                      .filter(a => a.health.status === 'hot')
                      .slice(0, 10)
                      .map((article, i) => (
                        <div key={article.path} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-muted-foreground w-5 flex-shrink-0">{i + 1}.</span>
                            <Link 
                              to={article.path} 
                              className="hover:text-primary truncate"
                              onClick={() => setDoubleDownDialogOpen(false)}
                            >
                              {article.path}
                            </Link>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">{article.views} views</Badge>
                            <span className="text-xs text-muted-foreground">{formatDuration(article.avgTime)} avg</span>
                          </div>
                        </div>
                      ))}
                    {topArticles.filter(a => a.health.status === 'hot').length === 0 && (
                      <p className="text-sm text-muted-foreground">No hot articles in this time period. Try extending the date range.</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 text-sm">Prompt includes these additional steps:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-500" />
                    Find related long-tail keywords
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-500" />
                    Internal linking suggestions
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-500" />
                    Social repurposing (threads, carousels, videos)
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-500" />
                    2-week content calendar
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ContentInsights;
