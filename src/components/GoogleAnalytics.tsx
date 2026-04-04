import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getConsent } from "@/lib/cookieConsent";
import type { Json } from "@/integrations/supabase/types";

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
  const lastPushTimeRef = useRef<number>(0);

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
      // Deduplicate: skip if the same path was pushed within 2 seconds
      const now = Date.now();
      if (currentPath === prevPathRef.current && now - lastPushTimeRef.current < 2000) {
        return;
      }

      const pageTitle = document.title;

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'virtualPageview',
        pagePath: currentPath,
        pageTitle,
        pageReferrer: prevPath ? window.location.origin + prevPath : document.referrer,
      });

      prevPathRef.current = currentPath;
      lastPushTimeRef.current = now;
    }, 300);

    return () => clearTimeout(timer);
  }, [location]);

  return null;
};

export default GoogleAnalytics;

// Custom event tracking helper - pushes to dataLayer for GTM → GA4
// AND writes to Supabase analytics_events for the internal dashboard
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

  // Dual-write to Supabase
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
    .then(({ error }) => {
      if (error && !import.meta.env.PROD) {
        console.warn("[trackEvent] Supabase insert error:", error.message);
      }
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
