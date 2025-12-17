import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

interface ExitIntentOverlayProps {
  currentArticleId?: string;
}

const STORAGE_KEY = "exit_intent_dismissed";
const DISMISS_DAYS = 7;

const ExitIntentOverlay = ({ currentArticleId }: ExitIntentOverlayProps) => {
  const [isVisible, setIsVisible] = useState(false);

  const { data: recommendations } = useQuery({
    queryKey: ["exit-recommendations", currentArticleId],
    enabled: isVisible,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id, title, slug, featured_image_url,
          categories:primary_category_id (slug)
        `)
        .eq("status", "published")
        .neq("id", currentArticleId || "")
        .order("view_count", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
  });

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setIsVisible(false);
  }, []);

  useEffect(() => {
    // Check if dismissed recently
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const daysSince = (Date.now() - new Date(dismissed).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return;
    }

    let hasTriggered = false;

    const handleMouseLeave = (e: MouseEvent) => {
      if (hasTriggered) return;
      
      // Only trigger when mouse leaves through top of viewport
      if (e.clientY <= 0 && e.relatedTarget === null) {
        hasTriggered = true;
        setIsVisible(true);
      }
    };

    // Only add listener after user has been on page for a bit
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  if (!isVisible || !recommendations?.length) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg p-6">
        <div className="bg-background border border-border rounded-xl shadow-2xl p-6 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Before you go...</h2>
          </div>

          <p className="text-muted-foreground mb-6">
            Don't miss these popular stories from AI in ASIA
          </p>

          <div className="space-y-3">
            {recommendations.map((article: any) => (
              <Link
                key={article.id}
                to={`/${article.categories?.slug || 'news'}/${article.slug}`}
                onClick={handleDismiss}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
              >
                {article.featured_image_url && (
                  <img
                    src={article.featured_image_url}
                    alt=""
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <span className="font-medium group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </span>
              </Link>
            ))}
          </div>

          <Button variant="outline" className="w-full mt-4" onClick={handleDismiss}>
            No thanks, I'll continue browsing
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExitIntentOverlay;
