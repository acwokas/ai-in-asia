import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface PolicyBreadcrumbsProps {
  regionName?: string;
  regionSlug?: string;
  articleTitle?: string;
}

const PolicyBreadcrumbs = ({ regionName, regionSlug, articleTitle }: PolicyBreadcrumbsProps) => {
  return (
    <nav className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 -mt-4 mb-6 border-b flex items-center gap-2 text-sm" aria-label="Breadcrumb">
      <Link 
        to="/ai-policy-atlas" 
        className="text-primary hover:text-primary/80 transition-colors font-medium hover:underline"
      >
        AI Policy Atlas
      </Link>
      
      {regionName && regionSlug && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {articleTitle ? (
            <Link 
              to={`/ai-policy-atlas/${regionSlug}`}
              className="text-primary hover:text-primary/80 transition-colors font-medium hover:underline"
            >
              {regionName}
            </Link>
          ) : (
            <span className="text-foreground font-semibold">{regionName}</span>
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
