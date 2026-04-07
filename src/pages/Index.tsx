import { useState, useEffect, lazy, Suspense, memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OrganizationStructuredData, WebSiteStructuredData } from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Users, Loader2, BookOpen, Check } from "lucide-react";

import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

import { Skeleton } from "@/components/ui/skeleton";
import RecommendedGuides from "@/components/RecommendedGuides";
import WeeklyStats from "@/components/WeeklyStats";
import HomepageStatsBar from "@/components/HomepageStatsBar";
import FeaturedToolsCarousel from "@/components/FeaturedToolsCarousel";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { isNewsletterSubscribed as checkSubscribed, markNewsletterSubscribed, awardNewsletterPoints } from "@/lib/newsletterUtils";
import NotificationPrompt from "@/components/NotificationPrompt";

const MostDiscussedSection = lazy(() => import("@/components/MostDiscussedSection").catch(() => { safeReloadOnce(); return import("@/components/MostDiscussedSection"); }));
const ThreeBeforeNineTicker = lazy(() => import("@/components/ThreeBeforeNineTicker").catch(() => { safeReloadOnce(); return import("@/components/ThreeBeforeNineTicker"); }));
const safeReloadOnce = () => {
  const key = 'chunk_reload_attempted';
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1');
    window.location.reload();
  }
};

const TrendingVisualStrip = lazy(() => import("@/components/TrendingVisualStrip").catch(() => { safeReloadOnce(); return import("@/components/TrendingVisualStrip"); }));
const RecommendedArticles = lazy(() => import("@/components/RecommendedArticles").catch(() => { safeReloadOnce(); return import("@/components/RecommendedArticles"); }));
const EditorsPick = lazy(() => import("@/components/EditorsPick").catch(() => { safeReloadOnce(); return import("@/components/EditorsPick"); }));
const UpcomingEvents = lazy(() => import("@/components/UpcomingEvents").catch(() => { safeReloadOnce(); return import("@/components/UpcomingEvents"); }));
const ForYouSection = lazy(() => import("@/components/ForYouSection").catch(() => { safeReloadOnce(); return import("@/components/ForYouSection"); }));
const ThreeBeforeNineLanding = lazy(() => import("@/components/ThreeBeforeNineLanding").catch(() => { safeReloadOnce(); return import("@/components/ThreeBeforeNineLanding"); }));
import { getOptimizedAvatar, getOptimizedHeroImage, getOptimizedThumbnail, generateResponsiveSrcSet } from "@/lib/imageOptimization";
import { getCategoryColor } from "@/lib/categoryColors";

/** Accent colour for guide pillar values */
const getGuidePillarColor = (pillar: string | null | undefined): string => {
  switch ((pillar || '').toLowerCase()) {
    case 'learn': return '#5F72FF';   // blue
    case 'prompts': return '#D97706'; // amber
    case 'toolbox': return '#0D9488'; // teal
    default: return '#5F72FF';
  }
};
import ExploreMoreButton from "@/components/ExploreMoreButton";
import AdUnit from "@/components/AdUnit";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// Editorial freshness labels for homepage articles - selective to be meaningful
const getFreshnessLabel = (publishedAt: string | null, updatedAt: string | null, isCornerstone?: boolean): string | null => {
  if (!publishedAt) return null;
  
  const now = new Date();
  const published = new Date(publishedAt);
  const updated = updatedAt ? new Date(updatedAt) : null;
  
  const hoursSincePublished = (now.getTime() - published.getTime()) / (1000 * 60 * 60);
  const daysSincePublished = Math.floor(hoursSincePublished / 24);
  const hoursSinceUpdated = updated ? (now.getTime() - updated.getTime()) / (1000 * 60 * 60) : null;
  
  if (hoursSinceUpdated !== null && hoursSinceUpdated <= 72 && updated && published && updated.getTime() > published.getTime() + 86400000) {
    return "Updated recently";
  }
  
  if (hoursSincePublished <= 24) {
    return "Just in";
  }
  
  if (isCornerstone) {
    return "Ongoing coverage";
  }
  
  if (daysSincePublished <= 3) {
    return "This week";
  }
  
  return null;
};

const GRID_ASIA_KEYWORDS = [
  "asia", "singapore", "malaysia", "thailand", "vietnam", "indonesia", "philippines",
  "japan", "korea", "china", "india", "hong-kong", "taiwan",
  "sea", "asean", "southeast", "bangkok", "manila", "jakarta",
  "mumbai", "delhi", "tokyo", "seoul",
];

const isAsiaFocused = (slug: string, title: string) => {
  const lower = (slug + " " + title).toLowerCase();
  return GRID_ASIA_KEYWORDS.some(kw => lower.includes(kw));
};

