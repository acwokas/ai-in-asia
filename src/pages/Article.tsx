import { useParams, Link } from "react-router-dom";
import { dualPush } from "@/lib/dualTrack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { SidebarAd } from "@/components/GoogleAds";
import AdUnit from "@/components/AdUnit";
import Footer from "@/components/Footer";
import TldrSnapshot from "@/components/TldrSnapshot";
import SeriesNavigation from "@/components/SeriesNavigation";

import { ArticleStructuredData, BreadcrumbStructuredData, FAQPageStructuredData } from "@/components/StructuredData";
import { HowToStructuredData, parseHowToSteps, isHowToArticle } from "@/components/HowToStructuredData";
import PolicyArticleContent from "@/components/PolicyArticleContent";
import EditorNoteContent from "@/components/EditorNoteContent";
import { TopListsContent } from "@/components/TopListsContent";
import ReturnTriggerBlock from "@/components/ReturnTriggerBlock";
import EndOfContentNewsletter from "@/components/EndOfContentNewsletter";
import InlineRelatedArticles from "@/components/InlineRelatedArticles";
import RecommendedGuides from "@/components/RecommendedGuides";

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
import EditorialCallout from "@/components/article/EditorialCallout";
import { ThreeBeforeNineTemplate } from "@/components/ThreeBeforeNine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Clock, Lock } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { getCategoryColor } from "@/lib/categoryColors";
import { fixEncoding } from "@/lib/textUtils";
import { calculateReadingTime } from '@/lib/readingTime';
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useSocialEmbeds } from "@/components/SocialEmbeds";
import { ArticleRailRelatedReading } from "@/components/article/ArticleRailRelatedReading";
import ArticleYouMightAlsoLike from "@/components/article/ArticleYouMightAlsoLike";
import { ArticleShareInline, ArticleShareFloating, ArticleShareMobileBar } from "@/components/article/ArticleSocialShare";
// GA4 content tracking is inlined below to survive Vite tree-shaking
import { getOptimizedHeroImage, generateResponsiveSrcSet, getOptimizedAvatar } from "@/lib/imageOptimization";
import { LearningPathCallout } from "@/components/article/LearningPathCallout";
import { ArticleFallbackImage } from "@/components/ui/ArticleFallbackImage";

// Lazy-load Comments (below the fold)
const Comments = lazy(() => import("@/components/Comments"));

// Extracted components and hooks
import {
  renderArticleContent,
  ArticleLoadingSkeleton,
  ArticleNotFound,
  ArticleAdminControls,
  ArticleBreadcrumbs,
  ArticleAuthorBio,
} from "@/components/article";
import { createShareHandlers } from "@/hooks/useArticleActions";

