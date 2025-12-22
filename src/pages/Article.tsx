import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Comments from "@/components/Comments";
import ArticleCard from "@/components/ArticleCard";
import TldrSnapshot from "@/components/TldrSnapshot";
import SeriesNavigation from "@/components/SeriesNavigation";
import GoogleAd, { InArticleAd } from "@/components/GoogleAds";
import { ArticleStructuredData, BreadcrumbStructuredData } from "@/components/StructuredData";
import PolicyArticleContent from "@/components/PolicyArticleContent";
import PolicyBreadcrumbs from "@/components/PolicyBreadcrumbs";
import { TopListsContent } from "@/components/TopListsContent";
import { PromptAndGoBanner } from "@/components/PromptAndGoBanner";
import InlineRelatedArticles from "@/components/InlineRelatedArticles";
import InlineNewsletterSignup from "@/components/InlineNewsletterSignup";
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
import ArticleSaveButton from "@/components/ArticleSaveButton";
import RecentlyViewedArticles from "@/components/RecentlyViewedArticles";
import { useRecentArticles } from "@/hooks/useRecentArticles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, User, Share2, Bookmark, Twitter, Linkedin, Facebook, Instagram, Loader2, ExternalLink, Edit, Eye, EyeOff, Send, Mail, MessageCircle } from "lucide-react";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, memo } from "react";
import { useAdminRole } from "@/hooks/useAdminRole";
import DOMPurify from "dompurify";
import { track404Error } from "@/components/GoogleAnalytics";
import { getOptimizedHeroImage, generateResponsiveSrcSet } from "@/lib/imageOptimization";
import { ProgressiveImage } from "@/components/ProgressiveImage";
import { useSocialEmbeds } from "@/components/SocialEmbeds";
import { trackSponsorClick, trackSponsorImpression } from "@/hooks/useSponsorTracking";

// Article Sponsor Banner with tracking
interface ArticleSponsorData {
  sponsor_name: string;
  sponsor_logo_url: string;
  sponsor_website_url: string;
  sponsor_tagline?: string | null;
}

