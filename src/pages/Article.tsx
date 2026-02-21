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
import ReturnTriggerBlock from "@/components/ReturnTriggerBlock";

import ReadingProgressBar from "@/components/ReadingProgressBar";
import FontSizeControl from "@/components/FontSizeControl";
import { TableOfContentsSidebar, TableOfContentsMobile } from "@/components/TableOfContents";
import { ReadingTimeIndicator } from "@/components/ReadingTimeIndicator";
import FollowButton from "@/components/FollowButton";
import ContinueReading from "@/components/ContinueReading";
import ShareThoughtsCTA from "@/components/ShareThoughtsCTA";
import NextArticleProgress from "@/components/NextArticleProgress";
import MobileActionBar from "@/components/MobileActionBar";
import { useRecentArticles } from "@/hooks/useRecentArticles";
import ArticleReactions from "@/components/ArticleReactions";
import { ThreeBeforeNineTemplate } from "@/components/ThreeBeforeNine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Share2, Bookmark, MessageCircle, Clock } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { getCategoryColor } from "@/lib/categoryColors";
import { useState, useEffect } from "react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useSocialEmbeds } from "@/components/SocialEmbeds";
import { ArticleRailRelatedReading } from "@/components/article/ArticleRailRelatedReading";
import ArticleYouMightAlsoLike from "@/components/article/ArticleYouMightAlsoLike";
import { ArticleShareInline, ArticleShareFloating, ArticleShareMobileBar } from "@/components/article/ArticleSocialShare";

