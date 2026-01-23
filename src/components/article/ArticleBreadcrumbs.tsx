import { Link } from "react-router-dom";
import PolicyBreadcrumbs from "@/components/PolicyBreadcrumbs";

interface ArticleBreadcrumbsProps {
  articleType?: string | null;
  categoryName?: string;
  categorySlug?: string;
  articleTitle: string;
}

export const ArticleBreadcrumbs = ({
  articleType,
  categoryName,
  categorySlug,
  articleTitle,
}: ArticleBreadcrumbsProps) => {
  if (articleType === 'policy_article') {
    return (
      <PolicyBreadcrumbs 
        regionName={categoryName}
        regionSlug={categorySlug}
        articleTitle={articleTitle}
      />
    );
  }

  return (
    <nav className="text-sm text-muted-foreground mb-6">
      <Link to="/" className="hover:text-primary">Home</Link>
      <span className="mx-2">›</span>
      {categoryName && categorySlug && (
        <>
          <Link to={`/category/${categorySlug}`} className="hover:text-primary">
            {categoryName}
          </Link>
          <span className="mx-2">›</span>
        </>
      )}
      <span>{articleTitle.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}</span>
    </nav>
  );
};

export default ArticleBreadcrumbs;
