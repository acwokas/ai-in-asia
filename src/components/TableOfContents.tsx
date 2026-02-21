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
}

function useHeadings(contentSelector: string) {
  const [headings, setHeadings] = useState<TocItem[]>([]);

  useEffect(() => {
    // Small delay to let article content render
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
        // Find the first heading that is intersecting from the top
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

/** Desktop: sticky sidebar */
export function TableOfContentsSidebar({ contentSelector = ".article-content", minHeadings = 3, minReadingTime = 7, readingTime = 0 }: TableOfContentsProps) {
  const headings = useHeadings(contentSelector);
  const activeId = useActiveHeading(headings);

  if (headings.length < minHeadings || readingTime < minReadingTime) return null;

  return (
    <aside className="hidden xl:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-foreground">
          <List className="h-4 w-4" />
          <span>Contents</span>
        </div>
        <TocLinks headings={headings} activeId={activeId} />
      </div>
    </aside>
  );
}

/** Mobile: collapsible section */
export function TableOfContentsMobile({ contentSelector = ".article-content", minHeadings = 3, minReadingTime = 7, readingTime = 0 }: TableOfContentsProps) {
  const headings = useHeadings(contentSelector);
  const activeId = useActiveHeading(headings);
  const [open, setOpen] = useState(false);

  if (headings.length < minHeadings || readingTime < minReadingTime) return null;

  return (
    <div className="xl:hidden mb-6">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full border border-border rounded-lg px-4 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span>Contents</span>
            <span className="text-muted-foreground font-normal">({headings.length})</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="border border-t-0 border-border rounded-b-lg px-4 py-3">
          <TocLinks headings={headings} activeId={activeId} onClick={() => setOpen(false)} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
