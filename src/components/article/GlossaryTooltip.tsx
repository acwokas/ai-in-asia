/**
 * AI Glossary Tooltip System
 * Scans article prose for known AI/tech terms and wraps them with
 * interactive tooltips showing definitions in multiple modes.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { JARGON_DICTIONARY, type JargonEntry } from "@/lib/jargonDictionary";
import { BookOpen, Zap, Baby, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

type Mode = "plain" | "brutal" | "eli5";

/* ─── Floating tooltip card ─── */
function TooltipCard({
  entry,
  anchorRect,
  onClose,
}: {
  entry: JargonEntry;
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("plain");
  const cardRef = useRef<HTMLDivElement>(null);

  const text =
    mode === "brutal" ? entry.brutal : mode === "eli5" ? entry.eli5 : entry.plain;

  /* position the card above or below the term */
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean }>({
    top: 0,
    left: 0,
    above: false,
  });

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;

    let left = anchorRect.left + anchorRect.width / 2 - cw / 2;
    left = Math.max(12, Math.min(left, vw - cw - 12));

    const above = anchorRect.top - ch - gap > 0;
    const top = above
      ? anchorRect.top + window.scrollY - ch - gap
      : anchorRect.bottom + window.scrollY + gap;

    setPos({ top, left, above });
  }, [anchorRect]);

  /* close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  /* close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const modeButtons: { key: Mode; icon: typeof BookOpen; label: string }[] = [
    { key: "plain", icon: BookOpen, label: "Plain English" },
    { key: "brutal", icon: Zap, label: "Brutally Honest" },
    { key: "eli5", icon: Baby, label: "ELI5" },
  ];

  return createPortal(
    <div
      ref={cardRef}
      role="tooltip"
      className="fixed z-[9999] w-[320px] rounded-xl border bg-popover/95 backdrop-blur-lg shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
      style={{ top: pos.top, left: pos.left, position: "absolute" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {entry.term}
        </span>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
            {entry.category}
          </span>
          <button
            onClick={onClose}
            className="ml-1 rounded-md p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close tooltip"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <p className="text-sm leading-relaxed text-foreground">{text}</p>

        {entry.asiaContext && mode === "plain" && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground italic border-l-2 border-primary/40 pl-2">
            {entry.asiaContext}
          </p>
        )}
      </div>

      {/* Mode switcher */}
      <div className="flex border-t px-2 py-1.5 gap-0.5">
        {modeButtons.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium transition-colors",
              mode === key
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
            aria-label={label}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
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
  const matchedTermsRef = useRef(new Set<string>());

  /* Annotate text nodes */
  useEffect(() => {
    const el = proseRef.current;
    if (!el) return;
    matchedTermsRef.current.clear();

    // Walk text nodes inside the prose container
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        // Skip headings, links, code, already-annotated spans, script, style
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
        // Only annotate first occurrence of each term per article
        if (matchedTermsRef.current.has(termLower)) continue;
        matches.push({ start: m.index, end: m.index + m[0].length, term: m[1] });
        matchedTermsRef.current.add(termLower);
      }

      if (!matches.length) continue;

      // Build replacement fragment
      const frag = document.createDocumentFragment();
      let lastIdx = 0;

      for (const match of matches) {
        if (match.start > lastIdx) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx, match.start)));
        }
        const span = document.createElement("span");
        span.className = GLOSSARY_CLASS;
        span.setAttribute(GLOSSARY_ATTR, match.term.toLowerCase());
        span.textContent = text.slice(match.start, match.end);
        span.setAttribute("tabindex", "0");
        span.setAttribute("role", "button");
        span.setAttribute("aria-label", `Define: ${match.term}`);
        frag.appendChild(span);
        lastIdx = match.end;
      }

      if (lastIdx < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx)));
      }

      textNode.parentNode?.replaceChild(frag, textNode);
    }

    // Event delegation for clicks on glossary terms
    const handleClick = (e: Event) => {
      const target = (e.target as HTMLElement).closest(`[${GLOSSARY_ATTR}]`);
      if (!target) return;
      const termKey = target.getAttribute(GLOSSARY_ATTR);
      if (!termKey) return;
      const entry = TERM_MAP.get(termKey);
      if (!entry) return;
      setActiveEntry(entry);
      setAnchorRect(target.getBoundingClientRect());
    };

    el.addEventListener("click", handleClick);
    return () => {
      el.removeEventListener("click", handleClick);
    };
  }, [html]);

  const close = useCallback(() => {
    setActiveEntry(null);
    setAnchorRect(null);
  }, []);

  const tooltipNode =
    activeEntry && anchorRect ? (
      <TooltipCard entry={activeEntry} anchorRect={anchorRect} onClose={close} />
    ) : null;

  return { tooltipNode };
}
