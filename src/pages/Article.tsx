import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Comments from "@/components/Comments";
import TldrSnapshot from "@/components/TldrSnapshot";
import SeriesNavigation from "@/components/SeriesNavigation";
import GoogleAd from "@/components/GoogleAds";
import { ArticleStructuredData, BreadcrumbStructuredData } from "@/components/StructuredData";
import PolicyArticleContent from "@/components/PolicyArticleContent";
import EditorNoteContent from "@/components/EditorNoteContent";
import { TopListsContent } from "@/components/TopListsContent";
import { PromptAndGoBanner } from "@/components/PromptAndGoBanner";
import InlineRelatedArticles from "@/components/InlineRelatedArticles";
import ReturnTriggerBlock from "@/components/ReturnTriggerBlock";
import FloatingNewsletterPopup from "@/components/FloatingNewsletterPopup";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import FontSizeControl from "@/components/FontSizeControl";
import FollowButton from "@/components/FollowButton";
import ContinueReading from "@/components/ContinueReading";
import ShareThoughtsCTA from "@/components/ShareThoughtsCTA";
import DeepDiveSection from "@/components/DeepDiveSection";
import ExploreMoreButton from "@/components/ExploreMoreButton";
import UpNextSidebar from "@/components/UpNextSidebar";
import NextArticleProgress from "@/components/NextArticleProgress";
import ExitIntentOverlay from "@/components/ExitIntentOverlay";
import RecentlyViewedArticles from "@/components/RecentlyViewedArticles";
import { useRecentArticles } from "@/hooks/useRecentArticles";
import { ThreeBeforeNineTemplate } from "@/components/ThreeBeforeNine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Share2, Bookmark, MessageCircle } from "lucide-react";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useSocialEmbeds } from "@/components/SocialEmbeds";

// Extracted components and hooks
import {
  renderArticleContent,
  ArticleLoadingSkeleton,
  ArticleNotFound,
  ArticleAdminControls,
  ArticleAdminDebug,
  ArticleRelatedSection,
  ArticleBreadcrumbs,
  ArticleSponsorBanner,
  ArticleAuthorBio,
  getExternalLinkForCategory,
} from "@/components/article";
import { createShareHandlers } from "@/hooks/useArticleActions";

