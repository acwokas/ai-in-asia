import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

const SESSION_KEY = 'aiia_session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

interface SessionData {
  sessionId: string;
  startedAt: number;
  lastActivity: number;
  pageCount: number;
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

// Global event tracking function (can be used outside React components)
export const trackAnalyticsEvent = async (
  eventName: string, 
  eventCategory?: string, 
  eventData?: Record<string, unknown>
) => {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return;

  try {
    const sessionData: SessionData = JSON.parse(stored);
    await supabase.from('analytics_events').insert([{
      session_id: sessionData.sessionId,
      user_id: null,
      event_name: eventName,
      event_category: eventCategory || null,
      event_data: (eventData || {}) as Json,
      page_path: window.location.pathname,
    }]);
  } catch {
    // Silent fail
  }
};

// Track errors globally
export const trackError = async (
  errorMessage: string,
  errorSource: string,
  errorStack?: string,
  additionalData?: Record<string, unknown>
) => {
  await trackAnalyticsEvent('error', 'error', {
    message: errorMessage,
    source: errorSource,
    stack: errorStack?.slice(0, 1000), // Limit stack trace length
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    ...additionalData,
  });
};

// Setup global error handlers
export const setupGlobalErrorTracking = () => {
  // Track uncaught JavaScript errors
  window.addEventListener('error', (event) => {
    trackError(
      event.message || 'Unknown error',
      'window.onerror',
      event.error?.stack,
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || reason?.toString() || 'Unhandled promise rejection';
    trackError(
      message,
      'unhandledrejection',
      reason?.stack,
      { reason: String(reason) }
    );
  });

  // Track console errors (optional - can be noisy)
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    // Filter out noise - don't track these error types:
    const ignoredPatterns = [
      'Warning:',                    // React dev warnings
      'ReactDOM',                    // React internals
      'AdSense',                     // Google Ads slot size errors (normal behavior)
      'adsbygoogle',                 // Google Ads push errors
      'No slot size',                // AdSense no slot available
      'availableWidth=0',            // AdSense width calculation issues
      'dehydrated as pending',       // React Query SSR hydration (expected)
      'CancelledError',              // React Query cancelled requests (navigation)
    ];
    
    const shouldIgnore = ignoredPatterns.some(pattern => message.includes(pattern));
    
    if (!shouldIgnore) {
      trackError(message.slice(0, 500), 'console.error');
    }
    
    originalConsoleError.apply(console, args);
  };
};

export const useAnalyticsTracking = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Do not track admin, editor, auth, or profile pages
  const isInternalPath = ['/admin', '/editor', '/auth', '/profile', '/connection-test', '/not-found'].some(
    prefix => location.pathname.startsWith(prefix)
  );

  const lastPathRef = useRef<string | null>(null);
  const pageViewIdRef = useRef<string | null>(null);
  const pageStartTimeRef = useRef<number>(Date.now());
  const scrollDepthRef = useRef<number>(0);
  const sessionDataRef = useRef<SessionData | null>(null);

  // ── Idle detection: track active time, not wall time ──────────────
  const activeTimeRef = useRef<number>(0);       // accumulated active seconds
  const lastActiveTickRef = useRef<number>(Date.now());
  const isIdleRef = useRef<boolean>(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const IDLE_THRESHOLD = 30_000; // 30 seconds

  useEffect(() => {
    const markActive = () => {
      const now = Date.now();
      if (isIdleRef.current) {
        // Resuming from idle — reset tick without accumulating idle gap
        isIdleRef.current = false;
        lastActiveTickRef.current = now;
      }
      // Reset idle timer
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        // Accumulate active time before going idle
        activeTimeRef.current += Math.round((Date.now() - lastActiveTickRef.current) / 1000);
        isIdleRef.current = true;
      }, IDLE_THRESHOLD);
    };

    const events = ['scroll', 'click', 'keypress', 'mousemove', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, markActive, { passive: true }));
    markActive(); // start active

