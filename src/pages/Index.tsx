import { useState, useEffect, lazy, Suspense, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OrganizationStructuredData } from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MPUAd } from "@/components/GoogleAds";
import { Skeleton } from "@/components/ui/skeleton";
import RecommendedGuides from "@/components/RecommendedGuides";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { isNewsletterSubscribed as checkSubscribed, markNewsletterSubscribed, awardNewsletterPoints } from "@/lib/newsletterUtils";
import NotificationPrompt from "@/components/NotificationPrompt";

const MostDiscussedSection = lazy(() => import("@/components/MostDiscussedSection"));

// Lazy load below-the-fold components
const RecommendedArticles = lazy(() => import("@/components/RecommendedArticles"));
const EditorsPick = lazy(() => import("@/components/EditorsPick"));
const UpcomingEvents = lazy(() => import("@/components/UpcomingEvents"));
const ForYouSection = lazy(() => import("@/components/ForYouSection"));
const ThreeBeforeNineLanding = lazy(() => import("@/components/ThreeBeforeNineLanding"));
import { z } from "zod";
import { getOptimizedAvatar, getOptimizedHeroImage, getOptimizedThumbnail, generateResponsiveSrcSet } from "@/lib/imageOptimization";
import ExploreMoreButton from "@/components/ExploreMoreButton";

const newsletterSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
});

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

