import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { Button } from "./ui/button";

interface UpNextSidebarProps {
  currentArticleId: string;
  categoryId?: string;
}

const UpNextSidebar = ({ currentArticleId, categoryId }: UpNextSidebarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: upNextArticles } = useQuery({
    queryKey: ["up-next", currentArticleId, categoryId],
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
        .limit(3);

      if (categoryId) {
        query = query.eq("primary_category_id", categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      // Show sidebar between 25% and 85% scroll
      setIsVisible(scrollPercent >= 25 && scrollPercent < 85);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible || isDismissed || !upNextArticles?.length) return null;

  return (
    <div className="fixed right-4 top-1/3 z-30 hidden xl:block animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg p-4 w-64">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ArrowRight className="h-4 w-4" />
            Up Next
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-3">
          {upNextArticles.map((article: any) => (
            <Link
              key={article.id}
              to={`/${article.categories?.slug || 'news'}/${article.slug}`}
              className="flex items-start gap-2 group"
            >
              {article.featured_image_url && (
                <img
                  src={article.featured_image_url}
                  alt=""
                  className="w-12 h-12 object-cover rounded flex-shrink-0"
                />
              )}
              <span className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {article.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpNextSidebar;
