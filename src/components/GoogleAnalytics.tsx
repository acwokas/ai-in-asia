import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// GA4 is loaded via GTM (GTM-NVSBJH7Q). All tracking goes through dataLayer only.
// Previously, events were also sent via gtag("config"/event") which caused double-counting
// because gtag() just pushes to dataLayer anyway (see the stub in index.html).

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

const GoogleAnalytics = () => {
  const location = useLocation();
  const prevPathRef = useRef<string>('');

  // Track page views on route change via dataLayer for GTM
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prevPath = prevPathRef.current;
    const currentPath = location.pathname + location.search;

    // Skip tracking on internal/admin pages
    const internalPrefixes = ['/admin', '/editor', '/auth', '/profile', '/connection-test'];
    if (internalPrefixes.some(prefix => location.pathname.startsWith(prefix))) {
      prevPathRef.current = currentPath;
      return;
    }

    // Delay to allow react-helmet-async to update document.title before we read it
    const timer = setTimeout(() => {
      const pageTitle = document.title;

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'virtualPageview',
        pagePath: currentPath,
        pageTitle,
        pageReferrer: prevPath ? window.location.origin + prevPath : document.referrer,
      });

      prevPathRef.current = currentPath;
    }, 300);

    return () => clearTimeout(timer);
  }, [location]);

  return null;
};

export default GoogleAnalytics;

// Custom event tracking helper - pushes to dataLayer for GTM → GA4
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window === 'undefined') return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...eventParams,
  });

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
