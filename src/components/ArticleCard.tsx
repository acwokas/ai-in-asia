import { memo } from "react";
import { Link } from "react-router-dom";
import { User, TrendingUp, MessageCircle } from "lucide-react";
import { getOptimizedThumbnail, generateResponsiveSrcSet } from "@/lib/imageOptimization";
import { ProgressiveImage } from "@/components/ProgressiveImage";
import { ReadingTimeIndicator } from "@/components/ReadingTimeIndicator";
import { getCategoryColor } from "@/lib/categoryColors";

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
  publishedAt?: string;
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
  commentCount = 0,
  publishedAt
}: ArticleCardProps) => {
  // Freshness check
  const isNew = publishedAt && (Date.now() - new Date(publishedAt).getTime()) < 24 * 60 * 60 * 1000;

  // Single label: Freshness > Trending > Category
  const label = isNew ? "NEW" : isTrending ? "TRENDING" : category.toUpperCase();
  const catColor = getCategoryColor(categorySlug);
  const labelColor = isNew ? "text-editorial" : isTrending ? "text-editorial" : undefined;

  return (
    <article className={`article-card group hover:-translate-y-px hover:border-b-primary/50 transition-all duration-300 ${featured ? 'md:col-span-2 md:row-span-2' : ''}`}>
      <Link to={`/${categorySlug}/${slug}`} className="flex flex-col h-full">
        <div className="relative aspect-[16/9] overflow-hidden rounded-t-lg">
          <ProgressiveImage
            src={getOptimizedThumbnail(image, featured ? 800 : 400, featured ? 450 : 225)} 
            srcSet={image.includes('supabase.co/storage') ? generateResponsiveSrcSet(image, featured ? [400, 800, 1200] : [200, 400, 600]) : undefined}
            sizes={featured ? "(max-width: 768px) 100vw, 800px" : "(max-width: 768px) 100vw, 400px"}
            alt={title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
            className="transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
            width={featured ? 800 : 450}
            height={featured ? 450 : 253}
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>
        
        <div className="p-5 flex flex-col flex-1">
          <span className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${labelColor || ''}`} style={labelColor ? undefined : { color: catColor }}>
            {isTrending && !isNew && <TrendingUp className="h-3 w-3" />}
            {label}
            {seriesPart && seriesTotal && (
              <span className="text-muted-foreground font-normal normal-case tracking-normal ml-1">· Part {seriesPart}/{seriesTotal}</span>
            )}
          </span>

          <h3 className={`font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200 ${
            featured ? 'text-2xl md:text-3xl' : 'text-lg'
          }`}>
            {title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
          </h3>
          
          <p className={`text-muted-foreground line-clamp-2 mt-2 ${
            featured ? 'text-base' : 'text-sm'
          }`}>
            {excerpt}
          </p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span>{author}</span>
            </div>
            <div className="flex items-center gap-3">
              {publishedAt && (
                <span>{new Date(publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              )}
              {commentCount > 0 && (
                <div className="flex items-center gap-1 text-primary">
                  <MessageCircle className="h-3 w-3" />
                  <span>{commentCount}</span>
                </div>
              )}
              <ReadingTimeIndicator minutes={parseInt(readTime) || 5} />
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default memo(ArticleCard);