const Index = () => {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false);
  const [isNewsletterSubscribed, setIsNewsletterSubscribed] = useState(checkSubscribed());
  const [enableSecondaryQueries, setEnableSecondaryQueries] = useState(false);
  
  const { user } = useAuth();
  
  useAutoRefresh();

  // Trigger daily featured content refresh
  useEffect(() => {
    const LAST_REFRESH_KEY = 'homepage-featured-refresh-date';
    const today = new Date().toISOString().slice(0, 10);
    const lastRefresh = localStorage.getItem(LAST_REFRESH_KEY);
    if (lastRefresh !== today) {
      localStorage.setItem(LAST_REFRESH_KEY, today);
      supabase.functions.invoke('auto-refresh-featured-content', { body: { force: true } }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setEnableSecondaryQueries(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Inject NewsMediaOrganization JSON-LD
  useEffect(() => {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsMediaOrganization",
      name: "AI in Asia",
      url: "https://www.aiinasia.com",
      logo: "https://www.aiinasia.com/og-image.png",
      description: "Independent AI news and analysis covering artificial intelligence developments across the Asia-Pacific region.",
      foundingDate: "2024",
      areaServed: { "@type": "Place", name: "Asia-Pacific" },
      publishingPrinciples: "https://www.aiinasia.com/about",
      sameAs: [
        "https://www.facebook.com/profile.php?id=61561997634431",
        "https://www.instagram.com/aiinasia",
        "https://www.youtube.com/@AIinAsia",
        "https://www.tiktok.com/@aiinasia",
        "https://x.com/AI_in_Asia",
      ],
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-jsonld", "news-media-org");
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  // Optimized: Fetch homepage articles and trending in a single efficient query
  const { data: homepageData, isLoading } = useQuery({
    queryKey: ["homepage-articles"],
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const oneMonthAgoISO = oneMonthAgo.toISOString();

      const articleFields = `
        id, title, slug, excerpt, featured_image_url, reading_time_minutes,
        published_at, updated_at, cornerstone, sticky, primary_category_id,
        comment_count, is_trending, article_type,
        authors:authors_public!articles_author_id_fkey (name, slug),
        categories:primary_category_id (name, slug)
      `;

      // Fetch featured articles, latest backfill, and guides in parallel
      const [featuredResult, backfillResult, guidesResult] = await Promise.all([
        supabase
          .from("articles")
          .select(articleFields)
          .eq("status", "published")
          .eq("featured_on_homepage", true)
          .gte("published_at", oneMonthAgoISO)
          .neq("article_type", "three_before_nine")
          .order("sticky", { ascending: false })
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(18),
        supabase
          .from("articles")
          .select(articleFields)
          .eq("status", "published")
          .neq("article_type", "three_before_nine")
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(24),
        supabase
          .from("ai_guides")
          .select("id, title, slug, excerpt, featured_image_url, read_time_minutes, published_at, pillar, guide_category")
          .eq("status", "published")
          .not("featured_image_url", "is", null)
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(10),
      ]);

      if (featuredResult.error) throw featuredResult.error;
      const featuredArticles = featuredResult.data || [];
      const backfillArticles = backfillResult.data || [];
      const guides = guidesResult.data || [];

      // Merge featured + backfill, deduplicating, featured/sticky first
      const seenIds = new Set<string>();
      const allArticles: any[] = [];
      for (const a of featuredArticles) {
        if (!seenIds.has(a.id)) { seenIds.add(a.id); allArticles.push(a); }
      }
      for (const a of backfillArticles) {
        if (!seenIds.has(a.id)) { seenIds.add(a.id); allArticles.push(a); }
      }

      // Tag and normalise both types
      const taggedArticles = allArticles.map((a: any) => ({ ...a, content_type: 'article' as const }));
      const taggedGuides = guides.map((g: any) => ({
        ...g,
        content_type: 'guide' as const,
        reading_time_minutes: g.read_time_minutes,
        categories: { name: g.guide_category || 'Guide', slug: g.pillar || 'learn' },
        authors: null,
        comment_count: 0,
        is_trending: false,
        cornerstone: false,
        updated_at: g.published_at,
        sticky: false,
      }));

      // Merge and sort by published_at descending
      const merged = [...taggedArticles, ...taggedGuides].sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      });

      if (merged.length === 0) return { featured: null, latest: [], trending: [] };

      const featured = merged[0];
      const latest = merged.slice(1, 16);

      const { data: trendingData } = await supabase
        .from("articles")
        .select(`
          id, title, slug, excerpt, featured_image_url, reading_time_minutes,
          published_at, updated_at, cornerstone, view_count, primary_category_id,
          comment_count, homepage_trending, is_trending,
          authors:authors_public!articles_author_id_fkey (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .eq("homepage_trending", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(5);

      return { featured, latest, trending: trendingData || [] };
    },
  });

  const featuredArticle = homepageData?.featured;
  const latestArticles = homepageData?.latest;
  const baseTrendingArticles = homepageData?.trending;

  // Compute hero section IDs (primary + 4 secondary cards)
  const secondaryHeroArticles = latestArticles?.filter((a: any) => a.slug && a.id !== featuredArticle?.id).slice(0, 4) || [];
  const heroSectionIds = [
    featuredArticle?.id,
    ...secondaryHeroArticles.map((a: any) => a.id),
  ].filter(Boolean) as string[];

  // trendingExcludeIds used by TrendingVisualStrip
  const trendingExcludeIds = heroSectionIds;

  // Defer featured authors
  const { data: featuredAuthors } = useQuery({
    queryKey: ["featured-authors"],
    enabled: enableSecondaryQueries,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("authors_public")
        .select("*")
        .eq("is_featured", true)
        .neq("name", "Intelligence Desk")
        .order("article_count", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
  });

  // Editor's picks
  const { data: editorsPicks } = useQuery({
    queryKey: ["editors-picks-combined", homepageData?.featured?.id],
    enabled: enableSecondaryQueries,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editors_picks")
        .select(`
          location, article_id,
          articles (*, authors:authors_public!articles_author_id_fkey (name, slug), categories:primary_category_id (name, slug))
        `)
        .in("location", ["homepage", "trending-featured"]);
      if (error) throw error;
      const homepagePick = data?.find(p => p.location === "homepage");
      const trendingPick = data?.find(p => p.location === "trending-featured");
      return {
        homepage: homepagePick?.articles && (homepagePick.articles as any).id !== homepageData?.featured?.id ? homepagePick.articles : null,
        trendingFeatured: trendingPick?.articles
      };
    },
  });

  const editorsPick = editorsPicks?.homepage || null;
  const trendingFeatured = editorsPicks?.trendingFeatured || null;

  const trendingArticles = (() => {
    if (!baseTrendingArticles || baseTrendingArticles.length === 0) return [];
    const validBase = baseTrendingArticles;
    const validTrendingFeatured = trendingFeatured && (trendingFeatured as any).homepage_trending ? trendingFeatured : null;

    // Recency-weighted: prioritize articles from last 30 days, then 60, then 90, then any
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const sortByRecencyTier = (articles: any[]) => {
      return [...articles].sort((a, b) => {
        const ageA = now - new Date(a.published_at).getTime();
        const ageB = now - new Date(b.published_at).getTime();
        const tierA = ageA <= 30 * dayMs ? 0 : ageA <= 60 * dayMs ? 1 : ageA <= 90 * dayMs ? 2 : 3;
        const tierB = ageB <= 30 * dayMs ? 0 : ageB <= 60 * dayMs ? 1 : ageB <= 90 * dayMs ? 2 : 3;
        if (tierA !== tierB) return tierA - tierB;
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      });
    };

    const sorted = sortByRecencyTier(validBase);
    if (validTrendingFeatured) {
      return [validTrendingFeatured, ...sorted.filter((a: any) => a.id !== (validTrendingFeatured as any).id)];
    }
    return sorted;
  })();

  // Fetch trending strip article IDs for deduplication with grid
  const { data: trendingStripRawArticles } = useQuery({
    queryKey: ["trending-strip-ids"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("id")
        .eq("status", "published")
        .eq("is_trending", true)
        .order("trending_score", { ascending: false, nullsFirst: false })
        .limit(12);
      return data || [];
    },
  });

  // Fetch all published guides for grid mixing (randomisation is client-side, cached data still shuffled fresh)
  const { data: allPublishedGuides } = useQuery({
    queryKey: ["grid-all-guides"],
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_guides")
        .select("id, title, slug, featured_image_url, excerpt, read_time_minutes, published_at")
        .eq("status", "published")
        .not("featured_image_url", "is", null)
        .order("published_at", { ascending: false });
      return data || [];
    },
  });

  // Compute which article IDs the trending strip is showing
  const trendingStripShownIds = useMemo(() => {
    if (!trendingStripRawArticles) return [] as string[];
    const heroSet = new Set(heroSectionIds);
    return trendingStripRawArticles
      .filter(a => !heroSet.has(a.id))
      .slice(0, 4)
      .map(a => a.id);
  }, [trendingStripRawArticles, heroSectionIds]);

  // Compute which guide IDs the trending strip shows (daily seed)
  const trendingStripGuideIds = useMemo(() => {
    if (!allPublishedGuides || allPublishedGuides.length === 0) return [] as string[];
    const today = new Date().toISOString().slice(0, 10);
    let seed = 0;
    for (let i = 0; i < today.length; i++) seed = ((seed << 5) - seed + today.charCodeAt(i)) | 0;
    seed = Math.abs(seed);
    const tKw = ["singapore", "malaysia", "thailand", "vietnam", "indonesia", "philippines",
      "japan", "korea", "china", "india", "hong-kong", "taiwan", "bahasa", "halal",
      "hdb", "bto", "cpf", "iras", "ns-national"];
    const asian = allPublishedGuides.filter(g => tKw.some(kw => g.slug.includes(kw)));
    const general = allPublishedGuides.filter(g => !tKw.some(kw => g.slug.includes(kw)));
    const ids: string[] = [];
    if (asian.length) ids.push(asian[seed % asian.length].id);
    if (general.length) ids.push(general[(seed + 7) % general.length].id);
    return ids;
  }, [allPublishedGuides]);

  // Pick 3+ guides for the grid (randomized, at least 1 Asia-focused, deduped)
  const gridGuides = useMemo(() => {
    if (!allPublishedGuides || allPublishedGuides.length === 0) return [];
    const excludeSet = new Set(trendingStripGuideIds);
    const eligible = allPublishedGuides.filter(g => !excludeSet.has(g.id));
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const asiaGuides = shuffled.filter(g => isAsiaFocused(g.slug, g.title));
    const picked: typeof eligible = [];
    const pickedIds = new Set<string>();
    if (asiaGuides.length > 0) {
      picked.push(asiaGuides[0]);
      pickedIds.add(asiaGuides[0].id);
    }
    for (const g of shuffled) {
      if (picked.length >= 3) break;
      if (!pickedIds.has(g.id)) {
        picked.push(g);
        pickedIds.add(g.id);
      }
    }
    return picked;
  }, [allPublishedGuides, trendingStripGuideIds]);

  // All IDs shown above the grid (hero + trending strip)
  const aboveGridIds = useMemo(() => {
    return new Set([...heroSectionIds, ...trendingStripShownIds]);
  }, [heroSectionIds, trendingStripShownIds]);

  // Grid articles: 5-7 items, deduped against hero + trending strip, category-diverse
  const gridArticles = useMemo(() => {
    const seen = new Set(aboveGridIds);
    const candidates = [
      ...(latestArticles?.filter((a: any) => a.slug && a.article_type !== 'three_before_nine') || []),
      ...(trendingArticles || []),
    ];
    const deduped: any[] = [];
    for (const a of candidates) {
      if (!seen.has(a.id) && a.slug) {
        seen.add(a.id);
        deduped.push(a);
      }
    }
    // Sort by published_at descending
    deduped.sort((a, b) => {
      const da = a.published_at ? new Date(a.published_at).getTime() : 0;
      const db = b.published_at ? new Date(b.published_at).getTime() : 0;
      return db - da;
    });
    // Pick category-diverse: one per unique category first, then fill remaining
    const result: any[] = [];
    const usedCategories = new Set<string>();
    // First pass: one article per unique category
    for (const a of deduped) {
      if (result.length >= 7) break;
      const catId = a.primary_category_id || 'uncategorized';
      if (!usedCategories.has(catId)) {
        usedCategories.add(catId);
        result.push(a);
      }
    }
    // Second pass: fill remaining slots
    for (const a of deduped) {
      if (result.length >= 7) break;
      if (!result.includes(a)) {
        result.push(a);
      }
    }
    return result;
  }, [aboveGridIds, trendingArticles, latestArticles]);

  // postGridIds for downstream sections
  const gridSectionIds = gridArticles.map((a: any) => a.id);
  const gridGuideIds = gridGuides.map(g => g.id);
  const postGridIds = [...new Set([...heroSectionIds, ...trendingStripShownIds, ...gridSectionIds, ...gridGuideIds])];
  const heroLatestIds = postGridIds;

  const handleNewsletterSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsNewsletterSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const rawData = { email: formData.get('email') as string };

    try {
      const email = (rawData.email || '').trim();
      if (!isValidEmail(email)) {
        toast.error("Invalid email address");
        setIsNewsletterSubmitting(false);
        return;
      }
      const { data: existing } = await supabase
        .from("newsletter_subscribers")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        toast("Already subscribed", { description: "This email is already subscribed to our newsletter." });
        setIsNewsletterSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email });
      if (error) throw error;

      setIsNewsletterSubscribed(true);
      markNewsletterSubscribed();
      await awardNewsletterPoints(user?.id ?? null, supabase);
      toast("Successfully subscribed!", {
        description: user ? "You earned 25 points and the Newsletter Insider badge!" : "Welcome aboard! Check your inbox for our latest insights.",
      });
      (e.target as HTMLFormElement).reset();
      setNewsletterEmail("");
    } catch (error) {
      toast.error("Error", { description: "Failed to subscribe. Please try again." });
    } finally {
      setIsNewsletterSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="AI in ASIA — AI Hype to Real-World Impact in Asia"
        description="Your trusted source for AI news, insights, and education across Asia-Pacific. Breaking news, expert analysis, and practical guides on artificial intelligence."
        canonical="https://aiinasia.com/"
        ogImage="https://aiinasia.com/icons/aiinasia-512.png?v=3"
        ogImageAlt="AI in ASIA - AI News from Asia"
      >
        <link rel="alternate" type="application/rss+xml" title="AI in Asia RSS Feed" href="/rss.xml" />
        <link rel="preconnect" href={import.meta.env.VITE_SUPABASE_URL} />
        <link rel="dns-prefetch" href={import.meta.env.VITE_SUPABASE_URL} />
        {featuredArticle?.featured_image_url && (
          <link 
            rel="preload" as="image" 
            href={getOptimizedHeroImage(featuredArticle.featured_image_url, 1280)}
            imageSrcSet={featuredArticle.featured_image_url.includes('supabase.co/storage') ? generateResponsiveSrcSet(featuredArticle.featured_image_url, [640, 960, 1280]) : undefined}
            imageSizes="(max-width: 768px) 100vw, 640px"
          />
        )}
        {!featuredArticle && trendingArticles?.[0]?.featured_image_url && (
          <link 
            rel="preload" as="image" 
            href={getOptimizedHeroImage(trendingArticles[0].featured_image_url, 1280)}
            imageSrcSet={trendingArticles[0].featured_image_url.includes('supabase.co/storage') ? generateResponsiveSrcSet(trendingArticles[0].featured_image_url, [640, 960, 1280]) : undefined}
            imageSizes="(max-width: 768px) 100vw, 640px"
          />
        )}
      </SEOHead>
      
      <OrganizationStructuredData />
      <WebSiteStructuredData />
      
      <Header />
      <Suspense fallback={null}>
        <ThreeBeforeNineTicker />
      </Suspense>
      <NotificationPrompt />
      
      <main id="main-content" className="flex-1">
        {/* SEO H1 */}
        <h1 className="sr-only">AI News, Insights & Innovation Across Asia-Pacific</h1>


        

        {/* Hero: Lead Story (65%) + Secondary Stories (35%) — two-column */}
        <section className="container mx-auto px-4 pt-3 pb-3">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* PRIMARY STORY */}
            <div className="lg:col-span-8">
              {isLoading ? (
                <div className="relative h-[400px] md:h-[480px] rounded-lg overflow-hidden">
                  <Skeleton className="absolute inset-0" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-8 md:h-10 w-full max-w-[500px]" />
                    <Skeleton className="h-8 md:h-10 w-3/4 max-w-[380px]" />
                    <Skeleton className="h-4 w-full max-w-[450px] hidden md:block" />
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-2" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ) : new Date().toISOString().slice(0, 10) === "2026-03-01" ? (
                <Link to="/guides/startup" className="block group">
                  <div className="relative h-[400px] md:h-[480px] overflow-hidden rounded-lg">
                    <img
                      src="/images/startup-guides-hero.webp"
                      alt="AI guides for startup founders"
                      loading="eager" decoding="async" fetchPriority="high"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      width={1280} height={480}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 via-50% to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="text-white text-xs backdrop-blur-sm" style={{ backgroundColor: '#E5A54B', padding: '6px 14px' }}>Guides</Badge>
                        <Badge className="bg-emerald-600 text-white text-xs backdrop-blur-sm" style={{ padding: '6px 14px' }}>Featured</Badge>
                      </div>
                      <h2 className="text-white font-bold text-[28px] sm:text-[34px] md:text-[42px] leading-[1.15] mb-2 line-clamp-3 group-hover:text-primary transition-colors" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
                        AI guides for startup founders building and scaling their businesses
                      </h2>
                      <div className="flex items-center gap-3 text-white/50 text-[12px]">
                        <span>Explore our startup guides collection</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : featuredArticle && featuredArticle.slug ? (() => {
                const heroLink = featuredArticle.content_type === 'guide'
                  ? `/guides/${featuredArticle.categories?.slug || 'learn'}/${featuredArticle.slug}`
                  : `/${featuredArticle.categories?.slug || 'news'}/${featuredArticle.slug}`;
                const heroCatColor = featuredArticle.content_type === 'guide'
                  ? getGuidePillarColor(featuredArticle.categories?.slug)
                  : getCategoryColor(featuredArticle.categories?.slug);
                return (
                <Link to={heroLink} className="block group">
                  <div className="relative h-[400px] md:h-[480px] overflow-hidden rounded-lg">
                    <img
                      src={getOptimizedHeroImage(featuredArticle.featured_image_url || "/placeholder.svg", 1280)}
                      srcSet={featuredArticle.featured_image_url?.includes('supabase.co/storage') ? generateResponsiveSrcSet(featuredArticle.featured_image_url, [640, 960, 1280]) : undefined}
                      sizes="(max-width: 768px) 100vw, 65vw"
                      alt={featuredArticle.title}
                      loading="eager" decoding="async" fetchPriority="high"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      width={1280} height={480}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 via-50% to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className="text-white text-xs backdrop-blur-sm" style={{ backgroundColor: heroCatColor, padding: '6px 14px' }}>{featuredArticle.content_type === 'guide' ? `${featuredArticle.categories?.name || 'Guide'}` : (featuredArticle.categories?.name || "Uncategorized")}</Badge>
                        {featuredArticle.is_trending && (
                          <Badge className="text-white flex items-center gap-1 text-xs backdrop-blur-sm" style={{ backgroundColor: '#E06050', padding: '6px 14px' }}><TrendingUp className="h-3 w-3" />Trending</Badge>
                        )}
                        {getFreshnessLabel(featuredArticle.published_at, featuredArticle.updated_at, featuredArticle.cornerstone) && (
                          <Badge className="bg-emerald-600 text-white text-xs backdrop-blur-sm" style={{ padding: '6px 14px' }}>{getFreshnessLabel(featuredArticle.published_at, featuredArticle.updated_at, featuredArticle.cornerstone)}</Badge>
                        )}
                      </div>
                      <h2 className="hero-shimmer-text font-bold text-[28px] sm:text-[34px] md:text-[42px] leading-[1.15] mb-2 line-clamp-3 group-hover:text-primary transition-colors" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
                        {featuredArticle.title}
                      </h2>
                      <p className="text-[16px] leading-[1.5] line-clamp-2 mb-2 max-w-2xl hidden md:block" style={{ color: '#B0BEC5' }}>{featuredArticle.excerpt}</p>
                      <div className="flex items-center gap-3 text-white/50 text-[12px]">
                        {featuredArticle.published_at && (
                          <span>{new Date(featuredArticle.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        )}
                        <span>•</span>
                        <span>{featuredArticle.reading_time_minutes || 5} min read</span>
                        {featuredArticle.authors?.name && (
                          <>
                            <span>•</span>
                            <span>{featuredArticle.authors.name}</span>
                          </>
                        )}
                        {featuredArticle.comment_count > 0 && (
                          <>
                            <span>•</span>
                            <span>{featuredArticle.comment_count} {featuredArticle.comment_count === 1 ? 'comment' : 'comments'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
                );
              })() : trendingArticles.length > 0 && trendingArticles[0]?.slug ? (
                <Link to={`/${trendingArticles[0].categories?.slug || 'news'}/${trendingArticles[0].slug}`} className="block group">
                  <div className="relative h-[400px] md:h-[480px] overflow-hidden rounded-lg">
                    <img
                      src={getOptimizedHeroImage(trendingArticles[0].featured_image_url || "/placeholder.svg", 1280)}
                      srcSet={trendingArticles[0].featured_image_url?.includes('supabase.co/storage') ? generateResponsiveSrcSet(trendingArticles[0].featured_image_url, [640, 960, 1280]) : undefined}
                      sizes="(max-width: 768px) 100vw, 65vw"
                      alt={trendingArticles[0].title}
                      loading="eager" fetchPriority="high"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      width={1280} height={480}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 via-50% to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className="text-white text-xs backdrop-blur-sm" style={{ backgroundColor: getCategoryColor(trendingArticles[0].categories?.slug), padding: '6px 14px' }}>{trendingArticles[0].categories?.name || "Uncategorized"}</Badge>
                        {trendingArticles[0].is_trending && (
                          <Badge className="text-white flex items-center gap-1 text-xs backdrop-blur-sm" style={{ backgroundColor: '#E06050', padding: '6px 14px' }}><TrendingUp className="h-3 w-3" />Trending</Badge>
                        )}
                      </div>
                      <h2 className="text-white font-bold text-[28px] sm:text-[34px] md:text-[42px] leading-[1.15] mb-2 line-clamp-3 group-hover:text-primary transition-colors" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
                        {trendingArticles[0].title}
                      </h2>
                      <p className="text-[16px] leading-[1.5] line-clamp-2 mb-2 max-w-2xl hidden md:block" style={{ color: '#B0BEC5' }}>{trendingArticles[0].excerpt}</p>
                      <div className="flex items-center gap-3 text-white/50 text-[12px]">
                        {trendingArticles[0].published_at && <span>{new Date(trendingArticles[0].published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                        <span>•</span>
                        <span>{trendingArticles[0].reading_time_minutes || 5} min read</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : null}
            </div>

            {/* SECONDARY STORIES — 4 visual mini-cards with image on top */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3 lg:h-[480px]">
              {isLoading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-border/50 flex flex-col" style={{ borderTop: '3px solid hsl(var(--muted))' }}>
                      <div className="relative w-full h-[150px] overflow-hidden">
                        <Skeleton className="w-full h-full" />
                      </div>
                      <div className="p-2.5 flex flex-col flex-1 space-y-1.5">
                        <Skeleton className="h-2.5 w-14 rounded-sm" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex items-center gap-2 mt-auto pt-1">
                          <Skeleton className="h-2.5 w-12" />
                          <Skeleton className="h-2.5 w-1" />
                          <Skeleton className="h-2.5 w-14" />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (() => {
                const secondaryArticles = latestArticles?.filter((article: any) =>
                  article.slug && article.id !== featuredArticle?.id
                ).slice(0, 4) || [];

                return secondaryArticles.map((article: any) => {
                  const isGuide = article.content_type === 'guide';
                  const categorySlug = article.categories?.slug || (isGuide ? 'learn' : 'news');
                  const catColor = isGuide ? getGuidePillarColor(categorySlug) : getCategoryColor(categorySlug);
                  const itemLink = isGuide
                    ? `/guides/${categorySlug}/${article.slug}`
                    : `/${categorySlug}/${article.slug}`;
                  return (
                    <Link
                      key={article.id}
                      to={itemLink}
                      className="group rounded-lg overflow-hidden border border-border/50 hover:border-border transition-all duration-200 flex flex-col"
                      style={{ borderLeft: `3px solid ${catColor}` }}
                    >
                      <div className="relative w-full h-[150px] overflow-hidden">
                        <img
                          src={getOptimizedThumbnail(article.featured_image_url || "/placeholder.svg", 400, 220)}
                          alt={article.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          width={400} height={220}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                      </div>
                      <div className="p-2.5 flex flex-col flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: catColor }}>
                          {isGuide ? `${article.categories?.name || 'Guide'}` : (article.categories?.name || "Uncategorized")}
                        </span>
                        <h3 className="font-semibold text-[14px] leading-[1.3] line-clamp-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-auto pt-1">
                          {article.published_at && (
                            <span>{new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          )}
                          <span>·</span>
                          <span>{article.reading_time_minutes || 5} min</span>
                          {article.comment_count > 0 && (
                            <>
                              <span>·</span>
                              <span>{article.comment_count} {article.comment_count === 1 ? 'comment' : 'comments'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                });
              })()}
            </div>

            {/* View all latest articles link */}
            <div className="lg:col-span-12 flex justify-end mt-2">
              <Link to="/articles" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                View all latest articles →
              </Link>
            </div>
          </div>
        </section>

        {/* Newsletter CTA below hero */}
        <section className="py-10 md:py-14" style={{ background: 'linear-gradient(135deg, hsl(270 60% 12%), hsl(220 60% 14%))' }}>
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">Stay Ahead of Asia's AI Revolution</h2>
            <p className="text-muted-foreground text-sm md:text-base mb-6 max-w-lg mx-auto">Get curated AI news, expert analysis, and free tools delivered weekly.</p>
            {!isNewsletterSubscribed ? (
              <form onSubmit={handleNewsletterSignup} className="max-w-md mx-auto">
                <div className="flex gap-2">
                  <Input
                    id="hero-newsletter-email" name="email" type="email" required maxLength={255}
                    placeholder="your@email.com" className="flex-1 bg-background/80 text-foreground border-border/50"
                    value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)}
                  />
                  <Button type="submit" className="bg-[#F28C0F] hover:bg-[#F28C0F]/90 text-black font-bold px-6" disabled={isNewsletterSubmitting}>
                    {isNewsletterSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-2">No spam. Unsubscribe anytime.</p>
              </form>
            ) : (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-foreground font-semibold">You're subscribed! ✓</p>
              </div>
            )}
          </div>
        </section>

        {/* Stats bar */}
        <HomepageStatsBar />

        {/* Breathing room between stats and trending */}
        <div className="mt-3" />

        {/* Trending visual cards */}
        <div className="bg-muted/40 border-y border-border/40" style={{ padding: "1.5rem 0" }}>
          <Suspense fallback={null}>
            <TrendingVisualStrip excludeIds={trendingExcludeIds} />
          </Suspense>
        </div>

        {/* Homepage ad between trending and latest stories */}
        <div className="container mx-auto px-4 my-6" style={{ minHeight: '100px' }}>
          <AdUnit slot="1044321413" format="auto" responsive={true} />
        </div>

        {/* More Stories grid */}
        <section className="container mx-auto px-4 py-8 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="headline text-[22px] md:text-[26px] font-bold">Latest Stories</h2>
            <WeeklyStats />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className={`rounded-lg overflow-hidden border border-border/30 ${i % 4 === 0 ? 'md:col-span-2' : ''}`}>
                  <Skeleton className={`w-full ${i % 4 === 0 ? 'h-48' : 'h-36'}`} />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-2.5 w-14 rounded-sm" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex items-center gap-2 pt-1">
                      <Skeleton className="h-2.5 w-12" />
                      <Skeleton className="h-2.5 w-1" />
                      <Skeleton className="h-2.5 w-14" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (() => {
            // Build mixed grid: interleave guides among articles
            type GridItem = { kind: "article" | "guide"; data: any };
            const mixedItems: GridItem[] = [];
            let artIdx = 0, guideIdx = 0;
            const guidePositions = new Set([2, 5, 8]);
            const totalSlots = Math.min(10, gridArticles.length + gridGuides.length);
            for (let pos = 0; pos < totalSlots; pos++) {
              if (guidePositions.has(pos) && guideIdx < gridGuides.length) {
                mixedItems.push({ kind: "guide", data: gridGuides[guideIdx++] });
              } else if (artIdx < gridArticles.length) {
                mixedItems.push({ kind: "article", data: gridArticles[artIdx++] });
              } else if (guideIdx < gridGuides.length) {
                mixedItems.push({ kind: "guide", data: gridGuides[guideIdx++] });
              }
            }

            if (mixedItems.length === 0) return null;

            const isFeatured = (index: number) => {
              const pos = index % 10;
              return pos === 0 || pos === 6;
            };

            const renderArticleCard = (article: any, isLarge: boolean) => (
              <Link
                to={`/${article.categories?.slug || 'news'}/${article.slug}`}
                className="group block article-card rounded-lg overflow-hidden border border-border hover:-translate-y-1 hover:shadow-lg transition-all duration-300 h-full"
                style={{ borderTop: `3px solid ${getCategoryColor(article.categories?.slug)}` }}
              >
                <div className={`relative overflow-hidden ${isLarge ? 'h-[280px] max-h-[300px]' : 'h-[160px] max-h-[180px]'}`}>
                  <img
                    src={isLarge
                      ? getOptimizedThumbnail(article.featured_image_url || "/placeholder.svg", 800, 400)
                      : getOptimizedThumbnail(article.featured_image_url || "/placeholder.svg", 400, 225)
                    }
                    alt={article.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  {article.is_trending && (
                    <Badge className="absolute top-3 left-3 bg-orange-500 text-white flex items-center gap-1 text-xs">
                      <TrendingUp className="h-3 w-3" />Trending
                    </Badge>
                  )}
                  {getFreshnessLabel(article.published_at, article.updated_at, article.cornerstone) && (
                    <Badge className="absolute top-3 right-3 bg-emerald-600 text-white text-xs">
                      {getFreshnessLabel(article.published_at, article.updated_at, article.cornerstone)}
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <span className="text-[13px] font-bold uppercase tracking-wider mb-2 block" style={{ color: getCategoryColor(article.categories?.slug) }}>
                    {article.categories?.name || "Uncategorized"}
                  </span>
                  <h3 className={`font-bold leading-[1.25] line-clamp-2 group-hover:text-primary transition-colors ${
                    isLarge ? 'text-[22px] md:text-[24px]' : 'text-[16px] md:text-[17px]'
                  }`}>
                    {article.title}
                  </h3>
                  {isLarge && article.excerpt && (
                    <p className="text-muted-foreground text-[15px] leading-[1.6] line-clamp-2 mt-2">{article.excerpt}</p>
                  )}
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground mt-3">
                    {article.authors?.name && <span>{article.authors.name}</span>}
                    {article.authors?.name && article.published_at && <span>•</span>}
                    {article.published_at && (
                      <span>{new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    )}
                    <span>•</span>
                    <span>{article.reading_time_minutes || 5} min read</span>
                    {article.comment_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{article.comment_count} {article.comment_count === 1 ? 'comment' : 'comments'}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );

            const renderGuideCard = (guide: any, isLarge: boolean) => (
              <Link
                to={`/guides/${(guide.topic_category || "general").toLowerCase().replace(/\s+/g, "-")}/${guide.slug}`}
                className="group block article-card rounded-lg overflow-hidden border border-border hover:-translate-y-1 hover:shadow-lg transition-all duration-300 h-full"
                style={{ borderTop: `3px solid #10b981` }}
              >
                <div className={`relative overflow-hidden ${isLarge ? 'h-[280px] max-h-[300px]' : 'h-[160px] max-h-[180px]'}`}>
                  <img
                    src={isLarge
                      ? getOptimizedThumbnail(guide.featured_image_url || "/placeholder.svg", 800, 400)
                      : getOptimizedThumbnail(guide.featured_image_url || "/placeholder.svg", 400, 225)
                    }
                    alt={guide.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  <Badge className="absolute top-3 left-3 bg-emerald-600 text-white flex items-center gap-1 text-xs">
                    <BookOpen className="h-3 w-3" />Guide
                  </Badge>
                </div>
                <div className="p-4">
                  <span className="text-[13px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 text-emerald-400">
                    <BookOpen className="h-3.5 w-3.5" />
                    Guide
                  </span>
                  <h3 className={`font-bold leading-[1.25] line-clamp-2 group-hover:text-primary transition-colors ${
                    isLarge ? 'text-[22px] md:text-[24px]' : 'text-[16px] md:text-[17px]'
                  }`}>
                    {guide.title}
                  </h3>
                  {isLarge && guide.excerpt && (
                    <p className="text-muted-foreground text-[15px] leading-[1.6] line-clamp-2 mt-2">{guide.excerpt}</p>
                  )}
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground mt-3">
                    {guide.published_at && (
                      <span>{new Date(guide.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    )}
                    <span>•</span>
                    <span>{guide.read_time_minutes || 5} min read</span>
                  </div>
                </div>
              </Link>
            );

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {mixedItems.map((item, i) => {
                  const large = isFeatured(i);
                  const nodes = [];
                  nodes.push(
                    <div key={item.kind === "guide" ? `guide-${item.data.id}` : item.data.id} className={large ? 'md:col-span-2' : ''}>
                      {item.kind === "guide"
                        ? renderGuideCard(item.data, large)
                        : renderArticleCard(item.data, large)}
                    </div>
                  );
                  return nodes;
                })}
              </div>
            );
          })()}
        </section>

        <div className="border-t border-border/30" />

        {/* 3. For You Section (logged-in only, with UnreadBookmarksNudge folded in) */}
        {user && (
          <div className="py-14 md:py-20">
            <Suspense fallback={null}>
              <ForYouSection excludeIds={heroLatestIds} />
            </Suspense>
          </div>
        )}

        {user && <div className="border-t border-border/30" />}

        {/* 4. Most Discussed This Week */}
        <div className="py-10 md:py-14 bg-muted/10">
          <Suspense fallback={null}>
            <MostDiscussedSection excludeIds={heroLatestIds} />
          </Suspense>
        </div>

        <div className="border-t border-border/30" />

        {/* 5. Editor's Pick */}
        {editorsPick && (
          <>
            <section className="container mx-auto px-4 py-14 md:py-20 bg-muted/10">
              <EditorsPick article={editorsPick} />
            </section>
            <div className="border-t border-border/30" />
          </>
        )}

        {/* 6. Recommended Articles ("You May Like") */}
        <div className="py-14 md:py-20">
          <Suspense fallback={
            <div className="container mx-auto px-4">
              <div className="space-y-6">
                <Skeleton className="h-7 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-border/30">
                      <Skeleton className="h-44 w-full" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-2.5 w-14 rounded-sm" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <div className="flex items-center gap-2 pt-1">
                          <Skeleton className="h-2.5 w-12" />
                          <Skeleton className="h-2.5 w-14" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }>
            <RecommendedArticles excludeIds={heroLatestIds} />
          </Suspense>
        </div>

        {/* 7. Recommended Guides */}
        <div className="py-14 md:py-20">
          <RecommendedGuides />
        </div>

        <div className="border-t border-border/30" />

        {/* 8. Free AI Tools */}
        <section className="py-14 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="headline text-[22px] md:text-[28px] font-bold">Free AI Tools</h2>
              <p className="text-muted-foreground text-sm md:text-base mt-2">Try our interactive tools — no signup required</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { to: "/tools/ai-job-impact", icon: "M5 3a2 2 0 0 0-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V5a2 2 0 0 0-2-2H5ZM9 7h6M9 11h6M9 15h4", title: "Will AI Take My Job?", desc: "Get a personalised AI impact score for your role and country" },
                { to: "/tools/jargon-translator", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", title: "AI Jargon Translator", desc: "Decode corporate AI buzzwords into plain English" },
                { to: "/tools/ai-meeting-bingo", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", title: "AI Meeting Bingo", desc: "Spot meeting clichés and win — confetti included!", isNew: true },
                { to: "/tools/ai-policy-tracker", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", title: "AI Policy Tracker", desc: "Explore AI regulations across Asia-Pacific", isNew: true },
              ].map((tool) => (
                <Link
                  key={tool.to}
                  to={tool.to}
                  className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 overflow-hidden"
                >
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), transparent 60%)' }} />
                  {tool.isNew && (
                    <span className="absolute top-3 right-3 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full z-10">New</span>
                  )}
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d={tool.icon}/></svg>
                    </div>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tool.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-border/30" />

        {/* 9. Upcoming Events */}
        <div className="py-14 md:py-20 bg-muted/10">
          <Suspense fallback={
            <div className="container mx-auto px-4">
              <div className="space-y-6">
                <Skeleton className="h-7 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border/30 overflow-hidden">
                      <Skeleton className="h-32 w-full" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }>
            <UpcomingEvents />
          </Suspense>
        </div>

        <div className="border-t border-border/30" />

        {/* 10. Featured Voices */}
        {(featuredAuthors && featuredAuthors.length > 0) && (
          <>
            <section className="py-14 md:py-20 bg-muted/10">
              <div className="container mx-auto px-4">
                <div className="flex items-end justify-between mb-8 border-b border-border pb-4">
                  <div>
                    <h2 className="headline text-[22px] md:text-[26px] font-bold">Our Contributors</h2>
                    <p className="text-muted-foreground text-sm mt-1">The writers and experts behind AI in ASIA</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredAuthors?.map((author) => (
                    <Link
                      key={author.id}
                      to={`/author/${author.slug}`}
                      className="group flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
                    >
                      {author.avatar_url ? (
                        <img
                          src={getOptimizedAvatar(author.avatar_url, 96)}
                          srcSet={author.avatar_url.includes('supabase.co/storage') ? generateResponsiveSrcSet(author.avatar_url, [48, 96, 144]) : undefined}
                          sizes="56px"
                          alt={author.name}
                          className="w-14 h-14 rounded-full object-cover shrink-0 border border-border"
                          loading="lazy" width={56} height={56}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary shrink-0 flex items-center justify-center text-lg font-bold text-primary-foreground border border-border">
                          {author.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[16px] leading-snug group-hover:text-primary transition-colors">{author.name}</h3>
                        {author.job_title && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{author.job_title}</p>}
                        {author.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{author.bio}</p>}
                        <p className="text-xs text-primary/70 font-medium mt-2">{author.article_count || 0} articles</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
            <div className="border-t border-border/30" />
          </>
        )}

        <div className="border-t border-border/30" />

        {/* 11. Newsletter CTA */}
        <section id="newsletter" className="bg-gradient-to-r from-amber-500/90 to-amber-600/90 text-black py-20 md:py-28">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Stay Ahead of Asia's AI Revolution</h2>
            <p className="text-lg mb-6 opacity-80 max-w-lg mx-auto">Join 10,000+ professionals getting the AI in ASIA Brief every week.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm mb-8 max-w-md mx-auto">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Curated AI news from across Asia</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Expert analysis & insights</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4" /> Free tools & guides</span>
            </div>
            
            {!isNewsletterSubscribed ? (
              <form onSubmit={handleNewsletterSignup} className="max-w-md mx-auto">
                <div className="flex gap-2">
                  <Input 
                    id="newsletter-email" name="email" type="email" required maxLength={255}
                    placeholder="your@email.com" className="flex-1 bg-background text-foreground"
                    value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)}
                  />
                  <Button type="submit" className="bg-black hover:bg-black/80 text-white font-bold" disabled={isNewsletterSubmitting}>
                    {isNewsletterSubmitting ? "Subscribing..." : "Subscribe"}
                  </Button>
                </div>
                <p className="text-xs opacity-60 mt-2">No spam. Unsubscribe anytime. We respect your privacy.</p>
              </form>
            ) : (
              <div className="bg-black/10 border border-black/20 rounded-lg p-6 max-w-md mx-auto animate-scale-in">
                <p className="text-lg font-semibold">You're all set!</p>
                <p className="text-sm opacity-80 mt-2">Check your inbox for our latest insights.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <ExploreMoreButton />
      <Footer />
    </div>
  );
};

export default Index;
