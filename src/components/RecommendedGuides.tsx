import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { BookOpen, ArrowRight, GraduationCap, Lightbulb, Code, Users } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

const RecommendedGuides = () => {
  const { data: guides, isLoading } = useQuery({
    queryKey: ["recommended-guides"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, guide_category, level, primary_platform, excerpt, created_at, featured_image_url, featured_image_alt")
        .eq("status", "published")
        .in("guide_category", ["Guide", "Tutorial", "Prompt List", "Platform Guide", "Role Guide"])
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      // Pick up to 6 with category variety
      const items = data || [];
      const picked: typeof items = [];
      const usedCategories = new Set<string>();
      // First pass: one per category
      for (const item of items) {
        if (picked.length >= 6) break;
        if (!usedCategories.has(item.guide_category)) {
          usedCategories.add(item.guide_category);
          picked.push(item);
        }
      }
      // Second pass: fill remaining slots randomly
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
              <div key={i} className="space-y-4 p-6 rounded-xl border bg-card">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!guides || guides.length === 0) return null;

  const getCategoryBorderColor = (category: string) => {
    switch (category) {
      case "Tutorial": return "border-l-blue-500";
      case "Guide": return "border-l-emerald-500";
      case "Prompt List": return "border-l-purple-500";
      case "Platform Guide": return "border-l-orange-500";
      case "Role Guide": return "border-l-pink-500";
      default: return "border-l-primary";
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case "Tutorial": 
        return { color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: GraduationCap };
      case "Guide": 
        return { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: BookOpen };
      case "Prompt List": 
        return { color: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: Lightbulb };
      case "Platform Guide": 
        return { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: Code };
      case "Role Guide": 
        return { color: "bg-pink-500/15 text-pink-400 border-pink-500/30", icon: Users };
      default: 
        return { color: "bg-muted text-muted-foreground border-border", icon: BookOpen };
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "Beginner": return { text: "Beginner", class: "text-green-400" };
      case "Intermediate": return { text: "Intermediate", class: "text-yellow-400" };
      case "Advanced": return { text: "Advanced", class: "text-red-400" };
      default: return { text: level, class: "text-muted-foreground" };
    }
  };

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
          {guides.map((guide) => {
            const categoryConfig = getCategoryConfig(guide.guide_category);
            const CategoryIcon = categoryConfig.icon;
            const levelInfo = getLevelLabel(guide.level);
            
            return (
              <Link
                key={guide.id}
                to={`/guides/${guide.slug}`}
                className={`group flex flex-col border border-border/50 border-l-[3px] ${getCategoryBorderColor(guide.guide_category)} bg-card rounded-lg overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
              >
                {/* Image */}
                <div className="aspect-[16/9] bg-muted relative overflow-hidden">
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

                <div className="p-6 flex flex-col flex-grow">
                {/* Category badge — prominent */}
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={`${categoryConfig.color} border text-[13px] flex items-center gap-1.5 px-2.5 py-1`}>
                    <CategoryIcon className="h-3.5 w-3.5" />
                    {guide.guide_category}
                  </Badge>
                </div>
                
                {/* Title */}
                <h3 className="font-semibold text-lg md:text-xl leading-[1.3] line-clamp-2 mb-3 text-foreground group-hover:text-primary transition-colors">
                  {guide.title}
                </h3>
                
                {/* Excerpt */}
                {guide.excerpt && (
                  <p className="text-[15px] text-muted-foreground leading-[1.6] line-clamp-2 mb-4 flex-grow">
                    {guide.excerpt}
                  </p>
                )}
                
                {/* Meta footer */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/30">
                  <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {guide.primary_platform}
                    </span>
                    <span className={`font-medium ${levelInfo.class}`}>
                      {levelInfo.text}
                    </span>
                  </div>
                  <span className="text-[13px] font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Read
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RecommendedGuides;
