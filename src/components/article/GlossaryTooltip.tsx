/**
 * AI Glossary Tooltip System
 * Processes article HTML to wrap known AI/tech terms with styled spans.
 * Hover (desktop) or tap (mobile) shows a tooltip with definition + "AI term" badge.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { JARGON_DICTIONARY, type JargonEntry } from "@/lib/jargonDictionary";
import { Brain } from "lucide-react";

/* ─── term lookup map (case-insensitive) ─── */
const TERM_MAP = new Map<string, JargonEntry>();
JARGON_DICTIONARY.forEach((e) => TERM_MAP.set(e.term.toLowerCase(), e));

/* sorted longest-first for matching */
const SORTED_TERMS = [...JARGON_DICTIONARY].sort(
  (a, b) => b.term.length - a.term.length
);

/* word-boundary aware regex for each term */
const TERM_REGEX = new RegExp(
  `(?<![\\w-])(${SORTED_TERMS.map((t) =>
    t.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  ).join("|")})(?![\\w-])`,
  "gi"
);

/* ─── constants ─── */
const GLOSSARY_ATTR = "data-glossary-term";
const GLOSSARY_CLASS = "glossary-term";

/* ─── HTML string processor: inject glossary spans into raw HTML ─── */
export function annotateGlossaryHtml(html: string): { html: string; termCount: number } {
  if (!html) return { html, termCount: 0 };

  const matched = new Set<string>();

  // Split HTML into tags and text segments to avoid matching inside tags
  const TAG_RE = /(<[^>]+>)/g;
  const segments = html.split(TAG_RE);

  // Track which tags we're inside to skip headings, links, code, etc.
  const skipTags = new Set(["a", "code", "pre", "script", "style", "h1", "h2", "h3", "h4"]);
  let skipDepth = 0;

  const result = segments.map((seg) => {
    // HTML tag segment
    if (seg.startsWith("<")) {
      const closing = seg.startsWith("</");
      const tagMatch = seg.match(closing ? /^<\/(\w+)/ : /^<(\w+)/);
      if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        if (skipTags.has(tag)) {
          skipDepth += closing ? -1 : 1;
          if (skipDepth < 0) skipDepth = 0;
        }
      }
      return seg;
    }

    // Text segment — skip if inside a tag we don't annotate
    if (skipDepth > 0) return seg;
    if (seg.trim().length < 2) return seg;

    TERM_REGEX.lastIndex = 0;
    let lastIdx = 0;
    let out = "";
    let m: RegExpExecArray | null;

    while ((m = TERM_REGEX.exec(seg))) {
      const termLower = m[1].toLowerCase();
      if (matched.has(termLower)) continue;

      matched.add(termLower);
      out += seg.slice(lastIdx, m.index);
      out += `<span class="${GLOSSARY_CLASS}" ${GLOSSARY_ATTR}="${termLower}" tabindex="0" role="button" aria-label="Define: ${m[1]}">${m[1]}<sup class="glossary-sparkle" aria-hidden="true">*</sup></span>`;
      lastIdx = m.index + m[0].length;
    }

    if (lastIdx === 0) return seg; // no matches
    out += seg.slice(lastIdx);
    return out;
  });

  return { html: result.join(""), termCount: matched.size };
}

