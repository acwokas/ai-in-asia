import { Helmet } from "react-helmet-async";

const SITE_NAME = "AI in ASIA";
const SITE_URL = "https://aiinasia.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/icons/aiinasia-512.png?v=3`;
const TWITTER_HANDLE = "@aiinasia";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogImageWidth?: string;
  ogImageHeight?: string;
  ogType?: string;
  noIndex?: boolean;
  schemaJson?: Record<string, unknown> | Record<string, unknown>[];
  /** Additional article-specific meta (published_time, author, section, etc.) */
  articleMeta?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
  /** Extra children like preload/preconnect links */
  children?: React.ReactNode;
}

export const SEOHead = ({
  title,
  description,
  canonical,
  ogImage,
  ogImageAlt,
  ogImageWidth,
  ogImageHeight,
  ogType = "website",
  noIndex = false,
  schemaJson,
  articleMeta,
  children,
}: SEOHeadProps) => {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const resolvedImage = ogImage || DEFAULT_OG_IMAGE;
  const resolvedImageAlt = ogImageAlt || title;
  const twitterCard = ogImage ? "summary_large_image" : "summary";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:image" content={resolvedImage} />
      {ogImageWidth && <meta property="og:image:width" content={ogImageWidth} />}
      {ogImageHeight && <meta property="og:image:height" content={ogImageHeight} />}
      <meta property="og:image:alt" content={resolvedImageAlt} />
      <meta property="og:locale" content="en_US" />

      {/* Article-specific OG */}
      {articleMeta?.publishedTime && (
        <meta property="article:published_time" content={articleMeta.publishedTime} />
      )}
      {articleMeta?.modifiedTime && (
        <meta property="article:modified_time" content={articleMeta.modifiedTime} />
      )}
      {articleMeta?.author && (
        <meta property="article:author" content={articleMeta.author} />
      )}
      {articleMeta?.section && (
        <meta property="article:section" content={articleMeta.section} />
      )}
      {articleMeta?.tags?.map((tag, i) => (
        <meta key={i} property="article:tag" content={tag} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />
      <meta name="twitter:image:alt" content={resolvedImageAlt} />

      {/* Structured Data */}
      {schemaJson && (
        Array.isArray(schemaJson) ? (
          schemaJson.map((schema, i) => (
            <script key={i} type="application/ld+json">
              {JSON.stringify(schema)}
            </script>
          ))
        ) : (
          <script type="application/ld+json">
            {JSON.stringify(schemaJson)}
          </script>
        )
      )}

      {children}
    </Helmet>
  );
};

export default SEOHead;
