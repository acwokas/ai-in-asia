import SEOHead from "@/components/SEOHead";
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, X, Clock, Trash2, LogIn, Loader2 } from 'lucide-react';
import { useSavedArticles } from '@/hooks/useSavedArticles';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SavedArticles = () => {
  const { savedArticles, removeArticle, clearAll, loading } = useSavedArticles();
  const { user } = useAuth();

  const sortedArticles = [...savedArticles].sort((a, b) => b.savedAt - a.savedAt);

  const formatDate = (timestamp: number) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy');
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Saved Articles"
        description="Your saved articles from AI in ASIA."
        noIndex={true}
      />

      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <Bookmark className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Saved Articles</h1>
            </div>
            {sortedArticles.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearAll();
                  toast('Saved Articles cleared', { description: 'All saved articles have been removed.' });
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">
            {user ? 'Your saved articles sync across all your devices.' : 'Saved items live on this device only.'}
          </p>
        </div>

        {!user && sortedArticles.length > 0 && (
          <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-3">
              <LogIn className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Sign in to sync across devices</p>
                <p className="text-xs text-muted-foreground">Your saves will be backed up and available everywhere.</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedArticles.length === 0 ? (
          <Card className="p-8 text-center bg-card/50 border-border/40">
            <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No saved articles yet</h2>
            <p className="text-muted-foreground mb-6">
              When you save an article, it will appear here for easy access later.
            </p>
            <Button asChild>
              <Link to="/">Browse articles</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedArticles.map((article) => (
              <Card
                key={article.articleId || article.url}
                className="p-4 bg-card/50 border-border/40 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col min-[400px]:flex-row gap-4">
                  {article.featuredImageUrl && (
                    <Link to={article.url} className="flex-shrink-0">
                      <img
                        src={article.featuredImageUrl}
                        alt=""
                        className="w-full min-[400px]:w-24 h-40 min-[400px]:h-20 sm:w-32 sm:h-24 object-cover rounded-lg"
                        loading="lazy"
                      />
                    </Link>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Link
                          to={article.url}
                          className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2"
                        >
                          {article.title}
                        </Link>

                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {article.categoryName && (
                            <span className="text-primary">{article.categoryName}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Saved {formatDate(article.savedAt)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArticle(article.articleId || article.url)}
                        className="flex-shrink-0 h-10 w-10 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive"
                        aria-label="Remove from saved"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {article.excerpt && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 hidden sm:block">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SavedArticles;
