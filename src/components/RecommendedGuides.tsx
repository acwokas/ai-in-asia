import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { BookOpen, ArrowRight } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";

const difficultyColor = (d?: string | null) => {
  switch (d?.toLowerCase()) {
    case "beginner": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "intermediate": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "advanced": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

const RecommendedGuides = () => {
  const { data: guides, isLoading } = useQuery({
    queryKey: ["recommended-guides"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, featured_image_url, featured_image_alt, one_line_description, topic_category, difficulty")
        .eq("status", "published")
        .not('featured_image_url', 'is', null)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      const items = data || [];
      // Pick up to 6 with topic_category variety
      const picked: typeof items = [];
      const usedCategories = new Set<string>();
      for (const item of items) {
        if (picked.length >= 6) break;
        const cat = item.topic_category || "";
        if (!usedCategories.has(cat)) {
          usedCategories.add(cat);
          picked.push(item);
        }
      }
      const remaining = items.filter(i => !picked.includes(i)).sort(() => Math.random() - 0.5);
      for (const item of remaining) {
        if (picked.length >= 6) break;
        picked.push(item);
      }
      return picked.sort(() => Math.random() - 0.5);
    },
  });

  if (isLoading) {
    return (
      <section className="bg-[hsl(210,40%,8%)]">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4 rounded-xl border bg-card overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!guides || guides.length === 0) return null;

  return (
    <section className="bg-[hsl(210,40%,8%)] py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BookOpen className="h-6 w-6 text-primary" />
              <h2 className="text-[22px] md:text-[28px] font-bold text-white">Guides & Tutorials</h2>
            </div>
            <p className="text-[15px] text-[hsl(210,20%,70%)] leading-[1.6]">
              Master AI tools with step-by-step learning resources
            </p>
          </div>
          <Link
            to="/guides"
            className="text-primary text-[15px] font-medium flex items-center gap-1.5 hover:underline shrink-0 group"
          >
            View All Guides
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              to={`/guides/${(guide.topic_category || "general").toLowerCase().replace(/\s+/g, "-")}/${guide.slug}`}
              className="group flex flex-col border border-border/50 bg-card rounded-lg overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              {/* Image */}
              <div className="aspect-video bg-muted relative overflow-hidden">
                {guide.featured_image_url ? (
                  <img
                    src={guide.featured_image_url}
                    alt={guide.featured_image_alt || guide.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div className="p-5 flex flex-col flex-grow">
                {/* Title */}
                <h3 className="font-semibold text-lg leading-[1.3] line-clamp-2 mb-2 text-foreground group-hover:text-primary transition-colors">
                  {guide.title}
                </h3>

                {/* One-line description */}
                {guide.one_line_description && (
                  <p className="text-[14px] text-muted-foreground leading-[1.5] line-clamp-2 mb-3 flex-grow">
                    {guide.one_line_description}
                  </p>
                )}

                {/* Difficulty badge */}
                {guide.difficulty && (
                  <div className="mt-auto pt-2">
                    <Badge className={cn("text-[11px] px-2 py-0.5", difficultyColor(guide.difficulty))}>
                      {guide.difficulty}
                    </Badge>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecommendedGuides;
