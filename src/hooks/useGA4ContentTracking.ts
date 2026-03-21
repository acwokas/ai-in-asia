import { useEffect, useRef, useCallback } from "react";
import { trackEvent } from "@/components/GoogleAnalytics";

/** Track article engagement: view, scroll depth milestones, time-on-page */
export const useGA4ArticleTracking = (
  articleId: string | undefined,
  title: string | undefined,
  category?: string
) => {
  const startTime = useRef(Date.now());
  const firedDepths = useRef(new Set<number>());

  // Article view on mount
  useEffect(() => {
    if (!articleId || !title) return;
    startTime.current = Date.now();
    firedDepths.current.clear();

    trackEvent("content_view", {
      content_type: "article",
      content_id: articleId,
      content_title: title,
      content_category: category,
    });

    return () => {
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      if (seconds >= 5) {
        trackEvent("content_time_spent", {
          content_type: "article",
          content_id: articleId,
          content_title: title,
          seconds_on_page: seconds,
        });
      }
    };
  }, [articleId, title, category]);

  const trackScrollDepth = useCallback(
    (percent: number) => {
      if (!articleId) return;
      const milestone = [25, 50, 75, 100].find((m) => percent >= m && !firedDepths.current.has(m));
      if (milestone) {
        firedDepths.current.add(milestone);
        trackEvent("content_scroll_depth", {
          content_type: "article",
          content_id: articleId,
          content_title: title,
          depth_percent: milestone,
        });
      }
    },
    [articleId, title]
  );

  return { trackScrollDepth };
};

/** Track guide engagement: view, scroll depth milestones, time-on-page, prompt copy */
export const useGA4GuideTracking = (
  guideId: string | undefined,
  title: string | undefined,
  category?: string
) => {
  const startTime = useRef(Date.now());
  const firedDepths = useRef(new Set<number>());

  useEffect(() => {
    if (!guideId || !title) return;
    startTime.current = Date.now();
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
      const milestone = [25, 50, 75, 100].find((m) => percent >= m && !firedDepths.current.has(m));
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
