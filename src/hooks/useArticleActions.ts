import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface UseArticleActionsProps {
  articleId: string | undefined;
  userId: string | undefined;
  cleanSlug: string | undefined;
  isAdmin: boolean;
}

export const useArticleActions = ({ 
  articleId, 
  userId, 
  cleanSlug,
  isAdmin 
}: UseArticleActionsProps) => {
  
  const queryClient = useQueryClient();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (userId && articleId) {
      checkBookmark();
    }
  }, [userId, articleId]);

  const checkBookmark = async () => {
    if (!userId || !articleId) return;
    
    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .maybeSingle();
    
    setIsBookmarked(!!data);
  };

  const handleBookmark = async () => {
    if (!userId) {
      toast("Sign in required", { description: "Please sign in to bookmark articles" });
      return;
    }

    if (!articleId) return;

    if (isBookmarked) {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('article_id', articleId);
      
      setIsBookmarked(false);
      toast("Bookmark removed");
    } else {
      await supabase
        .from('bookmarks')
        .insert({ user_id: userId, article_id: articleId });
      
      setIsBookmarked(true);
      toast("Bookmarked!");
    }
  };

  const handlePublish = async () => {
    if (!articleId || !isAdmin) return;

    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from('articles')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', articleId);

      if (error) throw error;

      toast("Article published", { description: "The article is now live" });

      queryClient.invalidateQueries({ queryKey: ["article", cleanSlug] });
    } catch (error) {
      console.error("Error publishing article:", error);
      toast.error("Error", { description: "Failed to publish article" });
    } finally {
      setIsPublishing(false);
    }
  };

  const trackArticleView = async () => {
    if (!articleId) return;

    const viewKey = `article_view_${articleId}`;
    const lastViewed = localStorage.getItem(viewKey);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (!lastViewed || now - parseInt(lastViewed) > oneHour) {
      try {
        await supabase.rpc('increment_article_views', {
          article_id: articleId
        });
        localStorage.setItem(viewKey, now.toString());
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    }
  };

  const trackReadingHistory = async () => {
    if (!userId || !articleId) return;

    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('reading_history')
      .select('id')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .gte('read_at', `${today}T00:00:00`)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('reading_history')
        .insert({
          user_id: userId,
          article_id: articleId,
          completed: true
        });
    }
  };

  return {
    isBookmarked,
    isPublishing,
    handleBookmark,
    handlePublish,
    trackArticleView,
    trackReadingHistory,
  };
};

// Social share handlers factory
export const createShareHandlers = (
  categorySlug: string,
  articleSlug: string,
  articleTitle: string,
  articleExcerpt: string | null,
  canonicalUrl: string | null,
  userId: string | undefined,
) => {
  const getPublicArticleUrl = () => {
    const rawCanonical = (canonicalUrl || "").trim();

    if (rawCanonical) {
      try {
        const u = new URL(rawCanonical);
        if (u.hostname === "aiinasia.com") {
          const cleanedPath = (u.pathname || "/").replace(/\/+$/g, "");
          if (cleanedPath && cleanedPath !== "/") {
            return `https://aiinasia.com${cleanedPath}`;
          }
        }
      } catch {
        // ignore
      }
    }

    if (articleSlug) return `https://aiinasia.com/${categorySlug}/${articleSlug}`;
    return categorySlug ? `https://aiinasia.com/category/${categorySlug}` : "https://aiinasia.com/";
  };

  const handleShare = async () => {
    const articleUrl = getPublicArticleUrl();
    const shareData = {
      title: articleTitle || "",
      text: [articleExcerpt || "", articleUrl].filter(Boolean).join("\n\n"),
      url: articleUrl,
    };

    try {
      if (navigator.share) {
        try {
          await navigator.share(shareData);

          if (userId) {
            const { data: stats } = await supabase
              .from("user_stats")
              .select("shares_made")
              .eq("user_id", userId)
              .single();

            if (stats) {
              await supabase
                .from("user_stats")
                .update({ shares_made: (stats.shares_made || 0) + 1 })
                .eq("user_id", userId);

              await supabase.rpc("award_points", {
                _user_id: userId,
                _points: 5,
              });
            }
          }
          return;
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") return;
          console.log("Share API unavailable, using clipboard fallback", shareErr);
        }
      }

      await navigator.clipboard.writeText(articleUrl);
      toast("Link copied!", { description: "Article link copied to clipboard" });
    } catch (err) {
      console.error("Error sharing:", err);
      toast.error("Unable to share", { description: "Please try copying the link manually" });
    }
  };

  const handleTwitterShare = () => {
    const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-meta-tags?path=${encodeURIComponent(`/${categorySlug}/${articleSlug}`)}`;
    const text = encodeURIComponent(articleTitle);
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${text}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const handleLinkedInShare = () => {
    const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-meta-tags?path=${encodeURIComponent(`/${categorySlug}/${articleSlug}`)}`;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const handleFacebookShare = () => {
    const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-meta-tags?path=${encodeURIComponent(`/${categorySlug}/${articleSlug}`)}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const handleInstagramShare = async () => {
    try {
      await navigator.clipboard.writeText(getPublicArticleUrl());
      toast("Link copied!", { description: "Share this link in your Instagram story or post" });
    } catch {
      toast("Share on Instagram", { description: "Copy the article link and share it on Instagram" });
    }
  };

  const handleRedditShare = () => {
    const shareUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/render-meta-tags?path=${encodeURIComponent(`/${categorySlug}/${articleSlug}`)}`;
    const text = encodeURIComponent(articleTitle);
    window.open(
      `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${text}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const handleWhatsAppShare = () => {
    const directUrl = getPublicArticleUrl();
    const text = encodeURIComponent(`${articleTitle}\n\n${directUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleEmailShare = () => {
    const directUrl = getPublicArticleUrl();
    const subject = encodeURIComponent(articleTitle);
    const body = encodeURIComponent(`Check out this article:\n\n${articleTitle}\n${directUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return {
    getPublicArticleUrl,
    handleShare,
    handleTwitterShare,
    handleLinkedInShare,
    handleFacebookShare,
    handleInstagramShare,
    handleRedditShare,
    handleWhatsAppShare,
    handleEmailShare,
  };
};
