// Shared category color map — used across the site for badges, borders, labels
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

/**
 * @deprecated Use getCategoryFallbackImage for Storage-based fallbacks.
 * Returns a CSS gradient string for the given category slug.
 */
const CATEGORY_GRADIENTS: Record<string, string> = {
  news: "linear-gradient(135deg, #E06050 0%, #7f1d1d 100%)",
  business: "linear-gradient(135deg, #E5A54B 0%, #78350f 100%)",
  life: "linear-gradient(135deg, #c084fc 0%, #581c87 100%)",
  learn: "linear-gradient(135deg, #5F72FF 0%, #1e1b4b 100%)",
  create: "linear-gradient(135deg, #9B72FF 0%, #4c1d95 100%)",
  voices: "linear-gradient(135deg, #E0609B 0%, #831843 100%)",
};

const DEFAULT_GRADIENT = "linear-gradient(135deg, #5F72FF 0%, #1a1a2e 100%)";

export const getCategoryGradient = (slug: string | undefined | null): string => {
  if (!slug) return DEFAULT_GRADIENT;
  return CATEGORY_GRADIENTS[slug.toLowerCase()] ?? DEFAULT_GRADIENT;
};
