/**
 * Article Author Bio Component
 * Displays author bio section at the end of articles
 * Extracted from Article.tsx for maintainability
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, User, Share2, Bookmark, MessageCircle } from "lucide-react";
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

interface ArticleAuthorFooterProps {
  authors?: Author | null;
  categories?: Category | null;
  readingTime: number;
  publishedAt?: string | null;
  commentCount: number;
  isBookmarked: boolean;
  handleBookmark: () => void;
  handleShare: () => void;
}

export const ArticleAuthorFooter = ({
  authors,
  categories,
  readingTime,
  publishedAt,
  commentCount,
  isBookmarked,
  handleBookmark,
  handleShare
}: ArticleAuthorFooterProps) => {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex flex-col md:flex-row md:items-center gap-4 relative z-20">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {authors?.slug ? (
            <Link to={`/author/${authors.slug}`}>
              {authors.avatar_url ? (
                <img 
                  src={authors.avatar_url} 
                  alt={authors.name}
                  className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary hover:opacity-80 transition-opacity flex-shrink-0" />
              )}
            </Link>
          ) : (
            authors?.avatar_url ? (
              <img 
                src={authors.avatar_url} 
                alt={authors?.name || 'Anonymous'}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0" />
            )
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 font-semibold">
              <User className="h-4 w-4 flex-shrink-0" />
              {authors?.slug ? (
                <Link to={`/author/${authors.slug}`} className="hover:text-primary transition-colors truncate">
                  {authors.name}
                </Link>
              ) : (
                <span className="truncate">{authors?.name || 'Anonymous'}</span>
              )}
            </div>
            {authors?.job_title && (
              <div className="text-sm text-muted-foreground truncate">
                {authors.job_title}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Clock className="h-3 w-3 flex-shrink-0" />
              <span className="whitespace-nowrap">{readingTime} min read</span>
              <span>•</span>
              <span className="whitespace-nowrap">
                {publishedAt && new Date(publishedAt).toLocaleDateString("en-GB", {
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
            {authors && (
              <FollowButton
                followType="author"
                followId={authors.id}
                followName={authors.name}
              />
            )}
            {categories && (
              <FollowButton
                followType="category"
                followId={categories.id}
                followName={categories.name}
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
    </div>
  );
};

interface ArticleAuthorBioProps {
  authors?: Author | null;
}

export const ArticleAuthorBio = ({ authors }: ArticleAuthorBioProps) => {
  // Hide for Intelligence Desk
  if (!authors || authors.name === 'Intelligence Desk') return null;
  
  return (
    <div className="bg-muted/50 rounded-lg p-8 flex flex-col md:flex-row items-center md:items-start gap-6 mt-8">
      {authors.slug ? (
        <Link to={`/author/${authors.slug}`} className="flex-shrink-0">
          {authors.avatar_url ? (
            <img 
              src={authors.avatar_url} 
              alt={authors.name}
              className="w-32 h-32 rounded-full object-cover hover:opacity-80 transition-opacity ring-4 ring-background shadow-lg"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary hover:opacity-80 transition-opacity ring-4 ring-background shadow-lg" />
          )}
        </Link>
      ) : (
        authors.avatar_url ? (
          <img 
            src={authors.avatar_url} 
            alt={authors.name}
            className="w-32 h-32 rounded-full object-cover flex-shrink-0 ring-4 ring-background shadow-lg"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0 ring-4 ring-background shadow-lg" />
        )
      )}
      <div className="flex-1 text-center md:text-left">
        <h4 className="font-semibold text-xl mb-2">
          {authors.slug ? (
            <Link to={`/author/${authors.slug}`} className="hover:text-primary transition-colors">
              {authors.name}
            </Link>
          ) : (
            authors.name
          )}
        </h4>
        {authors.job_title && (
          <p className="text-base text-muted-foreground mb-3">
            {authors.job_title}
          </p>
        )}
        {authors.bio && (
          <p className="text-base text-muted-foreground leading-relaxed">
            {authors.bio}
          </p>
        )}
      </div>
    </div>
  );
};

export default ArticleAuthorBio;
