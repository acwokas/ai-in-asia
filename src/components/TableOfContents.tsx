import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function useHeadings(contentSelector: string) {
  const [headings, setHeadings] = useState<TocItem[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const container = document.querySelector(contentSelector);
      if (!container) return;

      const elements = container.querySelectorAll("h2, h3");
      const items: TocItem[] = [];

      elements.forEach((el) => {
        if (!el.id) {
          el.id = slugify(el.textContent || "") || `heading-${items.length}`;
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

/** TOC link list with h3 indented under h2, primary active highlight */
function TocLinks({
  headings,
  activeId,
  onClickItem,
  showCopyLink = false,
}: {
  headings: TocItem[];
  activeId: string;
  onClickItem?: () => void;
  showCopyLink?: boolean;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleClick = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        onClickItem?.();
      }
    },
    [onClickItem]
  );

  const handleCopyLink = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      toast("Link copied", { description: "Section link copied to clipboard" });
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  return (
    <nav aria-label="Table of contents">
      <ul className="flex flex-col gap-0.5">
        {headings.map(({ id, text, level }) => (
          <li key={id} className="group relative flex items-start gap-1">
            <button
              onClick={() => handleClick(id)}
              className={cn(
                "text-left flex-1 text-sm py-1 pr-2 border-l-2 transition-colors duration-200 cursor-pointer",
                level === 3 ? "pl-6" : "pl-3",
                level === 3 ? "font-normal" : "font-medium",
                activeId === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {text}
            </button>
            {showCopyLink && (
              <button
                onClick={(e) => handleCopyLink(e, id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-muted-foreground hover:text-foreground flex-shrink-0 mt-1.5"
                title="Copy link to section"
                aria-label="Copy link to section"
              >
                {copiedId === id ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                )}
              </button>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Desktop: sticky sidebar TOC */
export function TableOfContentsSidebar({
  contentSelector = ".article-content",
  minHeadings = 3,
  minReadingTime = 0,
  readingTime = 0,
  categoryColor,
}: TableOfContentsProps) {
  const headings = useHeadings(contentSelector);
  const activeId = useActiveHeading(headings);

  if (headings.length < minHeadings || (minReadingTime > 0 && readingTime < minReadingTime)) return null;

  return (
    <div className="bg-card/60 border border-border rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <List className="h-4 w-4 text-primary" />
        On this page
      </h3>
      <div
        className="max-h-[50vh] overflow-y-auto"
        style={{ scrollbarWidth: "thin" }}
      >
        <TocLinks headings={headings} activeId={activeId} showCopyLink />
      </div>
    </div>
  );
}

/** Mobile: collapsible section */
export function TableOfContentsMobile({
  contentSelector = ".article-content",
  minHeadings = 3,
  minReadingTime = 0,
  readingTime = 0,
}: TableOfContentsProps) {
  const headings = useHeadings(contentSelector);
  const activeId = useActiveHeading(headings);
  const [open, setOpen] = useState(false);

  if (headings.length < minHeadings || (minReadingTime > 0 && readingTime < minReadingTime)) return null;

  return (
    <div className="min-[1200px]:hidden mb-6">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          className={cn(
            "flex items-center justify-between w-full px-4 py-3 text-sm font-semibold bg-card/60 border border-border transition-colors cursor-pointer",
            open ? "rounded-t-lg border-b-0" : "rounded-lg"
          )}
        >
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-primary" />
            <span>On this page</span>
            <span className="text-muted-foreground font-normal">({headings.length})</span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="bg-card/60 border border-border border-t-0 rounded-b-lg px-4 pb-4">
          <TocLinks headings={headings} activeId={activeId} onClickItem={() => setOpen(false)} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
