import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock, Eye, Sparkles, ArrowRight } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { GuideBookmarkButton } from "@/components/GuideBookmarkButton";

const guideHref = (slug: string, topicCategory?: string | null) => {
  const cat = (topicCategory || "general").toLowerCase().replace(/\s+/g, "-");
  return `/guides/${cat}/${slug}`;
};

const diffColors: Record<string, string> = {
  beginner: "bg-green-500",
  intermediate: "bg-amber-500",
  advanced: "bg-red-500",
};

interface GuideRelatedProps {
  currentGuideId: string;
  topicCategory: string | null;
  platformTags: string[];
  topicTags: string[];
}

const GuideRelated = ({ currentGuideId, topicCategory, platformTags, topicTags }: GuideRelatedProps) => {
  const { data: candidates } = useQuery({
    queryKey: ["related-guides", currentGuideId],
    queryFn: async () => {
      // Fetch guides in same topic category + some extras
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, topic_category, difficulty, one_line_description, featured_image_url, read_time_minutes, primary_platform, platform_tags, topic_tags, view_count")
        .eq("status", "published")
        .neq("id", currentGuideId)
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const related = useMemo(() => {
    if (!candidates) return [];

    const scored = candidates.map((g) => {
      let score = 0;
      // Same topic category = highest
      if (topicCategory && g.topic_category?.toLowerCase() === topicCategory.toLowerCase()) score += 10;
      // Matching platform tags
      const gPlats = (g.platform_tags || []).map((t: string) => t.toLowerCase());
      const matchPlats = platformTags.filter((t) => gPlats.includes(t.toLowerCase())).length;
      score += matchPlats * 3;
      // Matching topic tags
      const gTopics = (g.topic_tags || []).map((t: string) => t.toLowerCase());
      const matchTopics = topicTags.filter((t) => gTopics.includes(t.toLowerCase())).length;
      score += matchTopics * 2;
      return { ...g, score };
    });

    return scored.filter((g) => g.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
  }, [candidates, topicCategory, platformTags, topicTags]);

  if (related.length === 0) return null;

  return (
    <section className="mt-12 mb-8">
      <h2 className="text-xl font-bold text-foreground mb-4">Related Guides</h2>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((g) => (
          <div key={g.id} className="relative group">
            <GuideBookmarkButton
              guideId={g.id}
              className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <Link
              to={guideHref(g.slug, g.topic_category)}
              className="block rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 h-full"
            >
              <div className="aspect-video overflow-hidden">
                {g.featured_image_url ? (
                  <OptimizedImage src={g.featured_image_url} alt={g.title} aspectRatio="16/9" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary/30" />
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {g.difficulty && <Badge className={`${diffColors[g.difficulty] || ""} text-white text-[10px]`}>{g.difficulty}</Badge>}
                  {g.primary_platform && g.primary_platform !== "Generic" && (
                    <Badge variant="secondary" className="bg-muted/60 text-muted-foreground text-[10px] border-0">{g.primary_platform}</Badge>
                  )}
                </div>
                <h3 className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">{g.title}</h3>
                {g.one_line_description && <p className="text-xs text-muted-foreground line-clamp-2">{g.one_line_description}</p>}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.read_time_minutes || 5} min</span>
                  {(g.view_count ?? 0) > 0 && (
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{g.view_count >= 1000 ? `${(g.view_count / 1000).toFixed(1)}k` : g.view_count}</span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};

export default GuideRelated;