    return () => {
      events.forEach(evt => window.removeEventListener(evt, markActive));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  /** Get total active seconds on current page (excludes idle time) */
  const getActiveSeconds = useCallback(() => {
    let total = activeTimeRef.current;
    if (!isIdleRef.current) {
      total += Math.round((Date.now() - lastActiveTickRef.current) / 1000);
    }
    return total;
  }, []);

  /** Reset active timer (called on page navigation) */
  const resetActiveTimer = useCallback(() => {
    activeTimeRef.current = 0;
    lastActiveTickRef.current = Date.now();
    isIdleRef.current = false;
  }, []);

  // Update session in database
  const updateSessionInDb = useCallback(async (sessionId: string, updates: {
    duration_seconds?: number;
    ended_at?: string;
    page_count?: number;
    is_bounce?: boolean;
    exit_page?: string;
  }) => {
    await supabase
      .from('analytics_sessions')
      .update(updates)
      .eq('session_id', sessionId);
  }, []);

  const getOrCreateSession = useCallback(async (): Promise<string> => {
    const stored = localStorage.getItem(SESSION_KEY);
    let sessionData: SessionData | null = null;

    if (stored) {
      try {
        sessionData = JSON.parse(stored);
        // Check if session is still valid (within timeout)
        if (Date.now() - sessionData.lastActivity > SESSION_TIMEOUT) {
          // Finalize old session
          await updateSessionInDb(sessionData.sessionId, {
            duration_seconds: Math.round((sessionData.lastActivity - sessionData.startedAt) / 1000),
            ended_at: new Date(sessionData.lastActivity).toISOString(),
            is_bounce: sessionData.pageCount <= 1,
          });
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
      sessionDataRef.current = sessionData;
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
      pageCount: 0,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    sessionDataRef.current = newSession;

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
      duration_seconds: 0,
      page_count: 0,
      is_bounce: true, // Assume bounce until proven otherwise
    });

    return sessionId;
  }, [user?.id, location.pathname, updateSessionInDb]);

  const trackPageView = useCallback(async () => {
    const sessionId = await getOrCreateSession();
    const currentPath = location.pathname + location.search;

    // Update previous pageview with time spent and scroll depth
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

    // Increment page count in session
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const sessionData: SessionData = JSON.parse(stored);
        sessionData.pageCount = (sessionData.pageCount || 0) + 1;
        sessionData.lastActivity = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        sessionDataRef.current = sessionData;

        // Update session in database
        const durationSeconds = Math.round((Date.now() - sessionData.startedAt) / 1000);
        await updateSessionInDb(sessionId, {
          page_count: sessionData.pageCount,
          duration_seconds: durationSeconds,
          is_bounce: sessionData.pageCount <= 1,
          exit_page: currentPath,
        });
      } catch {
        // Silent fail
      }
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
      .insert([{
        session_id: sessionId,
        user_id: user?.id || null,
        page_path: currentPath,
        page_title: document.title,
        referrer_path: lastPathRef.current,
        article_id: articleId,
        guide_id: guideId,
        category_slug: categorySlug,
        is_exit: false, // Will be updated on next navigation or page close
      }])
      .select('id')
      .single();

    if (data) {
      pageViewIdRef.current = data.id;
    }

    // Mark previous page as not an exit
    if (lastPathRef.current && pageViewIdRef.current) {
      // The previous page wasn't the exit since we're still navigating
    }

    lastPathRef.current = currentPath;
    pageStartTimeRef.current = Date.now();
    scrollDepthRef.current = 0;
    resetActiveTimer();
  }, [getOrCreateSession, location.pathname, location.search, user?.id, updateSessionInDb, resetActiveTimer]);

  // Track scroll depth + periodic save every 10s while active
  useEffect(() => {
    if (isInternalPath) return;
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      scrollDepthRef.current = Math.max(scrollDepthRef.current, scrollPercent);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Periodic scroll depth + active time save every 10 seconds
    const intervalId = setInterval(async () => {
      if (!pageViewIdRef.current || isIdleRef.current) return;

      const activeSeconds = getActiveSeconds();

      await supabase
        .from('analytics_pageviews')
        .update({
          time_on_page_seconds: activeSeconds,
          scroll_depth_percent: scrollDepthRef.current,
        })
        .eq('id', pageViewIdRef.current);
    }, 10_000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(intervalId);
    };
  }, [isInternalPath, getActiveSeconds]);

  // Track page views on route change — skip internal pages
  useEffect(() => {
    if (!isInternalPath) {
      trackPageView();
    }
  }, [location.pathname, location.search, isInternalPath]);

  // Handle page visibility changes (tab switching, minimizing)
  // Throttled: skip if last write was <10 s ago to avoid rapid tab-switch spam
  const lastVisibilityWriteRef = useRef<number>(0);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'hidden') return;

