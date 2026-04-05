import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight } from "lucide-react";

const guideHref = (slug: string, topicCategory?: string | null) => {
  const cat = (topicCategory || "general").toLowerCase().replace(/\s+/g, "-");
  return `/guides/${cat}/${slug}`;
};

interface GuideSeriesNavProps {
  currentGuideId: string;
  topicCategory: string | null;
  showInLearningPaths: boolean;
}

const GuideSeriesNav = ({ currentGuideId, topicCategory, showInLearningPaths }: GuideSeriesNavProps) => {
  const { data: seriesGuides } = useQuery({
    queryKey: ["guide-series", topicCategory],
    enabled: showInLearningPaths && !!topicCategory,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, topic_category, featured_image_url")
        .eq("status", "published")
        .eq("show_in_learning_paths", true)
        .eq("topic_category", topicCategory!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { prev, next } = useMemo(() => {
    if (!seriesGuides || seriesGuides.length < 2) return { prev: null, next: null };
    const idx = seriesGuides.findIndex((g) => g.id === currentGuideId);
    if (idx === -1) return { prev: null, next: null };
    return {
      prev: idx > 0 ? seriesGuides[idx - 1] : null,
      next: idx < seriesGuides.length - 1 ? seriesGuides[idx + 1] : null,
    };
  }, [seriesGuides, currentGuideId]);

  if (!prev && !next) return null;

  return (
    <nav className="mt-12 mb-4 rounded-xl border border-border bg-card/50 backdrop-blur p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Next in Series</p>
      <div className="flex items-stretch gap-4">
        {prev ? (
          <Link
            to={guideHref(prev.slug, prev.topic_category)}
            className="flex-1 flex items-center gap-3 group rounded-lg p-2 hover:bg-muted/30 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground shrink-0" />
            {prev.featured_image_url ? (
              <img src={prev.featured_image_url} alt="" className="w-12 h-12 rounded object-cover shrink-0" loading="lazy" />
            ) : (
              <div className="w-12 h-12 rounded bg-muted shrink-0" />
            )}
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground">Previous</span>
              <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{prev.title}</p>
            </div>
          </Link>
        ) : <div className="flex-1" />}

        {next ? (
          <Link
            to={guideHref(next.slug, next.topic_category)}
            className="flex-1 flex items-center gap-3 justify-end text-right group rounded-lg p-2 hover:bg-muted/30 transition-colors"
          >
            <div className="min-w-0">
              <span className="text-[10px] text-muted-foreground">Next</span>
              <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{next.title}</p>
            </div>
            {next.featured_image_url ? (
              <img src={next.featured_image_url} alt="" className="w-12 h-12 rounded object-cover shrink-0" loading="lazy" />
            ) : (
              <div className="w-12 h-12 rounded bg-muted shrink-0" />
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </Link>
        ) : <div className="flex-1" />}
      </div>
    </nav>
  );
};

export default GuideSeriesNav;
