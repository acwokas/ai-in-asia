import { useState, useCallback } from "react";
import { List, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TocSection } from "./GuideDetailSidebar";
import { useActiveSection } from "./GuideDetailSidebar";

interface GuideMobileTocProps {
  sections: TocSection[];
}

export default function GuideMobileToc({ sections }: GuideMobileTocProps) {
  const [open, setOpen] = useState(false);
  const activeId = useActiveSection(sections);

  const handleClick = useCallback((id: string) => {
    setOpen(false);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }, []);

  if (sections.length === 0) return null;

  return (
    <div className="lg:hidden">
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-teal-600 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-1.5 text-sm font-medium hover:bg-teal-500 transition-colors"
      >
        <List className="h-4 w-4" />
        Contents
      </button>

      {/* Overlay + Drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">On this page</p>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="space-y-1">
              {sections.map(({ id, label }) => (
                <li key={id}>
                  <button
                    onClick={() => handleClick(id)}
                    className={cn(
                      "block w-full text-left py-2.5 px-3 rounded-md text-sm transition-colors cursor-pointer",
                      activeId === id
                        ? "text-teal-400 bg-teal-500/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
