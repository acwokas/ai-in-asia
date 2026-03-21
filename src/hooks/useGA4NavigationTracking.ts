import { useEffect } from "react";

const push = (event: string, params?: Record<string, any>) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
};

export function useGA4NavigationTracking() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a") as HTMLAnchorElement | null;

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

  useEffect(() => {
    const handler = (e: Event) => {
      const form = e.target as HTMLFormElement;
      const input = form.querySelector(
        'input[type="search"], input[name="q"], input[placeholder*="Search"]'
      ) as HTMLInputElement | null;
      if (input && input.value.trim()) {
        push("search_performed", {
          search_term: input.value.trim(),
        });
      }
    };
    document.addEventListener("submit", handler, { capture: true });
    return () => document.removeEventListener("submit", handler, { capture: true });
  }, []);
}
