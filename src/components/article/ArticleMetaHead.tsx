import SEOHead from "@/components/SEOHead";
import { fixEncoding } from "@/lib/textUtils";

interface ArticleMetaHeadProps {
  article: {
    title: string;
    meta_title?: string | null;
    meta_description?: string | null;
    excerpt?: string | null;
    featured_image_url?: string | null;
    featured_image_alt?: string | null;
    published_at?: string | null;
    updated_at?: string | null;
    authors?: { name: string } | null;
    categories?: { name: string; slug: string } | null;
  };
  isPreview: boolean;
  getPublicArticleUrl: () => string;
}

export const ArticleMetaHead = ({ article, isPreview, getPublicArticleUrl }: ArticleMetaHeadProps) => {
  const cleanMetaValue = (value: string) => {
    return value
      .replace(/%%sep%%/g, '|')
      .replace(/%%sitename%%/g, 'AI in ASIA')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  const title = fixEncoding(cleanMetaValue((article.meta_title || article.title || 'Article') + ''));
  const description = fixEncoding(cleanMetaValue(article.meta_description || article.excerpt || ''));

  return (
    <SEOHead
      title={title}
      description={description}
      canonical={isPreview ? undefined : getPublicArticleUrl()}
      ogImage={article.featured_image_url || 'https://aiinasia.com/icons/aiinasia-512.png?v=3'}
      ogImageAlt={article.featured_image_alt || article.title}
      ogImageWidth="1200"
      ogImageHeight="630"
      ogType="article"
      noIndex={isPreview}
      articleMeta={{
        publishedTime: article.published_at || '',
        modifiedTime: article.updated_at || '',
        author: article.authors?.name || 'AI in ASIA',
        section: article.categories?.name || '',
      }}
    />
  );
};
