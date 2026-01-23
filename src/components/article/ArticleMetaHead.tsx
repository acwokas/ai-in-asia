import { Helmet } from "react-helmet";

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

  const title = cleanMetaValue((article.meta_title || article.title || 'Article') + '');
  const description = cleanMetaValue(article.meta_description || article.excerpt || '');

  return (
    <Helmet>
      <title>{title} | AI in ASIA</title>
      <meta name="description" content={description} />
      <meta name="author" content={article.authors?.name || 'AI in ASIA'} />
      <meta property="article:published_time" content={article.published_at || ''} />
      <meta property="article:modified_time" content={article.updated_at || ''} />
      <meta property="article:author" content={article.authors?.name || ''} />
      <meta property="article:section" content={article.categories?.name || ''} />
      <meta property="og:site_name" content="AI in ASIA" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={article.featured_image_url || 'https://aiinasia.com/favicon.png'} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={article.featured_image_alt || article.title} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={getPublicArticleUrl()} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@aiinasia" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={article.featured_image_url || 'https://aiinasia.com/favicon.png'} />
      <meta name="twitter:image:alt" content={article.featured_image_alt || article.title} />
      {isPreview ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <link rel="canonical" href={getPublicArticleUrl()} />
      )}
    </Helmet>
  );
};
