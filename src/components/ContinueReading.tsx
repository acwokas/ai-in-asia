import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowRight, Clock } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

interface ContinueReadingProps {
  currentArticleId: string;
  categoryId?: string;
  categorySlug?: string;
}

const ContinueReading = ({ currentArticleId, categoryId, categorySlug }: ContinueReadingProps) => {
  const { data: nextArticle } = useQuery({
    queryKey: ["next-article-relevant", currentArticleId, categoryId],
    enabled: !!currentArticleId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      // Fetch the current article's tags first
      const { data: currentArticle } = await supabase
        .from('articles')
        .select('ai_tags, topic_tags')
        .eq('id', currentArticleId)
        .maybeSingle();

      const currentTags = [
        ...((currentArticle?.ai_tags as string[]) || []),
        ...((currentArticle?.topic_tags as string[]) || []),
      ].map(t => t.toLowerCase());

      // Fetch recent candidates from same category
      let query = supabase
        .from('articles')
        .select(`
          id, title, slug, excerpt, featured_image_url, reading_time_minutes,
          ai_tags, topic_tags,
          authors (name, slug),
          categories:primary_category_id (name, slug)
        `)
        .eq('status', 'published')
        .neq('id', currentArticleId)
        .order('published_at', { ascending: false })
        .limit(10);

      if (categoryId) {
        query = query.eq('primary_category_id', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Score by shared tags, fall back to most recent
      if (currentTags.length === 0) return data[0];

      let best = data[0];
      let bestScore = -1;
      for (const a of data) {
        const aTags = [
          ...((a.ai_tags as string[]) || []),
          ...((a.topic_tags as string[]) || []),
        ].map(t => t.toLowerCase());
        const score = aTags.filter(t => currentTags.includes(t)).length;
        if (score > bestScore) {
          bestScore = score;
          best = a;
        }
      }
      return best;
    },
  });

  if (!nextArticle) return null;

  const articleUrl = `/${nextArticle.categories?.slug || categorySlug || 'news'}/${nextArticle.slug}`;

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 my-8">
      <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3">
        <ArrowRight className="h-4 w-4" />
        Continue Reading
      </div>
      
      <Link to={articleUrl} className="group block">
        <div className="flex gap-4">
          <OptimizedImage
            src={nextArticle.featured_image_url}
            alt={nextArticle.title}
            className="w-24 h-24 rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2 mb-2">
              {nextArticle.title}
            </h3>
            {nextArticle.excerpt && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {nextArticle.excerpt}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {nextArticle.authors?.name && (
                <span>By {nextArticle.authors.name}</span>
              )}
              {nextArticle.reading_time_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {nextArticle.reading_time_minutes} min
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </Card>
  );
};

export default ContinueReading;
