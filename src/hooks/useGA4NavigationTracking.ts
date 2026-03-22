import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { dualPush as push } from "@/lib/dualTrack";

export function useGA4NavigationTracking() {
  const location = useLocation();

  // ── Click-based navigation events ────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a") as HTMLAnchorElement | null;

      // ── Social share click ───────────────────────────────────────────
      const shareBtn = target.closest(
        '[data-share], .share-btn, [aria-label*="share" i], [aria-label*="Share" i]'
      );
      if (shareBtn) {
        const platform =
          shareBtn.getAttribute("data-share") ||
          shareBtn.getAttribute("aria-label") ||
          shareBtn.textContent?.trim() ||
          "unknown";
        push("social_share_click", {
          platform: platform.toLowerCase().replace(/share (on|to|via) /i, ""),
          page_path: window.location.pathname,
        });
        return;
      }

      // ── AI Snapshot expand ───────────────────────────────────────────
      const snapshotToggle = target.closest(
        '[data-snapshot], .tldr-snapshot summary, [class*="Snapshot"] button, [class*="snapshot"] button, [class*="TldrSnapshot"] button, details.tldr summary'
      );
      if (snapshotToggle) {
        push("ai_snapshot_expand", {
          page_path: window.location.pathname,
        });
        return;
      }

      // ── Up Next click ────────────────────────────────────────────────
      const upNext = target.closest(
        '[data-up-next], [class*="NextArticle"], [class*="up-next"], [class*="UpNext"]'
      );
      if (upNext) {
        const linkEl = upNext.closest("a") || upNext.querySelector("a");
        push("up_next_click", {
          link_text: (linkEl?.textContent || target.textContent || "").trim().slice(0, 80),
          link_url: linkEl?.getAttribute("href") || "",
          page_path: window.location.pathname,
        });
        return;
      }

      // ── Learning path click ──────────────────────────────────────────
      const learningPath = target.closest(
        '[data-learning-path], [class*="LearningPath"], [class*="learning-path"]'
      );
      if (learningPath) {
        const linkEl = learningPath.closest("a") || learningPath.querySelector("a");
        push("learning_path_click", {
          link_text: (linkEl?.textContent || target.textContent || "").trim().slice(0, 80),
          link_url: linkEl?.getAttribute("href") || "",
          page_path: window.location.pathname,
        });
        return;
      }

      // ── Search result click ──────────────────────────────────────────
      const searchResult = target.closest(
        '[data-search-result], [class*="search-result"], [class*="SearchResult"], .search-results a'
      );
      if (searchResult) {
        const linkEl = (searchResult.tagName === "A" ? searchResult : searchResult.closest("a") || searchResult.querySelector("a")) as HTMLAnchorElement | null;
        push("search_result_click", {
          link_text: (linkEl?.textContent || target.textContent || "").trim().slice(0, 80),
          link_url: linkEl?.getAttribute("href") || "",
          page_path: window.location.pathname,
        });
        return;
      }

      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      const text = (anchor.textContent || "").trim().slice(0, 80);

      const inHeader = anchor.closest("header");
      if (inHeader) {
        const inDropdown = anchor.closest(
          '[role="menu"], [data-radix-popper-content-wrapper], .dropdown-content'
        );
        if (inDropdown) {
          push("nav_category_click", { link_text: text, link_url: href });
          return;
        }
        const inNav = anchor.closest("nav");
        if (inNav) {
          push("nav_click", { link_text: text, link_url: href });
          return;
        }
      }

      if (anchor.closest('[aria-label="breadcrumb"], .breadcrumb, nav[aria-label*="Breadcrumb"]')) {
        push("breadcrumb_click", { link_text: text, link_url: href });
        return;
      }

      if (
        anchor.closest(
          '[data-trending], .trending-strip, .trending-section, [class*="trending"]'
        )
      ) {
        push("trending_article_click", { link_text: text, link_url: href });
        return;
      }

      if (
        anchor.closest(
          '[data-related], .related-articles, [class*="related"], [class*="recommended"], [class*="you-might"], [class*="YouMight"]'
        )
      ) {
        push("related_article_click", { link_text: text, link_url: href });
        return;
      }

      if (anchor.closest("footer")) {
        push("footer_link_click", { link_text: text, link_url: href });
        return;
      }
    };

    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, []);

  // ── Comment submit tracking ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const form = e.target as HTMLFormElement;

      // Search form
      const input = form.querySelector(
        'input[type="search"], input[name="q"], input[placeholder*="Search"]'
      ) as HTMLInputElement | null;
      if (input && input.value.trim()) {
        push("search_performed", {
          search_term: input.value.trim(),
        });
        return;
      }

      // Comment form
      const commentInput = form.querySelector(
        'textarea[name="comment"], textarea[placeholder*="comment" i], textarea[placeholder*="Comment" i], .comment-form textarea'
      ) as HTMLTextAreaElement | null;
      if (commentInput && commentInput.value.trim()) {
        push("comment_submit", {
          page_path: window.location.pathname,
          comment_length: commentInput.value.trim().length,
        });
      }
    };
    document.addEventListener("submit", handler, { capture: true });
    return () => document.removeEventListener("submit", handler, { capture: true });
  }, []);

  // ── Category page view ───────────────────────────────────────────────
  useEffect(() => {
    const categoryMatch = location.pathname.match(
      /^\/(news|business|life|voices|learn|create|policy)$/
    );
    if (categoryMatch) {
      push("category_page_view", {
        category: categoryMatch[1],
        page_path: location.pathname,
      });
    }
  }, [location.pathname]);
}
