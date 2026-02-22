import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const PAGE_SIZE = 20;

const ProfileReadingHistory = () => {
  const { user } = useAuth();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading } = useQuery({
    queryKey: ['reading-history', user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_history')
        .select('id, read_at, completed, article_id, articles(title, slug, featured_image_url, primary_category_id, categories:primary_category_id(name, slug))')
        .eq('user_id', user!.id)
        .order('read_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const items = data || [];
  const inProgress = items.filter(i => !i.completed);
  const completed = items.filter(i => i.completed);
  const hasMore = items.length === limit;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No reading history yet</h3>
          <p className="text-muted-foreground">Articles you read will appear here.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/articles">Browse Articles</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const renderItem = (item: typeof items[0]) => {
    const article = item.articles as any;
    const category = article?.categories as any;
    return (
      <Link
        key={item.id}
        to={`/${category?.slug || 'article'}/${article?.slug}`}
        className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
      >
        {article?.featured_image_url ? (
          <img
            src={article.featured_image_url}
            alt=""
            className="w-16 h-12 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-12 rounded bg-muted flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm line-clamp-1">{article?.title || 'Untitled'}</p>
          <div className="flex items-center gap-2 mt-1">
            {category?.name && (
              <Badge variant="secondary" className="text-xs">{category.name}</Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {format(new Date(item.read_at), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
        {item.completed ? (
          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
        )}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {inProgress.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Continue Reading
            </h3>
            <div className="divide-y divide-border">
              {inProgress.map(renderItem)}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Recently Read
          </h3>
          <div className="divide-y divide-border">
            {(inProgress.length > 0 ? completed : items).map(renderItem)}
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setLimit(prev => prev + PAGE_SIZE)}
            >
              Load more
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileReadingHistory;
