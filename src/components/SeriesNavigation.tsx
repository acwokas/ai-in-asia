import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

interface SeriesNavigationProps {
  seriesId: string;
  currentPart: number;
  currentArticleId: string;
}

const SeriesNavigation = ({ seriesId, currentPart, currentArticleId }: SeriesNavigationProps) => {
  const { data: seriesData } = useQuery({
    queryKey: ["series", seriesId],
    queryFn: async () => {
      // Get series info
      const { data: series } = await supabase
        .from("article_series")
        .select("*")
        .eq("id", seriesId)
        .single();

      // Get all articles in series
      const { data: articles } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          series_part,
          categories:primary_category_id (slug)
        `)
        .eq("series_id", seriesId)
        .eq("status", "published")
        .order("series_part");

      return { series, articles };
    },
  });

  if (!seriesData?.series || !seriesData?.articles) return null;

  const { series, articles } = seriesData;
  const currentIndex = articles.findIndex(a => a.id === currentArticleId);
  const prevArticle = currentIndex > 0 ? articles[currentIndex - 1] : null;
  const nextArticle = currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;

  return (
    <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-6 my-8">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm text-muted-foreground">Part {currentPart} of {articles.length}</p>
          <h3 className="font-bold text-lg">{series.name}</h3>
          {series.description && (
            <p className="text-sm text-muted-foreground mt-1">{series.description}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center gap-4 mt-4">
        {prevArticle ? (
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link to={`/${prevArticle.categories?.slug || 'news'}/${prevArticle.slug}`}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <div className="text-left overflow-hidden">
                <p className="text-xs text-muted-foreground">Previous</p>
                <p className="truncate">{prevArticle.title}</p>
              </div>
            </Link>
          </Button>
        ) : (
          <div className="flex-1" />
        )}

        <Button variant="outline" size="sm" className="shrink-0">
          {currentPart} / {articles.length}
        </Button>

        {nextArticle ? (
          <Button variant="default" size="sm" asChild className="flex-1">
            <Link to={`/${nextArticle.categories?.slug || 'news'}/${nextArticle.slug}`}>
              <div className="text-right overflow-hidden">
                <p className="text-xs">Next</p>
                <p className="truncate">{nextArticle.title}</p>
              </div>
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* All parts list */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
          View all {articles.length} parts
        </summary>
        <ol className="mt-3 space-y-2 ml-4">
          {articles.map((article) => (
            <li key={article.id}>
              <Link
                to={`/${article.categories?.slug || 'news'}/${article.slug}`}
                className={`text-sm hover:text-primary transition-colors ${
                  article.id === currentArticleId ? 'font-bold text-primary' : ''
                }`}
              >
                Part {article.series_part}: {article.title}
              </Link>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
};

export default SeriesNavigation;
