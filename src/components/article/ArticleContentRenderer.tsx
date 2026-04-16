/**
 * Article Content Renderer
 * Handles rendering of article content from various formats (string/markdown/JSON)
 * Extracted from Article.tsx for maintainability
 */

import { useEffect, useRef, useState, useMemo, ReactNode } from "react";
import { createPortal } from "react-dom";
import DOMPurify from "dompurify";
import { useGlossaryAnnotation, annotateGlossaryHtml } from "./GlossaryTooltip";

import { fixEncoding } from "@/lib/textUtils";

/**
 * Extract FAQ content from inside editorial-view divs so it renders
 * on the standard page background instead of inside the styled box.
 */
const extractFaqFromEditorialView = (html: string): string => {
  // Match editorial-view divs that contain FAQ headings
  return html.replace(
    /(<div\s+class="editorial-view"[^>]*>)([\s\S]*?)<\/div>/gi,
    (fullMatch, openTag, innerContent) => {
      // Look for FAQ heading (h2-h6 containing "FAQ" or "Frequently Asked Questions")
      const faqHeadingPattern = /(<h[2-6][^>]*>(?:[^<]*(?:FAQ|Frequently\s+Asked\s+Questions)[^<]*)<\/h[2-6]>)/i;
      const faqIdx = innerContent.search(faqHeadingPattern);
      if (faqIdx === -1) return fullMatch; // no FAQ found, leave as-is

      // Split: everything before FAQ stays in editorial-view, FAQ onwards goes outside
      const beforeFaq = innerContent.substring(0, faqIdx);
      const faqAndAfter = innerContent.substring(faqIdx);

      // If there's content before FAQ, keep the editorial-view div for it
      const editorialPart = beforeFaq.trim()
        ? `${openTag}${beforeFaq}</div>`
        : '';

      return `${editorialPart}\n${faqAndAfter}`;
    }
  );
};

/**
 * Wrap "Closing Thoughts" headings and their following content in a styled callout box,
 * mirroring the editorial-view appearance (dark box, teal left border).
 */
const wrapClosingThoughts = (html: string): string => {
  // Match h2-h6 containing "Closing Thoughts" (case-insensitive)
  return html.replace(
    /(<h[2-6][^>]*>(?:[^<]*[Cc]losing\s+[Tt]houghts[^<]*)<\/h[2-6]>)([\s\S]*?)(?=<h[2-6]|<div\s+class="editorial-view"|<div\s+class="closing-thoughts"|$)/gi,
    (fullMatch, heading, content) => {
      // Replace the heading with a strong label inside the closing-thoughts div
      return `<div class="closing-thoughts"><strong>Closing Thoughts</strong>${content}</div>`;
    }
  );
};

/**
 * Wrap content that starts with "The AI in Asia View" into our standard
 * editorial-view container, replacing any inline styling the CMS may have added.
 */
const wrapEditorialViewParagraphs = (html: string): string => {
  // Skip if already using our editorial-view class
  if (html.includes('class="editorial-view"')) return html;

  // Pattern 1: A div with arbitrary classes wrapping a <strong> containing "THE AI IN ASIA VIEW"
  // Replace the wrapper div's classes with our editorial-view class
  html = html.replace(
    /<div\s+class="[^"]*"[^>]*>\s*<strong[^>]*>\s*(?:THE\s+AI\s+IN\s+ASIA\s+VIEW|The\s+AI\s+in\s+Asia\s+View)[:\s]*<\/strong>([\s\S]*?)<\/div>/gi,
    (_, content) => {
      return `<div class="editorial-view"><strong>The AI in Asia View</strong>${content}</div>`;
    }
  );

  // Pattern 2: Bare <strong>The AI in Asia View:</strong> text (not in a styled div)
  if (!html.includes('class="editorial-view"')) {
    html = html.replace(
      /(?:<p[^>]*>\s*)?<strong>\s*The AI in Asia View[:\s]*<\/strong>\s*([\s\S]*?)(?=<h[2-6]|<div\s|<blockquote|<section|$)/gi,
      (match) => {
        const content = match
          .replace(/^(?:<p[^>]*>\s*)?<strong>\s*The AI in Asia View[:\s]*<\/strong>\s*/i, '')
          .trim();
        return `<div class="editorial-view"><strong>The AI in Asia View</strong><p>${content}</p></div>`;
      }
    );
  }

  return html;
};

const IN_ARTICLE_AD_CLIENT = "ca-pub-4181437297386228";
const IN_ARTICLE_AD_SLOT = "3478913062";
const IN_ARTICLE_AD_SLOT_HORIZONTAL = "3478913062";
const MIN_PARAGRAPHS_FOR_IN_ARTICLE_ADS = 10;
const MIN_PARAGRAPHS_FOR_FIRST_AD = 3;
const FIRST_AD_AFTER_PARAGRAPH = 3;
const PARAGRAPH_AD_INTERVAL = 6;
const MID_ARTICLE_INSERT_AFTER_PARAGRAPH = 4;

interface ProseHtmlProps {
  html: string;
  className: string;
  injectInArticleAds?: boolean;
  midArticleNode?: ReactNode;
}

/**
 * Inject ad placeholder HTML into the content string after specific paragraphs.
 * This avoids DOM manipulation via useEffect which breaks on React re-renders.
 */
