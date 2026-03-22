/**
 * Dual-write analytics bridge.
 * Pushes events to both window.dataLayer (for GTM → GA4) AND
 * Supabase analytics_events (for the Analytics Hub dashboard).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const SESSION_KEY = "aiia_session_id";

const getSessionId = (): string => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.sessionId || "unknown";
    }
  } catch {
    // ignore
  }
  return "unknown";
};

/**
 * Push an event to both dataLayer AND Supabase analytics_events.
 * Fire-and-forget — never throws.
 */
export const dualPush = (event: string, params?: Record<string, any>) => {
  // 1. dataLayer for GTM → GA4
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });

  // 2. Supabase analytics_events for the internal dashboard
  const sessionId = getSessionId();
  supabase
    .from("analytics_events")
    .insert({
      session_id: sessionId,
      event_name: event,
      event_category: params?.article_category || params?.content_category || null,
      event_data: (params || {}) as Json,
      page_path: typeof window !== "undefined" ? window.location.pathname : null,
    })
    .then(({ error }) => {
      if (error && !import.meta.env.PROD) {
        console.warn("[dualPush] Supabase insert error:", error.message);
      }
    });
};
