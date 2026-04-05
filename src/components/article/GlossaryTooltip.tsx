/**
 * AI Glossary Tooltip System
 * Scans article prose for known AI/tech terms and wraps the first occurrence
 * with an amber dotted-underline span + ✦ superscript indicator.
 * Hover (desktop) or tap (mobile) shows a tooltip with definition + "AI term" badge.
 */

import { useEffect, useRef, useState, useCallback } from "react";
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

  /* Calculate position */
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const vw = window.innerWidth;
    const gap = 10;

    // Center horizontally on the term
    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    let left = anchorCenterX - cw / 2;
    left = Math.max(12, Math.min(left, vw - cw - 12));

    // Arrow position relative to card
    const arrowLeft = Math.max(16, Math.min(anchorCenterX - left, cw - 16));

    // Prefer above; fall below if not enough space
    const above = anchorRect.top - ch - gap > 0;
    const top = above
      ? anchorRect.top + window.scrollY - ch - gap
      : anchorRect.bottom + window.scrollY + gap;

    setPos({ top, left, arrowLeft, above });
    setReady(true);
  }, [anchorRect]);

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close on the same tap that opened it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
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
      {/* Arrow */}
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

      {/* Card body */}
      <div className="relative bg-card border border-border shadow-lg rounded-lg p-3 max-w-xs z-[2]">
        {/* Header row */}
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

        {/* Definition */}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {entry.plain}
        </p>

        {/* Asia context if available */}
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

/* ─── Hook: scan prose DOM and annotate glossary terms ─── */
export function useGlossaryAnnotation(
  proseRef: React.RefObject<HTMLDivElement>,
  html: string
) {
  const [activeEntry, setActiveEntry] = useState<JargonEntry | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [termCount, setTermCount] = useState(0);
  const matchedTermsRef = useRef(new Set<string>());

  /* Annotate text nodes */
  useEffect(() => {
    const el = proseRef.current;
    if (!el) return;
    matchedTermsRef.current.clear();

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (
          ["A", "CODE", "PRE", "SCRIPT", "STYLE", "H1", "H2", "H3", "H4"].includes(tag) ||
          parent.closest(`[${GLOSSARY_ATTR}], a, code, pre, h1, h2, h3, h4`)
        )
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) textNodes.push(n as Text);

    for (const textNode of textNodes) {
      const text = textNode.textContent || "";
      if (text.trim().length < 2) continue;

      TERM_REGEX.lastIndex = 0;
      const matches: { start: number; end: number; term: string }[] = [];
      let m: RegExpExecArray | null;

      while ((m = TERM_REGEX.exec(text))) {
        const termLower = m[1].toLowerCase();
        if (matchedTermsRef.current.has(termLower)) continue;
        matches.push({ start: m.index, end: m.index + m[0].length, term: m[1] });
        matchedTermsRef.current.add(termLower);
      }

      if (!matches.length) continue;

      const frag = document.createDocumentFragment();
      let lastIdx = 0;

      for (const match of matches) {
        if (match.start > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, match.start)));
        }

        // Wrapper span
        const span = document.createElement("span");
        span.className = GLOSSARY_CLASS;
        span.setAttribute(GLOSSARY_ATTR, match.term.toLowerCase());
        span.setAttribute("tabindex", "0");
        span.setAttribute("role", "button");
        span.setAttribute("aria-label", `Define: ${match.term}`);

        // Term text
        span.appendChild(document.createTextNode(text.slice(match.start, match.end)));

        // Sparkle superscript indicator
        const sup = document.createElement("sup");
        sup.className = "glossary-sparkle";
        sup.textContent = "*";
        sup.setAttribute("aria-hidden", "true");
        span.appendChild(sup);

        frag.appendChild(span);
        lastIdx = match.end;
      }

      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }

      textNode.parentNode?.replaceChild(frag, textNode);
    }

    setTermCount(matchedTermsRef.current.size);

    /* ── Event delegation: hover on desktop, tap on mobile ── */
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
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
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
  }, [html]);

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
      // Briefly highlight it
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
