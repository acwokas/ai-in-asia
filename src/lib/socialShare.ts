/**
 * Social Sharing Utilities with SEO-friendly URLs
 * 
 * These utilities generate share URLs that route through the render-meta-tags
 * edge function, which returns proper meta tags to social media crawlers
 * while redirecting regular users to the actual article.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SITE_URL = 'https://aiinasia.com';

/**
 * Generate a crawler-friendly share URL that routes through the edge function
 * This URL will return proper OG/Twitter meta tags when crawled by social platforms
 */
export const getShareUrl = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // For social sharing, we use the edge function URL
  // The edge function detects crawlers and returns proper meta tags
  // For regular users, the meta tags redirect back to the actual page
  return `${SUPABASE_URL}/functions/v1/render-meta-tags?path=${encodeURIComponent(normalizedPath)}`;
};

/**
 * Get the regular article URL (for non-social sharing contexts)
 */
export const getArticleUrl = (categorySlug: string, articleSlug: string): string => {
  return `${SITE_URL}/${categorySlug}/${articleSlug}`;
};

/**
 * Share handlers that use SEO-friendly URLs for social platforms
 */
export const shareHandlers = {
  twitter: (url: string, title: string) => {
    const shareUrl = encodeURIComponent(url);
    const text = encodeURIComponent(title);
    window.open(
      `https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`,
      '_blank',
      'width=600,height=400'
    );
  },

  facebook: (url: string) => {
    const shareUrl = encodeURIComponent(url);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      '_blank',
      'width=600,height=400'
    );
  },

  linkedin: (url: string) => {
    const shareUrl = encodeURIComponent(url);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      '_blank',
      'width=600,height=400'
    );
  },

  reddit: (url: string, title: string) => {
    const shareUrl = encodeURIComponent(url);
    const text = encodeURIComponent(title);
    window.open(
      `https://reddit.com/submit?url=${shareUrl}&title=${text}`,
      '_blank',
      'width=600,height=400'
    );
  },

  whatsapp: (url: string, title: string) => {
    const text = encodeURIComponent(`${title}\n\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  },

  email: (url: string, title: string) => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`Check out this article:\n\n${title}\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  },

  copyToClipboard: async (url: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Creates share handlers for a specific article that use SEO-friendly URLs
 */
export const createArticleShareHandlers = (
  categorySlug: string,
  articleSlug: string,
  articleTitle: string
) => {
  // Use the edge function URL for social platforms (they'll get proper meta tags)
  const shareUrl = getShareUrl(`/${categorySlug}/${articleSlug}`);
  // Use the regular URL for copy/email (users will go directly to the article)
  const directUrl = getArticleUrl(categorySlug, articleSlug);

  return {
    twitter: () => shareHandlers.twitter(shareUrl, articleTitle),
    facebook: () => shareHandlers.facebook(shareUrl),
    linkedin: () => shareHandlers.linkedin(shareUrl),
    reddit: () => shareHandlers.reddit(shareUrl, articleTitle),
    whatsapp: () => shareHandlers.whatsapp(directUrl, articleTitle),
    email: () => shareHandlers.email(directUrl, articleTitle),
    copy: () => shareHandlers.copyToClipboard(directUrl),
  };
};
