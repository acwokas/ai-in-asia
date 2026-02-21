// Re-exports the shared ContentAdminControls for backwards compatibility
import { ContentAdminControls } from "@/components/ContentAdminControls";

interface Article {
  id: string;
  status: string;
  slug: string;
  title: string;
  view_count?: number | null;
  published_at?: string | null;
  featured_on_homepage?: boolean | null;
  meta_title?: string | null;
  meta_description?: string | null;
  categories?: { name: string; slug: string; id: string } | null;
  authors?: { name: string; slug: string } | null;
}

interface ArticleAdminControlsProps {
  article: Article;
  showAdminView: boolean;
  onToggleAdminView: () => void;
  queryKey: any[];
}

export const ArticleAdminControls = ({
  article,
  showAdminView,
  onToggleAdminView,
  queryKey,
}: ArticleAdminControlsProps) => {
  return (
    <ContentAdminControls
      item={article}
      type="article"
      showAdminView={showAdminView}
      onToggleAdminView={onToggleAdminView}
      queryKey={queryKey}
      categorySlug={article.categories?.slug}
      authorName={article.authors?.name}
    />
  );
};

export const ArticleAdminDebug = ({ article }: { article: any }) => null;

export default ArticleAdminControls;
