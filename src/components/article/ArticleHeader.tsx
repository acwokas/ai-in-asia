/**
 * Article Header Component
 * Displays article title, author info, meta data, and action buttons
 * Extracted from Article.tsx for maintainability
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Share2, Bookmark, Loader2, Edit, Eye, EyeOff, Send, MessageCircle } from "lucide-react";
import FontSizeControl from "@/components/FontSizeControl";
import FollowButton from "@/components/FollowButton";

interface Author {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  avatar_url?: string;
  job_title?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ArticleHeaderProps {
  article: {
    id: string;
    title: string;
    excerpt?: string | null;
    status: string;
    reading_time_minutes?: number | null;
    published_at?: string | null;
    authors?: Author | null;
    categories?: Category | null;
  };
  sponsor?: {
    sponsor_name: string;
    sponsor_logo_url: string;
    sponsor_website_url: string;
    sponsor_tagline?: string | null;
  } | null;
  isPreview: boolean;
  isAdmin: boolean;
  isLoadingAdmin: boolean;
  showAdminView: boolean;
  setShowAdminView: (show: boolean) => void;
  isPublishing: boolean;
  handlePublish: () => void;
  isBookmarked: boolean;
  handleBookmark: () => void;
  handleShare: () => void;
  commentCount: number;
  onSponsorClick?: () => void;
}

const ArticleHeader = ({
  article,
  sponsor,
  isPreview,
  isAdmin,
  isLoadingAdmin,
  showAdminView,
  setShowAdminView,
  isPublishing,
  handlePublish,
  isBookmarked,
  handleBookmark,
  handleShare,
  commentCount,
  onSponsorClick
}: ArticleHeaderProps) => {
  return (
    <header className="mb-8">
      {isPreview && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            🔒 Preview Mode - This article is not publicly visible
          </p>
        </div>
      )}

      {/* Admin Controls */}
      {!isLoadingAdmin && isAdmin && (
        <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <Edit className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium">Admin Controls</span>
            {article.status !== 'published' && (
              <Badge variant="outline" className="ml-2">
                {article.status}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdminView(!showAdminView)}
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
            {article.status !== 'published' && (
              <Button
                variant="default"
                size="sm"
                onClick={handlePublish}
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
              <Link to={`/editor?id=${article.id}`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Article
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Admin Debug Info */}
      {!isLoadingAdmin && isAdmin && showAdminView && (
        <div className="mb-4 p-4 bg-muted/50 border border-border rounded-lg space-y-2">
          <h3 className="text-sm font-semibold mb-2">Article Metadata</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">ID:</span> {article.id}</div>
            <div><span className="text-muted-foreground">Status:</span> {article.status}</div>
          </div>
        </div>
      )}
      
      <Badge className="mb-4 bg-primary text-primary-foreground">
        {article.categories?.name || 'Article'}
      </Badge>
      
      

      
      <h1 className="headline text-4xl md:text-5xl mb-4">
        {article.title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")}
      </h1>
      
      {article.excerpt && (
        <p className="text-xl text-muted-foreground mb-6">
          {article.excerpt}
        </p>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-4 pb-6 border-b border-border relative z-20">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {article.authors?.slug ? (
            <Link to={`/author/${article.authors.slug}`}>
              {article.authors.avatar_url ? (
                <img 
                  src={article.authors.avatar_url} 
                  alt={article.authors.name}
                  className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary hover:opacity-80 transition-opacity flex-shrink-0" />
              )}
            </Link>
          ) : (
            article.authors?.avatar_url ? (
              <img 
                src={article.authors.avatar_url} 
                alt={article.authors?.name || 'Anonymous'}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0" />
            )
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 font-semibold">
              <User className="h-4 w-4 flex-shrink-0" />
              {article.authors?.slug ? (
                <Link to={`/author/${article.authors.slug}`} className="hover:text-primary transition-colors truncate">
                  {article.authors.name}
                </Link>
              ) : (
                <span className="truncate">{article.authors?.name || 'Anonymous'}</span>
              )}
            </div>
            {article.authors?.job_title && (
              <div className="text-sm text-muted-foreground truncate">
                {article.authors.job_title}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="whitespace-nowrap">{article.reading_time_minutes || 5} min read</span>
              <span>•</span>
              <span className="whitespace-nowrap">
                {article.published_at && new Date(article.published_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span>•</span>
              <button 
                onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
              >
                <MessageCircle className="h-3 w-3 flex-shrink-0" />
                <span className="whitespace-nowrap">{commentCount} comments</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
            {article.authors && (
              <FollowButton
                followType="author"
                followId={article.authors.id}
                followName={article.authors.name}
              />
            )}
            {article.categories && (
              <FollowButton
                followType="category"
                followId={article.categories.id}
                followName={article.categories.name}
              />
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-auto md:ml-0">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleBookmark}
              title={isBookmarked ? "Remove bookmark" : "Bookmark article"}
              className="h-8 w-8 cursor-pointer"
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </Button>
            
            <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1 h-8">
              <FontSizeControl />
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleShare}
              title="Share article"
              className="h-8 w-8 cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ArticleHeader;