const ArticleSponsorBanner = ({ sponsor, categoryName }: { sponsor: ArticleSponsorData; categoryName: string }) => {
  useEffect(() => {
    trackSponsorImpression('category_sponsor', sponsor.sponsor_name, { category: categoryName, location: 'article' });
  }, [sponsor.sponsor_name, categoryName]);

  const handleClick = () => {
    trackSponsorClick('category_sponsor', sponsor.sponsor_name, sponsor.sponsor_website_url, { category: categoryName, location: 'article' });
  };

  return (
    <div className="mb-6 pb-4 border-b border-border/40">
      <a
        href={sponsor.sponsor_website_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="flex items-center gap-3 group"
        onClick={handleClick}
      >
        <span className="text-xs text-muted-foreground font-medium">
          In partnership with
        </span>
        <img
          src={sponsor.sponsor_logo_url}
          alt={sponsor.sponsor_name}
          className="h-6 object-contain group-hover:scale-105 transition-transform"
        />
        {sponsor.sponsor_tagline && (
          <span className="text-xs text-muted-foreground italic hidden sm:inline">
            {sponsor.sponsor_tagline}
          </span>
        )}
      </a>
    </div>
  );
};

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
  
  // Check for preview code in URL
  const urlParams = new URLSearchParams(window.location.search);
  const previewCode = urlParams.get('preview');
  const isPreview = !!previewCode;

// Fetch live comment count (approved real comments + published AI comments)
  const { data: commentCount = 0 } = useQuery({
    queryKey: ["article-comment-count", cleanSlug],
    staleTime: 30 * 1000, // 30 seconds
    queryFn: async () => {
      // Get article ID first
      const { data: articleData } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", cleanSlug)
        .maybeSingle();
      
      if (!articleData?.id) return 0;
      
      // Count approved real comments
      const { count: realCount } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleData.id)
        .eq("approved", true);
      
      // Count published AI comments
      const { count: aiCount } = await supabase
        .from("ai_generated_comments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", articleData.id)
        .eq("published", true);
      
      return (realCount || 0) + (aiCount || 0);
    },
  });

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", cleanSlug, previewCode],
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      console.log('Article fetch params:', { 
        category, 
        slug, 
        cleanSlug, 
        previewCode, 
        isPreview,
        fullUrl: window.location.href 
      });
      
      let query = supabase
        .from("articles")
        .select(`
          *,
          authors!articles_author_id_fkey (id, name, slug, bio, avatar_url, job_title),
          categories!articles_primary_category_id_fkey (name, slug, id)
        `)
        .eq("slug", cleanSlug);
      
      // If preview code provided, check for draft/scheduled articles with matching code
      if (previewCode) {
        query = query.eq("preview_code", previewCode);
        console.log('Looking for article with preview code:', previewCode);
      } else {
        // Otherwise only show published articles
        query = query.eq("status", "published");
        console.log('Looking for published article');
      }
      
      const { data, error } = await query.maybeSingle();
      
      console.log('Article query result:', { data, error });
      if (error) throw error;
      return data;
    },
  });

  // Load social embed widgets (Twitter, Instagram, TikTok) after article content loads
  useSocialEmbeds([article?.content]);

  // Fetch sponsor for article's category
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

  useEffect(() => {
    if (user && article?.id) {
      checkBookmark();
      trackReadingHistory();
    }
  }, [user, article?.id]);

  // Track article view
  useEffect(() => {
    if (article?.id && article.status === 'published') {
      trackArticleView();
      // Track for "Continue Reading" localStorage-based feature
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

  // Defer related articles query
  useEffect(() => {
    if (article?.id) {
      const timer = setTimeout(() => setEnableRelatedArticles(true), 200);
      return () => clearTimeout(timer);
    }
  }, [article?.id]);

  // Ensure page always loads at top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [article?.id]);

  // Handle copy functionality for prompt boxes
  useEffect(() => {
    if (!article?.content) return;

    const promptBoxes = document.querySelectorAll('.prompt-box');
    
    const handleCopy = async (e: Event) => {
      e.preventDefault();
      const button = e.currentTarget as HTMLElement;
      const promptBox = button.closest('.prompt-box');
      
      if (promptBox) {
        // Find the prompt text (everything except the button)
        const promptText = Array.from(promptBox.childNodes)
          .filter(node => !node.textContent?.includes('Copy Prompt'))
          .map(node => node.textContent?.trim())
          .filter(Boolean)
          .join('\n\n');
        
        try {
          await navigator.clipboard.writeText(promptText);
          toast({
            title: "Copied!",
            description: "Prompt copied to clipboard",
          });
        } catch (err) {
          console.error('Copy failed:', err);
          toast({
            title: "Copy failed",
            description: "Please try selecting and copying manually",
            variant: "destructive",
          });
        }
      }
    };

    // Attach click handlers to all copy buttons in prompt boxes
    promptBoxes.forEach(box => {
      const copyButton = box.querySelector('a[href*="copy"], button');
      if (copyButton) {
        copyButton.addEventListener('click', handleCopy as EventListener);
      }
    });

    // Cleanup
    return () => {
      promptBoxes.forEach(box => {
        const copyButton = box.querySelector('a[href*="copy"], button');
        if (copyButton) {
          copyButton.removeEventListener('click', handleCopy as EventListener);
        }
      });
    };
  }, [article?.content, toast]);

  const trackArticleView = async () => {
    if (!article?.id) return;

    // Check localStorage to avoid counting the same view multiple times
    const viewKey = `article_view_${article.id}`;
    const lastViewed = localStorage.getItem(viewKey);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    // Only count the view if more than 1 hour has passed since last view
    if (!lastViewed || now - parseInt(lastViewed) > oneHour) {
      try {
        await supabase.rpc('increment_article_views', {
          article_id: article.id
        });
        localStorage.setItem(viewKey, now.toString());
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    }
  };

  const trackReadingHistory = async () => {
    if (!user || !article?.id) return;

    // Check if already tracked today
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('reading_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('article_id', article.id)
      .gte('read_at', `${today}T00:00:00`)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('reading_history')
        .insert({
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
      toast({
        title: "Sign in required",
        description: "Please sign in to bookmark articles",
      });
      return;
    }

    if (isBookmarked) {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('article_id', article!.id);
      
      setIsBookmarked(false);
      toast({ title: "Bookmark removed" });
    } else {
      await supabase
        .from('bookmarks')
        .insert({ user_id: user.id, article_id: article!.id });
      
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
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', article.id);

      if (error) throw error;

      toast({
        title: "Article published",
        description: "The article is now live",
      });

      // Invalidate queries to refresh the article data
      queryClient.invalidateQueries({ queryKey: ["article", cleanSlug] });
    } catch (error) {
      console.error("Error publishing article:", error);
      toast({
        title: "Error",
        description: "Failed to publish article",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleShare = async () => {
    console.log('[Article] Share clicked');
    const shareData = {
      title: article?.title || "",
      text: article?.excerpt || "",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        try {
          await navigator.share(shareData);

          // Track share if user is logged in
          if (user) {
            const { data: stats } = await supabase
              .from("user_stats")
              .select("shares_made")
              .eq("user_id", user.id)
              .single();

            if (stats) {
              await supabase
                .from("user_stats")
                .update({ shares_made: (stats.shares_made || 0) + 1 })
                .eq("user_id", user.id);

              await supabase.rpc("award_points", {
                _user_id: user.id,
                _points: 5,
              });
            }
          }
          return;
        } catch (shareErr: any) {
          // If share fails (e.g., in iframe/preview), fall through to clipboard
          if (shareErr.name !== "AbortError") {
            console.log("Share API unavailable, using clipboard fallback", shareErr);
          } else {
            // User cancelled the share dialog
            return;
          }
        }
      }

      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Article link copied to clipboard",
      });
    } catch (err) {
      console.error("Error sharing:", err);
      toast({
        title: "Unable to share",
        description: "Please try copying the link manually",
        variant: "destructive",
      });
    }
  };

  // Use SEO-friendly share URLs that route through the edge function
  // Social platforms will receive proper meta tags from the edge function
  const categorySlug = article?.categories?.slug || category || 'news';
  const articleSlug = article?.slug || cleanSlug || '';
  const articleTitle = article?.title || '';

  const handleTwitterShare = () => {
    const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-meta-tags?path=${encodeURIComponent(`/${categorySlug}/${articleSlug}`)}`;
    const text = encodeURIComponent(articleTitle);
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${text}`, '_blank', 'width=600,height=400');
  };

  const handleLinkedInShare = () => {
    const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-meta-tags?path=${encodeURIComponent(`/${categorySlug}/${articleSlug}`)}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
  };

  const handleFacebookShare = () => {
    const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-meta-tags?path=${encodeURIComponent(`/${categorySlug}/${articleSlug}`)}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
  };

  const handleInstagramShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Share this link in your Instagram story or post",
      });
    } catch (err) {
      toast({
        title: "Share on Instagram",
        description: "Copy the article link and share it on Instagram",
      });
    }
  };

  const handleRedditShare = () => {
    const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-meta-tags?path=${encodeURIComponent(`/${categorySlug}/${articleSlug}`)}`;
    const text = encodeURIComponent(articleTitle);
    window.open(`https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${text}`, '_blank', 'width=600,height=400');
  };

  const handleWhatsAppShare = () => {
    // WhatsApp uses direct URL since users will click it
    const directUrl = `https://aiinasia.com/${categorySlug}/${articleSlug}`;
    const text = encodeURIComponent(`${articleTitle}\n\n${directUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleEmailShare = () => {
    // Email uses direct URL since users will click it
    const directUrl = `https://aiinasia.com/${categorySlug}/${articleSlug}`;
    const subject = encodeURIComponent(articleTitle);
    const body = encodeURIComponent(`Check out this article:\n\n${articleTitle}\n${directUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Defer: Related articles load after main content
  const { data: relatedArticles } = useQuery({
    queryKey: ["related-articles", article?.primary_category_id, article?.id],
    enabled: enableRelatedArticles && !!article?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      // If article has a category, prioritize same category
      if (article?.primary_category_id) {
        const { data, error } = await supabase
          .from("articles")
          .select(`
            *,
            authors (name, slug),
            categories:primary_category_id (name, slug)
          `)
          .eq("primary_category_id", article.primary_category_id)
          .neq("id", article.id)
          .eq("status", "published")
          .order("view_count", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(3);
        
        if (error) throw error;
        return data;
      }
      
      // Otherwise, just show recent popular articles
      const { data, error } = await supabase
        .from("articles")
        .select(`
          *,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .neq("id", article.id)
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
  });

  // Determine external link based on article category
  const getExternalLink = () => {
    const categoryName = article?.categories?.name?.toLowerCase() || '';
    
    if (categoryName.includes('ai') || categoryName.includes('machine learning')) {
      return {
        text: 'Try ChatGPT',
        url: 'https://chat.openai.com',
        icon: '🤖'
      };
    } else if (categoryName.includes('robotics')) {
      return {
        text: 'Try Gemini AI',
        url: 'https://gemini.google.com',
        icon: '✨'
      };
    } else {
      return {
        text: 'Explore Google Gemini',
        url: 'https://gemini.google.com',
        icon: '🚀'
      };
    }
  };

  const externalLink = article ? getExternalLink() : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="aspect-video rounded-lg mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    // Track as error event instead of page view
    useEffect(() => {
      track404Error(window.location.pathname, "article_not_found");
      
      // Also log to database
      const log404 = async () => {
        try {
          await supabase.from("page_not_found_log").insert({
            path: window.location.pathname,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
          });
        } catch (error) {
          console.error("Failed to log article 404:", error);
        }
      };
      log404();
    }, []);

    return (
      <div className="min-h-screen flex flex-col">
        <Helmet>
          <title>Article Not Found - 404 | AI in ASIA</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
            <p className="text-muted-foreground mb-8">The article you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/">Go to Homepage</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const renderContent = (content: any) => {
    if (!content) return null;

    // Handle string content (markdown or raw HTML from the editor)
    if (typeof content === 'string') {
      const hasPromptBoxes = content.includes('prompt-box');

      // Consolidate ALL consecutive bullet points into single lists
      // Replace all double line breaks between bullets with single line breaks
      let consolidated = content.replace(/(- [^\n]+)\n\n(?=- )/g, '$1\n');
      
      // Consolidate numbered lists - merge consecutive numbered items separated by double line breaks
      consolidated = consolidated.replace(/(\d+\.\s[^\n]+)\n\n(?=\d+\.\s)/g, '$1\n');
      
      // Clean up simple div wrappers from pasted content so markdown headings are detectable
      // Only do this when we DON'T have prompt boxes, otherwise it destroys their layout
      if (!hasPromptBoxes) {
        consolidated = consolidated
          .replace(/<div>\s*<\/div>/g, '\n\n')
          .replace(/<\/div>\s*<div>/g, '\n\n')
          .replace(/<\/?div>/g, '');
      }

      consolidated = consolidated
        // Remove legacy WordPress tweet links (e.g., <a href="...">Tweet</a> or [Tweet](...))
        .replace(/<a[^>]*>\s*Tweet\s*<\/a>/gi, '')
        .replace(/\[Tweet\]\([^)]*\)/gi, '')
        // Remove any standalone "Tweet" text that looks like a link remnant
        .replace(/^\s*Tweet\s*$/gm, '')
        // Convert markdown images ![alt](url) to HTML
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<div class="my-8"><img src="$2" alt="$1" class="w-full rounded-lg" loading="lazy" /><\/div>')
        // Convert actual bold text first
        .replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1<\/strong>')
        // Convert italic text (single asterisks only, not part of **)
        .replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, '<em>$1<\/em>')
        // Remove any remaining standalone ** markers (cleanup)
        .replace(/\*\*/g, '')
        // Fix old subscribe links - replace any aiinasia.com subscribe links with /newsletter
        .replace(/\[([^\]]*subscribe[^\]]*)\]\((https?:\/\/)?(www\.)?aiinasia\.com[^\)]*\)/gi, '[Subscribe to our newsletter](/newsletter)')
        // Redirect /connect/ links to /contact
        .replace(/\[([^\]]+)\]\((https?:\/\/)?(www\.)?aiinasia\.com\/connect\/?[^\)]*\)/gi, '[$1](/contact)')
        // Convert links with new tab marker (^) - add external link icon (must come before regular links)
        .replace(/\[([^\]]+)\]\(([^)]+)\)\^/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline inline-flex items-center gap-1">$1<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline ml-0.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"><\/path><polyline points="15 3 21 3 21 9"><\/polyline><line x1="10" x2="21" y1="14" y2="3"><\/line></svg></a>')
        // Convert external links (http/https but not internal domain) - open in new tab
        .replace(/\[([^\]]+)\]\((https?:\/\/(?!aiinasia\.com)[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1<\/a>')
        // Convert internal links (no http or relative paths)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline">$1<\/a>');

      // Ensure markdown headings (lines starting with #, ##, ###) always start their own block
      // by forcing a double line break before them. This fixes cases where a heading immediately
      // follows a paragraph on the next line but within the same block.
      consolidated = consolidated.replace(/(^|\n)(#{1,3}\s+)/g, (match, prefix, hashes) => {
        const safePrefix = prefix || '';
        return `${safePrefix}\n\n${hashes}`;
      });
      
      // If content contains prompt cards, sanitize and render as HTML after markdown processing
      if (consolidated.includes('prompt-box')) {
        // Split by double line breaks first
        const blocks = consolidated.split('\n\n').map(block => block.trim()).filter(block => block.length > 0);
        
        // Join back with proper spacing but don't process blocks individually
        // This preserves the exact layout with prompt cards
        const htmlBlocks = blocks.map(block => {
          // If it's a prompt-box or social embed, return as-is
          if (block.includes('prompt-box') || 
              block.includes('twitter-tweet') || 
              block.includes('instagram-media') || 
              block.includes('tiktok-embed') ||
              block.includes('youtube.com/embed')) {
            return block;
          }
          // Otherwise wrap in paragraph
          return `<p class="leading-relaxed mb-6">${block.replace(/\n/g, ' ')}</p>`;
        });
        
        const sanitizedHtml = DOMPurify.sanitize(htmlBlocks.join('\n\n'), {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'div', 'span', 'iframe', 'img', 'figure', 'figcaption', 'button', 'svg', 'path', 'section', 'time'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style', 'alt', 'title', 'loading', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'data-prompt-title', 'data-prompt-content', 'type', 'lang', 'dir', 'data-instgrm-captioned', 'data-instgrm-permalink', 'data-instgrm-version', 'cite', 'data-video-id', 'datetime']
        });
        return <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
      }
      
      // Split into blocks by double line breaks
      const blocks = consolidated.split('\n\n').map(block => block.trim()).filter(block => block.length > 0);
      
      // Process each block
      const htmlBlocks = blocks.map(block => {
        // Preserve social media embeds as-is (don't wrap in paragraph)
        // Twitter/X embeds
        if (block.includes('twitter-tweet') || block.includes('class="twitter-tweet"')) {
          return block;
        }
        // Instagram embeds
        if (block.includes('instagram-media') || block.includes('class="instagram-media"')) {
          return block;
        }
        // TikTok embeds
        if (block.includes('tiktok-embed') || block.includes('class="tiktok-embed"')) {
          return block;
        }
        // YouTube embeds (iframe)
        if (block.includes('youtube.com/embed') || block.includes('youtu.be')) {
          return block;
        }
        
        // Check for headings (must be at start of block)
        if (block.startsWith('### ')) {
          return `<h3 class="text-2xl font-semibold mt-8 mb-4">${block.substring(4)}</h3>`;
        }
        if (block.startsWith('## ')) {
          return `<h2 class="text-3xl font-bold mt-12 mb-6 text-foreground">${block.substring(3)}</h2>`;
        }
        if (block.startsWith('# ')) {
          return `<h1 class="text-4xl font-bold mt-8 mb-4">${block.substring(2)}</h1>`;
        }
        
        // Check for blockquotes (but not Twitter blockquotes which have class)
        if (block.startsWith('> ') && !block.includes('twitter-tweet')) {
          const quoteContent = block.substring(2);
          return `<blockquote class="border-l-4 border-primary bg-primary/5 pl-6 pr-4 py-4 my-8">
            <p class="italic text-lg text-foreground/90 leading-relaxed">${quoteContent}</p>
          </blockquote>`;
        }
        
        // Check for unordered lists (multiple lines starting with -)
        if (block.includes('\n- ') || block.startsWith('- ')) {
          const items = block.split('\n')
            .filter(line => line.trim().startsWith('- '))
            .map(line => `<li class="leading-relaxed mb-2">${line.trim().substring(2)}</li>`)
            .join('');
          return `<ul class="pl-6 my-6 space-y-1">${items}</ul>`;
        }
        
        // Check for ordered lists (multiple lines starting with number.)
        if (/^\d+\.\s/.test(block) || /\n\d+\.\s/.test(block)) {
          const items = block.split('\n')
            .filter(line => /^\d+\.\s/.test(line.trim()))
            .map(line => {
              // Remove the number prefix completely - let CSS handle numbering
              const content = line.trim().replace(/^\d+\.\s/, '');
              return `<li>${content}</li>`;
            })
            .join('');
          // No class needed - CSS targets .prose ol directly
          return `<ol>${items}</ol>`;
        }
        
        // Default to paragraph
        return `<p class="leading-relaxed mb-6">${block.replace(/\n/g, ' ')}</p>`;
      });
      
      // Insert newsletter signup placeholder mid-content (around 50%)
      const midPoint = Math.floor(htmlBlocks.length / 2);
      if (htmlBlocks.length >= 6) {
        htmlBlocks.splice(midPoint, 0, '<div id="mid-content-newsletter-placeholder"></div>');
      }
      
      const sanitizedHtml = DOMPurify.sanitize(htmlBlocks.join('\n'), {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'div', 'span', 'iframe', 'img', 'figure', 'figcaption', 'button', 'svg', 'path', 'polyline', 'line', 'section', 'time'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style', 'alt', 'title', 'loading', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'data-prompt-title', 'data-prompt-content', 'type', 'lang', 'dir', 'points', 'x1', 'x2', 'y1', 'y2', 'data-instgrm-captioned', 'data-instgrm-permalink', 'data-instgrm-version', 'cite', 'data-video-id', 'datetime', 'id']
      });
      
      // Split by placeholder and render with actual newsletter component
      const parts = sanitizedHtml.split('<div id="mid-content-newsletter-placeholder"></div>');
      if (parts.length === 2) {
        return (
          <div className="prose">
            <div dangerouslySetInnerHTML={{ __html: parts[0] }} />
            <InlineNewsletterSignup />
            <div dangerouslySetInnerHTML={{ __html: parts[1] }} />
          </div>
        );
      }
      
      return <div className="prose" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
    }
    
    // Otherwise try to parse as JSON blocks (legacy format)
    try {
      const blocks = typeof content === 'string' ? JSON.parse(content) : content;
      
      // Helper function to process inline formatting in text
      const processInlineFormatting = (text: string) => {
        if (!text || typeof text !== 'string') return text;
        
        // Process inline formatting
        let processed = text
          // Remove legacy WordPress tweet links
          .replace(/<a[^>]*>\s*Tweet\s*<\/a>/gi, '')
          .replace(/\[Tweet\]\([^)]*\)/gi, '')
          // Convert external links (http/https but not internal domain)
          .replace(/\[([^\]]+)\]\((https?:\/\/(?!aiinasia\.com)[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>')
          // Convert internal links
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline">$1</a>')
          // Convert bold text
          .replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>')
          // Convert italic text (single asterisks)
          .replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, '<em>$1</em>');
        
        return processed;
      };
      
      return blocks.map((block: any, index: number) => {
        // Skip TL;DR headings (they should be in tldr_snapshot field instead)
        if (block.type === 'heading' && block.content && 
            (block.content.toLowerCase().includes('tl;dr') || block.content.toLowerCase().includes('tldr'))) {
          return null;
        }
        
        switch (block.type) {
          case 'paragraph':
            const processInlineFormatting = (text: string) => {
              return text
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
              if (url.startsWith('/')) {
                return `<a href="${url}" class="text-primary hover:underline">${text}</a>`;
              }
              return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${text}</a>`;
            });
        };

            const contentText = block.content || '';
            const sanitizedContent = DOMPurify.sanitize(processInlineFormatting(contentText), {
              ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'a', 'br', 'span'],
              ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
            });

            const isLikelyImageCaption = contentText.length < 100 && (
              contentText.toLowerCase().includes('image:') ||
              contentText.toLowerCase().includes('source:') ||
              contentText.toLowerCase().includes('credit:') ||
              contentText.toLowerCase().includes('photo:')
            );

            return (
              <p 
                key={index} 
                className={`leading-relaxed mb-6 ${isLikelyImageCaption ? 'text-sm text-muted-foreground text-center -mt-4' : ''}`}
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />
            );
            
          case 'heading':
            const level = block.attrs?.level || 2;
            const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
            const headingClasses = level === 1 ? "text-4xl font-bold mt-8 mb-4" :
                                 level === 2 ? "text-3xl font-bold mt-8 mb-4" :
                                 "text-2xl font-semibold mt-8 mb-4";
            return (
              <HeadingTag key={index} className={headingClasses}>
                {block.content}
              </HeadingTag>
            );
            
          case 'quote':
            return (
              <blockquote key={index} className="border-l-4 border-primary pl-6 py-2 my-8 italic text-xl">
                {block.content}
              </blockquote>
            );
            
          case 'list':
        const listItems = Array.isArray(block.content) ? block.content : [block.content];
        const isOrdered = block.attrs?.listType === 'ordered';
        const ListTag = isOrdered ? 'ol' : 'ul';
        
        return (
          <ListTag 
            key={index} 
            className={isOrdered ? "list-none pl-10 my-6 space-y-2" : "list-disc pl-8 my-6 space-y-2"}
            style={isOrdered ? { counterReset: 'list-counter' } : undefined}
          >
            {listItems.map((item: string, i: number) => {
              const processInlineFormatting = (text: string) => {
                return text
                  .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
                    if (url.startsWith('/')) {
                      return `<a href="${url}" class="text-primary hover:underline">${text}</a>`;
                    }
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${text}</a>`;
                  });
              };
              const sanitizedItem = DOMPurify.sanitize(processInlineFormatting(item), {
                ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'a', 'br', 'span'],
                ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
              });
              return (
                <li 
                  key={i}
                  className={isOrdered ? "relative pl-2" : ""}
                  style={isOrdered ? { counterIncrement: 'list-counter' } : undefined}
                  dangerouslySetInnerHTML={{ __html: sanitizedItem }}
                />
              );
            })}
          </ListTag>
        );
        
      case 'image':
        return (
          <div key={index} className="my-8">
            <img 
              src={block.attrs?.src || block.url} 
              alt={block.attrs?.alt || block.alt || ''} 
              className="w-full rounded-lg" 
            />
            {(block.attrs?.caption || block.caption) && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                {block.attrs?.caption || block.caption}
              </p>
            )}
          </div>
        );
        
          default:
            return null;
        }
      }).filter(Boolean);
    } catch (error) {
      return <p className="leading-relaxed mb-6">{content}</p>;
    }
  };

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
        <meta property="og:image" content={article.featured_image_url ? (article.featured_image_url.startsWith('http') ? article.featured_image_url : `https://aiinasia.com${article.featured_image_url}`) : 'https://aiinasia.com/og-image.png'} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@aiinasia" />
        <meta name="twitter:title" content={(article.meta_title || article.title).replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")} />
        <meta name="twitter:description" content={(article.meta_description || article.excerpt || '').replace(/%%sep%%/g, '|').replace(/%%sitename%%/g, 'AI in ASIA')} />
        <meta name="twitter:image" content={article.featured_image_url ? (article.featured_image_url.startsWith('http') ? article.featured_image_url : `https://aiinasia.com${article.featured_image_url}`) : 'https://aiinasia.com/og-image.png'} />
        {isPreview ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <link rel="canonical" href={article.canonical_url || window.location.href} />
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
          { name: article.title, url: window.location.href }
        ]}
      />

      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1">
          <article className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Breadcrumbs */}
            {article.article_type === 'policy_article' ? (
              <PolicyBreadcrumbs 
                regionName={article.categories?.name}
                regionSlug={article.categories?.slug}
                articleTitle={article.title}
              />
            ) : (
              <nav className="text-sm text-muted-foreground mb-6">
                <Link to="/" className="hover:text-primary">Home</Link>
                <span className="mx-2">›</span>
                {article.categories && (
                  <>
                    <Link to={`/category/${article.categories.slug}`} className="hover:text-primary">
                      {article.categories.name}
                    </Link>
                    <span className="mx-2">›</span>
                  </>
                )}
                <span>{article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}</span>
              </nav>
            )}

            {/* Article Header */}
            <header className="mb-8">
              {isPreview && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                    🔒 Preview Mode - This article is not publicly visible
                  </p>
                </div>
              )}

              {/* Admin Controls */}
              {!isLoadingAdmin && isAdmin && (
                <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">Admin Controls</span>
                    {article.status !== 'published' && (
                      <Badge variant="outline" className="ml-2">
                        {article.status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdminView(!showAdminView)}
                      className="cursor-pointer"
                    >
                      {showAdminView ? (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Normal View
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Admin View
                        </>
                      )}
                    </Button>
                    {article.status !== 'published' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="cursor-pointer"
                      >
                        {isPublishing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Publishing...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Publish Now
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="cursor-pointer"
                    >
                      <Link to={`/editor?id=${article.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Article
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Admin Debug Info */}
              {!isLoadingAdmin && isAdmin && showAdminView && (
                <div className="mb-4 p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                  <h3 className="text-sm font-semibold mb-2">Article Metadata</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">ID:</span> {article.id}</div>
                    <div><span className="text-muted-foreground">Status:</span> {article.status}</div>
                    <div><span className="text-muted-foreground">Slug:</span> {article.slug}</div>
                    <div><span className="text-muted-foreground">Views:</span> {article.view_count || 0}</div>
                    <div><span className="text-muted-foreground">Published:</span> {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Not published'}</div>
                    <div><span className="text-muted-foreground">Featured:</span> {article.featured_on_homepage ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}
              
              <Badge className="mb-4 bg-primary text-primary-foreground">
                {article.categories?.name || 'Article'}
              </Badge>
              
              {/* Category Sponsor */}
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
                <p className="text-xl text-muted-foreground mb-6">
                  {article.excerpt}
                </p>
              )}

              <div className="flex flex-col md:flex-row md:items-center gap-4 pb-6 border-b border-border relative z-20">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {article.authors?.slug ? (
                    <Link to={`/author/${article.authors.slug}`}>
                      {article.authors.avatar_url ? (
                        <img 
                          src={article.authors.avatar_url} 
                          alt={article.authors.name}
                          className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary hover:opacity-80 transition-opacity flex-shrink-0" />
                      )}
                    </Link>
                  ) : (
                    article.authors?.avatar_url ? (
                      <img 
                        src={article.authors.avatar_url} 
                        alt={article.authors?.name || 'Anonymous'}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0" />
                    )
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-semibold">
                      <User className="h-4 w-4 flex-shrink-0" />
                      {article.authors?.slug ? (
                        <Link to={`/author/${article.authors.slug}`} className="hover:text-primary transition-colors truncate">
                          {article.authors.name}
                        </Link>
                      ) : (
                        <span className="truncate">{article.authors?.name || 'Anonymous'}</span>
                      )}
                    </div>
                    {article.authors?.job_title && (
                      <div className="text-sm text-muted-foreground truncate">
                        {article.authors.job_title}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="whitespace-nowrap">{article.reading_time_minutes || 5} min read</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">
                        {article.published_at && new Date(article.published_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <button 
                        onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                      >
                        <MessageCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">{commentCount} comments</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
                    {article.authors && (
                      <FollowButton
                        followType="author"
                        followId={article.authors.id}
                        followName={article.authors.name}
                      />
                    )}
                    {article.categories && (
                      <FollowButton
                        followType="category"
                        followId={article.categories.id}
                        followName={article.categories.name}
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-auto md:ml-0">
                    <ArticleSaveButton
                      article={{
                        id: article.id,
                        title: article.title,
                        url: `/${article.categories?.slug || category || 'news'}/${article.slug}`,
                        excerpt: article.excerpt || '',
                        featuredImageUrl: article.featured_image_url || undefined,
                        categoryName: article.categories?.name || undefined,
                        categorySlug: article.categories?.slug || undefined,
                      }}
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                    />
                    
                    <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1 h-8">
                      <FontSizeControl />
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleShare}
                      title="Share article"
                      className="h-8 w-8 cursor-pointer"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </header>

            {/* Hero Image - Featured image displayed above article content */}
            {article.featured_image_url && (
              <div className="mb-8">
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  <ProgressiveImage
                    src={getOptimizedHeroImage(article.featured_image_url, 1280)} 
                    srcSet={article.featured_image_url.includes('supabase.co/storage') 
                      ? generateResponsiveSrcSet(article.featured_image_url, [640, 960, 1280, 1920]) 
                      : undefined}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1280px"
                    alt={article.featured_image_alt || article.title}
                    loading="eager"
                    fetchPriority="high"
                    width={1280}
                    height={720}
                  />
                </div>
                {article.featured_image_caption && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    {article.featured_image_caption}
                  </p>
                )}
              </div>
            )}

            {/* TL;DR Snapshot */}
            {article.tldr_snapshot && Array.isArray(article.tldr_snapshot) && article.tldr_snapshot.length > 0 && (
              <TldrSnapshot bullets={article.tldr_snapshot as string[]} />
            )}


            {/* Series Navigation */}
            {article.series_id && article.series_part && (
              <SeriesNavigation 
                seriesId={article.series_id}
                currentPart={article.series_part}
                currentArticleId={article.id}
              />
            )}

            {/* First Ad - After Intro */}
            <InArticleAd />

            {/* Article Content */}
            <div className="prose prose-lg max-w-none">
              {article.article_type === 'policy_article' ? (
                <PolicyArticleContent article={article} />
              ) : article.article_type === 'top_lists' && Array.isArray(article.top_list_items) ? (
                <TopListsContent
                  items={article.top_list_items as any}
                  articleId={article.id}
                  introHtml={article.top_list_intro as string | undefined}
                  outroHtml={article.top_list_outro as string | undefined}
                />
              ) : (
                renderContent(article.content)
              )}
            </div>



            {/* Article Footer - Author Block (same as top) */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex flex-col md:flex-row md:items-center gap-4 relative z-20">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {article.authors?.slug ? (
                    <Link to={`/author/${article.authors.slug}`}>
                      {article.authors.avatar_url ? (
                        <img 
                          src={article.authors.avatar_url} 
                          alt={article.authors.name}
                          className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary hover:opacity-80 transition-opacity flex-shrink-0" />
                      )}
                    </Link>
                  ) : (
                    article.authors?.avatar_url ? (
                      <img 
                        src={article.authors.avatar_url} 
                        alt={article.authors?.name || 'Anonymous'}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0" />
                    )
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-semibold">
                      <User className="h-4 w-4 flex-shrink-0" />
                      {article.authors?.slug ? (
                        <Link to={`/author/${article.authors.slug}`} className="hover:text-primary transition-colors truncate">
                          {article.authors.name}
                        </Link>
                      ) : (
                        <span className="truncate">{article.authors?.name || 'Anonymous'}</span>
                      )}
                    </div>
                    {article.authors?.job_title && (
                      <div className="text-sm text-muted-foreground truncate">
                        {article.authors.job_title}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="whitespace-nowrap">{article.reading_time_minutes || 5} min read</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">
                        {article.published_at && new Date(article.published_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span>•</span>
                      <button 
                        onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                      >
                        <MessageCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">{commentCount} comments</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
                    {article.authors && (
                      <FollowButton
                        followType="author"
                        followId={article.authors.id}
                        followName={article.authors.name}
                      />
                    )}
                    {article.categories && (
                      <FollowButton
                        followType="category"
                        followId={article.categories.id}
                        followName={article.categories.name}
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-auto md:ml-0">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleBookmark}
                      title={isBookmarked ? "Remove bookmark" : "Bookmark article"}
                      className="h-8 w-8 cursor-pointer"
                    >
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    </Button>
                    
                    <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1 h-8">
                      <FontSizeControl />
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleShare}
                      title="Share article"
                      className="h-8 w-8 cursor-pointer"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Author Bio - Hide for Intelligence Desk */}
            {article.authors && article.authors.name !== 'Intelligence Desk' && (
              <div className="bg-muted/50 rounded-lg p-8 flex flex-col md:flex-row items-center md:items-start gap-6 mt-8">
                {article.authors.slug ? (
                  <Link to={`/author/${article.authors.slug}`} className="flex-shrink-0">
                    {article.authors.avatar_url ? (
                      <img 
                        src={article.authors.avatar_url} 
                        alt={article.authors.name}
                        className="w-32 h-32 rounded-full object-cover hover:opacity-80 transition-opacity ring-4 ring-background shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary hover:opacity-80 transition-opacity ring-4 ring-background shadow-lg" />
                    )}
                  </Link>
                ) : (
                  article.authors.avatar_url ? (
                    <img 
                      src={article.authors.avatar_url} 
                      alt={article.authors.name}
                      className="w-32 h-32 rounded-full object-cover flex-shrink-0 ring-4 ring-background shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0 ring-4 ring-background shadow-lg" />
                  )
                )}
                <div className="flex-1 text-center md:text-left">
                  <h4 className="font-semibold text-xl mb-2">
                    {article.authors.slug ? (
                      <Link to={`/author/${article.authors.slug}`} className="hover:text-primary transition-colors">
                        {article.authors.name}
                      </Link>
                    ) : (
                      article.authors.name
                    )}
                  </h4>
                  {article.authors.job_title && (
                    <p className="text-base text-muted-foreground mb-3">
                      {article.authors.job_title}
                    </p>
                  )}
                  {article.authors.bio && (
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {article.authors.bio}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Share Thoughts CTA */}
            <ShareThoughtsCTA commentCount={commentCount} />

            {/* Deep Dive Section - Cornerstone articles */}
            <DeepDiveSection currentArticleId={article.id} tags={article.ai_tags} />

            {/* Continue Reading */}
            <ContinueReading 
              currentArticleId={article.id} 
              categoryId={article.primary_category_id || undefined}
              categorySlug={article.categories?.slug}
            />

            {/* Return Trigger Block */}
            <ReturnTriggerBlock />
          </article>

          {/* Comments Section */}
          <section id="comments-section" className="container mx-auto px-4 max-w-4xl mt-12">
            <Comments articleId={article.id} />
          </section>

          {/* Continue Reading - Based on recently viewed articles */}
          <section className="container mx-auto px-4 max-w-4xl mt-12">
            <RecentlyViewedArticles 
              excludeUrl={`/${article.categories?.slug || category || 'news'}/${article.slug}`}
              maxItems={5}
              title="Continue reading"
            />
          </section>

          {/* Related Articles Box - Above You May Also Like */}
          {article.categories?.id && (
            <section className="container mx-auto px-4 max-w-4xl mt-12">
              <InlineRelatedArticles
                currentArticleId={article.id}
                categoryId={article.categories.id}
                categorySlug={article.categories.slug}
              />
            </section>
          )}

          {/* You May Also Like - After Related Articles */}
          {relatedArticles && relatedArticles.length > 0 && (
            <section className="bg-muted/30 py-12 mt-8">
              <div className="container mx-auto px-4 max-w-6xl">
                <h2 className="headline text-3xl mb-8">You may also like:</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {relatedArticles.map((relatedArticle: any) => (
                    <ArticleCard
                      key={relatedArticle.id}
                      title={relatedArticle.title}
                      excerpt={relatedArticle.excerpt || ""}
                      category={relatedArticle.categories?.name || ""}
                      categorySlug={relatedArticle.categories?.slug || "uncategorized"}
                      author={relatedArticle.authors?.name || ""}
                      readTime={`${relatedArticle.reading_time_minutes || 5} min read`}
                      image={relatedArticle.featured_image_url || ""}
                      slug={relatedArticle.slug}
                      commentCount={relatedArticle.comment_count || 0}
                    />
                  ))}
                  
                  {/* External Link Card for SEO */}
                  <a 
                    href={externalLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="article-card group hover:shadow-lg transition-shadow"
                  >
                    <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <span className="text-6xl">{externalLink.icon}</span>
                    </div>
                    
                    <div className="p-6">
                      <h3 className="headline text-xl mb-3 hover:text-primary transition-colors flex items-center gap-2">
                        {externalLink.text}
                        <ExternalLink className="h-4 w-4" />
                      </h3>
                      
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        Explore cutting-edge AI technology and interactive experiences
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Badge variant="secondary" className="bg-primary text-primary-foreground">
                          External Resource
                        </Badge>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </section>
          )}


          {/* Prompt and Go Banner for Top Lists - At the very bottom */}
          {article.article_type === 'top_lists' && (
            <section className="container mx-auto px-4 max-w-4xl mt-12">
              <div className="text-sm text-muted-foreground mb-3 text-center">
                In partnership with
              </div>
              <PromptAndGoBanner />
            </section>
          )}
        </main>

        {/* Engagement Components */}
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
