import { Button } from '@/components/ui/button';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useSavedArticles, SavedArticle } from '@/hooks/useSavedArticles';
import { useToast } from '@/hooks/use-toast';

interface ArticleSaveButtonProps {
  article: Omit<SavedArticle, 'savedAt'>;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export const ArticleSaveButton = ({
  article,
  variant = 'ghost',
  size = 'icon',
  showLabel = false,
  className = '',
}: ArticleSaveButtonProps) => {
  const { isSaved, toggleSave } = useSavedArticles();
  const { toast } = useToast();
  const saved = isSaved(article.url);

  const handleClick = () => {
    const wasSaved = toggleSave(article);
    toast({
      title: wasSaved ? 'Article saved' : 'Article removed',
      description: wasSaved 
        ? 'Find it anytime in your Saved Articles' 
        : 'Removed from your saved list',
    });
  };

  if (showLabel) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
      >
        {saved ? (
          <>
            <BookmarkCheck className="h-4 w-4 mr-2 text-primary" />
            Saved
          </>
        ) : (
          <>
            <Bookmark className="h-4 w-4 mr-2" />
            Save article
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      aria-label={saved ? 'Remove from saved' : 'Save article'}
      className={className}
    >
      {saved ? (
        <BookmarkCheck className="h-5 w-5 text-primary" />
      ) : (
        <Bookmark className="h-5 w-5" />
      )}
    </Button>
  );
};

export default ArticleSaveButton;