function injectAdMarkersIntoHtml(html: string, shouldInject: boolean): string {
  if (!shouldInject) return html;

  // Split on </p> to count and insert after specific paragraphs
  const parts = html.split('</p>');
  if (parts.length - 1 < MIN_PARAGRAPHS_FOR_FIRST_AD) return html; // not enough paragraphs

  const paragraphCount = parts.length - 1; // last part is after the final </p>
  const result: string[] = [];
  let pIndex = 0;
  let skipDepth = 0; // depth counter for containers where ads must never appear

  // Tags/classes that define "no-ad zones"
  const SKIP_OPEN_RE = /<(blockquote|table|thead|tbody|tfoot)[\s>]/gi;
  const SKIP_CLOSE_RE = /<\/(blockquote|table|thead|tbody|tfoot)>/gi;
  const SKIP_DIV_OPEN_RE = /<div[^>]*class="[^"]*\b(by-the-numbers|tldr-snapshot|article-pull-quote|ai-view-box|comparison-table|faq-styled-item|prompt-box|mid-article-portal)\b[^"]*"[^>]*>/gi;
  const DIV_CLOSE_RE = /<\/div>/gi;

  // Track div-based skip zones separately (they nest with generic divs)
  let insideSkipDiv = 0;

  for (let i = 0; i < parts.length; i++) {
    result.push(parts[i]);

    const segment = parts[i];

    // Track block-level skip elements (blockquote, table)
    const blockOpens = (segment.match(SKIP_OPEN_RE) || []).length;
    const blockCloses = (segment.match(SKIP_CLOSE_RE) || []).length;
    skipDepth += blockOpens - blockCloses;
    if (skipDepth < 0) skipDepth = 0;

    // Track div-based skip zones
    const divSkipOpens = (segment.match(SKIP_DIV_OPEN_RE) || []).length;
    const divCloses = insideSkipDiv > 0 ? (segment.match(DIV_CLOSE_RE) || []).length : 0;
    insideSkipDiv += divSkipOpens - divCloses;
    if (insideSkipDiv < 0) insideSkipDiv = 0;

    // Reset lastIndex on all regex (they use /g flag)
    SKIP_OPEN_RE.lastIndex = 0;
    SKIP_CLOSE_RE.lastIndex = 0;
    SKIP_DIV_OPEN_RE.lastIndex = 0;
    DIV_CLOSE_RE.lastIndex = 0;

    // Only add </p> back if this isn't the last segment
    if (i < parts.length - 1) {
      result.push('</p>');
      pIndex++;

      // Never inject ads inside protected containers
      if (skipDepth > 0 || insideSkipDiv > 0) continue;

      // First ad placement after FIRST_AD_AFTER_PARAGRAPH
      if (pIndex === FIRST_AD_AFTER_PARAGRAPH) {
        result.push(buildAdPlaceholderHtml('horizontal', IN_ARTICLE_AD_SLOT_HORIZONTAL));
        continue;
      }

      // Recurring ads every PARAGRAPH_AD_INTERVAL paragraphs after the first ad
      if (paragraphCount >= MIN_PARAGRAPHS_FOR_IN_ARTICLE_ADS &&
          pIndex > FIRST_AD_AFTER_PARAGRAPH &&
          (pIndex - FIRST_AD_AFTER_PARAGRAPH) % PARAGRAPH_AD_INTERVAL === 0) {
        result.push(buildAdPlaceholderHtml('rectangle', IN_ARTICLE_AD_SLOT));
      }
    }
  }

  return result.join('');
}

function buildAdPlaceholderHtml(format: 'horizontal' | 'rectangle', slot: string): string {
  const label = '<p class="text-[10px] text-center mb-1 uppercase tracking-wider" style="color: hsl(var(--muted-foreground)); opacity: 0.5;">Advertisement</p>';

  if (import.meta.env.PROD) {
    const minHeight = format === 'horizontal' ? '90px' : '250px';
    return `<div class="in-article-ad-wrapper my-6 text-center" data-ad-slot="${slot}" data-ad-format="${format}">
      ${label}
      <ins class="adsbygoogle" data-ad-client="${IN_ARTICLE_AD_CLIENT}" data-ad-slot="${slot}" data-ad-format="${format}" data-full-width-responsive="true" style="display:block;max-width:100%;overflow:hidden;text-align:center;margin:0 auto;min-height:${minHeight};"></ins>
    </div>`;
  }

  const minHeight = format === 'horizontal' ? '90px' : '250px';
  return `<div class="in-article-ad-wrapper my-6 text-center">
    ${label}
    <div style="min-height:${minHeight};display:flex;align-items:center;justify-content:center;font-size:12px;border:1px dashed hsl(var(--border));border-radius:8px;color:hsl(var(--muted-foreground));">${format === 'horizontal' ? 'Horizontal' : 'Rectangle'} Ad: ${slot}</div>
  </div>`;
}

