import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { BookOpen, Sparkles, ArrowRight, GraduationCap, Lightbulb, Code, Users } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";

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
      
      // Shuffle and take 6 random guides
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 6);
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case "Tutorial": 
        return { 
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          icon: GraduationCap,
          gradient: "from-blue-500/10 to-blue-600/5"
        };
      case "Guide": 
        return { 
          color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: BookOpen,
          gradient: "from-emerald-500/10 to-emerald-600/5"
        };
      case "Prompt List": 
        return { 
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          icon: Lightbulb,
          gradient: "from-purple-500/10 to-purple-600/5"
        };
      case "Platform Guide": 
        return { 
          color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
          icon: Code,
          gradient: "from-orange-500/10 to-orange-600/5"
        };
      case "Role Guide": 
        return { 
          color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
          icon: Users,
          gradient: "from-pink-500/10 to-pink-600/5"
        };
      default: 
        return { 
          color: "bg-muted text-muted-foreground border-border",
          icon: BookOpen,
          gradient: "from-muted/50 to-muted/25"
        };
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
    <section className="py-16 bg-gradient-to-b from-muted/30 via-muted/20 to-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="headline text-3xl md:text-4xl font-bold">
                Guides & Tutorials
              </h2>
              <p className="text-muted-foreground mt-1">
                Master AI tools with step-by-step learning resources
              </p>
            </div>
          </div>
          <Button variant="outline" asChild className="w-fit group">
            <Link to="/guides" className="flex items-center gap-2">
              Explore All Guides
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
        
        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((guide, index) => {
            const categoryConfig = getCategoryConfig(guide.guide_category);
            const CategoryIcon = categoryConfig.icon;
            
            return (
              <Link
                key={guide.id}
                to={`/guides/${guide.slug}`}
                className={`group relative flex flex-col p-6 rounded-xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
                  index === 0 ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${categoryConfig.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                <div className="relative z-10">
                  {/* Category & Level badges */}
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={`${categoryConfig.color} border flex items-center gap-1.5`}>
                      <CategoryIcon className="h-3 w-3" />
                      {guide.guide_category}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getLevelColor(guide.level)}`}>
                      {guide.level}
                    </Badge>
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-semibold text-lg line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                    {guide.title}
                  </h3>
                  
                  {/* Excerpt */}
                  {guide.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">
                      {guide.excerpt}
                    </p>
                  )}
                  
                  {/* Platform & CTA */}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{guide.primary_platform}</span>
                    </div>
                    <span className="text-xs font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Read Guide
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        
        {/* Quick category links */}
        <div className="flex flex-wrap justify-center gap-3 mt-10">
          {['Tutorial', 'Guide', 'Prompt List', 'Platform Guide'].map((category) => {
            const config = getCategoryConfig(category);
            const Icon = config.icon;
            return (
              <Link
                key={category}
                to={`/guides?category=${encodeURIComponent(category)}`}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${config.color} hover:shadow-md transition-all duration-200`}
              >
                <Icon className="h-4 w-4" />
                {category}s
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RecommendedGuides;
