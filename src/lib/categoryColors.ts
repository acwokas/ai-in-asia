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
