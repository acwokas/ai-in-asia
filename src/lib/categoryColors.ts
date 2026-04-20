// Shared category color map - used across the site for badges, borders, labels
const CATEGORY_COLORS: Record<string, string> = {
  news: "#E06050",
  business: "#E5A54B",
  life: "#c084fc",
  learn: "#5F72FF",
  create: "#9B72FF",
  voices: "#E0609B",
};

/** Returns a hex colour string for the given category slug. Falls back to teal. */
export const getCategoryColor = (slug: string | undefined | null): string => {
  if (!slug) return CATEGORY_COLORS.life; // default teal
  return CATEGORY_COLORS[slug.toLowerCase()] ?? "#0D9488";
};

/**
 * Category-based fallback hero images stored in Supabase Storage.
 * Returns a public URL for a gradient WebP image keyed by category slug.
 */
const STORAGE_BASE = "https://pbmtnvxywplgpldmlygv.supabase.co/storage/v1/object/public/article-images/defaults";

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  news: `${STORAGE_BASE}/category-fallback-news.webp`,
  business: `${STORAGE_BASE}/category-fallback-business.webp`,
  life: `${STORAGE_BASE}/category-fallback-life.webp`,
  learn: `${STORAGE_BASE}/category-fallback-learn.webp`,
  create: `${STORAGE_BASE}/category-fallback-create.webp`,
  voices: `${STORAGE_BASE}/category-fallback-voices.webp`,
};

const DEFAULT_FALLBACK_IMAGE = `${STORAGE_BASE}/category-fallback-learn.webp`;

/** Returns the Supabase Storage URL for a category fallback hero image. */
export const getCategoryFallbackImage = (slug: string | undefined | null): string => {
  if (!slug) return DEFAULT_FALLBACK_IMAGE;
  return CATEGORY_FALLBACK_IMAGES[slug.toLowerCase()] ?? DEFAULT_FALLBACK_IMAGE;
};