const Article = () => {
  const { category, slug } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, isLoading: isLoadingAdmin } = useAdminRole();
  const queryClient = useQueryClient();
  const { trackView } = useRecentArticles();
  
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showAdminView, setShowAdminView] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [enableRelatedArticles, setEnableRelatedArticles] = useState(false);
  
  const cleanSlug = slug?.replace(/\/+$/g, '');
  const urlParams = new URLSearchParams(window.location.search);
  const previewCode = urlParams.get('preview');
  const isPreview = !!previewCode;

  // Fetch comment count
  const { data: commentCount = 0 } = useQuery({
    queryKey: ["article-comment-count", cleanSlug],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data: articleData } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", cleanSlug)
        .maybeSingle();
      
      if (!articleData?.id) return 0;
      
      const { count: realCount } = await supabase
        .from("comments_public")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleData.id);
      
      const { count: aiCount } = await supabase
        .from("ai_generated_comments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleData.id)
        .eq("published", true);
      
      return (realCount || 0) + (aiCount || 0);
    },
  });

  // Fetch article
  const { data: article, isLoading } = useQuery({
    queryKey: ["article", cleanSlug, previewCode],
    staleTime: typeof window !== "undefined" &&
      (window.location.hostname.includes("lovableproject.com") ||
        window.location.hostname === "localhost")
        ? 0
        : 5 * 60 * 1000,
    refetchOnMount: typeof window !== "undefined" &&
      (window.location.hostname.includes("lovableproject.com") ||
        window.location.hostname === "localhost")
        ? "always"
        : undefined,
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select(`
          *,
          authors!articles_author_id_fkey (id, name, slug, bio, avatar_url, job_title),
          categories!articles_primary_category_id_fkey (name, slug, id)
        `)
        .eq("slug", cleanSlug);
      
      if (previewCode) {
        query = query.eq("preview_code", previewCode);
      } else {
        query = query.eq("status", "published");
      }
      
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Load social embeds
  useSocialEmbeds([article?.content]);

  // Fetch sponsor
  const { data: sponsor } = useQuery({
    queryKey: ["category-sponsor", article?.categories?.id],
    enabled: !!article?.categories?.id,
    queryFn: async () => {
      if (!article?.categories?.id) return null;
      const { data, error } = await supabase
        .from("category_sponsors")
        .select("*")
        .eq("category_id", article.categories.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch related articles
  const { data: relatedArticles } = useQuery({
    queryKey: ["related-articles", article?.primary_category_id, article?.id],
    enabled: enableRelatedArticles && !!article?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const baseQuery = supabase
        .from("articles")
        .select(`*, authors (name, slug), categories:primary_category_id (name, slug)`)
        .neq("id", article!.id)
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(3);

      if (article?.primary_category_id) {
        const { data, error } = await baseQuery.eq("primary_category_id", article.primary_category_id);
        if (error) throw error;
        return data;
      }
      
      const { data, error } = await baseQuery;
      if (error) throw error;
      return data;
    },
  });

  // Effects
  useEffect(() => {
    if (user && article?.id) {
      checkBookmark();
      trackReadingHistory();
    }
  }, [user, article?.id]);

  useEffect(() => {
    if (article?.id && article.status === 'published') {
      trackArticleView();
      const articleUrl = `/${article.categories?.slug || category || 'news'}/${article.slug}`;
      trackView({
        id: article.id,
        title: article.title,
        url: articleUrl,
        featuredImageUrl: article.featured_image_url || undefined,
        categoryName: article.categories?.name || undefined,
        categorySlug: article.categories?.slug || undefined,
      });
    }
  }, [article?.id]);

  useEffect(() => {
    if (article?.id) {
      const timer = setTimeout(() => setEnableRelatedArticles(true), 200);
      return () => clearTimeout(timer);
    }
  }, [article?.id]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [article?.id]);

  // Prompt box copy handler
  useEffect(() => {
    if (!article?.content) return;
    const promptBoxes = document.querySelectorAll('.prompt-box');
    
    const handleCopy = async (e: Event) => {
      e.preventDefault();
      const button = e.currentTarget as HTMLElement;
      const promptBox = button.closest('.prompt-box');
      
      if (promptBox) {
        const promptText = Array.from(promptBox.childNodes)
          .filter(node => !node.textContent?.includes('Copy Prompt'))
          .map(node => node.textContent?.trim())
          .filter(Boolean)
          .join('\n\n');
        
        try {
          await navigator.clipboard.writeText(promptText);
          toast({ title: "Copied!", description: "Prompt copied to clipboard" });
        } catch (err) {
          toast({ title: "Copy failed", description: "Please try selecting and copying manually", variant: "destructive" });
        }
      }
    };

    promptBoxes.forEach(box => {
      const copyButton = box.querySelector('a[href*="copy"], button');
      if (copyButton) copyButton.addEventListener('click', handleCopy as EventListener);
    });

    return () => {
      promptBoxes.forEach(box => {
        const copyButton = box.querySelector('a[href*="copy"], button');
        if (copyButton) copyButton.removeEventListener('click', handleCopy as EventListener);
      });
    };
  }, [article?.content, toast]);

  // Action handlers
  const trackArticleView = async () => {
    if (!article?.id) return;
    const viewKey = `article_view_${article.id}`;
    const lastViewed = localStorage.getItem(viewKey);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (!lastViewed || now - parseInt(lastViewed) > oneHour) {
      try {
        await supabase.rpc('increment_article_views', { article_id: article.id });
        localStorage.setItem(viewKey, now.toString());
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    }
  };

  const trackReadingHistory = async () => {
    if (!user || !article?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('reading_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('article_id', article.id)
      .gte('read_at', `${today}T00:00:00`)
      .maybeSingle();

    if (!existing) {
      await supabase.from('reading_history').insert({
        user_id: user.id,
        article_id: article.id,
        completed: true
      });
    }
  };

  const checkBookmark = async () => {
    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user!.id)
      .eq('article_id', article!.id)
      .maybeSingle();
    setIsBookmarked(!!data);
  };

  const handleBookmark = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to bookmark articles" });
      return;
    }
    if (!article?.id) return;

    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('article_id', article.id);
      setIsBookmarked(false);
      toast({ title: "Bookmark removed" });
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, article_id: article.id });
      setIsBookmarked(true);
      toast({ title: "Bookmarked!" });
    }
  };

  const handlePublish = async () => {
    if (!article || !isAdmin) return;
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from('articles')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', article.id);
      if (error) throw error;
      toast({ title: "Article published", description: "The article is now live" });
      queryClient.invalidateQueries({ queryKey: ["article", cleanSlug] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to publish article", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  // Share handlers
  const categorySlug = article?.categories?.slug || category || "news";
  const articleSlug = article?.slug || cleanSlug || "";
  const articleTitle = article?.title || "";

  const shareHandlers = createShareHandlers(
    categorySlug,
    articleSlug,
    articleTitle,
    article?.excerpt || null,
    article?.canonical_url || null,
    user?.id,
    toast
  );

  // Loading state
  if (isLoading) return <ArticleLoadingSkeleton />;

  // 404 state
  if (!article) return <ArticleNotFound />;

  // 3-Before-9 template
  if (article.article_type === 'three_before_nine') {
    return (
      <>
        <Header />
        <ThreeBeforeNineTemplate 
          article={{
            id: article.id,
            title: article.title,
            slug: article.slug,
            content: article.content,
            excerpt: article.excerpt || "Three AI signals worth knowing before your first coffee.",
            published_at: article.published_at || '',
            updated_at: article.updated_at,
            featured_image_url: article.featured_image_url || undefined,
            meta_title: article.meta_title || undefined,
            meta_description: article.meta_description || undefined,
            tldr_snapshot: article.tldr_snapshot as any,
            author: article.authors ? {
              name: article.authors.name,
              slug: article.authors.slug,
              avatar_url: article.authors.avatar_url || undefined
            } : undefined
          }}
        />
        <Footer />
      </>
    );
  }

  const externalLink = getExternalLinkForCategory(article.categories?.name);

  return (
    <>
      <ReadingProgressBar />
      
      <Helmet>
        <title>{((article.meta_title || article.title || 'Article') + '').replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")} | AI in ASIA</title>
        <meta name="description" content={(article.meta_description || article.excerpt || '').replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA')} />
        <meta name="author" content={article.authors?.name || 'AI in ASIA'} />
        <meta property="article:published_time" content={article.published_at || ''} />
        <meta property="article:modified_time" content={article.updated_at || ''} />
        <meta property="article:author" content={article.authors?.name || ''} />
        <meta property="article:section" content={article.categories?.name || ''} />
        <meta property="og:site_name" content="AI in ASIA" />
        <meta property="og:title" content={(article.meta_title || article.title).replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")} />
        <meta property="og:description" content={(article.meta_description || article.excerpt || '').replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA')} />
        <meta property="og:image" content={article.featured_image_url || 'https://aiinasia.com/favicon.png'} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={article.featured_image_alt || article.title} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={shareHandlers.getPublicArticleUrl()} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@aiinasia" />
        <meta name="twitter:title" content={(article.meta_title || article.title).replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")} />
        <meta name="twitter:description" content={(article.meta_description || article.excerpt || '').replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA')} />
        <meta name="twitter:image" content={article.featured_image_url || 'https://aiinasia.com/favicon.png'} />
        <meta name="twitter:image:alt" content={article.featured_image_alt || article.title} />
        {isPreview ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <link rel="canonical" href={shareHandlers.getPublicArticleUrl()} />
        )}
      </Helmet>

      <ArticleStructuredData
        title={article.title}
        description={article.excerpt || ''}
        imageUrl={article.featured_image_url || ''}
        datePublished={article.published_at || ''}
        dateModified={article.updated_at || ''}
        authorName={article.authors?.name || 'AI in ASIA'}
        categoryName={article.categories?.name || ''}
      />

      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: 'https://aiinasia.com' },
          { name: article.categories?.name || 'Uncategorized', url: `https://aiinasia.com/category/${article.categories?.slug || 'uncategorized'}` },
          { name: article.title, url: article.canonical_url || `https://aiinasia.com/${categorySlug}/${articleSlug}` }
        ]}
      />

      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1">
          <article className="container mx-auto px-4 py-8 max-w-4xl">
            <ArticleBreadcrumbs
              articleType={article.article_type}
              categoryName={article.categories?.name}
              categorySlug={article.categories?.slug}
              articleTitle={article.title}
            />

            <header className="mb-8">
              {isPreview && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    🔒 Preview Mode - This article is not publicly visible
                  </p>
                </div>
              )}

              {!isLoadingAdmin && isAdmin && (
                <ArticleAdminControls
                  articleId={article.id}
                  articleStatus={article.status}
                  showAdminView={showAdminView}
                  isPublishing={isPublishing}
                  onToggleAdminView={() => setShowAdminView(!showAdminView)}
                  onPublish={handlePublish}
                />
              )}

              {!isLoadingAdmin && isAdmin && showAdminView && (
                <ArticleAdminDebug article={article} />
              )}
              
              <Badge className="mb-4 bg-primary text-primary-foreground">
                {article.categories?.name || 'Article'}
              </Badge>
              
              {sponsor && (
                <ArticleSponsorBanner 
                  sponsor={sponsor} 
                  categoryName={article.categories?.name || ''} 
                />
              )}
              
              <h1 className="headline text-4xl md:text-5xl mb-4">
                {article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
              </h1>
              
              {article.excerpt && (
                <p className="text-xl text-muted-foreground mb-6">{article.excerpt}</p>
              )}

              {/* Author info row */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 pb-6 border-b border-border relative z-20">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {article.authors?.slug ? (
                    <Link to={`/author/${article.authors.slug}`}>
                      {article.authors.avatar_url ? (
                        <img src={article.authors.avatar_url} alt={article.authors.name} className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary hover:opacity-80 transition-opacity flex-shrink-0" />
                      )}
                    </Link>
                  ) : article.authors?.avatar_url ? (
                    <img src={article.authors.avatar_url} alt={article.authors?.name || 'Anonymous'} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-semibold">
                      <User className="h-4 w-4 flex-shrink-0" />
                      {article.authors?.slug ? (
                        <Link to={`/author/${article.authors.slug}`} className="hover:text-primary transition-colors truncate">{article.authors.name}</Link>
                      ) : (
                        <span className="truncate">{article.authors?.name || 'Anonymous'}</span>
                      )}
                    </div>
                    {article.authors?.job_title && (
                      <div className="text-sm text-muted-foreground truncate">{article.authors.job_title}</div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="whitespace-nowrap">{article.reading_time_minutes || 5} min read</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">
                        {article.published_at && new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <span>•</span>
                      <button onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                        <MessageCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">{commentCount} comments</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
                    {article.authors && <FollowButton followType="author" followId={article.authors.id} followName={article.authors.name} />}
                    {article.categories && <FollowButton followType="category" followId={article.categories.id} followName={article.categories.name} />}
                  </div>
                  <div className="flex items-center gap-2 ml-auto md:ml-0">
                    <Button variant="outline" size="icon" onClick={handleBookmark} title={isBookmarked ? "Remove bookmark" : "Bookmark article"} className="h-8 w-8 cursor-pointer">
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    </Button>
                    <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1 h-8">
                      <FontSizeControl />
                    </div>
                    <Button variant="outline" size="icon" onClick={shareHandlers.handleShare} title="Share article" className="h-8 w-8 cursor-pointer">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </header>

            {/* Series Navigation */}
            {article.series_id && (
              <SeriesNavigation 
                seriesId={article.series_id} 
                currentPart={article.series_part || 1} 
                currentArticleId={article.id} 
              />
            )}

            {/* Featured Image */}
            {article.featured_image_url && (
              <div className="mb-8">
                <img src={article.featured_image_url} alt={article.featured_image_alt || article.title} className="w-full rounded-lg" loading="eager" />
                {article.featured_image_caption && (
                  <p className="text-sm text-muted-foreground text-center mt-2">{article.featured_image_caption}</p>
                )}
              </div>
            )}

            {/* TLDR */}
            {article.tldr_snapshot && typeof article.tldr_snapshot === 'object' && (article.tldr_snapshot as any).bullets?.length > 0 && (
              <TldrSnapshot 
                bullets={(article.tldr_snapshot as any).bullets}
                whoShouldPayAttention={(article.tldr_snapshot as any).whoShouldPayAttention}
                whatChangesNext={(article.tldr_snapshot as any).whatChangesNext}
              />
            )}

            {/* Sidebar Ad */}
            <div className="float-right ml-6 mb-6 hidden lg:block w-72">
              <GoogleAd slot="sidebar" />
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none article-content">
              {article.article_type === 'policy_article' ? (
                <PolicyArticleContent article={article} />
              ) : article.article_type === 'top_lists' ? (
                <TopListsContent
                  items={article.top_list_items as any}
                  introHtml={article.top_list_intro as string | undefined}
                  outroHtml={article.top_list_outro as string | undefined}
                />
              ) : article.article_type === 'editors_note' ? (
                <EditorNoteContent article={article} renderContent={renderArticleContent} />
              ) : (
                renderArticleContent(article.content)
              )}
            </div>

            {/* Article Footer */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex flex-col md:flex-row md:items-center gap-4 relative z-20">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {article.authors?.slug ? (
                    <Link to={`/author/${article.authors.slug}`}>
                      {article.authors.avatar_url ? (
                        <img src={article.authors.avatar_url} alt={article.authors.name} className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary hover:opacity-80 transition-opacity flex-shrink-0" />
                      )}
                    </Link>
                  ) : article.authors?.avatar_url ? (
                    <img src={article.authors.avatar_url} alt={article.authors?.name || 'Anonymous'} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-semibold">
                      <User className="h-4 w-4 flex-shrink-0" />
                      {article.authors?.slug ? (
                        <Link to={`/author/${article.authors.slug}`} className="hover:text-primary transition-colors truncate">{article.authors.name}</Link>
                      ) : (
                        <span className="truncate">{article.authors?.name || 'Anonymous'}</span>
                      )}
                    </div>
                    {article.authors?.job_title && (
                      <div className="text-sm text-muted-foreground truncate">{article.authors.job_title}</div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="whitespace-nowrap">{article.reading_time_minutes || 5} min read</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">
                        {article.published_at && new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      <span>•</span>
                      <button onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                        <MessageCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">{commentCount} comments</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
                    {article.authors && <FollowButton followType="author" followId={article.authors.id} followName={article.authors.name} />}
                    {article.categories && <FollowButton followType="category" followId={article.categories.id} followName={article.categories.name} />}
                  </div>
                  <div className="flex items-center gap-2 ml-auto md:ml-0">
                    <Button variant="outline" size="icon" onClick={handleBookmark} title={isBookmarked ? "Remove bookmark" : "Bookmark article"} className="h-8 w-8 cursor-pointer">
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    </Button>
                    <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1 h-8">
                      <FontSizeControl />
                    </div>
                    <Button variant="outline" size="icon" onClick={shareHandlers.handleShare} title="Share article" className="h-8 w-8 cursor-pointer">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Author Bio */}
            <ArticleAuthorBio authors={article.authors} />

            <ShareThoughtsCTA commentCount={commentCount} />
            <DeepDiveSection currentArticleId={article.id} tags={article.ai_tags} />
            <ContinueReading currentArticleId={article.id} categoryId={article.primary_category_id || undefined} categorySlug={article.categories?.slug} />
            <ReturnTriggerBlock />
          </article>

          {/* Comments */}
          <section id="comments-section" className="container mx-auto px-4 max-w-4xl mt-12">
            <Comments articleId={article.id} />
          </section>

          {/* Recently Viewed */}
          <section className="container mx-auto px-4 max-w-4xl mt-12">
            <RecentlyViewedArticles excludeUrl={`/${article.categories?.slug || category || 'news'}/${article.slug}`} maxItems={5} title="Continue reading" />
          </section>

          {/* Inline Related */}
          {article.categories?.id && (
            <section className="container mx-auto px-4 max-w-4xl mt-12">
              <InlineRelatedArticles currentArticleId={article.id} categoryId={article.categories.id} categorySlug={article.categories.slug} />
            </section>
          )}

          {/* Related Articles */}
          <ArticleRelatedSection relatedArticles={relatedArticles || []} externalLink={externalLink} />

          {/* Prompt & Go Banner */}
          {article.article_type === 'top_lists' && (
            <section className="container mx-auto px-4 max-w-4xl mt-12">
              <div className="text-sm text-muted-foreground mb-3 text-center">In partnership with</div>
              <PromptAndGoBanner />
            </section>
          )}
        </main>

        <ExploreMoreButton />
        <UpNextSidebar currentArticleId={article.id} categoryId={article.primary_category_id || undefined} />
        <NextArticleProgress currentArticleId={article.id} categoryId={article.primary_category_id || undefined} />
        <ExitIntentOverlay currentArticleId={article.id} />
        <FloatingNewsletterPopup />
        <Footer />
      </div>
    </>
  );
};

export default Article;
