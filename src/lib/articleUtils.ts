export function getEditorialTag(article: any): string {
  const tags = (article.ai_tags || []).map((t: string) => t.toLowerCase());
  const title = (article.title || '').toLowerCase();
  if (tags.some((t: string) => t.includes('how-to') || t.includes('tutorial')) || title.includes('how to')) return 'How-To';
  if (tags.some((t: string) => t.includes('guide')) || title.includes('guide')) return 'Guide';
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  if (article.published_at && new Date(article.published_at) < sixMonthsAgo) return 'Timeless';
  if (tags.some((t: string) => t.includes('tool')) || article.article_type === 'tools') return 'Evergreen';
  return 'Essential';
}
