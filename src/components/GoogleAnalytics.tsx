import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// GA4 Measurement ID (loaded via GTM, not directly)
const GA_MEASUREMENT_ID = "G-M981596ST2";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

const GoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Ensure dataLayer and gtag are available (GTM handles loading GA4)
    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      if (typeof window.gtag !== 'function') {
        window.gtag = function () {
          window.dataLayer!.push(arguments as unknown as any);
        } as any;
      }
    }
  }, []);

  // Track page views on route change via dataLayer for GTM
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Push page_view event to dataLayer for GTM triggers
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'virtualPageview',
        pagePath: location.pathname + location.search,
        pageTitle: document.title,
      });

      // Also send via gtag for direct GA4 processing
      if (window.gtag) {
        window.gtag("config", GA_MEASUREMENT_ID, {
          page_path: location.pathname + location.search,
        });
      }
    }
  }, [location]);

  return null;
};

export default GoogleAnalytics;

// Custom event tracking helper - sends to both dataLayer (for GTM) and gtag (for GA4)
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window === 'undefined') return;

  // Push to dataLayer for GTM
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...eventParams,
  });

  // Also send via gtag
  if (window.gtag) {
    window.gtag("event", eventName, eventParams);
  }

  if (!import.meta.env.PROD) {
    console.log("GA4 Event (dev mode):", eventName, eventParams);
  }
};

// Common events
export const trackArticleView = (articleId: string, title: string, category?: string) => {
  trackEvent("article_view", {
    article_id: articleId,
    article_title: title,
    article_category: category,
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

export const trackShareClick = (
  articleId: string,
  platform: string
) => {
  trackEvent("share", {
    article_id: articleId,
    platform: platform,
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
  trackEvent("outbound_click", {
    click_url: url,
    click_text: text,
    page_path: window.location.pathname,
  });
};

export const trackArticleReadDepth = (articleId: string, depth: number, title: string) => {
  trackEvent("article_read_depth", {
    article_id: articleId,
    scroll_threshold: depth,
    article_title: title,
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
