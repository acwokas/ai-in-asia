import { useEffect, useRef, useCallback } from "react";
import { trackEvent } from "@/components/GoogleAnalytics";

/**
 * GA4 content-engagement tracking for articles.
 * Fires scroll-depth milestones, engagement score on exit,
 * and newsletter-CTA impressions / clicks — all via dataLayer only.
 */
export const useGA4ContentTracking = (
  article: {
    id?: string;
    title?: string;
    categories?: { name?: string; slug?: string } | null;
  } | null | undefined
) => {
  const maxDepth = useRef(0);
  const firedDepths = useRef(new Set<number>());
  const startTime = useRef(Date.now());
  const newsletterObserved = useRef(false);

  const articleId = article?.id;
  const title = article?.title;
  const categoryName = article?.categories?.name;

  // ── Scroll-depth milestones on .article-content ──────────────────────
  useEffect(() => {
    if (!articleId) return;
    startTime.current = Date.now();
    maxDepth.current = 0;
    firedDepths.current.clear();

    const contentEl = document.querySelector(".article-content");
    if (!contentEl) return;

    const MILESTONES = [25, 50, 75, 90];

    const handleScroll = () => {
      const rect = contentEl.getBoundingClientRect();
      const scrolled = -rect.top;
      const total = rect.height - window.innerHeight;
      if (total <= 0) return;
      const pct = Math.min(100, Math.round((scrolled / total) * 100));

      if (pct > maxDepth.current) maxDepth.current = pct;

      for (const m of MILESTONES) {
        if (pct >= m && !firedDepths.current.has(m)) {
          firedDepths.current.add(m);
          if (m === 90) {
            const seconds = Math.round((Date.now() - startTime.current) / 1000);
            if (seconds >= 60) {
              trackEvent("article_read_complete", {
                article_id: articleId,
                article_title: title,
                article_category: categoryName,
                time_on_page: seconds,
              });
            }
          } else {
            trackEvent(`article_read_${m}`, {
              article_id: articleId,
              article_title: title,
              article_category: categoryName,
            });
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [articleId, title, categoryName]);

  // ── Engagement score on page exit (visibilitychange) ─────────────────
  useEffect(() => {
    if (!articleId) return;

    const handleVisChange = () => {
      if (document.visibilityState === "hidden") {
        const seconds = Math.round((Date.now() - startTime.current) / 1000);
        trackEvent("article_engagement_score", {
          article_title: title,
          article_category: categoryName,
          scroll_depth: maxDepth.current,
          time_on_page: seconds,
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisChange);
    return () => document.removeEventListener("visibilitychange", handleVisChange);
  }, [articleId, title, categoryName]);

  // ── Newsletter CTA view + click tracking ─────────────────────────────
  useEffect(() => {
    if (!articleId || newsletterObserved.current) return;
    newsletterObserved.current = true;

    const targets = document.querySelectorAll(".newsletter-cta, [data-newsletter]");
    if (!targets.length) {
      // Elements may not be mounted yet — retry once after a short delay
      const timer = setTimeout(() => {
        const retryTargets = document.querySelectorAll(".newsletter-cta, [data-newsletter]");
        if (retryTargets.length) observeTargets(retryTargets);
      }, 2000);
      return () => clearTimeout(timer);
    }

    observeTargets(targets);

    function observeTargets(els: NodeListOf<Element>) {
      const viewedSet = new WeakSet<Element>();

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !viewedSet.has(entry.target)) {
              viewedSet.add(entry.target);
              trackEvent("newsletter_cta_view", {
                article_id: articleId,
                article_title: title,
              });
            }
          }
        },
        { threshold: 0.5 }
      );

      els.forEach((el) => observer.observe(el));

      // Click tracking
      const handleClick = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest("button") || target.tagName === "BUTTON") {
          trackEvent("newsletter_cta_click", {
            article_id: articleId,
            article_title: title,
          });
        }
      };

      els.forEach((el) => el.addEventListener("click", handleClick));
    }
  }, [articleId, title]);
};

/**
 * GA4 guide-engagement tracking.
 * Mirrors article tracking with additional prompt-copy and tool-click events.
 */
export const useGA4GuideTracking = (
  guideId: string | undefined,
  title: string | undefined,
  category?: string
) => {
  const maxDepth = useRef(0);
  const firedDepths = useRef(new Set<number>());
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!guideId || !title) return;
    startTime.current = Date.now();
    maxDepth.current = 0;
    firedDepths.current.clear();

    trackEvent("content_view", {
      content_type: "guide",
      content_id: guideId,
      content_title: title,
      content_category: category,
    });

    return () => {
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      if (seconds >= 5) {
        trackEvent("content_time_spent", {
          content_type: "guide",
          content_id: guideId,
          content_title: title,
          seconds_on_page: seconds,
        });
      }
    };
  }, [guideId, title, category]);

  const trackScrollDepth = useCallback(
    (percent: number) => {
      if (!guideId) return;
      const milestone = [25, 50, 75, 100].find(
        (m) => percent >= m && !firedDepths.current.has(m)
      );
      if (milestone) {
        firedDepths.current.add(milestone);
        trackEvent("content_scroll_depth", {
          content_type: "guide",
          content_id: guideId,
          content_title: title,
          depth_percent: milestone,
        });
      }
    },
    [guideId, title]
  );

  const trackPromptCopy = useCallback(
    (promptTitle: string) => {
      trackEvent("guide_prompt_copy", {
        content_id: guideId,
        content_title: title,
        prompt_title: promptTitle,
      });
    },
    [guideId, title]
  );

  const trackToolClick = useCallback(
    (toolName: string, toolUrl: string) => {
      trackEvent("guide_tool_click", {
        content_id: guideId,
        tool_name: toolName,
        tool_url: toolUrl,
      });
    },
    [guideId]
  );

  return { trackScrollDepth, trackPromptCopy, trackToolClick };
};
