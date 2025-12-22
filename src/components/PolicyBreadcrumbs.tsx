import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface PolicyBreadcrumbsProps {
  regionName?: string;
  regionSlug?: string;
  articleTitle?: string;
}

const PolicyBreadcrumbs = ({ regionName, regionSlug, articleTitle }: PolicyBreadcrumbsProps) => {
  return (
    <nav className="mb-6 pb-3 border-b flex items-center gap-2 text-sm relative z-30" aria-label="Breadcrumb">
      <Link 
        to="/ai-policy-atlas" 
        className="text-primary hover:text-primary/80 transition-colors font-medium hover:underline py-1"
      >
        Policy Atlas
      </Link>
      
      {regionName && regionSlug && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {articleTitle ? (
            <Link 
              to={`/ai-policy-atlas/${regionSlug}`}
              className="text-primary hover:text-primary/80 transition-colors font-medium hover:underline py-1"
            >
              {regionName}
            </Link>
          ) : (
            <span className="text-foreground font-semibold py-1">{regionName}</span>
          )}
        </>
      )}
      
      {articleTitle && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-semibold line-clamp-1">
            {articleTitle}
          </span>
        </>
      )}
    </nav>
  );
};

export default PolicyBreadcrumbs;
