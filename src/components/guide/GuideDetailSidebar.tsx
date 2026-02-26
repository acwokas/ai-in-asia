import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SidebarAd } from "@/components/GoogleAds";

interface TocSection {
  id: string;
  label: string;
}

function useActiveSection(sections: TocSection[]) {
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (sections.length === 0) return;

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
      { rootMargin: "-20% 0px -80% 0px", threshold: 0.1 }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [sections]);

  return activeId;
}

interface GuideDetailSidebarProps {
  sections: TocSection[];
}

export default function GuideDetailSidebar({ sections }: GuideDetailSidebarProps) {
  const activeId = useActiveSection(sections);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (sections.length === 0) return null;

  return (
    <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
      <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {/* TOC */}
        <nav aria-label="Guide table of contents">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">On this page</p>
          <ul className="space-y-0.5">
            {sections.map(({ id, label }) => (
              <li key={id}>
                <button
                  onClick={() => handleClick(id)}
                  className={cn(
                    "block w-full text-left text-sm py-1.5 transition-colors cursor-pointer",
                    activeId === id
                      ? "text-teal-400 border-l-2 border-teal-500 pl-3"
                      : "text-muted-foreground hover:text-foreground pl-3 border-l-2 border-transparent"
                  )}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Ad slot */}
        <div className="mt-8">
          <SidebarAd />
        </div>

        {/* Related Guides placeholder */}
        <div className="mt-8">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">Related Guides</p>
          <p className="text-sm text-muted-foreground">More guides coming soon</p>
        </div>
      </div>
    </aside>
  );
}

export { useActiveSection };
export type { TocSection };