const ProseHtml = ({ html, className, injectInArticleAds = false, midArticleNode }: ProseHtmlProps) => {
  const proseRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  // Inject ad markers and glossary annotations into the HTML string BEFORE rendering
  const withAds = injectAdMarkersIntoHtml(html, injectInArticleAds);
  const glossaryResult = useMemo(() => annotateGlossaryHtml(withAds), [withAds]);
  const processedHtml = glossaryResult.html;

  // Inject mid-article related content after the Nth paragraph
  useEffect(() => {
    if (!midArticleNode || !proseRef.current) {
      setPortalContainer(null);
      return;
    }

    const proseElement = proseRef.current;
    // Remove previous container
    proseElement.querySelector(".mid-article-portal")?.remove();

    const paragraphs = Array.from(proseElement.querySelectorAll(":scope > p, :scope > div > p"));
    if (paragraphs.length < MID_ARTICLE_INSERT_AFTER_PARAGRAPH + 1) {
      setPortalContainer(null);
      return;
    }

    const target = paragraphs[MID_ARTICLE_INSERT_AFTER_PARAGRAPH - 1]; // 0-indexed
    const container = document.createElement("div");
    container.className = "mid-article-portal";
    target.parentNode?.insertBefore(container, target.nextSibling);
    setPortalContainer(container);

    return () => {
      container.remove();
      setPortalContainer(null);
    };
  }, [html, !!midArticleNode]);

  // Activate AdSense on injected ad slots (production only)
  useEffect(() => {
    if (!import.meta.env.PROD || !injectInArticleAds || !proseRef.current) return;

    const pushAds = () => {
      const adSlots = proseRef.current?.querySelectorAll('.in-article-ad-wrapper ins.adsbygoogle');
      adSlots?.forEach((ins) => {
        if (ins.getAttribute('data-adsbygoogle-status')) return;
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        } catch (err) {
          console.error("AdSense push error:", err);
        }
      });
    };

    // Try immediately, then retry after AdSense script may have loaded (post-consent)
    const t1 = setTimeout(pushAds, 100);
    const t2 = setTimeout(pushAds, 2000);
    const t3 = setTimeout(pushAds, 5000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [processedHtml, injectInArticleAds]);

  // FAQ visual styling via DOM manipulation
  useEffect(() => {
    if (!proseRef.current) return;
    const prose = proseRef.current;

    // Clean up previous FAQ styling
    const cleanup = () => {
      prose.querySelectorAll(".faq-styled-item").forEach((node) => node.remove());
      // Restore hidden originals
      prose.querySelectorAll("[data-faq-hidden]").forEach((el) => {
        (el as HTMLElement).style.display = "";
        el.removeAttribute("data-faq-hidden");
      });
    };
    cleanup();

    // Find h2 containing "Frequently Asked Questions"
    const headings = Array.from(prose.querySelectorAll("h2, h3"));
    const faqHeading = headings.find((h) =>
      /frequently\s+asked\s+questions/i.test(h.textContent || "")
    );
    if (!faqHeading) return cleanup;

    // Collect h4+p pairs after the FAQ heading
    const pairs: { q: Element; a: Element }[] = [];
    let sibling = faqHeading.nextElementSibling;
    while (sibling) {
      const tag = sibling.tagName;
      // Stop if we hit another h2/h3 (new section)
      if (tag === "H2" || tag === "H3") break;
      if (tag === "H4") {
        const answer = sibling.nextElementSibling;
        if (answer && answer.tagName === "P") {
          pairs.push({ q: sibling, a: answer });
          sibling = answer.nextElementSibling;
          continue;
        }
      }
      sibling = sibling.nextElementSibling;
    }

    if (pairs.length === 0) return cleanup;

    pairs.forEach(({ q, a }, i) => {
      // Hide originals
      (q as HTMLElement).style.display = "none";
      q.setAttribute("data-faq-hidden", "true");
      (a as HTMLElement).style.display = "none";
      a.setAttribute("data-faq-hidden", "true");

      const item = document.createElement("div");
      item.className = "faq-styled-item";
      item.style.cssText = `
        display: flex;
        gap: 1rem;
        padding: 1.25rem 0;
        ${i < pairs.length - 1 ? "border-bottom: 1px solid rgba(255,255,255,0.1);" : ""}
      `;

      const numEl = document.createElement("span");
      numEl.textContent = String(i + 1).padStart(2, "0");
      numEl.style.cssText = `
        font-size: 2rem;
        font-weight: 700;
        line-height: 1;
        color: rgb(82, 205, 224);
        flex-shrink: 0;
        min-width: 2.5rem;
      `;

      const textCol = document.createElement("div");
      textCol.style.cssText = "flex: 1; min-width: 0;";

      const qEl = document.createElement("h4");
      qEl.textContent = q.textContent || "";
      qEl.style.cssText = `
        font-weight: 700;
        font-size: 1.1rem;
        color: hsl(var(--foreground));
        margin: 0 0 0.5rem 0;
      `;

      const aEl = document.createElement("p");
      aEl.innerHTML = (a as HTMLElement).innerHTML;
      aEl.style.cssText = `
        color: hsl(var(--muted-foreground));
        margin: 0;
        line-height: 1.7;
      `;

      textCol.append(qEl, aEl);
      item.append(numEl, textCol);

      // Insert styled item after the last original element of this pair
      a.parentNode?.insertBefore(item, a.nextSibling);
    });

    // Add mobile responsive styles
    const styleId = "faq-responsive-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @media (max-width: 640px) {
          .faq-styled-item {
            flex-direction: column !important;
            gap: 0.25rem !important;
          }
          .faq-styled-item > span:first-child {
            font-size: 1.25rem !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    return cleanup;
  }, [html]);

  const { tooltipNode, bannerNode } = useGlossaryAnnotation(proseRef, processedHtml, glossaryResult.termCount);

  return (
    <>
      {bannerNode}
      <div ref={proseRef} className={className} dangerouslySetInnerHTML={{ __html: processedHtml }} />
      {portalContainer && midArticleNode && createPortal(midArticleNode, portalContainer)}
      {tooltipNode}
    </>
  );
};

/** Strip leading/trailing quotation marks from blockquote text (they're redundant inside <blockquote>) */
const stripWrappingQuotes = (text: string): string =>
  text.replace(/^[\u201c\u201d\u201e\u201f\u2018\u2019"'""'']+|[\u201c\u201d\u201e\u201f\u2018\u2019"'""'']+$/g, '').trim();

/** Generate a URL-safe heading ID from text */
export const generateHeadingId = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/^\d+\.\s*/, '') // strip leading "1. "
    .replace(/[^\w\s-]/g, '') // strip special chars, emojis, punctuation
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Remove em dashes (—) from article HTML, except inside <blockquote> elements
 * where they are used for attribution. Replaces with comma-space or colon as appropriate.
 */
const stripEmDashes = (html: string): string => {
  // Split HTML by blockquote boundaries to preserve em dashes in quotes
  const parts = html.split(/(<blockquote[\s\S]*?<\/blockquote>)/gi);
  return parts.map((part, i) => {
    // Odd indices are blockquote content — leave untouched
    if (i % 2 === 1) return part;
    // Replace em dashes and en dashes with comma or period context
    return part
      .replace(/\s*[—–]\s*/g, '; ');
  }).join('');
};

/**
 * Strip external-link attributes (target="_blank", rel, external icon SVG, inline-flex class)
 * from links pointing to internal paths (relative URLs or aiinasia.com).
 * This ensures internal links behave as same-tab inline links even if the LLM
 * mistakenly formatted them as external.
 */
const cleanInternalLinks = (html: string): string => {
  // Match <a ...> tags whose href starts with "/" or points to aiinasia.com
  return html.replace(
    /<a\s+([^>]*?)href="(\/[^"]*|https?:\/\/(www\.)?aiinasia\.com[^"]*)"([^>]*?)>([\s\S]*?)<\/a>/gi,
    (_match, before, href, _www, after, inner) => {
      // Combine all attributes (before + after href)
      let attrs = (before + after)
        .replace(/\s*target="_blank"\s*/g, ' ')
        .replace(/\s*rel="noopener noreferrer"\s*/g, ' ')
        .replace(/inline-flex\s*/g, '')
        .replace(/items-center\s*/g, '')
        .replace(/gap-1\s*/g, '')
        .trim();
      // Strip SVG icon from inner content
      const cleanInner = inner.replace(/<svg[\s\S]*?<\/svg>/gi, '').trim();
      return `<a ${attrs}href="${href}">${cleanInner}</a>`;
    }
  );
};

// Process inline formatting for text content
const processInlineFormatting = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  return text
    .replace(/<a[^>]*>\s*Tweet\s*<\/a>/gi, '')
    .replace(/\[Tweet\]\([^)]*\)/gi, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/(?!aiinasia\.com)[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline">$1</a>')
    .replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, '<em>$1</em>');
};

// Normalize YouTube embeds
const normalizeYouTubeEmbeds = (html: string): string => {
  html = html.replace(
    /src="https?:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/[^"?]+\?[^\"]*\blist=([^"&]+)[^\"]*"/gi,
    'src="https://www.youtube.com/embed?listType=playlist&list=$1"'
  );

  html = html
    .replace(
      /<div([^>]*\bclass="[^"]*\byoutube-embed\b[^"]*"[^>]*)\sstyle="[^"]*"([^>]*)>/gi,
      '<div$1$2>'
    )
    .replace(
      /<iframe([^>]*\bsrc="[^"]*(?:youtube\.com|youtube-nocookie\.com)\/embed[^"]*"[^>]*)\sstyle="[^"]*"([^>]*)>/gi,
      '<iframe$1$2>'
    );

  return html;
};

