import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface PolicyBreadcrumbsProps {
  regionName?: string;
  regionSlug?: string;
  articleTitle?: string;
}

const PolicyBreadcrumbs = ({ regionName, regionSlug, articleTitle }: PolicyBreadcrumbsProps) => {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
      <Link 
        to="/ai-policy-atlas" 
        className="hover:text-primary transition-colors"
      >
        AI Policy Atlas
      </Link>
      
      {regionName && regionSlug && (
        <>
          <ChevronRight className="h-4 w-4" />
          {articleTitle ? (
            <Link 
              to={`/ai-policy-atlas/${regionSlug}`}
              className="hover:text-primary transition-colors"
            >
              {regionName}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{regionName}</span>
          )}
        </>
      )}
      
      {articleTitle && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium line-clamp-1">
            {articleTitle}
          </span>
        </>
      )}
    </nav>
  );
};

export default PolicyBreadcrumbs;
