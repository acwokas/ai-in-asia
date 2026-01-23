/**
 * Social sharing utilities for articles
 * Extracted from Article.tsx for reuse and maintainability
 */

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UseArticleShareHandlersProps {
  articleTitle: string;
  categorySlug: string;
  articleSlug: string;
  canonicalUrl?: string;
  user?: { id: string } | null;
}

export const useArticleShareHandlers = ({
  articleTitle,
  categorySlug,
  articleSlug,
  canonicalUrl,
  user
}: UseArticleShareHandlersProps) => {
  const { toast } = useToast();

  const getPublicArticleUrl = () => {
    const rawCanonical = (canonicalUrl || "").trim();

    // Some rows have a bad canonical_url (e.g. homepage). Ignore those.
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
      title: articleTitle,
      text: articleUrl,
      url: articleUrl,
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
          if (shareErr.name !== "AbortError") {
            console.log("Share API unavailable, using clipboard fallback", shareErr);
          } else {
            return;
          }
        }
      }

      // Fallback to clipboard
      await navigator.clipboard.writeText(articleUrl);
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
      toast({
        title: "Link copied!",
        description: "Share this link in your Instagram story or post",
      });
    } catch {
      toast({
        title: "Share on Instagram",
        description: "Copy the article link and share it on Instagram",
      });
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
    handleEmailShare
  };
};
