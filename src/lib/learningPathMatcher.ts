import { LEARNING_PATHS, type LearningPath } from "@/constants/learningPaths";

/**
 * Normalize a tag for flexible matching:
 * - lowercase
 * - strip hyphens and extra whitespace
 * - trim
 */
function normalizeTag(tag: string): string {
  return tag.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Check if two tags match with fuzzy logic:
 * - Exact normalized match
 * - One contains the other as a whole word boundary
 * - Handle common expansions (e.g. "ai" ↔ "artificial intelligence")
 */
const EXPANSIONS: Record<string, string[]> = {
  ai: ["artificial intelligence"],
  "artificial intelligence": ["ai"],
  ml: ["machine learning"],
  "machine learning": ["ml"],
  nlp: ["natural language processing"],
  "natural language processing": ["nlp"],
  llm: ["large language model", "large language models"],
  llms: ["large language model", "large language models", "llm"],
  sea: ["southeast asia"],
  "southeast asia": ["sea", "asean"],
  asean: ["southeast asia", "sea"],
};

function fuzzyTagMatch(pathTag: string, articleTag: string): boolean {
  const pt = normalizeTag(pathTag);
  const at = normalizeTag(articleTag);

  // Exact match
  if (pt === at) return true;

  // One contains the other
  if (at.includes(pt) || pt.includes(at)) return true;

  // Expansion match
  const expansions = EXPANSIONS[pt];
  if (expansions?.some((exp) => at.includes(exp) || exp.includes(at))) return true;

  return false;
}

/**
 * Check if an article matches a learning path's tags.
 * Returns true if any path tag matches any article tag (fuzzy).
 */
export function articleMatchesPath(
  article: {
    ai_tags?: string[] | null;
    topic_tags?: string[] | null;
    article_tags?: Array<{ tags?: { name?: string } | null }> | null;
    title?: string;
  },
  path: LearningPath
): boolean {
  const articleTags = [
    ...(article.ai_tags || []),
    ...(article.topic_tags || []),
    ...(article.article_tags || [])
      .map((at: any) => at.tags?.name)
      .filter(Boolean),
  ];

  const title = article.title || "";

  return path.tags.some(
    (pt) =>
      articleTags.some((at) => fuzzyTagMatch(pt, at)) ||
      normalizeTag(title).includes(normalizeTag(pt))
  );
}

/**
 * Filter articles for a learning path with dev-mode count warning.
 */
export function filterArticlesForPath(
  articles: any[],
  path: LearningPath,
  maxCount?: number
): any[] {
  const matched = articles.filter((a) => articleMatchesPath(a, path));

  // Dev-only warning when matched count is less than declared
  if (
    import.meta.env.DEV &&
    matched.length < path.articles
  ) {
    console.warn(
      `[Learning Path] "${path.title}" matched ${matched.length}/${path.articles} articles. ` +
        `Tags: [${path.tags.join(", ")}]`
    );
  }

  return matched.slice(0, maxCount ?? path.articles + 4);
}

/**
 * Find all learning paths that an article belongs to.
 * Returns array of { categorySlug, path } objects.
 */
export function findPathsForArticle(article: {
  ai_tags?: string[] | null;
  topic_tags?: string[] | null;
  article_tags?: Array<{ tags?: { name?: string } | null }> | null;
  title?: string;
}): Array<{ categorySlug: string; path: LearningPath }> {
  const results: Array<{ categorySlug: string; path: LearningPath }> = [];

  for (const [categorySlug, paths] of Object.entries(LEARNING_PATHS)) {
    for (const path of paths) {
      if (articleMatchesPath(article, path)) {
        results.push({ categorySlug, path });
      }
    }
  }

  return results;
}
