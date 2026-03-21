import { useEffect, useRef } from "react";
import { trackEvent } from "@/components/GoogleAnalytics";

/**
 * GA4 tracking for "3 Before 9" briefing pages.
 * Fires briefing_view, briefing_story_read (per story), briefing_complete,
 * briefing_outbound_click, and briefing_context_expand.
 */
export function useGA4BriefingTracking(
  articleId: string | undefined,
  publishedAt: string | undefined,
  storyCount: number
) {
  const viewedStories = useRef(new Set<number>());
  const completeFired = useRef(false);

  // ── briefing_view on mount ──
  useEffect(() => {
    if (!articleId || !publishedAt) return;
    viewedStories.current.clear();
    completeFired.current = false;

    const date = publishedAt.slice(0, 10); // YYYY-MM-DD
    trackEvent("briefing_view", { briefing_date: date });
  }, [articleId, publishedAt]);

  // ── briefing_story_read via IntersectionObserver on signal/story cards ──
  useEffect(() => {
    if (!articleId || storyCount === 0) return;

    // Wait for DOM to render story cards
    const timer = setTimeout(() => {
      // Find story card elements — look for signal sections in the 3B9 template
      const cards = document.querySelectorAll(
        '[data-signal], [data-story], .signal-card, .story-card, article section, [class*="signal"]'
      );

      // Fallback: grab direct children of the main signals container
      let targets: Element[] = Array.from(cards);
      if (targets.length === 0) {
        // Try grabbing the numbered signal sections by heading pattern
        const allSections = document.querySelectorAll("h2, h3");
        const signalHeadings = Array.from(allSections).filter((el) =>
          /^(signal\s+)?[1-4🔵🟡🟠]|^bonus/i.test(el.textContent?.trim() || "")
        );
        targets = signalHeadings.map((h) => h.closest("div, section") || h);
      }

      if (targets.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const idx = targets.indexOf(entry.target);
            if (idx === -1 || viewedStories.current.has(idx)) continue;

            viewedStories.current.add(idx);
            trackEvent("briefing_story_read", {
              story_index: idx + 1,
              story_total: targets.length,
            });

            // ── briefing_complete when all stories viewed ──
            const needed = Math.min(storyCount, targets.length);
            if (
              viewedStories.current.size >= needed &&
              !completeFired.current
            ) {
              completeFired.current = true;
              trackEvent("briefing_complete", {
                stories_viewed: viewedStories.current.size,
              });
            }
          }
        },
        { threshold: 0.4 }
      );

      targets.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
    }, 1000);

    return () => clearTimeout(timer);
  }, [articleId, storyCount]);

  // ── briefing_outbound_click ──
  useEffect(() => {
    if (!articleId) return;

    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.href;
      if (
        href &&
        !href.startsWith(window.location.origin) &&
        !href.startsWith("/")
      ) {
        trackEvent("briefing_outbound_click", {
          click_url: href,
          click_text: (anchor.textContent || "").trim().slice(0, 80),
        });
      }
    };

    // Scope to article / main content
    const container =
      document.querySelector("article") ||
      document.querySelector("main") ||
      document;
    container.addEventListener("click", handler as EventListener, { capture: true });
    return () =>
      container.removeEventListener("click", handler as EventListener, {
        capture: true,
      });
  }, [articleId]);

  // ── briefing_context_expand (details/summary, collapsible, accordion) ──
  useEffect(() => {
    if (!articleId) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const expandable = target.closest(
        "summary, [data-state][data-radix-collapsible-trigger], [data-expand], button[aria-expanded]"
      );
      if (expandable) {
        trackEvent("briefing_context_expand", {
          section_text: (expandable.textContent || "").trim().slice(0, 60),
        });
      }
    };

    document.addEventListener("click", handler, { capture: true });
    return () =>
      document.removeEventListener("click", handler, { capture: true });
  }, [articleId]);
}