const Article = () => {
  const { category, slug } = useParams();
  
  const { user } = useAuth();
  const { isAdmin, isLoading: isLoadingAdmin } = useAdminRole();
  const queryClient = useQueryClient();
  const { trackView } = useRecentArticles();
  
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showAdminView, setShowAdminView] = useState(false);
  
  const cleanSlug = slug?.replace(/\/+$/g, '');
  const urlParams = new URLSearchParams(window.location.search);
  const previewCode = urlParams.get('preview');
  const isPreview = !!previewCode;

  // Reset prerenderReady on navigation so the prerenderer waits for new data
  useEffect(() => {
    (window as any).prerenderReady = false;
  }, [cleanSlug]);

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
          authors!articles_author_id_fkey (id, name, slug, bio, avatar_url, job_title, twitter_handle),
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

  // Fetch comment count (after article loads)
  const { data: commentCount = 0 } = useQuery({
    queryKey: ["article-comment-count", article?.id],
    staleTime: 2 * 60 * 1000,
    enabled: !!article?.id && article?.article_type !== 'policy_article',
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

  // ── GA4 inline tracking (inlined to survive Vite tree-shaking) ──
  const ga4MaxDepth = useRef(0);
  const ga4FiredDepths = useRef(new Set<number>());
  const ga4StartTime = useRef(Date.now());

  const ga4ArticleId = article?.id;
  const ga4Title = article?.title;
  const ga4Category = (article as any)?.categories?.name;

  // useEffect #1 — Scroll depth milestones
  useEffect(() => {
    if (!ga4ArticleId) return;
    ga4StartTime.current = Date.now();
    ga4MaxDepth.current = 0;
    ga4FiredDepths.current.clear();

    const MILESTONES = [25, 50, 75, 90] as const;

    const handleScroll = () => {
      // Re-query on every scroll to avoid stale/detached DOM references
      const contentEl = document.querySelector(".article-content");
      if (!contentEl) return;

      const rect = contentEl.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return;

      const scrolled = -rect.top;
      const pct = Math.max(0, Math.min(100, Math.round((scrolled / total) * 100)));
      if (pct > ga4MaxDepth.current) ga4MaxDepth.current = pct;

      for (const m of MILESTONES) {
        if (pct >= m && !ga4FiredDepths.current.has(m)) {
          ga4FiredDepths.current.add(m);

          const payload: Record<string, any> = {
            article_id: ga4ArticleId,
            article_title: ga4Title,
            article_category: ga4Category,
          };

          if (m === 90) {
            const seconds = Math.round((Date.now() - ga4StartTime.current) / 1000);
            if (seconds < 60) continue; // skip — too fast to be a real read
            payload.time_on_page = seconds;
          }

          // Use dualPush for both dataLayer AND Supabase dual-write
          dualPush(m === 90 ? "article_complete" : `article_read_${m}`, payload);

          if (!import.meta.env.PROD) {
            console.log(`[GA4-INLINE] Fired ${payload.event} at ${pct}%`);
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [ga4ArticleId, ga4Title, ga4Category]);

  // useEffect #2 — Engagement score on exit
  useEffect(() => {
    if (!ga4ArticleId) return;
    const handleVis = () => {
      if (document.visibilityState === "hidden") {
        const seconds = Math.round((Date.now() - ga4StartTime.current) / 1000);
        dualPush("article_engagement_score", { article_title: ga4Title, article_category: ga4Category, scroll_depth: ga4MaxDepth.current, time_on_page: seconds });
      }
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, [ga4ArticleId, ga4Title, ga4Category]);

  // useEffect #3 — Newsletter CTA tracking
  useEffect(() => {
    if (!ga4ArticleId) return;
    const targets = document.querySelectorAll(".newsletter-cta");
    if (!targets.length) return;

    const viewedSet = new WeakSet<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !viewedSet.has(entry.target)) {
          viewedSet.add(entry.target);
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: "newsletter_cta_view", article_id: ga4ArticleId, article_title: ga4Title });
        }
      }
    }, { threshold: 0.5 });

    targets.forEach((el) => observer.observe(el));

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.tagName === "BUTTON") {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "newsletter_cta_click", article_id: ga4ArticleId, article_title: ga4Title });
      }
    };
    targets.forEach((el) => el.addEventListener("click", handleClick));

    return () => {
      observer.disconnect();
      targets.forEach((el) => el.removeEventListener("click", handleClick));
    };
  }, [ga4ArticleId, ga4Title]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [article?.id]);

  // Signal to prerenderers (lovablehtml, prerender.io, etc.) that
  // the page is ready to snapshot — i.e. article data has loaded and
  // react-helmet-async has injected the article-specific meta tags.
  useEffect(() => {
    if (!isLoading) {
      // Fires for both successful loads and 404s (article === null).
      // Small delay to ensure Helmet has flushed meta tags into <head>.
      requestAnimationFrame(() => {
        (window as any).prerenderReady = true;
      });
    }
  }, [article, isLoading]);

  // Inject NewsArticle JSON-LD via useEffect (cleaned up on unmount / navigation)
  useEffect(() => {
    if (!article) return;

    const categorySlugVal = article.categories?.slug || category || 'news';
    const articleSlugVal = article.slug;
    const datePublished = article.published_at || article.created_at;
    const dateModified = article.updated_at || datePublished;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: article.title,
      datePublished,
      dateModified,
      author: {
        "@type": "Organization",
        name: "AI in Asia",
        url: "https://aiinasia.com",
      },
      publisher: {
        "@type": "NewsMediaOrganization",
        name: "AI in Asia",
        url: "https://aiinasia.com",
        logo: {
          "@type": "ImageObject",
          url: "https://aiinasia.com/og-image.png",
        },
      },
      url: `https://aiinasia.com/${categorySlugVal}/${articleSlugVal}`,
      description: article.excerpt || article.meta_description || "",
      ...(article.featured_image_url && { image: article.featured_image_url }),
      ...(article.categories?.name && { articleSection: article.categories.name }),
      inLanguage: "en-GB",
      isPartOf: {
        "@type": "NewsMediaOrganization",
        name: "AI in Asia",
        url: "https://www.aiinasia.com",
      },
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-jsonld", "news-article");
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [article?.id, article?.slug, article?.updated_at]);

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
          toast("Copied!", { description: "Prompt copied to clipboard" });
        } catch (err) {
          toast.error("Copy failed", { description: "Please try selecting and copying manually" });
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
            const messages: Record<number, { title: string; description: string }> = {
              1: { title: "+10 points", description: "Keep reading to level up!" },
              5: { title: "5 articles today!", description: "You're on a roll - 50 points earned" },
              10: { title: "10 articles!", description: "You're a power reader - 100 points earned" },
            };
            const msg = messages[articleCount];
            if (msg) toast(msg.title, { description: msg.description, duration: 3000 });
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
      toast("Sign in required", { description: "Please sign in to bookmark articles" });
      return;
    }
    if (!article?.id) return;

    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('article_id', article.id);
      setIsBookmarked(false);
      toast("Bookmark removed");
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, article_id: article.id });
      setIsBookmarked(true);
      toast("Bookmarked!");
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
        title={fixEncoding(((article.meta_title || article.title || 'Article') + '').replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"))}
        description={fixEncoding((article.meta_description || article.excerpt || '').replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA'))}
        canonical={isPreview ? undefined : shareHandlers.getPublicArticleUrl()}
        ogImage={article.featured_image_url || 'https://aiinasia.com/icons/aiinasia-og-default.png'}
        ogImageAlt={article.featured_image_alt || article.title}
        ogType="article"
        noIndex={isPreview}
        articleMeta={{
          publishedTime: article.published_at || '',
          modifiedTime: article.updated_at || '',
          author: article.authors?.name || 'AI in ASIA',
          section: article.categories?.name || '',
          tags: [...(article.ai_tags || []), ...(article.topic_tags || [])].filter(Boolean),
          twitterHandle: article.authors?.twitter_handle || undefined,
        }}
      >
        {article.featured_image_url && (
          <link
            rel="preload"
            as="image"
            href={article.featured_image_url}
            fetchPriority="high"
          />
        )}
      </SEOHead>

      <ArticleStructuredData
        title={article.title}
        description={article.excerpt || ''}
        imageUrl={article.featured_image_url || ''}
        datePublished={article.published_at || ''}
        dateModified={article.updated_at || ''}
        authorName={article.authors?.name || 'AI in ASIA'}
        categoryName={article.categories?.name || ''}
        categorySlug={article.categories?.slug || ''}
        wordCount={article.content ? calculateReadingTime(article.content, article.title || '') * 200 : undefined}
        keywords={[...(article.ai_tags || []), ...(article.topic_tags || [])].filter(Boolean).join(', ') || undefined}
        thumbnailUrl={article.featured_image_url || undefined}
        canonicalUrl={article.canonical_url || `https://aiinasia.com/${categorySlug}/${articleSlug}`}
        authorSlug={article.authors?.slug || undefined}
      />

      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: '/' },
          { name: article.categories?.name || 'Uncategorized', url: `/category/${article.categories?.slug || 'uncategorized'}` },
          { name: article.title, url: article.canonical_url || `/${categorySlug}/${articleSlug}` }
        ]}
      />

      {isHowToArticle(article.ai_tags) && (() => {
        const contentStr = typeof article.content === 'string' ? article.content : JSON.stringify(article.content);
        const steps = parseHowToSteps(contentStr);
        return steps.length > 0 ? (
          <HowToStructuredData
            title={article.title}
            description={article.excerpt || ''}
            imageUrl={article.featured_image_url || undefined}
            steps={steps}
          />
        ) : null;
      })()}

      {/* FAQ structured data — auto-parsed from Scout-generated FAQ sections */}
      {(() => {
        const contentStr = typeof article.content === 'string' ? article.content : JSON.stringify(article.content || '');
        const faqMatches = [...contentStr.matchAll(/<h[34][^>]*>\s*([^<]+\?)\s*<\/h[34]>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)];
        if (faqMatches.length === 0) return null;
        const questions = faqMatches.map(m => ({
          question: m[1].replace(/<[^>]+>/g, '').trim(),
          answer: m[2].replace(/<[^>]+>/g, '').trim(),
        })).filter(q => q.question && q.answer).slice(0, 5);
        return questions.length > 0 ? <FAQPageStructuredData questions={questions} /> : null;
      })()}

      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main id="main-content" className="flex-1">
          {/* Admin controls above hero */}
          {(!isLoadingAdmin && isAdmin) && (
            <div className="container mx-auto px-4 max-w-[1080px] pt-4">
              <ArticleAdminControls
                article={article}
                showAdminView={showAdminView}
                onToggleAdminView={() => setShowAdminView(!showAdminView)}
                queryKey={["article", cleanSlug, previewCode]}
              />
            </div>
          )}

          {isPreview && (
            <div className="container mx-auto px-4 max-w-[1080px] pt-4">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  <Lock className="h-4 w-4 inline mr-1" /> Preview Mode - This article is not publicly visible
                </p>
              </div>
            </div>
          )}

          {/* Hero Image with overlay */}
          {article.featured_image_url ? (
            <div className="container mx-auto max-w-[1080px] mt-4 px-4 md:px-4">
              <figure className="article-hero rounded-lg">
                <ArticleFallbackImage
                  src={getOptimizedHeroImage(article.featured_image_url, 1080)}
                  srcSet={generateResponsiveSrcSet(article.featured_image_url)}
                  sizes="(max-width: 768px) 100vw, 1080px"
                  alt={article.featured_image_alt || article.title}
                  width={1080}
                  height={607}
                  loading="eager"
                  fetchPriority="high"
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
                        {fixEncoding(article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"))}
                  </h1>
                  
                      {article.excerpt && (
                        <p className="article-hero-excerpt">{fixEncoding(article.excerpt)}</p>
                  )}

                  {/* Byline row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {article.authors?.avatar_url && (
                      <Link to={`/author/${article.authors?.slug}`}>
                        <img src={getOptimizedAvatar(article.authors.avatar_url, 40)} alt={article.authors.name} className="w-8 h-8 rounded-full object-cover border border-white/30" />
                      </Link>
                    )}
                    <span className="text-white/90 text-sm font-semibold">{article.authors?.name || 'Intelligence Desk'}</span>
                    <span className="text-white/50 text-sm">•</span>
                    <time dateTime={article.published_at || ''} className="text-white/70 text-sm">
                      {article.published_at && new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </time>
                    <span className="text-white/50 text-sm">•</span>
                    <span className="text-white/70 text-sm flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.reading_time_minutes || 5} min read
                    </span>
                    <div className="flex items-center gap-1 ml-auto">
                      <ArticleShareInline categorySlug={categorySlug} articleSlug={articleSlug} articleTitle={articleTitle} />
                      <Button variant="ghost" size="icon" onClick={handleBookmark} className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10" aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this article"}>
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </figure>
              {article.featured_image_caption && (
                <p className="text-xs text-muted-foreground/70 text-center mt-2 italic px-2">{article.featured_image_caption}</p>
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
              
              <h1 className="article-hero-title text-foreground mb-4">
                {fixEncoding(article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"))}
              </h1>
              {article.excerpt && (
                <p className="text-xl text-muted-foreground mb-6">{fixEncoding(article.excerpt)}</p>
              )}
              <div className="flex items-center gap-3 pb-6 border-b border-border text-sm text-muted-foreground flex-wrap">
                {article.authors?.avatar_url && (
                  <Link to={`/author/${article.authors?.slug}`}>
                    <img src={getOptimizedAvatar(article.authors.avatar_url, 40)} alt={article.authors.name} className="w-8 h-8 rounded-full object-cover" />
                  </Link>
                )}
                <span className="font-semibold text-foreground">{article.authors?.name || 'Intelligence Desk'}</span>
                <span>•</span>
                <span>{article.published_at && new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
                <span>•</span>
                <ReadingTimeIndicator minutes={article.reading_time_minutes || 5} />
                <span>•</span>
                <ArticleShareInline categorySlug={categorySlug} articleSlug={articleSlug} articleTitle={articleTitle} />
              </div>
            </div>
          )}

          {/* Breadcrumbs (below hero when hero exists) */}
          {article.featured_image_url && (
            <nav aria-label="Breadcrumb" className="container mx-auto max-w-[1080px] px-4 mt-4">
              <ArticleBreadcrumbs
                articleType={article.article_type}
                categoryName={article.categories?.name}
                categorySlug={article.categories?.slug}
                articleTitle={article.title}
              />
            </nav>
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
              <article className="min-w-0 flex-1 max-w-[720px]">
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

                {/* Your Take CTA - excluded from three_before_nine and policy_article */}
                {(article.article_type as string) !== 'three_before_nine' && article.article_type !== 'policy_article' && (
                  <EditorialCallout />
                )}

                {/* Reactions */}
                <p className="text-sm text-muted-foreground mb-2" style={{ marginTop: '2rem' }}>What did you think?</p>
                <ArticleReactions articleId={article.id} />

                {/* Clickable topic tags — internal navigation */}
                {(() => {
                  const allTags = [...(article.ai_tags || []), ...(article.topic_tags || [])]
                    .filter(Boolean)
                    .filter((t, i, arr) => arr.indexOf(t) === i)
                    .slice(0, 8);
                  if (allTags.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-2" style={{ marginTop: '1.25rem' }}>
                      {allTags.map((tag: string) => {
                        const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                        return (
                          <Link
                            key={tag}
                            to={`/tag/${slug}`}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                          >
                            #{tag}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Compact Author Footer */}
                <div className="flex items-center gap-3" style={{ marginTop: '3.5rem', paddingTop: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
                  {article.authors?.avatar_url && (
                    <Link to={`/author/${article.authors.slug}`}>
                      <img src={getOptimizedAvatar(article.authors.avatar_url, 80)} alt={article.authors.name} className="w-10 h-10 rounded-full object-cover" />
                    </Link>
                  )}
                  <div className="text-sm">
                    Written by <Link to={`/author/${article.authors?.slug}`} className="font-semibold hover:text-primary">{article.authors?.name}</Link>
                  </div>
                  {article.authors && <FollowButton followType="author" followId={article.authors.id} followName={article.authors.name} />}
                </div>

                {/* Author Bio */}
                <ArticleAuthorBio authors={article.authors} />

                {/* Inline related articles — shown mid-flow after content */}
                {article.primary_category_id && article.article_type !== 'policy_article' && (
                  <div style={{ marginTop: '2.5rem' }}>
                    <InlineRelatedArticles
                      currentArticleId={article.id}
                      categoryId={article.primary_category_id}
                      categorySlug={article.categories?.slug || 'news'}
                    />
                  </div>
                )}

                {/* Share Thoughts CTA */}
                {article.article_type !== 'policy_article' && (
                  <div style={{ marginTop: '2.5rem' }}>
                    <ShareThoughtsCTA commentCount={commentCount} />
                  </div>
                )}

                {/* Continue Reading */}
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
              </article>

              {/* Right sidebar rail — desktop only */}
              <aside className="hidden min-[1200px]:block w-[300px] flex-shrink-0 overflow-hidden">
                <div className="sticky top-[80px] w-[300px] overflow-hidden flex flex-col gap-8">
                  <TableOfContentsSidebar readingTime={article.reading_time_minutes || 0} categoryColor={getCategoryColor(article.categories?.slug)} />
                  <SidebarAd />
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

          {/* End-of-article ad */}
          <div className="container mx-auto px-4 max-w-[720px] my-6 overflow-hidden text-center">
            <p className="text-xs text-muted-foreground/50 uppercase tracking-wider mb-1">Advertisement</p>
            <AdUnit slot="8539668053" format="rectangle" responsive={true} />
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

          {/* Learning Path callout */}
          <div className="container mx-auto px-4 max-w-[1080px]" style={{ marginTop: '2rem' }}>
            <LearningPathCallout article={article} />
          </div>


          {/* Recommended Guides — cross-link to long-form content */}
          {article.article_type !== 'policy_article' && (
            <div className="container mx-auto px-4 max-w-[1080px]" style={{ marginTop: '2.5rem' }}>
              <RecommendedGuides />
            </div>
          )}

          {/* Newsletter signup — shown before comments on all article types */}
          <div className="container mx-auto px-4 max-w-[1080px]" style={{ marginTop: '2.5rem' }}>
            <EndOfContentNewsletter />
          </div>

          {/* Comments — hidden on policy articles */}
          {article.article_type !== 'policy_article' && (
            <section id="comments-section" className="container mx-auto px-4 max-w-[1080px]" style={{ marginTop: '2rem' }}>
              <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading comments...</div>}>
                <Comments articleId={article.id} />
              </Suspense>
            </section>
          )}
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
