import { memo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { getOptimizedHeroImage, generateResponsiveSrcSet } from "@/lib/imageOptimization";

interface EditorsPickProps {
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    featured_image_url?: string;
    reading_time_minutes?: number;
    authors?: { name: string; slug: string };
    categories?: { name: string; slug: string };
  };
}

const EditorsPickComponent = ({ article }: EditorsPickProps) => {
  const categorySlug = article.categories?.slug || 'news';
  
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <Link 
        to={`/${categorySlug}/${article.slug}`}
        className="block group"
      >
        <div className="relative">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded-full">
            <Star className="h-4 w-4 fill-current" />
            <span className="text-xs font-bold uppercase">Editor's Pick</span>
          </div>
          <div className="aspect-[21/9] overflow-hidden">
            <img 
              src={getOptimizedHeroImage(article.featured_image_url || "/placeholder.svg", 1280)} 
              srcSet={article.featured_image_url?.includes('supabase.co/storage') ? generateResponsiveSrcSet(article.featured_image_url, [640, 960, 1280]) : undefined}
              sizes="(max-width: 768px) 100vw, 1280px"
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="eager"
              width={1280}
              height={549}
            />
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-xs">
              {article.categories?.name || "Uncategorized"}
            </Badge>
            {article.reading_time_minutes && (
              <span className="text-xs text-muted-foreground">
                {article.reading_time_minutes} min read
              </span>
            )}
          </div>
          <h3 className="font-bold text-xl mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-muted-foreground text-sm line-clamp-2">
              {article.excerpt}
            </p>
          )}
          {article.authors && (
            <p className="text-xs text-muted-foreground mt-3">
              By {article.authors.name}
            </p>
          )}
        </div>
      </Link>
    </Card>
  );
};

// Memoized and exported as EditorsPick
export const EditorsPick = memo(EditorsPickComponent, (prevProps, nextProps) => {
  return prevProps.article?.id === nextProps.article?.id;
});
