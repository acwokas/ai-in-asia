import { memo } from "react";
import { Link } from "react-router-dom";
import { Clock, User, TrendingUp, BookOpen, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getOptimizedThumbnail, generateResponsiveSrcSet } from "@/lib/imageOptimization";

interface ArticleCardProps {
  title: string;
  excerpt: string;
  category: string;
  categorySlug: string;
  author: string;
  readTime: string;
  image: string;
  slug: string;
  featured?: boolean;
  isTrending?: boolean;
  seriesPart?: number;
  seriesTotal?: number;
  commentCount?: number;
}

const ArticleCard = ({ 
  title, 
  excerpt, 
  category,
  categorySlug,
  author, 
  readTime, 
  image,
  slug,
  featured = false,
  isTrending = false,
  seriesPart,
  seriesTotal,
  commentCount = 0
}: ArticleCardProps) => {
  return (
    <article className={`article-card ${featured ? 'md:col-span-2 md:row-span-2' : ''}`}>
      <Link to={`/${categorySlug}/${slug}`} className="block">
        <div className="relative aspect-video overflow-hidden">
          <img 
            src={getOptimizedThumbnail(image, featured ? 800 : 400, featured ? 600 : 300)} 
            srcSet={image.includes('supabase.co/storage') ? generateResponsiveSrcSet(image, featured ? [400, 800, 1200] : [200, 400, 600]) : undefined}
            sizes={featured ? "(max-width: 768px) 100vw, 800px" : "(max-width: 768px) 100vw, 400px"}
            alt={title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
            width={featured ? 800 : 400}
            height={featured ? 600 : 300}
          />
          <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
            <Badge className="bg-primary text-primary-foreground">
              {category}
            </Badge>
            {isTrending && (
              <Badge className="bg-orange-500 text-white flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Trending
              </Badge>
            )}
            {seriesPart && seriesTotal && (
              <Badge variant="outline" className="bg-background/90 flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {seriesPart}/{seriesTotal}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="p-6">
          <h3 className={`headline mb-3 hover:text-primary transition-colors ${
            featured ? 'text-3xl md:text-4xl' : 'text-xl'
          }`}>
            {title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
          </h3>
          
          <p className={`text-muted-foreground mb-4 line-clamp-2 ${
            featured ? 'text-lg' : 'text-sm'
          }`}>
            {excerpt}
          </p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span>{author}</span>
            </div>
            <div className="flex items-center gap-3">
              {commentCount > 0 && (
                <div className="flex items-center gap-1 text-primary">
                  <MessageCircle className="h-3 w-3" />
                  <span>{commentCount}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{readTime}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default memo(ArticleCard);
