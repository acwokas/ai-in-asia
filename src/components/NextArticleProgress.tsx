import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

interface NextArticleProgressProps {
  currentArticleId: string;
  categoryId?: string;
}

const NextArticleProgress = ({ currentArticleId, categoryId }: NextArticleProgressProps) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: nextArticle } = useQuery({
    queryKey: ["next-article-progress", currentArticleId, categoryId],
    enabled: isVisible && !isDismissed,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select(`
          id, title, slug, featured_image_url,
          categories:primary_category_id (slug)
        `)
        .eq("status", "published")
        .neq("id", currentArticleId)
        .order("published_at", { ascending: false })
        .limit(1);

      if (categoryId) {
        query = query.eq("primary_category_id", categoryId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min((window.scrollY / scrollHeight) * 100, 100);
      setScrollProgress(progress);
      
      // Show at 80%, hide at 95%
      setIsVisible(progress >= 80 && progress < 95);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible || isDismissed || !nextArticle) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border shadow-lg animate-in slide-in-from-bottom duration-300">
      <Progress value={scrollProgress} className="h-1 rounded-none" />
      
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {nextArticle.featured_image_url && (
              <img
                src={nextArticle.featured_image_url}
                alt=""
                className="w-12 h-12 object-cover rounded hidden sm:block"
              />
            )}
            <div className="min-w-0">
              <span className="text-xs text-primary font-medium flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Up Next
              </span>
              <Link
                to={`/${nextArticle.categories?.slug || 'news'}/${nextArticle.slug}`}
                className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors"
              >
                {nextArticle.title}
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link to={`/${nextArticle.categories?.slug || 'news'}/${nextArticle.slug}`}>
                Read Now
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NextArticleProgress;
