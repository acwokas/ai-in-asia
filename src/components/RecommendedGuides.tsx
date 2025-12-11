import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { BookOpen, Sparkles } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

const RecommendedGuides = () => {
  const { data: guides, isLoading } = useQuery({
    queryKey: ["recommended-guides"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      // Fetch recent guides and tutorials, randomly ordered
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, guide_category, level, primary_platform, excerpt, created_at")
        .in("guide_category", ["Guide", "Tutorial", "Prompt List", "Platform Guide", "Role Guide"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Shuffle and take 4 random guides
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 4);
    },
  });

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!guides || guides.length === 0) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Tutorial": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "Guide": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "Prompt List": return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case "Platform Guide": return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
      case "Role Guide": return "bg-pink-500/10 text-pink-600 dark:text-pink-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "Intermediate": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "Advanced": return "bg-red-500/10 text-red-600 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="headline text-2xl flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Guides & Tutorials
        </h2>
        <Link 
          to="/guides" 
          className="text-sm text-primary hover:underline font-medium"
        >
          View All
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {guides.map((guide) => (
          <Link
            key={guide.id}
            to={`/guides/${guide.slug}`}
            className="group block article-card p-4 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`text-xs ${getCategoryColor(guide.guide_category)}`}>
                {guide.guide_category}
              </Badge>
              <Badge variant="outline" className={`text-xs ${getLevelColor(guide.level)}`}>
                {guide.level}
              </Badge>
            </div>
            
            <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
              {guide.title}
            </h3>
            
            {guide.excerpt && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {guide.excerpt}
              </p>
            )}
            
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              <span>{guide.primary_platform}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default RecommendedGuides;
