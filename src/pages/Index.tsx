import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OrganizationStructuredData } from "@/components/StructuredData";
import StockTicker from "@/components/StockTicker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingUp, Users, Calendar, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PromptAndGoBanner } from "@/components/PromptAndGoBanner";
import { BusinessInAByteAd } from "@/components/BusinessInAByteAd";
import RecommendedArticles from "@/components/RecommendedArticles";
import { EditorsPick } from "@/components/EditorsPick";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { z } from "zod";
import { getOptimizedAvatar, getOptimizedHeroImage, getOptimizedThumbnail, generateResponsiveSrcSet } from "@/lib/imageOptimization";

const newsletterSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
});

const Index = () => {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false);
  const [isNewsletterSubscribed, setIsNewsletterSubscribed] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Optimized: Fetch homepage articles and trending in a single efficient query
  const { data: homepageData, isLoading } = useQuery({
    queryKey: ["homepage-articles"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      // Single batched query for all homepage articles
      const { data: articles, error } = await supabase
        .from("articles")
        .select(`
          *,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .eq("featured_on_homepage", true)
        .order("sticky", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(15);
      
      if (error) throw error;
      if (!articles || articles.length === 0) return { featured: null, latest: [], trending: [] };
      
      // Split into featured (first one) and latest (rest)
      const featured = articles[0];
      const latest = articles.slice(1, 13); // Take up to 12 for latest
      
      // Get trending articles from recent high-engagement content
      const { data: trendingData, error: trendingError } = await supabase
        .from("articles")
        .select(`
          *,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .gte("published_at", fourteenDaysAgo.toISOString())
        .order("view_count", { ascending: false, nullsFirst: false })
        .limit(5);
      
      if (trendingError) console.error("Error fetching trending:", trendingError);
      
      return {
        featured,
        latest,
        trending: trendingData || []
      };
    },
  });

  const featuredArticle = homepageData?.featured;
  const latestArticles = homepageData?.latest;
  const trendingArticles = homepageData?.trending;

  const { data: featuredAuthors } = useQuery({
    queryKey: ["featured-authors"],
    staleTime: 10 * 60 * 1000, // 10 minutes
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

  const { data: upcomingEvents } = useQuery({
    queryKey: ["upcoming-events"],
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "upcoming")
        .order("start_date", { ascending: true })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: editorsPick } = useQuery({
    queryKey: ["editors-pick-homepage"],
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editors_picks")
        .select(`
          article_id,
          articles (
            *,
            authors (name, slug),
            categories:primary_category_id (name, slug)
          )
        `)
        .eq("location", "homepage")
        .maybeSingle();
      
      if (error) throw error;
      return data?.articles;
    },
  });

  // Subscribe to realtime event updates
  useEffect(() => {
    const channel = supabase
      .channel('homepage-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        () => {
          // Refetch events when there's a change
          queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleNewsletterSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsNewsletterSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const rawData = {
      email: formData.get('email') as string,
    };

    try {
      const validatedData = newsletterSchema.parse(rawData);

      // Check if already subscribed
      const { data: existing } = await supabase
        .from("newsletter_subscribers")
        .select("id")
        .eq("email", validatedData.email)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already subscribed",
          description: "This email is already subscribed to our newsletter.",
        });
        setIsNewsletterSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: validatedData.email });

      if (error) throw error;

      setIsNewsletterSubscribed(true);
      toast({
        title: "Successfully subscribed!",
        description: "Welcome aboard! Check your inbox for our latest insights.",
      });
      
      (e.target as HTMLFormElement).reset();
      setNewsletterEmail("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('Error subscribing:', error);
        toast({
          title: "Error",
          description: "Failed to subscribe. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsNewsletterSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>AI in ASIA - Leading AI News, Insights & Innovation Across Asia</title>
        <meta name="description" content="Your trusted source for AI news, insights, and education across Asia. Breaking news, expert analysis, and practical guides on artificial intelligence. Powered by you.withthepowerof.ai." />
        <link rel="canonical" href="https://aiinasia.com/" />
        
        {/* Preconnect to critical origins for faster resource loading */}
        <link rel="preconnect" href="https://ppvifagplcdjpdpqknzt.supabase.co" />
        <link rel="dns-prefetch" href="https://ppvifagplcdjpdpqknzt.supabase.co" />
        
        {/* Preload LCP image for faster loading */}
        {featuredArticle?.featured_image_url && (
          <link 
            rel="preload" 
            as="image" 
            href={getOptimizedHeroImage(featuredArticle.featured_image_url, 1280)}
            imageSrcSet={featuredArticle.featured_image_url.includes('supabase.co/storage') ? generateResponsiveSrcSet(featuredArticle.featured_image_url, [640, 960, 1280]) : undefined}
            imageSizes="(max-width: 768px) 100vw, 640px"
          />
        )}
        {!featuredArticle && trendingArticles?.[0]?.featured_image_url && (
          <link 
            rel="preload" 
            as="image" 
            href={getOptimizedHeroImage(trendingArticles[0].featured_image_url, 1280)}
            imageSrcSet={trendingArticles[0].featured_image_url.includes('supabase.co/storage') ? generateResponsiveSrcSet(trendingArticles[0].featured_image_url, [640, 960, 1280]) : undefined}
            imageSizes="(max-width: 768px) 100vw, 640px"
          />
        )}
        
        <meta property="og:title" content="AI in ASIA - Leading AI News, Insights & Innovation Across Asia" />
        <meta property="og:description" content="Your trusted source for AI news, insights, and education across Asia. Breaking news, expert analysis, and practical guides on artificial intelligence." />
        <meta property="og:url" content="https://aiinasia.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://aiinasia.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI in ASIA - Leading AI News, Insights & Innovation Across Asia" />
        <meta name="twitter:description" content="Your trusted source for AI news, insights, and education across Asia." />
        <meta name="twitter:image" content="https://aiinasia.com/og-image.png" />
      </Helmet>
      
      <OrganizationStructuredData />
      
      <Header />
      <StockTicker />
      
      <main className="flex-1">
        {/* Hero Grid Section */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Trending Section - Left */}
            <div className="lg:col-span-3 order-2 lg:order-1">
              <div className="bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold uppercase mb-6">
                Trending
              </div>
              <div className="space-y-4">
              {(() => {
                const filteredTrending = trendingArticles?.filter((article: any) => article.slug) || [];
                const leftColumnCount = Math.min(5, filteredTrending.length);
                
                return filteredTrending.slice(0, leftColumnCount).map((article: any, index: number) => {
                  const categorySlug = article.categories?.slug || article.primary_category_id?.slug || 'news';
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
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                      {article.categories?.name || "Uncategorized"}
                    </Badge>
                    {index === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <p className="text-white text-xs mb-1">{article.categories?.name || "Uncategorized"} | {article.reading_time_minutes || 5} min read</p>
                        <h3 className="text-white font-bold text-base line-clamp-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                      </div>
                    )}
                  </div>
                  {index > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground mb-1">
                        {article.categories?.name || "Uncategorized"} | {article.reading_time_minutes || 5} min read
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
              {/* Large Featured Article */}
              {featuredArticle && featuredArticle.slug ? (
                <Link to={`/${featuredArticle.categories?.slug || 'news'}/${featuredArticle.slug}`} className="block group">
                  <div className="relative h-[600px] overflow-hidden rounded-lg">
                    <img 
                      src={getOptimizedHeroImage(featuredArticle.featured_image_url || "/placeholder.svg", 1280)} 
                      srcSet={featuredArticle.featured_image_url?.includes('supabase.co/storage') ? generateResponsiveSrcSet(featuredArticle.featured_image_url, [640, 960, 1280]) : undefined}
                      sizes="(max-width: 768px) 100vw, 640px"
                      alt={featuredArticle.title}
                      loading="eager"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      width={640}
                      height={600}
                      fetchPriority="high"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <Badge className="bg-primary text-primary-foreground mb-3">
                        {featuredArticle.categories?.name || "Uncategorized"}
                      </Badge>
                      <h1 className="text-white font-bold text-3xl md:text-4xl mb-4 line-clamp-3 group-hover:text-primary transition-colors">
                        {featuredArticle.title}
                      </h1>
                      <p className="text-white/90 text-base line-clamp-3">
                        {featuredArticle.excerpt}
                      </p>
                    </div>
                  </div>
                </Link>
              ) : (
                trendingArticles?.[0]?.slug && (
                  <Link to={`/${trendingArticles[0].categories?.slug || 'news'}/${trendingArticles[0].slug}`} className="block group">
                    <div className="relative h-[600px] overflow-hidden rounded-lg">
                      <img 
                        src={getOptimizedHeroImage(trendingArticles[0].featured_image_url || "/placeholder.svg", 1280)} 
                        srcSet={trendingArticles[0].featured_image_url?.includes('supabase.co/storage') ? generateResponsiveSrcSet(trendingArticles[0].featured_image_url, [640, 960, 1280]) : undefined}
                        sizes="(max-width: 768px) 100vw, 640px"
                        alt={trendingArticles[0].title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        width={640}
                        height={600}
                        fetchPriority="high"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-8">
                        <Badge className="bg-primary text-primary-foreground mb-3">
                          {trendingArticles[0].categories?.name || "Uncategorized"}
                        </Badge>
                        <h1 className="text-white font-bold text-3xl md:text-4xl mb-4 line-clamp-3 group-hover:text-primary transition-colors">
                          {trendingArticles[0].title}
                        </h1>
                        <p className="text-white/90 text-base line-clamp-3">
                          {trendingArticles[0].excerpt}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              )}

              {/* Two Medium Articles Stacked */}
              <div className="space-y-6">
                {latestArticles?.filter((article: any) => 
                  article.slug && article.id !== featuredArticle?.id
                ).slice(0, 2).map((article: any) => {
                  const categorySlug = article.categories?.slug || article.primary_category_id?.slug || 'news';
                  return (
                  <Link 
                    key={article.id}
                    to={`/${categorySlug}/${article.slug}`}
                    className="block group"
                  >
                    <div className="relative h-[280px] overflow-hidden rounded-lg">
                      <img 
                        src={getOptimizedThumbnail(article.featured_image_url || "/placeholder.svg", 640, 280)} 
                        srcSet={article.featured_image_url?.includes('supabase.co/storage') ? generateResponsiveSrcSet(article.featured_image_url, [320, 640, 960]) : undefined}
                        sizes="(max-width: 768px) 100vw, 640px"
                        alt={article.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        width={640}
                        height={280}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <Badge className="bg-primary text-primary-foreground text-xs mb-2">
                          {article.categories?.name || "Uncategorized"}
                        </Badge>
                        <h3 className="text-white font-bold text-xl mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-white/80 text-sm line-clamp-2">
                          {article.excerpt}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
                })}
              </div>
            </div>

            {/* Latest Articles - Right */}
            <div className="lg:col-span-3 order-3">
              {/* Advertisement Slot */}
              <div className="mb-6">
                <BusinessInAByteAd />
              </div>

              <div className="bg-secondary text-secondary-foreground px-3 py-1.5 mb-6">
                <div className="text-xs font-bold uppercase">
                  Latest
                </div>
              </div>
              <div className="space-y-4">
              {(() => {
                const trendingIds = trendingArticles?.map((a: any) => a.id) || [];
                const filteredLatest = latestArticles?.filter((article: any) => 
                  article.slug && 
                  article.id !== featuredArticle?.id &&
                  !trendingIds.includes(article.id)
                ) || [];
                const rightColumnCount = Math.min(8, filteredLatest.length);
                
                return filteredLatest.slice(0, rightColumnCount).map((article: any, index: number) => {
                  const categorySlug = article.categories?.slug || article.primary_category_id?.slug || 'news';
                  return (
                  <Link 
                    key={article.id}
                    to={`/${categorySlug}/${article.slug}`}
                    className="block group"
                  >
                    {index < 2 ? (
                      // First 2 articles with larger images
                      <div>
                        <div className="relative aspect-video overflow-hidden rounded-lg mb-2">
                          <img 
                            src={article.featured_image_url || "/placeholder.svg"} 
                            alt={article.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground text-xs">
                            {article.categories?.name || "Uncategorized"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {article.categories?.name || "Uncategorized"} | {article.reading_time_minutes || 5} min read
                        </p>
                        <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                      </div>
                    ) : (
                      // Remaining articles with small thumbnails
                      <div className="flex gap-3">
                        <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded">
                          <img 
                            src={article.featured_image_url || "/placeholder.svg"} 
                            alt={article.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">
                            {article.categories?.name || "Uncategorized"}
                          </p>
                          <h3 className="font-bold text-sm line-clamp-3 group-hover:text-primary transition-colors">
                            {article.title}
                          </h3>
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

        {/* Ad Banner */}
        <section className="container mx-auto px-4 py-8">
          <PromptAndGoBanner />
        </section>

        {/* Editor's Pick */}
        {editorsPick && (
          <section className="container mx-auto px-4 py-8">
            <EditorsPick article={editorsPick} />
          </section>
        )}

        {/* Featured Voices Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="headline text-4xl font-bold mb-3">
                Featured Voices
              </h2>
              <p className="text-muted-foreground text-lg">
                Meet the experts shaping AI discourse in Asia
              </p>
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
                      loading="lazy"
                      width={96}
                      height={96}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-primary-foreground">
                      {author.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <h3 className="font-semibold text-xl mb-1">{author.name}</h3>
                  {author.job_title && (
                    <p className="text-sm text-muted-foreground mb-3">{author.job_title}</p>
                  )}
                  {author.bio && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{author.bio}</p>
                  )}
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    {author.article_count || 0} Articles
                  </div>
                  {author.twitter_handle && (
                    <p className="text-xs text-muted-foreground mt-2">@{author.twitter_handle}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="headline text-3xl flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              Upcoming Events
            </h2>
            <Button variant="outline" asChild>
              <Link to="/events">Full Calendar</Link>
            </Button>
          </div>
          
          <div className="space-y-4">
            {upcomingEvents && upcomingEvents.length > 0 ? (
              upcomingEvents.map((event) => (
                <div key={event.id} className="article-card p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{format(new Date(event.start_date), 'dd MMM yyyy')}</span>
                      <span>•</span>
                      <span>{event.city}, {event.country}</span>
                    </div>
                  </div>
                  {event.website_url ? (
                    <Button variant="outline" asChild>
                      <a href={event.website_url} target="_blank" rel="noopener noreferrer">
                        Learn More
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" asChild>
                      <Link to="/events">View Details</Link>
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="article-card p-6 text-center text-muted-foreground">
                No upcoming events at the moment. Check back soon!
              </div>
            )}
          </div>
        </section>

        {/* Trending Tools Section */}
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="headline text-3xl flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              Trending AI Tools
            </h2>
            <Button variant="outline">View All Tools</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Prompt with the power of AI.", desc: "Advanced prompt engineering platform", url: "https://www.promptandgo.ai", category: "Productivity" },
              { name: "Startup with the power of AI.", desc: "AI prompts and templates to supercharge your business", url: "https://www.businessinabyte.com", category: "Business" },
              { name: "Shop with the power of AI.", desc: "AI-curated deals from around the web", url: "https://www.myofferclub.com", category: "Retail" },
            ].map((tool, i) => (
              <div key={i} className="article-card p-6 relative">
                <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground hover:bg-accent/90">
                  {tool.category}
                </Badge>
                <h3 className="font-semibold text-lg mb-3 pr-20">{tool.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{tool.desc}</p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={tool.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                    Learn More
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Articles */}
        <UpcomingEvents />

        {/* Newsletter CTA */}
        <section id="newsletter" className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-4xl font-bold mb-4">
              Never Miss an AI Breakthrough
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join 10,000+ professionals getting the AI in ASIA Brief every week.
            </p>
            
            {!isNewsletterSubscribed ? (
              <form onSubmit={handleNewsletterSignup} className="max-w-md mx-auto">
                <div className="flex gap-2">
                  <Input 
                    id="newsletter-email" 
                    name="email" 
                    type="email" 
                    required 
                    maxLength={255}
                    placeholder="your@email.com" 
                    className="flex-1 bg-background text-foreground"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                  />
                  <Button type="submit" variant="secondary" disabled={isNewsletterSubmitting}>
                    {isNewsletterSubmitting ? "Subscribing..." : "Subscribe"}
                  </Button>
                </div>
                <p className="text-xs opacity-75 mt-2">
                  No spam. Unsubscribe anytime. We respect your privacy.
                </p>
              </form>
            ) : (
              <div className="bg-background/10 border border-primary-foreground/20 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-lg font-semibold">You're all set!</p>
                <p className="text-sm opacity-90 mt-2">
                  Check your inbox for our latest insights.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