// Extracted components and hooks
import {
  renderArticleContent,
  ArticleLoadingSkeleton,
  ArticleNotFound,
  ArticleAdminControls,
  ArticleAdminDebug,
  ArticleBreadcrumbs,
  ArticleSponsorBanner,
  ArticleAuthorBio,
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
  
  
  
  const cleanSlug = slug?.replace(/\/+$/g, '');
  const urlParams = new URLSearchParams(window.location.search);
  const previewCode = urlParams.get('preview');
  const isPreview = !!previewCode;

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

  // Fetch comment count (after article loads)
  const { data: commentCount = 0 } = useQuery({
    queryKey: ["article-comment-count", article?.id],
    staleTime: 30 * 1000,
    enabled: !!article?.id,
    queryFn: async () => {
      const { count: realCount } = await supabase
        .from("comments_public")
        .select("*", { count: "exact", head: true })
        .eq("article_id", article!.id);
      
      const { count: aiCount } = await supabase
        .from("ai_generated_comments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", article!.id)
        .eq("published", true);
      
      return (realCount || 0) + (aiCount || 0);
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

      if (!isPreview) {
        const lastToastTime = parseInt(sessionStorage.getItem('last-points-toast') || '0');
        const now = Date.now();
        const articleCount = parseInt(sessionStorage.getItem('articles-read-session') || '0') + 1;
        sessionStorage.setItem('articles-read-session', String(articleCount));
        
        // Show toast only on 1st, 5th, and 10th article in a session
        const milestones = [1, 5, 10];
        if (milestones.includes(articleCount) && (now - lastToastTime > 60000)) {
          sessionStorage.setItem('last-points-toast', String(now));
          setTimeout(() => {
            const messages = {
              1: { title: "✨ +10 points", description: "Keep reading to level up!" },
              5: { title: "🔥 5 articles today!", description: "You're on a roll - 50 points earned" },
              10: { title: "🏆 10 articles!", description: "You're a power reader - 100 points earned" },
            };
            const msg = messages[articleCount as keyof typeof messages];
            if (msg) toast({ ...msg, duration: 3000 });
          }, 2000);
        }
      }
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
            status: article.status,
            view_count: article.view_count,
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

  

  return (
    <>
      <ReadingProgressBar readingTimeMinutes={article.reading_time_minutes || 5} />
      
      <SEOHead
        title={((article.meta_title || article.title || 'Article') + '').replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
        description={(article.meta_description || article.excerpt || '').replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA')}
        canonical={isPreview ? undefined : shareHandlers.getPublicArticleUrl()}
        ogImage={article.featured_image_url || 'https://aiinasia.com/icons/aiinasia-512.png?v=3'}
        ogImageAlt={article.featured_image_alt || article.title}
        ogImageWidth="1200"
        ogImageHeight="630"
        ogType="article"
        noIndex={isPreview}
        articleMeta={{
          publishedTime: article.published_at || '',
          modifiedTime: article.updated_at || '',
          author: article.authors?.name || 'AI in ASIA',
          section: article.categories?.name || '',
        }}
      />

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
          {/* Admin controls above hero */}
          {(!isLoadingAdmin && isAdmin) && (
            <div className="container mx-auto px-4 max-w-[1080px] pt-4">
              <ArticleAdminControls
                articleId={article.id}
                articleStatus={article.status}
                showAdminView={showAdminView}
                isPublishing={isPublishing}
                onToggleAdminView={() => setShowAdminView(!showAdminView)}
                onPublish={handlePublish}
              />
              {showAdminView && <ArticleAdminDebug article={article} />}
            </div>
          )}

          {isPreview && (
            <div className="container mx-auto px-4 max-w-[1080px] pt-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  🔒 Preview Mode - This article is not publicly visible
                </p>
              </div>
            </div>
          )}

          {/* Hero Image with overlay */}
          {article.featured_image_url ? (
            <div className="container mx-auto max-w-[1080px] mt-4 px-4 md:px-4">
              <div className="article-hero rounded-lg">
                <img
                  src={article.featured_image_url}
                  alt={article.featured_image_alt || article.title}
                  loading="eager"
                />
                <div className="article-hero-gradient" />
                <div className="article-hero-content max-w-[1080px]">
                  {/* Category badge */}
                  <span
                    className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full mb-3"
                    style={{ backgroundColor: getCategoryColor(article.categories?.slug), color: '#fff' }}
                  >
                    {article.categories?.name || 'Article'}
                  </span>
                  
                  <h1 className="article-hero-title">
                    {article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
                  </h1>
                  
                  {article.excerpt && (
                    <p className="article-hero-excerpt">{article.excerpt}</p>
                  )}

                  {/* Byline row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {article.authors?.avatar_url && (
                      <Link to={`/author/${article.authors?.slug}`}>
                        <img src={article.authors.avatar_url} alt={article.authors.name} className="w-8 h-8 rounded-full object-cover border border-white/30" />
                      </Link>
                    )}
                    <span className="text-white/90 text-sm font-semibold">{article.authors?.name || 'Anonymous'}</span>
                    <span className="text-white/50 text-sm">•</span>
                    <span className="text-white/70 text-sm">
                      {article.published_at && new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                    <span className="text-white/50 text-sm">•</span>
                    <span className="text-white/70 text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.reading_time_minutes || 5} min read
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                      <ArticleShareInline categorySlug={categorySlug} articleSlug={articleSlug} articleTitle={articleTitle} />
                      <Button variant="ghost" size="icon" onClick={handleBookmark} className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10">
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              {article.featured_image_caption && (
                <p className="text-sm text-muted-foreground text-center mt-2">{article.featured_image_caption}</p>
              )}
            </div>
          ) : (
            /* No hero image — render title/meta in a standard block */
            <div className="container mx-auto max-w-[1080px] px-4 pt-8">
              <ArticleBreadcrumbs
                articleType={article.article_type}
                categoryName={article.categories?.name}
                categorySlug={article.categories?.slug}
                articleTitle={article.title}
              />
              <Badge className="mb-4" style={{ backgroundColor: getCategoryColor(article.categories?.slug), color: '#fff' }}>
                {article.categories?.name || 'Article'}
              </Badge>
              {sponsor && (
                <ArticleSponsorBanner sponsor={sponsor} categoryName={article.categories?.name || ''} />
              )}
              <h1 className="article-hero-title text-foreground mb-4">
                {article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
              </h1>
              {article.excerpt && (
                <p className="text-xl text-muted-foreground mb-6">{article.excerpt}</p>
              )}
              <div className="flex items-center gap-3 pb-6 border-b border-border text-sm text-muted-foreground flex-wrap">
                {article.authors?.avatar_url && (
                  <Link to={`/author/${article.authors?.slug}`}>
                    <img src={article.authors.avatar_url} alt={article.authors.name} className="w-8 h-8 rounded-full object-cover" />
                  </Link>
                )}
                <span className="font-semibold text-foreground">{article.authors?.name || 'Anonymous'}</span>
                <span>•</span>
                <span>{article.published_at && new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
                <span>•</span>
                <ReadingTimeIndicator minutes={article.reading_time_minutes || 5} />
                <span>•</span>
                <ArticleShareInline categorySlug={categorySlug} articleSlug={articleSlug} articleTitle={articleTitle} />
              </div>
            </div>
          )}

          {/* Sponsor banner (below hero when hero exists) */}
          {article.featured_image_url && sponsor && (
            <div className="container mx-auto max-w-[1080px] px-4 mt-4">
              <ArticleSponsorBanner sponsor={sponsor} categoryName={article.categories?.name || ''} />
            </div>
          )}

          {/* Breadcrumbs (below hero when hero exists) */}
          {article.featured_image_url && (
            <div className="container mx-auto max-w-[1080px] px-4 mt-4">
              <ArticleBreadcrumbs
                articleType={article.article_type}
                categoryName={article.categories?.name}
                categorySlug={article.categories?.slug}
                articleTitle={article.title}
              />
            </div>
          )}

          {/* Two-column layout */}
          <div className="container mx-auto max-w-[1080px] px-4" style={{ marginTop: '2.5rem' }}>
            {/* Series Navigation */}
            {article.series_id && (
              <SeriesNavigation 
                seriesId={article.series_id} 
                currentPart={article.series_part || 1} 
                currentArticleId={article.id} 
              />
            )}

            {/* TLDR */}
            {article.tldr_snapshot && typeof article.tldr_snapshot === 'object' && (article.tldr_snapshot as any).bullets?.length > 0 && (
              <div className="max-w-[720px]">
                <TldrSnapshot 
                  bullets={(article.tldr_snapshot as any).bullets}
                  whoShouldPayAttention={(article.tldr_snapshot as any).whoShouldPayAttention}
                  whatChangesNext={(article.tldr_snapshot as any).whatChangesNext}
                />
              </div>
            )}

            {/* Mobile TOC */}
            <div className="max-w-[720px]">
              <TableOfContentsMobile readingTime={article.reading_time_minutes || 0} />
            </div>

            {/* Desktop two-column / Tablet+Mobile single column */}
            <div className="flex gap-10">
              {/* Main reading column */}
              <div className="min-w-0 flex-1 max-w-[720px]">
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

                {/* Reactions */}
                <p className="text-sm text-muted-foreground mb-2" style={{ marginTop: '2rem' }}>What did you think?</p>
                <ArticleReactions articleId={article.id} />

                {/* Compact Author Footer */}
                <div className="flex items-center gap-3" style={{ marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
                  {article.authors?.avatar_url && (
                    <Link to={`/author/${article.authors.slug}`}>
                      <img src={article.authors.avatar_url} alt={article.authors.name} className="w-10 h-10 rounded-full object-cover" />
                    </Link>
                  )}
                  <div className="text-sm">
                    Written by <Link to={`/author/${article.authors?.slug}`} className="font-semibold hover:text-primary">{article.authors?.name}</Link>
                  </div>
                  {article.authors && <FollowButton followType="author" followId={article.authors.id} followName={article.authors.name} />}
                </div>

                {/* Author Bio */}
                <ArticleAuthorBio authors={article.authors} />

                {/* Share Thoughts CTA */}
                <div style={{ marginTop: '2.5rem' }}>
                  <ShareThoughtsCTA commentCount={commentCount} />
                </div>

                {/* Related articles */}
                <div style={{ marginTop: '2rem' }}>
                  <ContinueReading currentArticleId={article.id} categoryId={article.primary_category_id || undefined} categorySlug={article.categories?.slug} />
                </div>

                {!isPreview && (
                  <div style={{ marginTop: '2rem' }}>
                    <ReturnTriggerBlock
                      categorySlug={article.categories?.slug}
                      categoryId={article.categories?.id}
                      categoryName={article.categories?.name}
                      isBookmarked={isBookmarked}
                      onBookmark={handleBookmark}
                    />
                  </div>
                )}
              </div>

              {/* Right sidebar rail — desktop only */}
              <aside className="hidden min-[1200px]:block w-[300px] flex-shrink-0 overflow-hidden">
                <div className="sticky top-[80px] w-[300px] overflow-hidden flex flex-col gap-8">
                  <TableOfContentsSidebar readingTime={article.reading_time_minutes || 0} categoryColor={getCategoryColor(article.categories?.slug)} />
                  <div className="w-[300px] max-w-[300px] overflow-hidden pt-0">
                    <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(48,62,83,0.15)", borderRadius: "4px" }}>
                      <GoogleAd slot="sidebar" houseAdType="mpu" />
                    </div>
                  </div>
                  {article.categories?.id && (
                    <ArticleRailRelatedReading
                      categoryId={article.categories.id}
                      categoryName={article.categories.name}
                      categorySlug={article.categories.slug}
                      currentArticleId={article.id}
                    />
                  )}
                </div>
              </aside>
            </div>
          </div>

          {/* You Might Also Like */}
          <div className="container mx-auto px-4 max-w-[720px]" data-section="you-might-also-like">
            <ArticleYouMightAlsoLike
              articleId={article.id}
              categoryId={article.primary_category_id || undefined}
              categorySlug={article.categories?.slug}
              tags={article.ai_tags}
              topicTags={article.topic_tags}
            />
          </div>

          {/* Comments */}
          <section id="comments-section" className="container mx-auto px-4 max-w-[1080px]" style={{ marginTop: '2rem' }}>
            <Comments articleId={article.id} />
          </section>
        </main>

        <NextArticleProgress currentArticleId={article.id} categoryId={article.primary_category_id || undefined} />

        {/* Floating social share sidebar (desktop) */}
        <ArticleShareFloating categorySlug={categorySlug} articleSlug={articleSlug} articleTitle={articleTitle} />

        {/* Mobile share bar */}
        <ArticleShareMobileBar categorySlug={categorySlug} articleSlug={articleSlug} articleTitle={articleTitle} />

        {/* Mobile Floating Action Bar */}
        <MobileActionBar
          isBookmarked={isBookmarked}
          onBookmark={handleBookmark}
          onShare={shareHandlers.handleShare}
        />
        
        <Footer />
      </div>
    </>
  );
};

export default Article;
