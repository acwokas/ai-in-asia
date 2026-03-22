import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { dualPush as push } from "@/lib/dualTrack";

export function useGA4NewUserTracking() {
  const location = useLocation();
  const pageviewCount = useRef(0);

  useEffect(() => {
    const path = location.pathname;

    const skip = ["/admin", "/editor", "/auth", "/profile"];
    if (skip.some((p) => path.startsWith(p))) return;

    const isArticlePage =
      /^\/[a-z-]+\/[a-z0-9-]+$/.test(path) &&
      !path.startsWith("/guides") &&
      !path.startsWith("/search");

    if (isArticlePage && !sessionStorage.getItem("ga4_first_article")) {
      sessionStorage.setItem("ga4_first_article", "1");
      push("first_article_view", { page_path: path });
    }

    pageviewCount.current += 1;
    if (
      pageviewCount.current >= 3 &&
      !sessionStorage.getItem("ga4_session_depth")
    ) {
      sessionStorage.setItem("ga4_session_depth", "1");
      push("first_session_depth", { pageviews: pageviewCount.current });
    }

    // ── Category loyalty: 5+ articles in same category ──────────────
    const categoryMatch = path.match(/^\/(news|business|life|voices|learn|create|policy)/);
    if (categoryMatch) {
      const cat = categoryMatch[1];
      const cats = JSON.parse(
        sessionStorage.getItem("ga4_cats_visited") || "[]"
      ) as string[];
      if (!cats.includes(cat)) {
        cats.push(cat);
        sessionStorage.setItem("ga4_cats_visited", JSON.stringify(cats));
        if (cats.length === 2 && !sessionStorage.getItem("ga4_cat_explore")) {
          sessionStorage.setItem("ga4_cat_explore", "1");
          push("new_user_category_explore", {
            categories: cats.join(","),
          });
        }
      }

      // Category loyalty via localStorage
      if (isArticlePage) {
        const loyaltyKey = "ga4_cat_loyalty";
        const loyalty: Record<string, number> = JSON.parse(
          localStorage.getItem(loyaltyKey) || "{}"
        );
        loyalty[cat] = (loyalty[cat] || 0) + 1;
        localStorage.setItem(loyaltyKey, JSON.stringify(loyalty));

        if (loyalty[cat] === 5) {
          push("category_loyalty", {
            category: cat,
            article_count: loyalty[cat],
            page_path: path,
          });
        }
      }
    }
  }, [location.pathname]);

  // ── New user bounce: beforeunload if scroll < 25% ─────────────────
  useEffect(() => {
    const isNewUser = !localStorage.getItem("ga4_returning");

    if (!isNewUser) return;

    const handler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

      if (pct < 25 && pageviewCount.current <= 1) {
        push("new_user_bounce_content", {
          scroll_depth: pct,
          page_path: window.location.pathname,
        });
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}

export function useGA4ReturningUserTracking() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Mark as returning user for future sessions
    localStorage.setItem("ga4_returning", "1");

    if (sessionStorage.getItem("ga4_return_checked")) return;
    sessionStorage.setItem("ga4_return_checked", "1");

    (async () => {
      const { data: stats } = await supabase
        .from("user_stats")
        .select("last_active_date, streak_days")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!stats) return;

      if (stats.last_active_date) {
        const last = new Date(stats.last_active_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        last.setHours(0, 0, 0, 0);
        const diffDays = Math.round(
          (today.getTime() - last.getTime()) / 86400000
        );
        if (diffDays >= 1) {
          push("return_visit", { days_since: diffDays });
        }
      }

      if (stats.streak_days && stats.streak_days >= 3) {
        push("content_streak", { streak_days: stats.streak_days });
      }
    })();
  }, [user]);

  // ── Bookmark click tracking ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(
        '[data-bookmark], .bookmark-btn, [aria-label*="bookmark" i], [aria-label*="save" i]'
      );
      if (btn) {
        push("bookmark_article", {
          page_path: window.location.pathname,
        });
      }
    };
    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, []);

  // ── Saved content return: returning user clicks a bookmarked article ─
  useEffect(() => {
    if (!user) return;

    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const inSaved = anchor.closest(
        '[data-saved], [class*="SavedArticle"], [class*="bookmark"], [class*="Bookmark"], [class*="ReadingQueue"]'
      );
      if (inSaved) {
        push("saved_content_return", {
          link_url: anchor.getAttribute("href") || "",
          link_text: (anchor.textContent || "").trim().slice(0, 80),
          page_path: window.location.pathname,
        });
      }
    };

    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, [user]);
}
