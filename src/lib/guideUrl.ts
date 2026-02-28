/** Build the canonical URL path for a guide */
export const guideUrl = (slug: string, topicCategory?: string | null): string => {
  const cat = (topicCategory || "general").toLowerCase().replace(/\s+/g, "-");
  return `/guides/${cat}/${slug}`;
};
