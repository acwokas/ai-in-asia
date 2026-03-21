import { useEffect } from "react";
import { trackEvent } from "@/components/GoogleAnalytics";

/**
 * Global GA4 navigation / interaction tracking via a single delegated click listener.
 * Detects nav links, category dropdowns, breadcrumbs, related articles,
 * trending articles, footer links, share buttons, and search submissions.
 */
export function useGA4NavigationTracking() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a") as HTMLAnchorElement | null;

      // ── Social share buttons ──
      const shareBtn = target.closest(
        '[data-share], .share-btn, [aria-label*="share" i], [aria-label*="Share" i]'
      );
      if (shareBtn) {
        const platform =
          shareBtn.getAttribute("data-share") ||
          shareBtn.getAttribute("aria-label") ||
          "unknown";
        trackEvent("social_share_click", {
          platform: platform.toLowerCase().replace(/share (on|to|via) /i, ""),
          page_path: window.location.pathname,
        });
        return;
      }

      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      const text = (anchor.textContent || "").trim().slice(0, 80);

      // ── Header nav links ──
      const inHeader = anchor.closest("header");
      if (inHeader) {
        // Category dropdown items (inside a dropdown/popover within header)
        const inDropdown = anchor.closest(
          '[role="menu"], [data-radix-popper-content-wrapper], .dropdown-content'
        );
        if (inDropdown) {
          trackEvent("nav_category_click", { link_text: text, link_url: href });
          return;
        }
        // Regular nav links
        const inNav = anchor.closest("nav");
        if (inNav) {
          trackEvent("nav_click", { link_text: text, link_url: href });
          return;
        }
      }

      // ── Breadcrumb links ──
      if (anchor.closest('[aria-label="breadcrumb"], .breadcrumb, nav[aria-label*="Breadcrumb"]')) {
        trackEvent("breadcrumb_click", { link_text: text, link_url: href });
        return;
      }

      // ── Trending section links ──
      if (
        anchor.closest(
          '[data-trending], .trending-strip, .trending-section, [class*="trending"]'
        )
      ) {
        trackEvent("trending_article_click", { link_text: text, link_url: href });
        return;
      }

      // ── Related / recommended article links ──
      if (
        anchor.closest(
          '[data-related], .related-articles, [class*="related"], [class*="recommended"], [class*="you-might"], [class*="YouMight"]'
        )
      ) {
        trackEvent("related_article_click", { link_text: text, link_url: href });
        return;
      }

      // ── Footer links ──
      if (anchor.closest("footer")) {
        trackEvent("footer_link_click", { link_text: text, link_url: href });
        return;
      }
    };

    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, []);

  // ── Search performed (intercept form submissions + overlay searches) ──
  useEffect(() => {
    const handler = (e: Event) => {
      const form = e.target as HTMLFormElement;
      const input = form.querySelector(
        'input[type="search"], input[name="q"], input[placeholder*="Search"]'
      ) as HTMLInputElement | null;
      if (input && input.value.trim()) {
        trackEvent("search_performed", {
          search_term: input.value.trim(),
        });
      }
    };
    document.addEventListener("submit", handler, { capture: true });
    return () => document.removeEventListener("submit", handler, { capture: true });
  }, []);
}
