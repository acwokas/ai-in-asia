import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// GA4 Measurement ID
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
    // Only load in production
    if (import.meta.env.PROD) {
      // Load GA4 script
      const script1 = document.createElement("script");
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script1);

      const script2 = document.createElement("script");
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_MEASUREMENT_ID}');
      `;
      document.head.appendChild(script2);

      return () => {
        document.head.removeChild(script1);
        document.head.removeChild(script2);
      };
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (import.meta.env.PROD && window.gtag) {
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return null;
};

export default GoogleAnalytics;

// Custom event tracking helper
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (import.meta.env.PROD && window.gtag) {
    window.gtag("event", eventName, eventParams);
  } else {
    console.log("GA4 Event (dev mode):", eventName, eventParams);
  }
};

// Common events
export const trackArticleView = (articleId: string, title: string) => {
  trackEvent("article_view", {
    article_id: articleId,
    article_title: title,
  });
};

export const trackNewsletterSignup = (location: string) => {
  trackEvent("newsletter_signup", {
    signup_location: location, // 'popup', 'footer', 'inline'
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
    platform: platform, // 'twitter', 'linkedin', 'facebook'
  });
};
