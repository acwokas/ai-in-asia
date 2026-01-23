import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Eye, EyeOff, Send, Loader2 } from "lucide-react";

interface ArticleAdminControlsProps {
  articleId: string;
  articleStatus: string;
  showAdminView: boolean;
  isPublishing: boolean;
  onToggleAdminView: () => void;
  onPublish: () => void;
}

export const ArticleAdminControls = ({
  articleId,
  articleStatus,
  showAdminView,
  isPublishing,
  onToggleAdminView,
  onPublish,
}: ArticleAdminControlsProps) => {
  return (
    <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative z-10">
      <div className="flex items-center gap-2">
        <Edit className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium">Admin Controls</span>
        {articleStatus !== 'published' && (
          <Badge variant="outline" className="ml-2">
            {articleStatus}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleAdminView}
          className="cursor-pointer"
        >
          {showAdminView ? (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Normal View
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Admin View
            </>
          )}
        </Button>
        {articleStatus !== 'published' && (
          <Button
            variant="default"
            size="sm"
            onClick={onPublish}
            disabled={isPublishing}
            className="cursor-pointer"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publish Now
              </>
            )}
          </Button>
        )}
        <Button
          asChild
          size="sm"
          variant="outline"
          className="cursor-pointer"
        >
          <Link to={`/editor?id=${articleId}`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Article
          </Link>
        </Button>
      </div>
    </div>
  );
};

interface ArticleAdminDebugProps {
  article: {
    id: string;
    status: string;
    slug: string;
    view_count?: number | null;
    published_at?: string | null;
    featured_on_homepage?: boolean | null;
  };
}

export const ArticleAdminDebug = ({ article }: ArticleAdminDebugProps) => {
  return (
    <div className="mb-4 p-4 bg-muted/50 border border-border rounded-lg space-y-2">
      <h3 className="text-sm font-semibold mb-2">Article Metadata</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-muted-foreground">ID:</span> {article.id}</div>
        <div><span className="text-muted-foreground">Status:</span> {article.status}</div>
        <div><span className="text-muted-foreground">Slug:</span> {article.slug}</div>
        <div><span className="text-muted-foreground">Views:</span> {article.view_count || 0}</div>
        <div><span className="text-muted-foreground">Published:</span> {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Not published'}</div>
        <div><span className="text-muted-foreground">Featured:</span> {article.featured_on_homepage ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
};

export default ArticleAdminControls;