interface RenderContentProps {
  content: any;
}

export const renderArticleContent = (content: any, midArticleNode?: ReactNode): React.ReactNode => {
  if (!content) return null;

  // Handle string content (markdown or raw HTML from the editor)
  if (typeof content === 'string') {
    // Fix encoding artifacts before any processing
    let fixedContent = fixEncoding(content);
    const hasPromptBoxes = fixedContent.includes('prompt-box');

    // Consolidate consecutive bullet points
    let consolidated = normalizeYouTubeEmbeds(fixedContent).replace(/(- [^\n]+)\n\n(?=- )/g, '$1\n');

    // Normalize <hr> separators
    consolidated = consolidated.replace(/<hr\s*\/?>/gi, "\n\n<hr />\n\n");
    
    // Consolidate numbered lists
    consolidated = consolidated.replace(/(\d+\.\s[^\n]+)\n\n(?=\d+\.\s)/g, '$1\n');
    
    // Clean up div wrappers (only when no prompt boxes)
    if (!hasPromptBoxes) {
      consolidated = consolidated
        .replace(/<div>\s*<\/div>/g, '\n\n')
        .replace(/<\/div>\s*<div>/g, '\n\n')
        .replace(/<\/?div>/g, '');
    }

    consolidated = consolidated
      .replace(/<a[^>]*>\s*Tweet\s*<\/a>/gi, '')
      .replace(/\[Tweet\]\([^)]*\)/gi, '')
      .replace(/^\s*Tweet\s*$/gm, '')
      // Convert markdown images — match URLs with image extensions as images, everything else as links
      .replace(/!\[([^\]]*)\]\(([^)]+\.(?:png|jpg|jpeg|gif|webp|svg|avif)(?:\?[^)]*)?)\)/gi, '<div class="my-8"><img src="$2" alt="$1" class="w-full rounded-lg" loading="lazy" /></div>')
      // Strip stray ! before markdown links that aren't images (prevents ![text](non-image-url) rendering as !link)
      .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '[$1]($2)')
      .replace(/\*\*([^\*]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, '<em>$1</em>')
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]*subscribe[^\]]*)\]\((https?:\/\/)?(www\.)?aiinasia\.com[^\)]*\)/gi, '[Subscribe to our newsletter](/newsletter)')
      .replace(/\[([^\]]+)\]\((https?:\/\/)?(www\.)?aiinasia\.com\/connect\/?[^\)]*\)/gi, '[$1](/contact)')
      // Strip ^ suffix from internal links (relative paths and aiinasia.com) BEFORE external icon processing
      .replace(/\[([^\]]+)\]\((\/[^)]+)\)\^/g, '[$1]($2)')
      .replace(/\[([^\]]+)\]\((https?:\/\/(www\.)?aiinasia\.com[^)]*)\)\^/g, '[$1]($2)')
      .replace(/\[([^\]]+)\]\(([^)]+)\)\^/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline inline-flex items-center gap-1">$1<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline ml-0.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" x2="21" y1="14" y2="3"></line></svg></a>')
      .replace(/\[([^\]]+)\]\((https?:\/\/(?!aiinasia\.com)[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:no-underline">$1</a>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:no-underline">$1</a>');

    // Strip wrapping quotes from HTML <blockquote> content (editor-generated)
    consolidated = consolidated.replace(
      /(<blockquote[^>]*>)\s*<p[^>]*>([\s\S]*?)<\/p>\s*(<\/blockquote>)/gi,
      (_, open, inner, close) => `${open}<p>${stripWrappingQuotes(inner)}</p>${close}`
    );

    // Pre-process: ensure blockquotes have blank lines around them so they split into their own blocks
    consolidated = consolidated.replace(/([^\n])\n(> )/g, '$1\n\n$2');
    consolidated = consolidated.replace(/(^> .+$)\n([^>\n])/gm, '$1\n\n$2');

    // Unwrap <p> tags that contain markdown patterns so block detection works
    consolidated = consolidated
      .replace(/<p[^>]*>\s*(#{1,3}\s+)/gi, '$1')
      .replace(/<p[^>]*>\s*(- )/gi, '$1')
      .replace(/<p[^>]*>\s*(\d+\.\s)/gi, '$1')
      .replace(/<p[^>]*>\s*(> )/gi, '$1')
      .replace(/(#{1,3}\s+[^<]*)<\/p>/gi, '$1')
      .replace(/(- [^<]*)<\/p>/gi, '$1')
      .replace(/(\d+\.\s[^<]*)<\/p>/gi, '$1')
      .replace(/(> [^<]*)<\/p>/gi, '$1');

    // Ensure markdown headings start and end their own block so lists beneath them parse correctly
    consolidated = consolidated
      .replace(/(^|\n)(#{1,3}\s+)/g, (match, prefix, hashes) => {
        const safePrefix = prefix || '';
        return `${safePrefix}\n\n${hashes}`;
      })
      .replace(/^(#{1,3}\s[^\n]+)\n(?!\n)/gm, '$1\n\n');
    
    // Handle content with prompt boxes
    if (consolidated.includes('prompt-box')) {
      const promptBoxRegex = /<div\s+class="prompt-box"[^>]*>[\s\S]*?<div\s+class="prompt-box-content"[^>]*>[\s\S]*?<\/div>(?:\s*<br\s*\/?>)*\s*<\/div>/gi;
      const promptBoxes: string[] = [];
      let contentWithPlaceholders = consolidated.replace(promptBoxRegex, (match) => {
        const index = promptBoxes.length;
        promptBoxes.push(match);
        return `\n\n__PROMPT_BOX_${index}__\n\n`;
      });
      
      const blocks = contentWithPlaceholders.split('\n\n').map(block => block.trim()).filter(block => block.length > 0);
      
      const htmlBlocks = blocks.map(block => {
        const placeholderMatch = block.match(/^__PROMPT_BOX_(\d+)__$/);
        if (placeholderMatch) {
          const index = parseInt(placeholderMatch[1], 10);
          return promptBoxes[index];
        }
        
        if (block.includes('twitter-tweet') || 
            block.includes('instagram-media') || 
            block.includes('tiktok-embed') ||
            block.includes('youtube.com/embed')) {
          return block;
        }
        
      if (block.startsWith('#### ')) {
          const text = block.substring(5);
          const id = generateHeadingId(text);
          return `<h4 id="${id}" class="text-xl font-semibold mt-6 mb-3">${text}</h4>`;
        }
        if (block.startsWith('### ')) {
          const text = block.substring(4);
          const id = generateHeadingId(text);
          return `<h4 id="${id}" class="text-xl font-semibold mt-6 mb-3">${text}</h4>`;
        }
        if (block.startsWith('## ')) {
          const text = block.substring(3);
          const id = generateHeadingId(text);
          return `<h3 id="${id}" class="text-2xl font-semibold mt-8 mb-4">${text}</h3>`;
        }
        if (block.startsWith('# ')) {
          const text = block.substring(2);
          const id = generateHeadingId(text);
          return `<h2 id="${id}" class="text-3xl font-bold mt-12 mb-6 text-foreground">${text}</h2>`;
        }
        if (block.startsWith('> ') && !block.includes('twitter-tweet')) {
          const quoteLines = block.split('\n')
            .map(line => line.replace(/^>\s?/, '').trim())
            .filter(line => line.length > 0);
          let quoteText = '';
          let attribution = '';
          if (quoteLines.length > 1 && /^[-—–]/.test(quoteLines[quoteLines.length - 1])) {
            attribution = quoteLines.pop()!.replace(/^[-—–]\s*/, '').trim();
            quoteText = stripWrappingQuotes(quoteLines.join(' '));
          } else {
            quoteText = stripWrappingQuotes(quoteLines.join(' '));
          }
          return `<blockquote class="article-pull-quote">
            <p>${quoteText}</p>
            ${attribution ? `<footer>${attribution}</footer>` : ''}
          </blockquote>`;
        }
        if (block.includes('\n- ') || block.startsWith('- ')) {
          const items = block.split('\n')
            .filter(line => line.trim().startsWith('- '))
            .map(line => `<li class="leading-relaxed mb-2">${line.trim().substring(2)}</li>`)
            .join('');
          return `<ul class="pl-6 my-6 space-y-1">${items}</ul>`;
        }
        if (/^\d+\.\s/.test(block) || /\n\d+\.\s/.test(block)) {
          const items = block.split('\n')
            .filter(line => /^\d+\.\s/.test(line.trim()))
            .map(line => {
              const content = line.trim().replace(/^\d+\.\s/, '');
              return `<li>${content}</li>`;
            })
            .join('');
          return `<ol>${items}</ol>`;
        }
        if (/^<(div|blockquote|figure|iframe|table|ul|ol|hr|h[1-6]|section|img|pre)\b/i.test(block)) {
          return block;
        }
        return `<p class="leading-relaxed mb-6">${block.replace(/\n/g, ' ')}</p>`;
      });
      
      let sanitizedHtml = DOMPurify.sanitize(htmlBlocks.join('\n\n'), {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'footer', 'code', 'pre', 'div', 'span', 'iframe', 'img', 'figure', 'figcaption', 'button', 'svg', 'path', 'section', 'time', 'hr', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col'],
        ALLOWED_ATTR: ['id', 'href', 'target', 'rel', 'class', 'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style', 'alt', 'title', 'loading', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'data-prompt-title', 'data-prompt-content', 'type', 'lang', 'dir', 'data-instgrm-captioned', 'data-instgrm-permalink', 'data-instgrm-version', 'cite', 'data-video-id', 'datetime', 'onclick']
      });

      sanitizedHtml = sanitizedHtml.replace(
        /(<h[34][^>]*>[^<]*[Bb]y [Tt]he [Nn]umbers[^<]*<\/h[34]>\s*)(<ul[\s\S]*?<\/ul>)/g,
        '<div class="by-the-numbers">$1$2</div>'
      );

      // Merge consecutive blockquotes where the second is an attribution (starts with — or ")
      sanitizedHtml = sanitizedHtml.replace(
        /<\/blockquote>\s*<blockquote[^>]*>\s*<p[^>]*>\s*(["\u201c]?\s*[-—–][\s\S]*?)\s*<\/p>\s*<\/blockquote>/gi,
        (_, attr) => {
          const cleanAttr = attr.replace(/^["\u201c]\s*/, '').replace(/["\u201d]\s*$/, '').replace(/^[-—–]\s*/, '').trim();
          return `<footer>${cleanAttr}</footer></blockquote>`;
        }
      );

      // Split single-paragraph blockquotes that contain an inline attribution after — / – / -
      // e.g. <blockquote><p>"Quote text" — Author Name</p></blockquote>
      sanitizedHtml = sanitizedHtml.replace(
        /(<blockquote[^>]*>)\s*<p[^>]*>([\s\S]*?)\s+[—–]\s+([\s\S]*?)<\/p>\s*(<\/blockquote>)/gi,
        (_, open, quoteText, attribution, close) => {
          const cleanQuote = stripWrappingQuotes(quoteText.trim());
          const cleanAttr = attribution.replace(/["\u201d]\s*$/, '').trim();
          return `${open}<p>${cleanQuote}</p><footer>${cleanAttr}</footer>${close}`;
        }
      );

      // Normalize "AIinASIA" → "AI in Asia" in editorial-view headings
      sanitizedHtml = sanitizedHtml.replace(/THE\s+AIINASIA\s+VIEW/gi, 'The AI in Asia View');

      // Wrap inline "The AI in Asia View:" paragraphs in editorial-view div if not already wrapped
      sanitizedHtml = wrapEditorialViewParagraphs(sanitizedHtml);

      // Extract FAQ from editorial-view boxes
      sanitizedHtml = extractFaqFromEditorialView(sanitizedHtml);

      // Wrap Closing Thoughts in styled callout
      sanitizedHtml = wrapClosingThoughts(sanitizedHtml);

      // Strip em dashes (except inside blockquotes)
      sanitizedHtml = stripEmDashes(sanitizedHtml);

      // Clean internal links that were incorrectly marked as external
      sanitizedHtml = cleanInternalLinks(sanitizedHtml);

      return <ProseHtml className="prose" html={sanitizedHtml} injectInArticleAds={true} midArticleNode={midArticleNode} />;
    }
    
    // Standard content processing (no prompt boxes)
    const blocks = consolidated.split('\n\n').map(block => block.trim()).filter(block => block.length > 0);


    const htmlBlocks = blocks.map((block, index) => {
      if (block.includes('twitter-tweet') || 
          block.includes('instagram-media') || 
          block.includes('tiktok-embed') ||
          block.includes('youtube.com/embed')) {
        return block;
      }
      if (block.startsWith('#### ')) {
        const text = block.substring(5);
        const id = generateHeadingId(text);
        return `<h4 id="${id}" class="text-xl font-semibold mt-6 mb-3">${text}</h4>`;
      }
      if (block.startsWith('### ')) {
        const text = block.substring(4);
        const id = generateHeadingId(text);
        return `<h4 id="${id}" class="text-xl font-semibold mt-6 mb-3">${text}</h4>`;
      }
      if (block.startsWith('## ')) {
        const text = block.substring(3);
        const id = generateHeadingId(text);
        return `<h3 id="${id}" class="text-2xl font-semibold mt-8 mb-4">${text}</h3>`;
      }
      if (block.startsWith('# ')) {
        const text = block.substring(2);
        const id = generateHeadingId(text);
        return `<h2 id="${id}" class="text-3xl font-bold mt-12 mb-6 text-foreground">${text}</h2>`;
      }
      if (block.startsWith('> ') && !block.includes('twitter-tweet')) {
        const quoteLines = block.split('\n')
          .map(line => line.replace(/^>\s?/, '').trim())
          .filter(line => line.length > 0);
        let quoteText = '';
        let attribution = '';
        if (quoteLines.length > 1 && /^[-—–]/.test(quoteLines[quoteLines.length - 1])) {
          attribution = quoteLines.pop()!.replace(/^[-—–]\s*/, '').trim();
          quoteText = stripWrappingQuotes(quoteLines.join(' '));
        } else {
          quoteText = stripWrappingQuotes(quoteLines.join(' '));
        }
        return `<blockquote class="article-pull-quote">
          <p>${quoteText}</p>
          ${attribution ? `<footer>${attribution}</footer>` : ''}
        </blockquote>`;
      }
      if (block.includes('\n- ') || block.startsWith('- ')) {
        const items = block.split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => `<li class="leading-relaxed mb-2">${line.trim().substring(2)}</li>`)
          .join('');
        return `<ul class="pl-6 my-6 space-y-1">${items}</ul>`;
      }
      if (/^\d+\.\s/.test(block) || /\n\d+\.\s/.test(block)) {
        const items = block.split('\n')
          .filter(line => /^\d+\.\s/.test(line.trim()))
          .map(line => {
            const content = line.trim().replace(/^\d+\.\s/, '');
            return `<li>${content}</li>`;
          })
          .join('');
        return `<ol>${items}</ol>`;
      }
      if (/^<(div|blockquote|figure|iframe|table|ul|ol|hr|h[1-6]|section|img|pre)\b/i.test(block)) {
        return block;
      }
      return `<p class="leading-relaxed mb-6">${block.replace(/\n/g, ' ')}</p>`;
    });
    
    // Join, sanitize, and post-process as a single string for cross-block patterns
    let joinedHtml = DOMPurify.sanitize(htmlBlocks.join('\n'), {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'footer', 'code', 'pre', 'div', 'span', 'iframe', 'img', 'figure', 'figcaption', 'button', 'svg', 'path', 'section', 'time', 'hr', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col'],
      ALLOWED_ATTR: ['id', 'href', 'target', 'rel', 'class', 'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'style', 'alt', 'title', 'loading', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'cite', 'data-video-id', 'datetime']
    });

    joinedHtml = joinedHtml.replace(
      /(<h[34][^>]*>[^<]*[Bb]y [Tt]he [Nn]umbers[^<]*<\/h[34]>\s*)(<ul[\s\S]*?<\/ul>)/g,
      '<div class="by-the-numbers">$1$2</div>'
    );

    // Merge consecutive blockquotes where the second is an attribution (starts with — or ")
    joinedHtml = joinedHtml.replace(
      /<\/blockquote>\s*<blockquote[^>]*>\s*<p[^>]*>\s*(["\u201c]?\s*[-—–][\s\S]*?)\s*<\/p>\s*<\/blockquote>/gi,
      (_, attr) => {
        const cleanAttr = attr.replace(/^["\u201c]\s*/, '').replace(/["\u201d]\s*$/, '').replace(/^[-—–]\s*/, '').trim();
        return `<footer>${cleanAttr}</footer></blockquote>`;
      }
    );

    // Split single-paragraph blockquotes that contain an inline attribution after — / – / -
    joinedHtml = joinedHtml.replace(
      /(<blockquote[^>]*>)\s*<p[^>]*>([\s\S]*?)\s+[—–]\s+([\s\S]*?)<\/p>\s*(<\/blockquote>)/gi,
      (_, open, quoteText, attribution, close) => {
        const cleanQuote = stripWrappingQuotes(quoteText.trim());
        const cleanAttr = attribution.replace(/["\u201d]\s*$/, '').trim();
        return `${open}<p>${cleanQuote}</p><footer>${cleanAttr}</footer>${close}`;
      }
    );

    // Normalize "AIinASIA" → "AI in Asia" in editorial-view headings
    joinedHtml = joinedHtml.replace(/THE\s+AIINASIA\s+VIEW/gi, 'The AI in Asia View');

    // Wrap inline "The AI in Asia View:" paragraphs in editorial-view div if not already wrapped
    joinedHtml = wrapEditorialViewParagraphs(joinedHtml);

    // Extract FAQ from editorial-view boxes
    joinedHtml = extractFaqFromEditorialView(joinedHtml);

    // Wrap Closing Thoughts in styled callout
    joinedHtml = wrapClosingThoughts(joinedHtml);

    // Strip em dashes (except inside blockquotes)
    joinedHtml = stripEmDashes(joinedHtml);

    // Clean internal links that were incorrectly marked as external
    joinedHtml = cleanInternalLinks(joinedHtml);

    return <ProseHtml className="prose prose-lg max-w-none" html={joinedHtml} injectInArticleAds={true} midArticleNode={midArticleNode} />;
  }
  
  // Handle JSON content (legacy format)
  try {
    const blocks = typeof content === 'string' ? JSON.parse(content) : content;
    
    return blocks.map((block: any, index: number) => {
      if (block.type === 'heading' && block.content && 
          (block.content.toLowerCase().includes('tl;dr') || block.content.toLowerCase().includes('tldr'))) {
        return null;
      }
      
      switch (block.type) {
        case 'paragraph':
          const contentText = fixEncoding(block.content || '');
          const sanitizedContent = DOMPurify.sanitize(processInlineFormatting(contentText), {
            ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'a', 'br', 'span'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
          });

          const isLikelyImageCaption = contentText.length < 100 && (
            contentText.toLowerCase().includes('image:') ||
            contentText.toLowerCase().includes('source:') ||
            contentText.toLowerCase().includes('credit:') ||
            contentText.toLowerCase().includes('photo:')
          );

          return (
            <p 
              key={index} 
              className={`leading-relaxed mb-6 ${isLikelyImageCaption ? 'text-sm text-muted-foreground text-center -mt-4' : ''}`}
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          );
          
        case 'heading':
          const level = block.attrs?.level || 2;
          const shiftedLevel = Math.min(level + 1, 6);
          const HeadingTag = `h${shiftedLevel}` as keyof JSX.IntrinsicElements;
          const headingClasses = shiftedLevel === 2 ? "text-3xl font-bold mt-12 mb-6 text-foreground" :
                               shiftedLevel === 3 ? "text-2xl font-semibold mt-8 mb-4" :
                               "text-xl font-semibold mt-6 mb-3";
          const headingId = generateHeadingId(block.content || '');
          return (
            <HeadingTag key={index} id={headingId} className={headingClasses}>
              {block.content}
            </HeadingTag>
          );
          
        case 'quote':
          return (
            <blockquote key={index} className="article-pull-quote">
              <p>{stripWrappingQuotes(block.content || '')}</p>
            </blockquote>
          );
          
        case 'list':
          const listItems = Array.isArray(block.content) ? block.content : [block.content];
          const isOrdered = block.attrs?.listType === 'ordered';
          const ListTag = isOrdered ? 'ol' : 'ul';
          
          return (
            <ListTag 
              key={index} 
              className={isOrdered ? "list-none pl-10 my-6 space-y-2" : "list-disc pl-8 my-6 space-y-2"}
              style={isOrdered ? { counterReset: 'list-counter' } : undefined}
            >
              {listItems.map((item: string, i: number) => {
                const sanitizedItem = DOMPurify.sanitize(processInlineFormatting(item), {
                  ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'a', 'br', 'span'],
                  ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
                });
                return (
                  <li 
                    key={i}
                    className={isOrdered ? "relative pl-2" : ""}
                    style={isOrdered ? { counterIncrement: 'list-counter' } : undefined}
                    dangerouslySetInnerHTML={{ __html: sanitizedItem }}
                  />
                );
              })}
            </ListTag>
          );
        
        case 'image':
          return (
            <div key={index} className="my-8">
              <img 
                src={block.attrs?.src || block.url} 
                alt={block.attrs?.alt || block.alt || ''} 
                className="w-full rounded-lg"
                loading="lazy"
              />
              {(block.attrs?.caption || block.caption) && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  {block.attrs?.caption || block.caption}
                </p>
              )}
            </div>
          );
          
        default:
          return null;
      }
    }).filter(Boolean);
  } catch (error) {
    return <p className="leading-relaxed mb-6">{content}</p>;
  }
};

export default renderArticleContent;
