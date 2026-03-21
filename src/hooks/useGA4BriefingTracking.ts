import { useEffect, useRef } from "react";

const push = (event: string, params?: Record<string, any>) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
};

export function useGA4BriefingTracking(
  articleId: string | undefined,
  publishedAt: string | undefined,
  storyCount: number
) {
  const viewedStories = useRef(new Set<number>());
  const completeFired = useRef(false);

  useEffect(() => {
    if (!articleId || !publishedAt) return;
    viewedStories.current.clear();
    completeFired.current = false;

    const date = publishedAt.slice(0, 10);
    push("briefing_view", { briefing_date: date });
  }, [articleId, publishedAt]);

  useEffect(() => {
    if (!articleId || storyCount === 0) return;

    const timer = setTimeout(() => {
      const cards = document.querySelectorAll(
        '[data-signal], [data-story], .signal-card, .story-card, article section, [class*="signal"]'
      );

      let targets: Element[] = Array.from(cards);
      if (targets.length === 0) {
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
            push("briefing_story_read", {
              story_index: idx + 1,
              story_total: targets.length,
            });

            const needed = Math.min(storyCount, targets.length);
            if (
              viewedStories.current.size >= needed &&
              !completeFired.current
            ) {
              completeFired.current = true;
              push("briefing_complete", {
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
        push("briefing_outbound_click", {
          click_url: href,
          click_text: (anchor.textContent || "").trim().slice(0, 80),
        });
      }
    };

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

  useEffect(() => {
    if (!articleId) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const expandable = target.closest(
        "summary, [data-state][data-radix-collapsible-trigger], [data-expand], button[aria-expanded]"
      );
      if (expandable) {
        push("briefing_context_expand", {
          section_text: (expandable.textContent || "").trim().slice(0, 60),
        });
      }
    };

    document.addEventListener("click", handler, { capture: true });
    return () =>
      document.removeEventListener("click", handler, { capture: true });
  }, [articleId]);
}
