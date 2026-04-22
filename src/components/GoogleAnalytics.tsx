import { supabase } from "@/integrations/supabase/client";
import { getConsent } from "@/lib/cookieConsent";
import type { Json } from "@/integrations/supabase/types";

// GA4 loaded via GTM (GTM-NVSBJH7Q). All tracking goes through dataLayer only.
// Page-view tracking for Astro ViewTransitions is handled in BaseLayout.astro.

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

// Custom event tracking helper - pushes to dataLayer for GTM → GA4
// AND writes to Supabase analytics_events for the internal dashboard
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window === 'undefined') return;

  if (getConsent() === 'accepted') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...eventParams,
    });
  }

  const SESSION_KEY = "aiia_session_id";
  let sessionId = "unknown";
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) sessionId = JSON.parse(stored).sessionId || "unknown";
  } catch { /* ignore */ }

  supabase
    .from("analytics_events")
    .insert({
      session_id: sessionId,
      event_name: eventName,
      event_category: eventParams?.article_category || eventParams?.content_category || null,
      event_data: (eventParams || {}) as Json,
      page_path: window.location.pathname,
    })
    .then(() => {});
};

export const trackArticleView = (
  articleId: string,
  title: string,
  category?: string,
  articleType?: 'three_before_nine' | 'standard',
  author?: string,
) => {
  trackEvent("article_view", {
    article_id: articleId,
    article_title: title,
    article_category: category,
    article_type: articleType || 'standard',
    author,
  });
};

export const trackNewsletterSignup = (location: string) => {
  trackEvent("newsletter_signup", {
    signup_location: location,
  });
};

export const trackSearch = (searchTerm: string, resultCount: number) => {
  trackEvent("search", {
    search_term: searchTerm,
    result_count: resultCount,
  });
};

export const trackShareClick = (articleId: string, platform: string) => {
  trackEvent("social_share", {
    article_id: articleId,
    platform,
  });
};

export const trackCategoryClick = (categoryName: string, categoryUrl: string) => {
  trackEvent("category_click", {
    category_name: categoryName,
    click_url: categoryUrl,
  });
};

export const trackSocialClick = (network: string, url: string) => {
  trackEvent("social_click", {
    social_network: network,
    click_url: url,
  });
};

export const trackOutboundClick = (url: string, text: string) => {
  trackEvent("outbound_link_click", {
    click_url: url,
    click_text: text,
    page_path: window.location.pathname,
  });
};

export const trackArticleReadDepth = (articleId: string, depth: number, title: string) => {
  trackEvent("scroll_depth", {
    article_id: articleId,
    scroll_threshold: depth,
    article_title: title,
    page_path: window.location.pathname,
  });
};

export const trackAudioPlay = (
  articleId: string,
  platform: 'spotify' | 'other',
  episodeTitle?: string,
) => {
  trackEvent("audio_play", {
    article_id: articleId,
    audio_platform: platform,
    episode_title: episodeTitle,
    page_path: window.location.pathname,
  });
};

export const track3B9EditionView = (articleId: string, title: string, editionDate?: string) => {
  trackEvent("3b9_edition_view", {
    article_id: articleId,
    article_title: title,
    edition_date: editionDate,
    page_path: window.location.pathname,
  });
};

export const trackCtaClick = (
  ctaName: string,
  ctaPosition: 'header' | 'inline' | 'sidebar' | 'footer' | 'modal' | string,
  ctaDestination?: string,
) => {
  trackEvent("cta_click", {
    cta_name: ctaName,
    cta_position: ctaPosition,
    cta_destination: ctaDestination,
    page_path: window.location.pathname,
  });
};

export const trackGuideView = (guideId: string, guideCategory: string, guideTitle?: string) => {
  trackEvent("guide_view", {
    guide_id: guideId,
    guide_category: guideCategory,
    guide_title: guideTitle,
    page_path: window.location.pathname,
  });
};

export const track404Error = (path: string, errorType: "page_not_found" | "article_not_found") => {
  trackEvent("404_error", {
    error_type: errorType,
    page_path: path,
    page_title: errorType === "article_not_found" ? "Article Not Found - 404" : "Page Not Found - 404",
  });
};
