import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ExternalLink
} from "lucide-react";
import AIToolsManager from "@/pages/AIToolsManager";

interface RecentArticle {
  id: string;
  title: string;
  status: string;
  created_at: string;
  authors: { name: string } | null;
}

interface PendingComment {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
  articles: { title: string; slug: string } | null;
}

interface AdminRecentArticlesTabProps {
  articles: RecentArticle[] | undefined;
}

export const AdminRecentArticlesTab = ({ articles }: AdminRecentArticlesTabProps) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Articles</CardTitle>
        <CardDescription>Latest articles across all statuses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {articles?.map((article) => (
            <div key={article.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h3 className="font-semibold">{article.title}</h3>
                <p className="text-sm text-muted-foreground">
                  by {article.authors?.name || "Unknown"} • {article.status}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/editor?id=${article.id}`)}
              >
                Edit
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate("/admin/articles")}>
            View All Articles
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface AdminPendingCommentsTabProps {
  comments: PendingComment[] | undefined;
  onApprove: (id: string) => void;
  onDelete: (id: string) => void;
}

export const AdminPendingCommentsTab = ({ comments, onApprove, onDelete }: AdminPendingCommentsTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Comments</CardTitle>
        <CardDescription>Comments awaiting moderation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {comments?.map((comment) => (
            <div key={comment.id} className="p-4 bg-destructive/10 border-2 border-destructive rounded-lg hover:bg-destructive/20 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-destructive">{comment.author_name}</p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onApprove(comment.id)}
                  >
                    Approve
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onDelete(comment.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <p className="text-sm mb-2 text-foreground">{comment.content}</p>
              <button 
                onClick={() => {
                  const article = comment.articles as any;
                  if (article?.slug) {
                    const categorySlug = article.categories?.slug || 'uncategorized';
                    window.open(`/${categorySlug}/${article.slug}#comments`, '_blank');
                  }
                }}
                className="text-xs text-destructive hover:underline flex items-center gap-1 font-medium"
              >
                On: {comment.articles?.title}
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          ))}
          {(!comments || comments.length === 0) && (
            <p className="text-muted-foreground text-center py-4">
              No pending comments
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const AdminToolsTab = () => (
  <Card>
    <CardContent className="pt-6">
      <AIToolsManager />
    </CardContent>
  </Card>
);

interface AdminSettingsTabProps {
  onOpenGoogleAds: () => void;
  onOpenNewsletter: () => void;
}

export const AdminSettingsTab = ({ onOpenGoogleAds, onOpenNewsletter }: AdminSettingsTabProps) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Settings</CardTitle>
        <CardDescription>Configure global site settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button onClick={onOpenGoogleAds} variant="outline" className="justify-start">
            Configure Google Ads
          </Button>
          <Button onClick={onOpenNewsletter} variant="outline" className="justify-start">
            Newsletter Popup Settings
          </Button>
          <Button onClick={() => navigate("/admin/redirects")} variant="outline" className="justify-start">
            URL Redirects
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
