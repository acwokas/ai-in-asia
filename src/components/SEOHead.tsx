import { Helmet } from "react-helmet-async";

const SITE_NAME = "AI in ASIA";
const SITE_URL = "https://aiinasia.com";
// TODO: Create /public/icons/aiinasia-og-default.png at 1200Ã630 to replace the 512Ã512 icon fallback
const DEFAULT_OG_IMAGE = `${SITE_URL}/icons/aiinasia-og-default.png`;
const TWITTER_HANDLE = "@AI_in_Asia";

/**
 * Convert a Supabase article-image URL to its OG-optimized counterpart.
 * Convention: `og/{basename}-og.jpg` in the same bucket.
 *
 * Example:
 *   in:  .../article-images/content/my-hero-123.png
 *   out: .../article-images/og/my-hero-123-og.jpg
 *
 * Non-Supabase URLs are returned unchanged.
 */
const getOgImageUrl = (url: string): string => {
  if (!url.includes('/article-images/')) return url;
  try {
    const base = url.substring(0, url.indexOf('/article-images/') + '/article-images/'.length);
    const pathAfterBucket = url.substring(base.length); // e.g. "content/my-hero-123.png"
    const filename = pathAfterBucket.split('/').pop()!;           // "my-hero-123.png"
    const baseName = filename.replace(/\.[^/.]+$/, '');           // "my-hero-123"
    return `${base}og/${baseName}-og.jpg`;
  } catch {
    return url;
  }
};

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
    twitterHandle?: string;
  };
  /** Extra children like preload/preconnect links */
  children?: React.ReactNode;
}

const normalizeCanonical = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Force https and canonical domain
    parsed.protocol = "https:";
    parsed.hostname = "aiinasia.com";
    // Remove www
    if (parsed.hostname.startsWith("www.")) {
      parsed.hostname = parsed.hostname.replace("www.", "");
    }
    // Remove query params
    parsed.search = "";
    // Remove trailing slash (but keep root "/")
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.replace(/\/+$/, "");
    }
    return `${parsed.protocol}//${parsed.hostname}${path}`;
  } catch {
    return url;
  }
};

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
  // Use the OG-optimized JPEG for social sharing tags (WhatsApp needs <300 KB)
  const socialImage = ogImage ? getOgImageUrl(ogImage) : DEFAULT_OG_IMAGE;
  const resolvedImageAlt = ogImageAlt || title;
  const twitterCard = ogImage ? "summary_large_image" : "summary";
  const normalizedCanonical = canonical ? normalizeCanonical(canonical) : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {normalizedCanonical && <link rel="canonical" href={normalizedCanonical} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {normalizedCanonical && <meta property="og:url" content={normalizedCanonical} />}
      <meta property="og:image" content={socialImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={resolvedImageAlt} />
      <meta property="og:locale" content="en_GB" />

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
      {articleMeta?.twitterHandle && (
        <meta name="twitter:creator" content={`@${articleMeta.twitterHandle.replace(/^@/, '')}`} />
      )}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={socialImage} />
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
