import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ExternalLink, Loader2, Wrench, Clock 
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

interface AdminMigrationTabProps {
  calculatingReadingTimes: boolean;
  readingTimeProgress: { current: number; total: number };
  autoScheduling: boolean;
  onCalculateReadingTimes: () => void;
  onAutoScheduleComments: () => void;
}

export const AdminMigrationTab = ({
  calculatingReadingTimes,
  readingTimeProgress,
  autoScheduling,
  onCalculateReadingTimes,
  onAutoScheduleComments,
}: AdminMigrationTabProps) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Migration Tools & Utilities
        </CardTitle>
        <CardDescription>
          Bulk operations, content migration, image processing, and AI-powered tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Migration & Import Tools */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Migration & Import</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/migration-dashboard")} variant="outline" className="justify-start">
              Migration Dashboard
            </Button>
            <Button onClick={() => navigate("/admin/bulk-import")} variant="outline" className="justify-start">
              Bulk Import Articles
            </Button>
            <Button onClick={() => navigate("/admin/migrate-category-urls")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
              Migrate to Category URLs
            </Button>
            <Button onClick={() => navigate("/admin/bulk-redirects")} variant="outline" className="justify-start">
              Bulk URL Redirects
            </Button>
            <Button onClick={() => navigate("/admin/extract-image-urls")} variant="outline" className="justify-start">
              Extract Image URLs
            </Button>
            <Button onClick={() => navigate("/admin/category-mapper")} variant="outline" className="justify-start">
              Category Mapper
            </Button>
          </div>
        </div>

        {/* Content Processing */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Content Processing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/clean-articles")} variant="outline" className="justify-start">
              Clean Article Formatting
            </Button>
            <Button onClick={() => navigate("/admin/content-processor")} variant="outline" className="justify-start">
              Content Processor
            </Button>
            <Button onClick={() => navigate("/admin/assign-categories")} variant="outline" className="justify-start">
              Auto-Assign Categories
            </Button>
            <div className="col-span-full">
              <Button 
                onClick={onCalculateReadingTimes} 
                variant="outline" 
                className="w-full justify-start bg-blue-500/10 border-blue-500 text-blue-700 hover:bg-blue-500/20"
                disabled={calculatingReadingTimes}
              >
                {calculatingReadingTimes ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Calculate Reading Times
                  </>
                )}
              </Button>
              {calculatingReadingTimes && readingTimeProgress.total > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Processing articles...</span>
                    <span>{readingTimeProgress.current} / {readingTimeProgress.total}</span>
                  </div>
                  <Progress 
                    value={(readingTimeProgress.current / readingTimeProgress.total) * 100} 
                    className="h-2"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image Tools */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Image Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/image-migration")} variant="outline" className="justify-start">
              Image Migration
            </Button>
            <Button onClick={() => navigate("/admin/update-article-images")} variant="outline" className="justify-start">
              Update Article Images
            </Button>
            <Button onClick={() => navigate("/admin/fix-broken-image")} variant="outline" className="justify-start">
              Fix Broken Images
            </Button>
            <Button onClick={() => navigate("/admin/optimize-images")} variant="outline" className="justify-start">
              Optimize Article Images
            </Button>
          </div>
        </div>

        {/* AI & Generation Tools */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">AI & Generation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/generate-tldr")} variant="outline" className="justify-start">
              Generate TLDR (Bulk)
            </Button>
            <Button onClick={() => navigate("/admin/bulk-comments")} variant="outline" className="justify-start">
              Generate Comments (Bulk)
            </Button>
            <Button onClick={() => navigate("/admin/ai-comments")} variant="outline" className="justify-start bg-green-500/10 border-green-500 text-green-700 hover:bg-green-500/20">
              AI Comments Manager
            </Button>
            <Button onClick={() => navigate("/admin/knowledge-engine")} variant="outline" className="justify-start bg-purple-500/10 border-purple-500 text-purple-700 hover:bg-purple-500/20">
              Knowledge Engine
            </Button>
            <Button onClick={() => navigate("/admin/process-comments")} variant="outline" className="justify-start bg-green-500/10 border-green-500 text-green-700 hover:bg-green-500/20">
              Process Pending Comments
            </Button>
            <Button onClick={() => navigate("/admin/migrate-toplist-images")} variant="outline" className="justify-start bg-blue-500/10 border-blue-500 text-blue-700 hover:bg-blue-500/20">
              Migrate Top List Images
            </Button>
            <Button
              onClick={onAutoScheduleComments}
              variant="outline" 
              className="justify-start bg-primary/5"
              disabled={autoScheduling}
            >
              {autoScheduling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                "Auto-Schedule Comments"
              )}
            </Button>
          </div>
        </div>

        {/* Utility Tools */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Utilities</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button onClick={() => navigate("/admin/remove-tweets")} variant="outline" className="justify-start">
              Remove Tweet Links
            </Button>
            <Button onClick={() => navigate("/admin/fix-migrated-content")} variant="outline" className="justify-start">
              Fix Migrated Content
            </Button>
            <Button onClick={() => navigate("/admin/fix-external-links")} variant="outline" className="justify-start">
              Fix External Links
            </Button>
            <Button onClick={() => navigate("/admin/csv-url-replacer")} variant="outline" className="justify-start">
              CSV URL Replacer
            </Button>
            <Button onClick={() => navigate("/admin/bulk-links-undo")} variant="outline" className="justify-start">
              Undo Bulk Links
            </Button>
            <Button onClick={() => navigate("/admin/guides-import")} variant="outline" className="justify-start">
              Import Guides
            </Button>
            <Button onClick={() => navigate("/admin/newsletter-import")} variant="outline" className="justify-start">
              Import Subscribers
            </Button>
            <Button onClick={() => navigate("/admin/404-analytics")} variant="outline" className="justify-start">
              404 Analytics
            </Button>
            <Button onClick={() => navigate("/admin/upload-author-avatars")} variant="outline" className="justify-start">
              Upload Author Avatars
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

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