      const now = Date.now();
      if (now - lastVisibilityWriteRef.current < 10_000) return; // throttle

      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored || !pageViewIdRef.current) return;

      try {
        const sessionData: SessionData = JSON.parse(stored);
        const timeSpent = Math.round((now - pageStartTimeRef.current) / 1000);

        // Only write if the user actually spent meaningful time on the page
        if (timeSpent < 2) return;

        lastVisibilityWriteRef.current = now;

        const durationSeconds = Math.round((now - sessionData.startedAt) / 1000);

        // Update pageview
        await supabase
          .from('analytics_pageviews')
          .update({
            time_on_page_seconds: timeSpent,
            scroll_depth_percent: scrollDepthRef.current,
            is_exit: true,
          })
          .eq('id', pageViewIdRef.current);

        // Update session
        await updateSessionInDb(sessionData.sessionId, {
          duration_seconds: durationSeconds,
          exit_page: location.pathname,
        });
      } catch {
        // Silent fail
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [location.pathname, updateSessionInDb]);

  // Mark exit page on unload using sendBeacon (non-blocking, reliable on tab close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored || !pageViewIdRef.current) return;

      try {
        const sessionData: SessionData = JSON.parse(stored);
        const timeSpent = getActiveSeconds();
        const durationSeconds = timeSpent; // Use active time, not wall time

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const headers = { 'Content-Type': 'application/json', apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Prefer: 'return=minimal' };

        // sendBeacon only supports POST, so use fetch with keepalive (works in all modern browsers).
        // keepalive flag ensures the request completes even after the page unloads.
        fetch(`${supabaseUrl}/rest/v1/analytics_pageviews?id=eq.${pageViewIdRef.current}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            time_on_page_seconds: timeSpent,
            scroll_depth_percent: scrollDepthRef.current,
            is_exit: true,
          }),
          keepalive: true,
        }).catch(() => {});

        fetch(`${supabaseUrl}/rest/v1/analytics_sessions?session_id=eq.${sessionData.sessionId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            duration_seconds: durationSeconds,
            ended_at: new Date().toISOString(),
            exit_page: location.pathname,
          }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Silent fail
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location.pathname]);

  // Periodic session update (every 5 minutes while active)
  useEffect(() => {
    const intervalId = setInterval(async () => {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored && pageViewIdRef.current) {
        try {
          const sessionData: SessionData = JSON.parse(stored);
          const durationSeconds = Math.round((Date.now() - sessionData.startedAt) / 1000);
          const timeSpent = Math.round((Date.now() - pageStartTimeRef.current) / 1000);

          // Update session duration
          await updateSessionInDb(sessionData.sessionId, {
            duration_seconds: durationSeconds,
          });

          // Update current pageview time
          await supabase
            .from('analytics_pageviews')
            .update({
              time_on_page_seconds: timeSpent,
              scroll_depth_percent: scrollDepthRef.current,
            })
            .eq('id', pageViewIdRef.current);

          // Update lastActivity in localStorage
          sessionData.lastActivity = Date.now();
          localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        } catch {
          // Silent fail
        }
      }
    }, 300_000); // Every 5 minutes — balances data freshness vs Supabase write volume

    return () => clearInterval(intervalId);
  }, [updateSessionInDb]);

  // Track custom events with user context
  const trackEvent = useCallback(async (eventName: string, eventCategory?: string, eventData?: Record<string, unknown>) => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return;

    try {
      const sessionData: SessionData = JSON.parse(stored);
      await supabase.from('analytics_events').insert([{
        session_id: sessionData.sessionId,
        user_id: user?.id || null,
        event_name: eventName,
        event_category: eventCategory || null,
        event_data: (eventData || {}) as Json,
        page_path: location.pathname,
      }]);
    } catch {
      // Silent fail
    }
  }, [user?.id, location.pathname]);

  return { trackEvent };
};

export default useAnalyticsTracking;