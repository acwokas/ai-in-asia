import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ArticleCard from "@/components/ArticleCard";
import { BreadcrumbStructuredData } from "@/components/StructuredData";
import { MPUAd } from "@/components/GoogleAds";
import { PromptAndGoBanner } from "@/components/PromptAndGoBanner";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { trackSponsorClick, trackSponsorImpression } from "@/hooks/useSponsorTracking";
import CategoryBreadcrumbsWithSiblings from "@/components/CategoryBreadcrumbsWithSiblings";
import {
  Loader2, 
  TrendingUp, 
  Clock, 
  Tag as TagIcon, 
  Sparkles, 
  Eye, 
  ArrowRight,
  MessageSquare,
  Newspaper,
  BarChart3,
  Cpu,
  Briefcase,
  GraduationCap,
  Globe,
  Lightbulb,
  Building2,
  Rocket,
  ExternalLink,
  Flame,
  type LucideIcon
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import InlineNewsletterSignup from "@/components/InlineNewsletterSignup";
import ExploreMoreButton from "@/components/ExploreMoreButton";

const StockTicker = lazy(() => import("@/components/StockTicker"));

// Category visual identity config
const categoryIdentity: Record<string, { bg: string; description: string }> = {
  news: { bg: "bg-[#1e3a5f]", description: "Breaking developments and signals from the AI landscape across Asia-Pacific" },
  business: { bg: "bg-[#134e4a]", description: "How AI is reshaping industries across Asia-Pacific" },
  life: { bg: "bg-[#4c1d95]", description: "AI's impact on everyday life, health, culture, and society" },
  learn: { bg: "bg-[#14532d]", description: "Tutorials, explainers, and guides to sharpen your AI skills" },
  create: { bg: "bg-[#7c2d12]", description: "Tools, prompts, and workflows for AI-powered creation" },
  voices: { bg: "bg-[#1c1917]", description: "Opinion, analysis, and commentary from AI practitioners and thinkers" },
};

// Category icon mapping
const categoryIcons: Record<string, LucideIcon> = {
  'voices': MessageSquare,
  'news': Newspaper,
  'analysis': BarChart3,
  'technology': Cpu,
  'business': Briefcase,
  'education': GraduationCap,
  'research': Lightbulb,
  'industry': Building2,
  'innovation': Rocket,
  'global': Globe,
  'life': Globe,
  'learn': GraduationCap,
  'create': Sparkles,
};

// Category Sponsor Card with tracking
interface CategorySponsorData {
  sponsor_name: string;
  sponsor_logo_url: string;
  sponsor_website_url: string;
  sponsor_tagline?: string | null;
}

const CategorySponsorCard = ({ sponsor, categoryName }: { sponsor: CategorySponsorData; categoryName: string }) => {
  useEffect(() => {
    trackSponsorImpression('category_sponsor', sponsor.sponsor_name, { category: categoryName });
  }, [sponsor.sponsor_name, categoryName]);

  const handleClick = () => {
    trackSponsorClick('category_sponsor', sponsor.sponsor_name, sponsor.sponsor_website_url, { category: categoryName });
  };

  return (
    <div className="lg:col-span-4">
      <Card className="!bg-white dark:!bg-white border-primary/20 hover:border-primary/40 transition-all shadow-md">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 text-center">
            In partnership with
          </p>
          <a
            href={sponsor.sponsor_website_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block group"
            onClick={handleClick}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-full flex items-center justify-center">
                <img
                  src={sponsor.sponsor_logo_url}
                  alt={sponsor.sponsor_name}
                  className="h-20 w-auto max-w-full object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              {sponsor.sponsor_tagline && (
                <p className="text-xs text-gray-600 italic leading-relaxed">
                  {sponsor.sponsor_tagline}
                </p>
              )}
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

const Category = () => {
  const { slug } = useParams();
  const [enableSecondaryQueries, setEnableSecondaryQueries] = useState(false);
  const [showAllArticles, setShowAllArticles] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Auto-refresh every 30 minutes
  useAutoRefresh();

  // Enable secondary queries after main content loads
  useEffect(() => {
    const timer = setTimeout(() => setEnableSecondaryQueries(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["category", slug],
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description, color")
        .eq("slug", slug)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch sponsor for this category
  const { data: sponsor } = useQuery({
    queryKey: ["category-sponsor", category?.id],
    enabled: !!category?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!category?.id) return null;
      
      const { data, error } = await supabase
        .from("category_sponsors")
        .select("id, sponsor_name, sponsor_logo_url, sponsor_website_url, sponsor_tagline")
        .eq("category_id", category.id)
        .eq("is_active", true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ["category-articles", slug],
    enabled: !!category?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async () => {
      if (!category?.id) return [];

      // Special handling for Voices category - fetch from article_categories junction
      if (slug === 'voices') {
        const { data, error } = await supabase
          .from("article_categories")
          .select(`
            articles!inner (
              id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, like_count, comment_count, reading_time_minutes,
              authors (name, slug),
              categories:primary_category_id!inner (name, slug)
            )
          `)
          .eq("category_id", category.id)
          .eq("articles.status", "published")
          .limit(20);
        
        if (error) throw error;
        
        // Extract articles and sort by published_at (latest first)
        const voicesArticles = data
          ?.map(item => item.articles)
          .filter(article => article && article.authors?.name !== 'Intelligence Desk')
          .sort((a: any, b: any) => 
            new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
          ) || [];
        
        return voicesArticles;
      }

      // Regular categories - fetch by primary_category_id
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, like_count, comment_count, reading_time_minutes,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("primary_category_id", category.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  // Defer: Fetch Koo Ping Shung's articles for "The View From Koo" section
  const { data: kooArticles } = useQuery({
    queryKey: ["koo-articles", category?.id],
    enabled: enableSecondaryQueries && category?.slug === "voices" && !!category?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!category?.id) return [];

      const { data, error } = await supabase
        .from("article_categories")
        .select(`
          articles (
            id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes,
            authors!inner (name, slug),
            categories:primary_category_id (name, slug)
          )
        `)
        .eq("category_id", category.id)
        .eq("articles.status", "published")
        .eq("articles.authors.name", "Koo Ping Shung");
      
      if (error) throw error;
      
      // Extract articles and sort by published date in JavaScript
      const articles = data?.map(item => item.articles).filter(Boolean) || [];
      return articles
        .sort((a: any, b: any) => 
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        )
        .slice(0, 3);
    },
  });

  // Defer: Fetch Adrian Watkins's articles for "Adrian's Angle" section
  const { data: adrianArticles } = useQuery({
    queryKey: ["adrian-articles", category?.id],
    enabled: enableSecondaryQueries && category?.slug === "voices" && !!category?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!category?.id) return [];

      const { data, error } = await supabase
        .from("article_categories")
        .select(`
          articles (
            id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes,
            authors!inner (name, slug),
            categories:primary_category_id (name, slug)
          )
        `)
        .eq("category_id", category.id)
        .eq("articles.status", "published")
        .eq("articles.authors.name", "Adrian Watkins");
      
      if (error) throw error;
      
      // Extract articles and sort by published date in JavaScript
      const articles = data?.map(item => item.articles).filter(Boolean) || [];
      return articles
        .sort((a: any, b: any) => 
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        )
        .slice(0, 3);
    },
  });

  // Defer: Fetch Editor's Pick - Most popular article excluding featured and latest
  const { data: editorsPick } = useQuery({
    queryKey: ["editors-pick", category?.id, slug],
    enabled: enableSecondaryQueries && !!category?.id && !!articles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!category?.id || !articles) return null;

      // First, check if there's a manually selected editor's pick for this category
      const { data: manualPick, error: manualError } = await supabase
        .from("editors_picks")
        .select(`
          article_id,
          articles (
            id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, status, reading_time_minutes,
            authors (name, slug),
            categories:primary_category_id (name, slug)
          )
        `)
        .eq("location", slug)
        .maybeSingle();

      if (manualError && manualError.code !== 'PGRST116') throw manualError;
      
      // If manual pick exists and article is published, return it UNLESS it's the featured article
      if (manualPick?.articles && (manualPick.articles as any).status === 'published') {
        const manualArticle = manualPick.articles as any;
        // Don't use manual pick if it's the same as the featured article
        if (manualArticle.id !== articles[0]?.id) {
          return manualArticle;
        }
        // If manual pick is same as featured, fall through to automatic selection
      }

      // Otherwise, fallback to automatic selection
      // Get IDs to exclude (featured article + latest articles shown)
      const excludeIds = [
        articles[0]?.id, // Featured article
        ...(articles.slice(0, 4).map(a => a.id)) // Latest articles shown in sidebar
      ].filter(Boolean);

      // Special handling for Voices category
      if (slug === 'voices') {
        const { data, error } = await supabase
          .from("article_categories")
          .select(`
            articles (
              id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes,
              authors (name, slug),
              categories:primary_category_id (name, slug)
            )
          `)
          .eq("category_id", category.id)
          .eq("articles.status", "published");
        
        if (error) throw error;
        
        // Extract articles, filter out Intelligence Desk and excluded IDs
        const voicesArticles = data
          ?.map(item => item.articles)
          .filter(article => 
            article && 
            article.authors?.name !== 'Intelligence Desk' &&
            !excludeIds.includes(article.id)
          ) || [];
        
        // Sort by view count and get the top one
        return voicesArticles
          .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))[0] || null;
      }

      // Regular categories
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("primary_category_id", category.id)
        .eq("status", "published")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .order("view_count", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Defer: Most read articles - excludes hero section articles
  const { data: mostReadArticles } = useQuery({
    queryKey: ["category-most-read", slug, articles?.[0]?.id],
    enabled: enableSecondaryQueries && !!category?.id && !!articles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!category?.id || !articles) return [];

      // Get IDs to exclude (featured + latest articles)
      const excludeIds = [
        articles[0]?.id,
        ...(articles.slice(1, 5).map(a => a.id))
      ].filter(Boolean);

      // Special handling for Voices - fetch from article_categories and exclude Intelligence Desk
      if (slug === 'voices') {
        const { data, error } = await supabase
          .from("article_categories")
          .select(`
            articles (
              id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes,
              authors (name, slug),
              categories:primary_category_id (name, slug)
            )
          `)
          .eq("category_id", category.id)
          .eq("articles.status", "published");
        
        if (error) throw error;
        
        // Extract articles, filter out Intelligence Desk and excluded IDs, and sort by view count
        const filteredArticles = data
          ?.map(item => item.articles)
          .filter(article => 
            article && 
            article.authors?.name !== 'Intelligence Desk' &&
            !excludeIds.includes(article.id)
          ) || [];
        
        return filteredArticles
          .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 4);
      }

      const { data, error } = await supabase
        .from("articles")
        .select(`
          id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("primary_category_id", category.id)
        .eq("status", "published")
        .not("id", "in", `(${excludeIds.join(",")})`)
        .order("view_count", { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data;
    },
  });

  // Defer: Trending articles - fills with recent articles if not enough trending
  const { data: trendingArticles } = useQuery({
    queryKey: ["category-trending", slug, articles],
    enabled: enableSecondaryQueries && !!category?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!category?.id) return [];

      // Calculate 6 months ago date
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAgoISO = sixMonthsAgo.toISOString();

      // Get IDs already shown on page to exclude
      const excludeIds = [
        ...(articles?.slice(0, 5).map(a => a.id) || []),
        editorsPick?.id,
        ...(mostReadArticles?.map(a => a.id) || [])
      ].filter(Boolean);

      // Filter function to exclude articles with "2025" in title and older than 6 months
      const filterArticle = (article: any) => {
        if (!article) return false;
        if (article.title?.includes('2025')) return false;
        if (article.published_at && new Date(article.published_at) < sixMonthsAgo) return false;
        if (excludeIds.includes(article.id)) return false;
        return true;
      };

      // Special handling for Voices - fetch from article_categories and exclude Intelligence Desk
      if (slug === 'voices') {
        // First get trending articles
        const { data: trendingData, error: trendingError } = await supabase
          .from("article_categories")
          .select(`
            articles!inner (
              id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes,
              authors (name, slug),
              categories:primary_category_id (name, slug)
            )
          `)
          .eq("category_id", category.id)
          .eq("articles.status", "published")
          .eq("articles.is_trending", true);
        
        if (trendingError) throw trendingError;
        
        let voicesTrending = trendingData
          ?.map(item => item.articles)
          .filter(article => article && article.authors?.name !== 'Intelligence Desk' && filterArticle(article)) || [];
        
        voicesTrending = voicesTrending.sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0));

        // If we have enough, return them
        if (voicesTrending.length >= 5) {
          return voicesTrending.slice(0, 5);
        }

        // Otherwise, fill with recent articles
        const { data: recentData, error: recentError } = await supabase
          .from("article_categories")
          .select(`
            articles!inner (
              id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes,
              authors (name, slug),
              categories:primary_category_id (name, slug)
            )
          `)
          .eq("category_id", category.id)
          .eq("articles.status", "published")
          .gte("articles.published_at", sixMonthsAgoISO)
          .order("articles.published_at", { ascending: false });
        
        if (recentError) throw recentError;

        const recentArticles = recentData
          ?.map(item => item.articles)
          .filter(article => 
            article && 
            article.authors?.name !== 'Intelligence Desk' && 
            filterArticle(article) &&
            !voicesTrending.some((t: any) => t.id === article.id)
          ) || [];

        const combined = [...voicesTrending, ...recentArticles];
        return combined.slice(0, 5);
      }

      // Regular categories - first get trending articles
      const { data: trendingData, error: trendingError } = await supabase
        .from("articles")
        .select(`
          id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("primary_category_id", category.id)
        .eq("status", "published")
        .eq("is_trending", true)
        .gte("published_at", sixMonthsAgoISO)
        .order("view_count", { ascending: false })
        .limit(10);
      
      if (trendingError) throw trendingError;
      
      const filteredTrending = (trendingData || []).filter(filterArticle);

      // If we have enough trending, return them
      if (filteredTrending.length >= 5) {
        return filteredTrending.slice(0, 5);
      }

      // Otherwise, fill with recent articles
      const neededCount = 5 - filteredTrending.length;
      const trendingIds = filteredTrending.map(a => a.id);
      const allExcludeIds = [...excludeIds, ...trendingIds].filter(Boolean);

      const { data: recentData, error: recentError } = await supabase
        .from("articles")
        .select(`
          id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, view_count, reading_time_minutes,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("primary_category_id", category.id)
        .eq("status", "published")
        .gte("published_at", sixMonthsAgoISO)
        .order("published_at", { ascending: false })
        .limit(20);
      
      if (recentError) throw recentError;

      const recentFiltered = (recentData || [])
        .filter(article => filterArticle(article) && !allExcludeIds.includes(article.id))
        .slice(0, neededCount);

      return [...filteredTrending, ...recentFiltered];
    },
  });

  // Defer: Popular tags
  const { data: popularTags } = useQuery({
    queryKey: ["category-popular-tags", slug],
    enabled: enableSecondaryQueries && !!category?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      if (!category?.id) return [];

      const { data, error } = await supabase
        .from("article_tags")
        .select(`
          tag_id,
          tags (id, name, slug),
          articles!inner (primary_category_id, id)
        `)
        .eq("articles.primary_category_id", category.id)
        .limit(200);
      
      if (error) throw error;

      // Count tag occurrences
      const tagCounts = new Map();
      data?.forEach((item: any) => {
        if (item.tags) {
          const tag = item.tags;
          if (tagCounts.has(tag.id)) {
            tagCounts.set(tag.id, {
              ...tag,
              count: tagCounts.get(tag.id).count + 1
            });
          } else {
            tagCounts.set(tag.id, { ...tag, count: 1 });
          }
        }
      });

      // Convert to array and sort by count
      return Array.from(tagCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
  });

  // Get articles for top 3 popular tags
  const { data: tagArticlesData } = useQuery({
    queryKey: ["category-tag-articles", popularTags?.slice(0, 3).map(t => t.id).join(",")],
    enabled: !!popularTags && popularTags.length > 0 && !!category?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!popularTags || popularTags.length === 0 || !category?.id) return [];

      const topTags = popularTags.slice(0, 3);
      const results = await Promise.all(
        topTags.map(async (tag) => {
          const { data, error } = await supabase
            .from("article_tags")
            .select(`
              article_id,
              articles!inner (
                id, slug, title, excerpt, featured_image_url, featured_image_alt, published_at, reading_time_minutes,
                authors (name, slug),
                categories:primary_category_id (name, slug)
              )
            `)
            .eq("tag_id", tag.id)
            .eq("articles.primary_category_id", category.id)
            .eq("articles.status", "published")
            .limit(4);
          
          if (error) throw error;
          
          // Sort by published_at in JavaScript since we can't order embedded resources
          const sortedArticles = (data?.map((item: any) => item.articles) || [])
            .sort((a: any, b: any) => 
              new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
            );
          
          return {
            tag,
            articles: sortedArticles
          };
        })
      );

      return results;
    },
  });

  // Fetch featured voices (specific authors) for Voices category
  const { data: featuredVoices } = useQuery({
    queryKey: ["featured-voices", category?.slug],
    enabled: category?.slug === "voices",
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      // Fetch specific featured authors using public view to avoid exposing email
      const { data, error } = await supabase
        .from("authors_public")
        .select("id, name, slug, bio, avatar_url, job_title, article_count")
        .in("name", ["Adrian Watkins", "Victoria Watkins", "Koo Ping Shung"]);

      if (error) throw error;

      // Sort in specific order: Adrian, Victoria, Koo
      const order = ["Adrian Watkins", "Victoria Watkins", "Koo Ping Shung"];
      return data?.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)) || [];
    },
  });

  // Fetch editor's choice article
  const { data: editorsChoiceArticle } = useQuery({
    queryKey: ["editors-choice", "adrians-arena-blink-and-theyre-gone-how-the-fastest-startups-win-with-ai-marketing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("slug", "adrians-arena-blink-and-theyre-gone-how-the-fastest-startups-win-with-ai-marketing")
        .eq("status", "published")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Popular this month - top 5 most-viewed in past 30 days
  const { data: popularThisMonth } = useQuery({
    queryKey: ["category-popular-month", slug],
    enabled: enableSecondaryQueries && !!category?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!category?.id) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (slug === 'voices') {
        const { data, error } = await supabase
          .from("article_categories")
          .select(`articles!inner (id, slug, title, view_count, published_at, categories:primary_category_id (slug))`)
          .eq("category_id", category.id)
          .eq("articles.status", "published")
          .gte("articles.published_at", thirtyDaysAgo.toISOString());
        if (error) throw error;
        return (data?.map(d => d.articles).filter(Boolean) || [])
          .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 5);
      }

      const { data, error } = await supabase
        .from("articles")
        .select("id, slug, title, view_count, categories:primary_category_id (slug)")
        .eq("primary_category_id", category.id)
        .eq("status", "published")
        .gte("published_at", thirtyDaysAgo.toISOString())
        .order("view_count", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const featuredArticle = articles?.[0];
  const latestArticles = category?.slug === 'voices' ? articles?.slice(1, 5) || [] : articles?.slice(1, 5) || [];
  
  // Collect IDs shown in hero section (featured + latest)
  const heroSectionIds = [
    featuredArticle?.id,
    ...(latestArticles?.map((a: any) => a.id) || [])
  ].filter(Boolean) as string[];
  
  // Collect all IDs shown in any section to exclude from "More Articles"
  const allShownIds = new Set([
    ...heroSectionIds,
    editorsPick?.id,
    ...(mostReadArticles?.map((a: any) => a.id) || []),
    ...(trendingArticles?.map((a: any) => a.id) || [])
  ].filter(Boolean));
  
  // Compute "more articles" excluding all previously shown articles
  const moreArticles = (articles?.slice(5) || []).filter((a: any) => !allShownIds.has(a.id));

  // Filter articles by selected tag
  const filteredMoreArticles = useMemo(() => {
    if (!selectedTag) return moreArticles;
    // We can't filter by tag on the client without tag data per article, so clear filter for now
    return moreArticles;
  }, [moreArticles, selectedTag]);

  const identity = categoryIdentity[slug || ''] || { bg: 'bg-[#1e3a5f]', description: '' };
  const totalArticleCount = articles?.length || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={`${category?.name || 'Category'} - AI News & Insights`}
        description={category?.description || `Explore the latest ${category?.name} articles, news, and insights on AI in ASIA. Expert coverage of artificial intelligence developments across Asia.`}
        canonical={`https://aiinasia.com/category/${category?.slug}`}
      />

      {category && (
        <BreadcrumbStructuredData
          items={[
            { name: 'Home', url: 'https://aiinasia.com' },
            { name: category.name, url: `https://aiinasia.com/category/${category.slug}` }
          ]}
        />
      )}

      <Header />
      
      {/* Stock Ticker — Business category only */}
      {(slug === "business" || slug === "news") && (
        <Suspense fallback={null}>
          <StockTicker />
        </Suspense>
      )}
      
      <main className="flex-1">
        {/* Category Hero Banner */}
        <section className={`${identity.bg} text-white py-10 md:py-14`}>
          <div className="container mx-auto px-4">
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/" className="text-white/60 hover:text-white">Home</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="text-white/40" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-white">{category?.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {categoryLoading ? (
              <>
                <Skeleton className="h-14 w-3/4 mb-3 bg-white/10" />
                <Skeleton className="h-5 w-full max-w-2xl bg-white/10" />
              </>
            ) : (
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <h1 className="headline text-4xl md:text-5xl lg:text-6xl mb-2 text-white">
                    {category?.name}
                  </h1>
                  <p className="text-lg text-white/75 max-w-2xl">
                    {identity.description || category?.description}
                  </p>
                </div>
                <p className="text-sm text-white/50 font-medium shrink-0">
                  {totalArticleCount}+ articles
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Tag filtering pills */}
        {popularTags && popularTags.length > 0 && (
          <div className="border-b bg-muted/30">
            <div className="container mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <Button
                variant={selectedTag === null ? "default" : "ghost"}
                size="sm"
                className="shrink-0 text-xs h-7"
                onClick={() => setSelectedTag(null)}
              >
                All
              </Button>
              {popularTags.map((tag: any) => (
                <Button
                  key={tag.id}
                  variant={selectedTag === tag.id ? "default" : "outline"}
                  size="sm"
                  className="shrink-0 text-xs h-7 gap-1"
                  onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
                >
                  {tag.name}
                  <span className="text-[10px] opacity-60">({tag.count})</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 py-8">
          {/* Sibling category suggestions */}
          {category && (
            <CategoryBreadcrumbsWithSiblings 
              currentCategorySlug={category.slug} 
              currentCategoryName={category.name} 
            />
          )}

          {articlesLoading ? (
            /* Loading skeletons for category content */
            <div className="space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                  <Skeleton className="aspect-video rounded-lg" />
                </div>
                <div className="lg:col-span-4 space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="w-20 h-20 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
          {/* Voices Category - Featured Authors Section */}
          {category?.slug === "voices" && featuredVoices && featuredVoices.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Featured Voices</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredVoices.map((author) => (
                  <Link
                    key={author.id}
                    to={`/author/${author.slug}`}
                    className="group"
                  >
                    <Card className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex flex-col items-center text-center">
                        {author.avatar_url ? (
                          <img
                            src={author.avatar_url}
                            alt={author.name}
                            className="w-24 h-24 rounded-full object-cover mb-4 ring-2 ring-border group-hover:ring-primary transition-all"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mb-4 ring-2 ring-border group-hover:ring-primary transition-all" />
                        )}
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors mb-1">
                          {author.name}
                        </h3>
                        {author.job_title && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {author.job_title}
                          </p>
                        )}
                        <p className="text-sm font-medium text-muted-foreground">
                          {author.article_count || 0} articles
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Voices Layout: Latest Published (Left) + Latest & Ad (Right) */}
          {category?.slug === 'voices' && featuredArticle ? (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Latest Voice</h2>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Latest Published - Larger Featured Card on Left */}
                <div className="lg:col-span-8">
                    <Card className="overflow-hidden hover:shadow-xl transition-shadow group">
                      <Link to={`/${featuredArticle.categories?.slug || 'news'}/${featuredArticle.slug}`}>
                        <div className="relative aspect-video overflow-hidden">
                          <img 
                            src={featuredArticle.featured_image_url} 
                            alt={featuredArticle.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-6">
                          <h3 className="headline text-2xl md:text-3xl mb-3 group-hover:text-primary transition-colors">
                            {featuredArticle.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                          </h3>
                          <p className="text-muted-foreground mb-4 line-clamp-2">
                            {featuredArticle.excerpt}
                          </p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{featuredArticle.authors?.name}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {featuredArticle.reading_time_minutes || 5} min
                            </span>
                          </div>
                        </div>
                      </Link>
                    </Card>
                </div>

                {/* Right Column: Latest + Ad */}
                <div className="lg:col-span-4 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Latest
                    </h3>
                    <div className="space-y-3">
                      {latestArticles.slice(0, 4).map((article) => (
                        <Link 
                          key={article.id}
                          to={`/${article.categories?.slug || 'news'}/${article.slug}`}
                          className="flex gap-3 group"
                        >
                          <img 
                            src={article.featured_image_url} 
                            alt={article.title}
                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0 group-hover:opacity-80 transition-opacity"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                              {article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {article.reading_time_minutes || 5} min
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  
                  <MPUAd />
                </div>
              </div>
            </section>
          ) : (
            // Standard Layout for Other Categories
            <section className="mb-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Featured Article - Larger Card on Left */}
                {featuredArticle && (
                  <div className="lg:col-span-8">
                    <Card className="overflow-hidden hover:shadow-xl transition-shadow group">
                      <Link to={`/${featuredArticle.categories?.slug || 'news'}/${featuredArticle.slug}`}>
                        <div className="relative aspect-[16/9] overflow-hidden">
                          <img 
                            src={featuredArticle.featured_image_url} 
                            alt={featuredArticle.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-primary text-primary-foreground">
                              Featured
                            </Badge>
                          </div>
                        </div>
                        <div className="p-6">
                          <h2 className="headline text-2xl md:text-3xl mb-3 group-hover:text-primary transition-colors">
                            {featuredArticle.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                          </h2>
                          <p className="text-muted-foreground mb-4 line-clamp-2">
                            {featuredArticle.excerpt}
                          </p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{featuredArticle.authors?.name}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {featuredArticle.reading_time_minutes || 5} min
                            </span>
                          </div>
                        </div>
                      </Link>
                    </Card>
                  </div>
                )}

                {/* Right Column: Latest + Ad */}
                <div className="lg:col-span-4 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Latest
                    </h3>
                    <div className="space-y-3">
                      {latestArticles.slice(0, 4).map((article) => (
                        <Link 
                          key={article.id}
                          to={`/${article.categories?.slug || 'news'}/${article.slug}`}
                          className="flex gap-3 group"
                        >
                          <img 
                            src={article.featured_image_url} 
                            alt={article.title}
                            className="w-20 h-20 object-cover rounded-lg flex-shrink-0 group-hover:opacity-80 transition-opacity"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                              {article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              {article.reading_time_minutes || 5} min
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  
                  <MPUAd />
                </div>
              </div>
            </section>
          )}


          {/* Editor's Pick - Horizontal Layout (shown for all categories) */}
          {editorsPick && (
            <section className="mb-12">
              <Card className="overflow-hidden hover:shadow-xl transition-shadow group">
                <Link to={`/${editorsPick.categories?.slug || 'news'}/${editorsPick.slug}`} className="flex flex-col md:flex-row gap-0">
                  <div className="md:w-2/5 relative aspect-video md:aspect-auto overflow-hidden">
                    <img 
                      src={editorsPick.featured_image_url} 
                      alt={editorsPick.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="md:w-3/5 p-6 md:p-8 flex flex-col justify-center">
                    <Badge className="w-fit mb-3 bg-editorial text-editorial-foreground hover:bg-editorial/90">
                      Editor's Pick
                    </Badge>
                    <h2 className="headline text-2xl md:text-3xl mb-4 group-hover:text-primary transition-colors">
                      {editorsPick.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                    </h2>
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {editorsPick.excerpt}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        {editorsPick.authors?.name}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {editorsPick.reading_time_minutes || 5} min read
                      </span>
                      {editorsPick.published_at && (
                        <>
                          <span>•</span>
                          <span>
                            {new Date(editorsPick.published_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </Card>
            </section>
          )}

          {/* Most Read / Talk of the Town - List Layout */}
          {mostReadArticles && mostReadArticles.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">
                  {category?.slug === 'voices' ? 'Talk of the Town' : 'Most Read'}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mostReadArticles.slice(0, 4).map((article, index) => (
                  <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                    <Link to={`/${article.categories?.slug || 'news'}/${article.slug}`} className="flex gap-4 p-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors mb-2">
                          {article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{article.authors?.name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.view_count || Math.floor(Math.random() * 5000) + 1000} views
                          </span>
                        </div>
                      </div>
                      <img 
                        src={article.featured_image_url} 
                        alt={article.title}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Inline Newsletter Signup */}
          <InlineNewsletterSignup />

          {/* Trending Articles - Horizontal Scroll */}
          {trendingArticles && trendingArticles.length > 0 && (
            <section className="mb-12 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/20">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-orange-600" />
                Trending Now
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {trendingArticles.map((article, index) => (
                  <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow group relative">
                    <Link to={`/${article.categories?.slug || 'news'}/${article.slug}`}>
                      <div className="absolute top-2 left-2 z-10 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="relative aspect-video overflow-hidden">
                        <img 
                          src={article.featured_image_url} 
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                        </h3>
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Mid-scroll Full Width Banner Ad */}
          <section className="mb-12 -mx-4 md:mx-0">
            <div className="flex justify-center">
              <PromptAndGoBanner />
            </div>
          </section>

          {/* Articles by Popular Tags */}
          {tagArticlesData && tagArticlesData.length > 0 && (
            <>
              {tagArticlesData.map((tagData, tagIndex) => (
                <section key={tagData.tag.id} className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <TagIcon className="h-6 w-6 text-primary" />
                      {tagData.tag.name}
                    </h2>
                    <Link to={`/tag/${tagData.tag.slug}`}>
                      <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-colors gap-1">
                        View all
                        <ArrowRight className="h-3 w-3" />
                      </Badge>
                    </Link>
                  </div>

                  {/* Alternate layouts for each tag section */}
                  {tagIndex % 2 === 0 ? (
                    // Grid layout
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {tagData.articles.map((article) => (
                        <ArticleCard
                          key={article.id}
                          title={article.title}
                          excerpt={article.excerpt || ""}
                          category={article.categories?.name || category?.name || ""}
                          categorySlug={article.categories?.slug || category?.slug || "uncategorized"}
                          author={article.authors?.name || ""}
                          readTime={`${article.reading_time_minutes || 5} min read`}
                          image={article.featured_image_url || ""}
                          slug={article.slug}
                          isTrending={article.is_trending || false}
                          commentCount={article.comment_count || 0}
                        />
                      ))}
                    </div>
                  ) : (
                    // List layout with larger images
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {tagData.articles.map((article) => (
                        <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          <Link to={`/${article.categories?.slug || 'news'}/${article.slug}`} className="flex flex-col sm:flex-row gap-4 p-4">
                            <img 
                              src={article.featured_image_url} 
                              alt={article.title}
                              className="w-full sm:w-32 h-32 object-cover rounded-lg flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors mb-2">
                                {article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {article.excerpt}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{article.authors?.name}</span>
                                <span>•</span>
                                <span>{article.reading_time_minutes || 5} min</span>
                              </div>
                            </div>
                          </Link>
                        </Card>
                      ))}
                    </div>
                  )}

                  {tagIndex < tagArticlesData.length - 1 && (
                    <Separator className="mt-12" />
                  )}
                </section>
              ))}
            </>
          )}

          {/* More Articles + Popular This Month Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main: More Articles */}
            <div className="lg:col-span-8">
              {moreArticles.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold mb-6">
                    {category?.slug === 'voices' ? 'More from Voices' : `More from ${category?.name}`}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(showAllArticles ? moreArticles : moreArticles.slice(0, 9)).map((article) => (
                      <Card key={article.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <Link to={`/${article.categories?.slug || 'news'}/${article.slug}`}>
                          <div className="relative aspect-video overflow-hidden">
                            <img 
                              src={article.featured_image_url} 
                              alt={article.title}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                          <div className="p-3">
                            <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors mb-2">
                              {article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {article.reading_time_minutes || 5} min
                            </p>
                          </div>
                        </Link>
                      </Card>
                    ))}
                  </div>
                  
                  {!showAllArticles && moreArticles.length > 9 && (
                    <div className="flex justify-center mt-8">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setIsLoadingMore(true);
                          setTimeout(() => {
                            setShowAllArticles(true);
                            setIsLoadingMore(false);
                          }, 300);
                        }}
                        disabled={isLoadingMore}
                        className="gap-2"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            Load More Articles
                            <Badge variant="secondary" className="ml-1">
                              +{moreArticles.length - 9}
                            </Badge>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </section>
              )}

              {!articles || articles.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No articles found in this category.</p>
                </div>
              )}
            </div>

            {/* Sidebar: Popular This Month (desktop only) */}
            <aside className="hidden lg:block lg:col-span-4">
              {popularThisMonth && popularThisMonth.length > 0 && (
                <div className="sticky top-24">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    Popular this month
                  </h3>
                  <div className="space-y-4">
                    {popularThisMonth.map((article: any, index: number) => (
                      <Link
                        key={article.id}
                        to={`/${article.categories?.slug || slug}/${article.slug}`}
                        className="flex gap-3 group"
                      >
                        <span className="text-2xl font-bold text-muted-foreground/40 w-6 shrink-0 text-right">
                          {index + 1}
                        </span>
                        <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {article.title?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                        </h4>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
            </>
          )}
        </div>
      </main>

      <ExploreMoreButton />
      <Footer />
    </div>
  );
};

export default Category;
