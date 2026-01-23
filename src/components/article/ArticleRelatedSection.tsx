import ArticleCard from "@/components/ArticleCard";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface RelatedArticle {
  id: string;
  title: string;
  excerpt?: string | null;
  slug: string;
  featured_image_url?: string | null;
  reading_time_minutes?: number | null;
  comment_count?: number | null;
  authors?: { name: string; slug?: string } | null;
  categories?: { name: string; slug: string } | null;
}

interface ExternalLinkData {
  text: string;
  url: string;
  icon: string;
}

interface ArticleRelatedSectionProps {
  relatedArticles: RelatedArticle[];
  externalLink: ExternalLinkData;
}

export const ArticleRelatedSection = ({ 
  relatedArticles, 
  externalLink 
}: ArticleRelatedSectionProps) => {
  if (!relatedArticles || relatedArticles.length === 0) return null;

  return (
    <section className="bg-muted/30 py-12 mt-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="headline text-3xl mb-8">You may also like:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedArticles.map((article) => (
            <ArticleCard
              key={article.id}
              title={article.title}
              excerpt={article.excerpt || ""}
              category={article.categories?.name || ""}
              categorySlug={article.categories?.slug || "uncategorized"}
              author={article.authors?.name || ""}
              readTime={`${article.reading_time_minutes || 5} min read`}
              image={article.featured_image_url || ""}
              slug={article.slug}
              commentCount={article.comment_count || 0}
            />
          ))}
          
          {/* External Link Card for SEO */}
          <a 
            href={externalLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="article-card group hover:shadow-lg transition-shadow"
          >
            <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-6xl">{externalLink.icon}</span>
            </div>
            
            <div className="p-6">
              <h3 className="headline text-xl mb-3 hover:text-primary transition-colors flex items-center gap-2">
                {externalLink.text}
                <ExternalLink className="h-4 w-4" />
              </h3>
              
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                Explore cutting-edge AI technology and interactive experiences
              </p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  External Resource
                </Badge>
              </div>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};

// Helper to determine external link based on category
export const getExternalLinkForCategory = (categoryName: string | undefined): ExternalLinkData => {
  const name = categoryName?.toLowerCase() || '';
  
  if (name.includes('ai') || name.includes('machine learning')) {
    return {
      text: 'Try ChatGPT',
      url: 'https://chat.openai.com',
      icon: '🤖'
    };
  } else if (name.includes('robotics')) {
    return {
      text: 'Try Gemini AI',
      url: 'https://gemini.google.com',
      icon: '✨'
    };
  } else {
    return {
      text: 'Explore Google Gemini',
      url: 'https://gemini.google.com',
      icon: '🚀'
    };
  }
};

export default ArticleRelatedSection;
