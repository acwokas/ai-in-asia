import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SESSION_KEY = 'aiia_session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

interface SessionData {
  sessionId: string;
  startedAt: number;
  lastActivity: number;
}

const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
  return 'desktop';
};

const getBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
};

const getOS = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'MacOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
};

const getUTMParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
  };
};

const getReferrerDomain = (referrer: string) => {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname;
  } catch {
    return null;
  }
};

export const useAnalyticsTracking = () => {
  const location = useLocation();
  const { user } = useAuth();
  const lastPathRef = useRef<string | null>(null);
  const pageViewIdRef = useRef<string | null>(null);
  const pageStartTimeRef = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);

  const getOrCreateSession = useCallback(async (): Promise<string> => {
    const stored = localStorage.getItem(SESSION_KEY);
    let sessionData: SessionData | null = null;

    if (stored) {
      try {
        sessionData = JSON.parse(stored);
        // Check if session is still valid (within timeout)
        if (Date.now() - sessionData.lastActivity > SESSION_TIMEOUT) {
          sessionData = null;
        }
      } catch {
        sessionData = null;
      }
    }

    if (sessionData) {
      // Update last activity
      sessionData.lastActivity = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      return sessionData.sessionId;
    }

    // Create new session
    const sessionId = generateSessionId();
    const utmParams = getUTMParams();
    const referrer = document.referrer;

    const newSession: SessionData = {
      sessionId,
      startedAt: Date.now(),
      lastActivity: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));

    // Insert session to database
    await supabase.from('analytics_sessions').insert({
      session_id: sessionId,
      user_id: user?.id || null,
      referrer: referrer || null,
      referrer_domain: getReferrerDomain(referrer),
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_term: utmParams.utm_term,
      utm_content: utmParams.utm_content,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
      landing_page: location.pathname,
    });

    return sessionId;
  }, [user?.id, location.pathname]);

  const trackPageView = useCallback(async () => {
    const sessionId = await getOrCreateSession();
    const currentPath = location.pathname + location.search;

    // Update previous pageview with time spent and exit status
    if (pageViewIdRef.current && lastPathRef.current) {
      const timeSpent = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
      await supabase
        .from('analytics_pageviews')
        .update({
          time_on_page_seconds: timeSpent,
          scroll_depth_percent: scrollDepthRef.current,
        })
        .eq('id', pageViewIdRef.current);
    }

    // Extract article/guide/category info from path
    let articleId = null;
    let guideId = null;
    let categorySlug = null;

    // Detect category pages
    const categoryMatch = location.pathname.match(/^\/(news|business|life|learn|create|voices|ai-policy-atlas)$/);
    if (categoryMatch) {
      categorySlug = categoryMatch[1];
    }

    // Insert new pageview
    const { data } = await supabase
      .from('analytics_pageviews')
      .insert({
        session_id: sessionId,
        user_id: user?.id || null,
        page_path: currentPath,
        page_title: document.title,
        referrer_path: lastPathRef.current,
        article_id: articleId,
        guide_id: guideId,
        category_slug: categorySlug,
      })
      .select('id')
      .single();

    if (data) {
      pageViewIdRef.current = data.id;
    }

    // Update session page count (simple increment via raw SQL would need function, skip for now)
    lastPathRef.current = currentPath;
    pageStartTimeRef.current = Date.now();
    scrollDepthRef.current = 0;
  }, [getOrCreateSession, location.pathname, location.search, user?.id]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      scrollDepthRef.current = Math.max(scrollDepthRef.current, scrollPercent);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView();
  }, [location.pathname, location.search]);

  // Mark exit page on unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored && pageViewIdRef.current) {
        try {
          const sessionData: SessionData = JSON.parse(stored);
          const timeSpent = Math.round((Date.now() - pageStartTimeRef.current) / 1000);
          
          // Use sendBeacon for reliable exit tracking
          const payload = JSON.stringify({
            pageViewId: pageViewIdRef.current,
            sessionId: sessionData.sessionId,
            timeSpent,
            scrollDepth: scrollDepthRef.current,
            exitPage: location.pathname,
          });
          
          navigator.sendBeacon('/api/track-exit', payload);
        } catch {
          // Silent fail
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location.pathname]);

  // Track custom events
  const trackEvent = useCallback(async (eventName: string, eventCategory?: string, eventData?: Record<string, any>) => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;

    try {
      const sessionData: SessionData = JSON.parse(stored);
      await supabase.from('analytics_events').insert({
        session_id: sessionData.sessionId,
        user_id: user?.id || null,
        event_name: eventName,
        event_category: eventCategory,
        event_data: eventData || {},
        page_path: location.pathname,
      });
    } catch {
      // Silent fail
    }
  }, [user?.id, location.pathname]);

  return { trackEvent };
};

export default useAnalyticsTracking;