/* ─── Floating tooltip with arrow ─── */
function GlossaryTooltipCard({
  entry,
  anchorRect,
  onClose,
}: {
  entry: JargonEntry;
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    above: boolean;
  }>({ top: 0, left: 0, arrowLeft: 0, above: true });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const vw = window.innerWidth;
    const gap = 10;
    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    let left = anchorCenterX - cw / 2;
    left = Math.max(12, Math.min(left, vw - cw - 12));
    const arrowLeft = Math.max(16, Math.min(anchorCenterX - left, cw - 16));
    const above = anchorRect.top - ch - gap > 0;
    const top = above
      ? anchorRect.top + window.scrollY - ch - gap
      : anchorRect.bottom + window.scrollY + gap;
    setPos({ top, left, arrowLeft, above });
    setReady(true);
  }, [anchorRect]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 10);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      ref={cardRef}
      role="tooltip"
      className="animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        opacity: ready ? 1 : 0,
        pointerEvents: ready ? "auto" : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: pos.arrowLeft,
          ...(pos.above
            ? { bottom: -5, transform: "translateX(-50%) rotate(45deg)" }
            : { top: -5, transform: "translateX(-50%) rotate(45deg)" }),
          width: 10,
          height: 10,
          zIndex: 1,
        }}
        className="bg-card border-b border-r border-border"
      />
      <div className="relative bg-card border border-border shadow-lg rounded-lg p-3 max-w-xs z-[2]">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-bold text-sm" style={{ color: "hsl(38 92% 50%)" }}>
            {entry.term}
          </span>
          <span
            className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border"
            style={{
              color: "hsl(38 92% 50%)",
              borderColor: "hsl(38 92% 50% / 0.3)",
              backgroundColor: "hsl(38 92% 50% / 0.08)",
            }}
          >
            <span className="text-[9px]">*</span>
            AI term
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{entry.plain}</p>
        {entry.asiaContext && (
          <p
            className="mt-2 text-xs leading-relaxed italic border-l-2 pl-2 text-muted-foreground/80"
            style={{ borderColor: "hsl(38 92% 50% / 0.4)" }}
          >
            {entry.asiaContext}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ─── Hook: event delegation for glossary terms ─── */
export function useGlossaryAnnotation(
  proseRef: React.RefObject<HTMLDivElement>,
  _html: string,
  termCount: number
) {
  const [activeEntry, setActiveEntry] = useState<JargonEntry | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = proseRef.current;
    if (!el || termCount === 0) return;

    let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

    const showTooltip = (target: Element) => {
      const termKey = target.getAttribute(GLOSSARY_ATTR);
      if (!termKey) return;
      const entry = TERM_MAP.get(termKey);
      if (!entry) return;
      setActiveEntry(entry);
      setAnchorRect(target.getBoundingClientRect());
    };

    const handleMouseEnter = (e: Event) => {
      const target = (e.target as HTMLElement).closest(`[${GLOSSARY_ATTR}]`);
      if (!target) return;
      if (hoverTimeout) clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => showTooltip(target), 200);
    };

    const handleMouseLeave = (e: Event) => {
      const target = (e.target as HTMLElement).closest(`[${GLOSSARY_ATTR}]`);
      if (!target) return;
      if (hoverTimeout) { clearTimeout(hoverTimeout); hoverTimeout = null; }
    };

    const handleClick = (e: Event) => {
      const target = (e.target as HTMLElement).closest(`[${GLOSSARY_ATTR}]`);
      if (!target) return;
      e.preventDefault();
      showTooltip(target);
    };

    el.addEventListener("mouseover", handleMouseEnter);
    el.addEventListener("mouseout", handleMouseLeave);
    el.addEventListener("click", handleClick);

    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      el.removeEventListener("mouseover", handleMouseEnter);
      el.removeEventListener("mouseout", handleMouseLeave);
      el.removeEventListener("click", handleClick);
    };
  }, [_html, termCount]);

  const close = useCallback(() => {
    setActiveEntry(null);
    setAnchorRect(null);
  }, []);

  const tooltipNode =
    activeEntry && anchorRect ? (
      <GlossaryTooltipCard entry={activeEntry} anchorRect={anchorRect} onClose={close} />
    ) : null;

  const scrollToFirst = useCallback(() => {
    const el = proseRef.current;
    if (!el) return;
    const first = el.querySelector(`[${GLOSSARY_ATTR}]`);
    if (first) {
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      first.classList.add("glossary-term-flash");
      setTimeout(() => first.classList.remove("glossary-term-flash"), 1500);
    }
  }, [proseRef]);

  const bannerNode = termCount > 0 ? (
    <button
      onClick={scrollToFirst}
      className="group flex items-center gap-2 rounded-lg border border-border bg-card/80 backdrop-blur-sm px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-amber-500/40 transition-all duration-200 mb-4"
      aria-label={`${termCount} AI terms explained in this article`}
    >
      <Brain className="h-4 w-4 text-amber-500" />
      <span>
        <span className="font-bold" style={{ color: "hsl(38 92% 50%)" }}>{termCount}</span>
        {" AI terms explained"}
      </span>
      <span className="text-muted-foreground/60 group-hover:translate-y-0.5 transition-transform">↓</span>
    </button>
  ) : null;

  return { tooltipNode, bannerNode, termCount };
}