const Index = () => {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false);
  const [isNewsletterSubscribed, setIsNewsletterSubscribed] = useState(checkSubscribed());
  const [enableSecondaryQueries, setEnableSecondaryQueries] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  useAutoRefresh();

  useEffect(() => {
    const timer = setTimeout(() => setEnableSecondaryQueries(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Optimized: Fetch homepage articles and trending in a single efficient query
  const { data: homepageData, isLoading } = useQuery({
    queryKey: ["homepage-articles"],
    staleTime: 10 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data: articles, error } = await supabase
        .from("articles")
        .select(`
          id, title, slug, excerpt, featured_image_url, reading_time_minutes,
          published_at, updated_at, cornerstone, sticky, primary_category_id,
          comment_count, is_trending,
          authors:author_id (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .eq("featured_on_homepage", true)
        .order("sticky", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(15);

      if (error) throw error;
      if (!articles || articles.length === 0) return { featured: null, latest: [], trending: [] };

      const featured = articles[0];
      const latest = articles.slice(1, 13);

      const { data: trendingData, error: trendingError } = await supabase
        .from("articles")
        .select(`
          id, title, slug, excerpt, featured_image_url, reading_time_minutes,
          published_at, updated_at, cornerstone, view_count, primary_category_id,
          comment_count, homepage_trending, is_trending,
          authors:author_id (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .eq("homepage_trending", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(5);

      if (trendingError) console.error("Error fetching trending:", trendingError);

      return { featured, latest, trending: trendingData || [] };
    },
  });

  const featuredArticle = homepageData?.featured;
  const latestArticles = homepageData?.latest;
  const baseTrendingArticles = homepageData?.trending;

  const heroLatestIds = [
    featuredArticle?.id,
    ...(latestArticles?.map((a: any) => a.id) || []),
    ...(baseTrendingArticles?.map((a: any) => a.id) || [])
  ].filter(Boolean) as string[];

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
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editors_picks")
        .select(`
          location, article_id,
          articles (*, authors:author_id (name, slug), categories:primary_category_id (name, slug))
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
    if (validTrendingFeatured) {
      return [validTrendingFeatured, ...validBase.filter((a: any) => a.id !== (validTrendingFeatured as any).id)];
    }
    return validBase;
  })();

  const handleNewsletterSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsNewsletterSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const rawData = { email: formData.get('email') as string };

    try {
      const validatedData = newsletterSchema.parse(rawData);
      const { data: existing } = await supabase
        .from("newsletter_subscribers")
        .select("id")
        .eq("email", validatedData.email)
        .maybeSingle();

      if (existing) {
        toast({ title: "Already subscribed", description: "This email is already subscribed to our newsletter." });
        setIsNewsletterSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: validatedData.email });
      if (error) throw error;

      setIsNewsletterSubscribed(true);
      markNewsletterSubscribed();
      await awardNewsletterPoints(user?.id ?? null, supabase);
      toast({
        title: "Successfully subscribed!",
        description: user ? "You earned 25 points and the Newsletter Insider badge! 🎉" : "Welcome aboard! Check your inbox for our latest insights.",
      });
      (e.target as HTMLFormElement).reset();
      setNewsletterEmail("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation Error", description: error.errors[0].message, variant: "destructive" });
      } else {
        console.error('Error subscribing:', error);
        toast({ title: "Error", description: "Failed to subscribe. Please try again.", variant: "destructive" });
      }
    } finally {
      setIsNewsletterSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="AI in ASIA - Leading AI News, Insights & Innovation Across Asia"
        description="Your trusted source for AI news, insights, and education across Asia. Breaking news, expert analysis, and practical guides on artificial intelligence. Powered by you.withthepowerof.ai."
        canonical="https://aiinasia.com/"
        ogImage="https://aiinasia.com/icons/aiinasia-512.png?v=3"
        ogImageAlt="AI in ASIA - AI News from Asia"
      >
        <link rel="preconnect" href="https://ppvifagplcdjpdpqknzt.supabase.co" />
        <link rel="dns-prefetch" href="https://ppvifagplcdjpdpqknzt.supabase.co" />
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
      
      <Header />
      <NotificationPrompt />
      
      <main className="flex-1">
        {/* SEO H1 */}
        <h1 className="sr-only">AI News, Insights & Innovation Across Asia-Pacific</h1>
        
        {/* Value Proposition Strip */}
        <div className="bg-muted/50 border-b border-border/50">
          <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Asia-Pacific's source for AI news, tools, and analysis — covering what matters across 15+ countries</span>
            <Link to="/about" className="text-primary hover:underline font-medium shrink-0">
              Learn more
            </Link>
          </div>
        </div>

        {/* 1. 3 Before 9 Daily Briefing */}
        <Suspense fallback={null}>
          <ThreeBeforeNineLanding />
        </Suspense>

        <Separator className="my-0" />

        {/* 2. Hero Grid (Trending + Featured + Latest) */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Trending Section - Left */}
            <div className="lg:col-span-3 order-2 lg:order-1">
              <div className="bg-editorial text-editorial-foreground px-3 py-1.5 text-xs font-bold uppercase mb-6">
                Trending
              </div>
              <div className="space-y-4">
              {isLoading ? (
                <>
                  <div>
                    <Skeleton className="aspect-video rounded-lg mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  {[...Array(4)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="aspect-[16/9] rounded-lg mb-2" />
                      <Skeleton className="h-3 w-2/3 mb-1" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </>
              ) : (() => {
                const filteredTrending = trendingArticles?.filter((article: any) => article.slug) || [];
                const leftColumnCount = Math.min(5, filteredTrending.length);
                
                return filteredTrending.slice(0, leftColumnCount).map((article: any, index: number) => {
                  const categorySlug = article.categories?.slug || 'news';
                  return (
                <Link 
                  key={article.id}
                  to={`/${categorySlug}/${article.slug}`}
                  className="block group"
                >
                  <div className={`relative ${index === 0 ? 'aspect-video' : 'aspect-[16/9]'} overflow-hidden rounded-lg mb-2`}>
                    <img 
                      src={article.featured_image_url || "/placeholder.svg"} 
                      alt={article.title}
                      loading="lazy"
                      decoding="async"
                      fetchPriority={index === 0 ? "high" : "low"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                      {article.categories?.name || "Uncategorized"}
                    </Badge>
                    {article.is_trending && (
                      <Badge className="absolute top-2 left-24 bg-orange-500 text-white flex items-center gap-1 text-xs">
                        <TrendingUp className="h-3 w-3" />
                        Trending
                      </Badge>
                    )}
                    {index < 3 && getFreshnessLabel(article.published_at, article.updated_at, article.cornerstone) && (
                      <Badge className="absolute top-2 right-2 bg-emerald-600 text-white text-xs">
                        {getFreshnessLabel(article.published_at, article.updated_at, article.cornerstone)}
                      </Badge>
                    )}
                    {index === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <p className="text-white text-xs mb-1">
                          {article.published_at && new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} {article.published_at && '•'} {article.reading_time_minutes || 5} min read
                        </p>
                        <h3 className="text-white font-bold text-base line-clamp-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                      </div>
                    )}
                  </div>
                  {index > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground mb-1">
                        {article.published_at && new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} {article.published_at && '•'} {article.reading_time_minutes || 5} min read
                      </p>
                      <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                    </>
                  )}
                </Link>
                );
                });
              })()}
              </div>
            </div>

            {/* Featured Article - Center */}
            <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
              {isLoading ? (
                <div><Skeleton className="h-[600px] rounded-lg" /></div>
              ) : featuredArticle && featuredArticle.slug ? (
                <Link to={`/${featuredArticle.categories?.slug || 'news'}/${featuredArticle.slug}`} className="block group">
                  <div className="relative h-[600px] overflow-hidden rounded-lg">
                    <img 
                      src={getOptimizedHeroImage(featuredArticle.featured_image_url || "/placeholder.svg", 1280)} 
                      srcSet={featuredArticle.featured_image_url?.includes('supabase.co/storage') ? generateResponsiveSrcSet(featuredArticle.featured_image_url, [640, 960, 1280]) : undefined}
                      sizes="(max-width: 768px) 100vw, 640px"
                      alt={featuredArticle.title}
                      loading="eager" decoding="async" fetchPriority="high"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      width={640} height={600}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Badge className="bg-primary text-primary-foreground">{featuredArticle.categories?.name || "Uncategorized"}</Badge>
                        {featuredArticle.is_trending && (
                          <Badge className="bg-orange-500 text-white flex items-center gap-1"><TrendingUp className="h-3 w-3" />Trending</Badge>
                        )}
                        {getFreshnessLabel(featuredArticle.published_at, featuredArticle.updated_at, featuredArticle.cornerstone) && (
                          <Badge className="bg-emerald-600 text-white">{getFreshnessLabel(featuredArticle.published_at, featuredArticle.updated_at, featuredArticle.cornerstone)}</Badge>
                        )}
                      </div>
                      <h1 className="text-white font-bold text-3xl md:text-4xl mb-4 line-clamp-3 group-hover:text-primary transition-colors">{featuredArticle.title}</h1>
                      <p className="text-white/90 text-base line-clamp-3 mb-3">{featuredArticle.excerpt}</p>
                      <div className="flex items-center gap-3 text-white/80 text-sm">
                        {featuredArticle.published_at && <span>{new Date(featuredArticle.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                        {featuredArticle.published_at && <span>•</span>}
                        <span>{featuredArticle.reading_time_minutes || 5} min read</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                trendingArticles.length > 0 && trendingArticles[0]?.slug && (
                  <Link to={`/${trendingArticles[0].categories?.slug || 'news'}/${trendingArticles[0].slug}`} className="block group">
                    <div className="relative h-[600px] overflow-hidden rounded-lg">
                      <img 
                        src={getOptimizedHeroImage(trendingArticles[0].featured_image_url || "/placeholder.svg", 1280)} 
                        srcSet={trendingArticles[0].featured_image_url?.includes('supabase.co/storage') ? generateResponsiveSrcSet(trendingArticles[0].featured_image_url, [640, 960, 1280]) : undefined}
                        sizes="(max-width: 768px) 100vw, 640px"
                        alt={trendingArticles[0].title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        width={640} height={600} fetchPriority="high"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-8">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <Badge className="bg-primary text-primary-foreground">{trendingArticles[0].categories?.name || "Uncategorized"}</Badge>
                          {trendingArticles[0].homepage_trending && (
                            <Badge className="bg-orange-500 text-white flex items-center gap-1"><TrendingUp className="h-3 w-3" />Trending</Badge>
                          )}
                        </div>
                        <h1 className="text-white font-bold text-3xl md:text-4xl mb-4 line-clamp-3 group-hover:text-primary transition-colors">{trendingArticles[0].title}</h1>
                        <p className="text-white/90 text-base line-clamp-3 mb-3">{trendingArticles[0].excerpt}</p>
                        <div className="flex items-center gap-3 text-white/80 text-sm">
                          {trendingArticles[0].published_at && <span>{new Date(trendingArticles[0].published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                          {(trendingArticles[0].published_at && (trendingArticles[0].reading_time_minutes || 5)) && <span>•</span>}
                          <span>{trendingArticles[0].reading_time_minutes || 5} min read</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              )}

              {/* Two Medium Articles Stacked */}
              <div className="space-y-6">
                {isLoading ? (
                  <>
                    <Skeleton className="h-[280px] rounded-lg" />
                    <Skeleton className="h-[280px] rounded-lg" />
                  </>
                ) : latestArticles?.filter((article: any) => 
                  article.slug && article.id !== featuredArticle?.id
                ).slice(0, 2).map((article: any) => {
                  const categorySlug = article.categories?.slug || 'news';
                  return (
                  <Link key={article.id} to={`/${categorySlug}/${article.slug}`} className="block group">
                    <div className="relative h-[280px] overflow-hidden rounded-lg">
                      <img 
                        src={getOptimizedThumbnail(article.featured_image_url || "/placeholder.svg", 640, 280)} 
                        srcSet={article.featured_image_url?.includes('supabase.co/storage') ? generateResponsiveSrcSet(article.featured_image_url, [320, 640, 960]) : undefined}
                        sizes="(max-width: 768px) 100vw, 640px"
                        alt={article.title} loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        width={640} height={280}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className="bg-primary text-primary-foreground text-xs">{article.categories?.name || "Uncategorized"}</Badge>
                          {article.is_trending && (
                            <Badge className="bg-orange-500 text-white flex items-center gap-1 text-xs"><TrendingUp className="h-3 w-3" />Trending</Badge>
                          )}
                          {getFreshnessLabel(article.published_at, article.updated_at, article.cornerstone) && (
                            <Badge className="bg-emerald-600 text-white text-xs">{getFreshnessLabel(article.published_at, article.updated_at, article.cornerstone)}</Badge>
                          )}
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2 line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h3>
                        <p className="text-white/80 text-sm line-clamp-2 mb-2">{article.excerpt}</p>
                        <div className="flex items-center gap-2 text-white/70 text-xs">
                          {article.published_at && <span>{new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                          {article.published_at && <span>•</span>}
                          <span>{article.reading_time_minutes || 5} min read</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
                })}
              </div>
            </div>

            {/* Latest Articles - Right */}
            <div className="lg:col-span-3 order-3">
              <div className="mb-6"><MPUAd /></div>
              <div className="bg-secondary text-secondary-foreground px-3 py-1.5 mb-6">
                <div className="text-xs font-bold uppercase">Latest</div>
              </div>
              <div className="space-y-4">
              {isLoading ? (
                <>
                  {[...Array(2)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="aspect-video rounded-lg mb-2" />
                      <Skeleton className="h-3 w-2/3 mb-1" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                  {[...Array(4)].map((_, i) => (
                    <div key={`small-${i}`} className="flex gap-3">
                      <Skeleton className="w-20 h-20 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-3 w-1/2 mb-1" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (() => {
                const trendingIds = trendingArticles?.map((a: any) => a.id) || [];
                const centerMediumArticleIds = latestArticles?.filter((a: any) => 
                  a.slug && a.id !== featuredArticle?.id
                ).slice(0, 2).map((a: any) => a.id) || [];
                
                const filteredLatest = latestArticles?.filter((article: any) => 
                  article.slug && 
                  article.id !== featuredArticle?.id &&
                  !trendingIds.includes(article.id) &&
                  !centerMediumArticleIds.includes(article.id)
                ) || [];
                const rightColumnCount = Math.min(6, filteredLatest.length);
                
                return filteredLatest.slice(0, rightColumnCount).map((article: any, index: number) => {
                  const categorySlug = article.categories?.slug || 'news';
                  return (
                  <Link key={article.id} to={`/${categorySlug}/${article.slug}`} className="block group">
                    {index < 2 ? (
                      <div>
                        <div className="relative aspect-video overflow-hidden rounded-lg mb-2">
                          <img 
                            src={article.featured_image_url || "/placeholder.svg"} 
                            alt={article.title} loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute top-2 left-2 flex gap-2 flex-wrap">
                            <Badge className="bg-secondary text-secondary-foreground text-xs">{article.categories?.name || "Uncategorized"}</Badge>
                            {article.is_trending && (
                              <Badge className="bg-orange-500 text-white flex items-center gap-1 text-xs"><TrendingUp className="h-3 w-3" />Trending</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {article.published_at && new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} {article.published_at && '•'} {article.reading_time_minutes || 5} min read
                        </p>
                        <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h3>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <div className="relative w-20 h-20 overflow-hidden rounded flex-shrink-0">
                          <img 
                            src={article.featured_image_url || "/placeholder.svg"} 
                            alt={article.title} loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">
                            {article.published_at && new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} {article.published_at && '•'} {article.reading_time_minutes || 5} min
                          </p>
                          <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">{article.title}</h3>
                        </div>
                      </div>
                    )}
                  </Link>
                );
                });
              })()}
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* 3. For You Section (logged-in only, with UnreadBookmarksNudge folded in) */}
        {user && (
          <Suspense fallback={null}>
            <ForYouSection excludeIds={heroLatestIds} />
          </Suspense>
        )}

        {user && <Separator />}

        {/* 4. Most Discussed This Week */}
        <div className="py-12 md:py-16">
          <Suspense fallback={null}>
            <MostDiscussedSection />
          </Suspense>
        </div>

        <Separator />

        {/* 5. Recommended Articles ("You May Like") */}
        <div className="py-12 md:py-16">
          <Suspense fallback={
            <div className="container mx-auto px-4">
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-48 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }>
            <RecommendedArticles excludeIds={heroLatestIds} />
          </Suspense>
        </div>

        <Separator />

        {/* 6. Editor's Pick */}
        {editorsPick && (
          <>
            <section className="container mx-auto px-4 py-12 md:py-16">
              <EditorsPick article={editorsPick} />
            </section>
            <Separator />
          </>
        )}

        {/* 7. Recommended Guides */}
        <div className="py-12 md:py-16">
          <RecommendedGuides />
        </div>

        <Separator />

        {/* 8. Upcoming Events */}
        <div className="py-12 md:py-16">
          <Suspense fallback={
            <div className="container mx-auto px-4">
              <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full" />
                  ))}
                </div>
              </div>
            </div>
          }>
            <UpcomingEvents />
          </Suspense>
        </div>

        <Separator />

        {/* 9. Featured Voices */}
        {(featuredAuthors && featuredAuthors.length > 0) && (
          <>
            <section className="bg-muted/30 py-12 md:py-16">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="headline text-4xl font-bold mb-3">Featured Voices</h2>
                  <p className="text-muted-foreground text-lg">Meet the experts shaping AI discourse in Asia</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredAuthors?.map((author) => (
                    <Link 
                      key={author.id} 
                      to={`/author/${author.slug}`}
                      className="bg-card border border-border rounded-lg p-6 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    >
                      {author.avatar_url ? (
                        <img 
                          src={getOptimizedAvatar(author.avatar_url, 160)} 
                          srcSet={author.avatar_url.includes('supabase.co/storage') ? generateResponsiveSrcSet(author.avatar_url, [80, 160, 240]) : undefined}
                          sizes="(max-width: 768px) 96px, 160px"
                          alt={author.name}
                          className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
                          loading="lazy" width={96} height={96}
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-primary-foreground">
                          {author.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                      )}
                      <h3 className="font-semibold text-xl mb-1">{author.name}</h3>
                      {author.job_title && <p className="text-sm text-muted-foreground mb-3">{author.job_title}</p>}
                      {author.bio && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{author.bio}</p>}
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {author.article_count || 0} Articles
                      </div>
                      {author.twitter_handle && <p className="text-xs text-muted-foreground mt-2">@{author.twitter_handle}</p>}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
            <Separator />
          </>
        )}

        {/* 10. Newsletter CTA */}
        <section id="newsletter" className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-12 md:py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-4xl font-bold mb-4">Never Miss an AI Breakthrough</h2>
            <p className="text-lg mb-8 opacity-90">Join 10,000+ professionals getting the AI in ASIA Brief every week.</p>
            
            {!isNewsletterSubscribed ? (
              <form onSubmit={handleNewsletterSignup} className="max-w-md mx-auto">
                <div className="flex gap-2">
                  <Input 
                    id="newsletter-email" name="email" type="email" required maxLength={255}
                    placeholder="your@email.com" className="flex-1 bg-background text-foreground"
                    value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)}
                  />
                  <Button type="submit" variant="secondary" disabled={isNewsletterSubmitting}>
                    {isNewsletterSubmitting ? "Subscribing..." : "Subscribe"}
                  </Button>
                </div>
                <p className="text-xs opacity-75 mt-2">No spam. Unsubscribe anytime. We respect your privacy.</p>
              </form>
            ) : (
              <div className="bg-background/10 border border-primary-foreground/20 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-lg font-semibold">You're all set!</p>
                <p className="text-sm opacity-90 mt-2">Check your inbox for our latest insights.</p>
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
