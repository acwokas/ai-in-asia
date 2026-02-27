import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SidebarAd } from "@/components/GoogleAds";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

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
  currentGuideId?: string;
  topicCategory?: string;
}

export default function GuideDetailSidebar({ sections, currentGuideId, topicCategory }: GuideDetailSidebarProps) {
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

        {/* Related Guides */}
        <RelatedGuides currentGuideId={currentGuideId} topicCategory={topicCategory} />
      </div>
    </aside>
  );
}

function RelatedGuides({ currentGuideId, topicCategory }: { currentGuideId?: string; topicCategory?: string }) {
  const { data: guides } = useQuery({
    queryKey: ["related-guides", currentGuideId, topicCategory],
    enabled: !!currentGuideId,
    queryFn: async () => {
      // Fetch same topic_category first
      let matched: any[] = [];
      if (topicCategory) {
        const { data } = await supabase
          .from("ai_guides")
          .select("id, title, slug, difficulty, featured_image_url, topic_category")
          .eq("status", "published")
          .not('featured_image_url', 'is', null)
          .eq("topic_category", topicCategory)
          .neq("id", currentGuideId!)
          .limit(4);
        matched = data || [];
      }
      // Backfill if fewer than 4
      if (matched.length < 4) {
        const excludeIds = [currentGuideId!, ...matched.map((g) => g.id)];
        const { data } = await supabase
          .from("ai_guides")
          .select("id, title, slug, difficulty, featured_image_url, topic_category")
          .eq("status", "published")
          .not('featured_image_url', 'is', null)
          .not("id", "in", `(${excludeIds.join(",")})`)
          .order("published_at", { ascending: false })
          .limit(4 - matched.length);
        matched = [...matched, ...(data || [])];
      }
      return matched.slice(0, 4);
    },
  });

  if (!guides?.length) return null;

  const difficultyColor = (d?: string) => {
    switch (d?.toLowerCase()) {
      case "beginner": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "intermediate": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "advanced": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="mt-8">
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">Related Guides</p>
      <div className="space-y-3">
        {guides.map((g: any) => (
          <Link key={g.id} to={`/guides/${g.slug}`} className="flex gap-3 group">
            <div className="w-16 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
              {g.featured_image_url ? (
                <img src={g.featured_image_url} alt={g.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{g.title}</p>
              {g.difficulty && (
                <Badge className={cn("mt-1 text-[10px] px-1.5 py-0", difficultyColor(g.difficulty))}>{g.difficulty}</Badge>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export { useActiveSection };
export type { TocSection };
