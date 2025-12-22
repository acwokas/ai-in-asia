import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ArrowRight, Clock } from 'lucide-react';
import { useRecentArticles } from '@/hooks/useRecentArticles';

interface RecentlyViewedArticlesProps {
  excludeUrl?: string;
  maxItems?: number;
  title?: string;
}

export const RecentlyViewedArticles = ({
  excludeUrl,
  maxItems = 5,
  title = 'Continue reading',
}: RecentlyViewedArticlesProps) => {
  const { getRecent } = useRecentArticles();
  const recentItems = getRecent(maxItems, excludeUrl);

  if (recentItems.length === 0) return null;

  return (
    <Card className="p-6 bg-card/50 border-border/40 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-sm text-primary font-medium mb-4">
        <Clock className="h-4 w-4" />
        {title}
      </div>
      
      <ul className="space-y-3">
        {recentItems.map((item) => (
          <li key={item.url}>
            <Link 
              to={item.url} 
              className="group flex items-start gap-3 text-sm hover:text-primary transition-colors"
            >
              {item.featuredImageUrl && (
                <img
                  src={item.featuredImageUrl}
                  alt=""
                  className="w-16 h-12 object-cover rounded flex-shrink-0"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <span className="line-clamp-2 group-hover:underline">
                  {item.title}
                </span>
                {item.categoryName && (
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {item.categoryName}
                  </span>
                )}
              </div>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default RecentlyViewedArticles;
