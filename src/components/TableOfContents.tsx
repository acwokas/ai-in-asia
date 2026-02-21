import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { List, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  contentSelector?: string;
  minHeadings?: number;
  minReadingTime?: number;
  readingTime?: number;
  categoryColor?: string;
}

function useHeadings(contentSelector: string) {
  const [headings, setHeadings] = useState<TocItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const container = document.querySelector(contentSelector);
      if (!container) return;

      const elements = container.querySelectorAll("h2, h3");
      const items: TocItem[] = [];

      elements.forEach((el, i) => {
        if (!el.id) {
          el.id = `heading-${i}-${el.textContent?.slice(0, 20).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase() || i}`;
        }
        items.push({
          id: el.id,
          text: el.textContent || "",
          level: el.tagName === "H2" ? 2 : 3,
        });
      });

      setHeadings(items);
    }, 500);

    return () => clearTimeout(timer);
  }, [contentSelector]);

  return headings;
}

function useActiveHeading(headings: TocItem[]) {
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [headings]);

  return activeId;
}

/** Shared TOC link list for desktop rail */
function RailTocLinks({ headings, activeId, categoryColor }: { headings: TocItem[]; activeId: string; categoryColor?: string }) {
  const handleClick = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    []
  );

  // Only show H2s in the rail
  const h2Headings = headings.filter(h => h.level === 2);

  return (
    <nav aria-label="Table of contents">
      <ul className="flex flex-col" style={{ gap: "0.6rem" }}>
        {h2Headings.map(({ id, text }) => (
          <li key={id}>
            <button
              onClick={() => handleClick(id)}
              className="text-left w-full cursor-pointer transition-colors duration-200"
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: "0.9rem",
                lineHeight: 1.4,
                paddingLeft: "0.75rem",
                borderLeft: activeId === id ? `2px solid ${categoryColor || 'hsl(var(--primary))'}` : "2px solid transparent",
                color: activeId === id ? "hsl(var(--foreground))" : "#BFC0C0",
              }}
            >
              {text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Legacy TocLinks for mobile collapsible (shows H2+H3) */
function TocLinks({ headings, activeId, onClick }: { headings: TocItem[]; activeId: string; onClick?: () => void }) {
  const handleClick = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        onClick?.();
      }
    },
    [onClick]
  );

  return (
    <nav aria-label="Table of contents">
      <ul className="space-y-1">
        {headings.map(({ id, text, level }) => (
          <li key={id}>
            <button
              onClick={() => handleClick(id)}
              className={cn(
                "text-left w-full text-sm py-1.5 pr-2 border-l-2 transition-colors duration-200 cursor-pointer",
                level === 3 ? "pl-6" : "pl-3",
                level === 3 ? "text-muted-foreground font-normal" : "font-medium",
                activeId === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Desktop: sticky sidebar TOC */
export function TableOfContentsSidebar({ contentSelector = ".article-content", minHeadings = 3, minReadingTime = 7, readingTime = 0, categoryColor }: TableOfContentsProps) {
  const headings = useHeadings(contentSelector);
  const activeId = useActiveHeading(headings);

  if (headings.length < minHeadings || readingTime < minReadingTime) return null;

  return (
    <div>
      <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "hsl(var(--foreground))", marginBottom: "1rem" }}>
        In this article
      </h3>
      <div
        className="max-h-[45vh] overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.3) rgba(255,255,255,0.15)",
        }}
      >
        <RailTocLinks headings={headings} activeId={activeId} categoryColor={categoryColor} />
      </div>
    </div>
  );
}

/** Mobile: collapsible section */
export function TableOfContentsMobile({ contentSelector = ".article-content", minHeadings = 3, minReadingTime = 7, readingTime = 0 }: TableOfContentsProps) {
  const headings = useHeadings(contentSelector);
  const activeId = useActiveHeading(headings);
  const [open, setOpen] = useState(false);

  if (headings.length < minHeadings || readingTime < minReadingTime) return null;

  return (
    <div className="min-[1200px]:hidden mb-6">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold transition-colors"
          style={{
            background: "rgba(48,62,83,0.2)",
            borderRadius: open ? "8px 8px 0 0" : "8px",
          }}
        >
          <div className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span>In this article</span>
            <span className="text-muted-foreground font-normal">({headings.filter(h => h.level === 2).length})</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent
          style={{
            background: "rgba(48,62,83,0.2)",
            borderRadius: "0 0 8px 8px",
            padding: "0 1rem 1rem 1rem",
          }}
        >
          <TocLinks headings={headings} activeId={activeId} onClick={() => setOpen(false)} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
