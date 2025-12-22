import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'aiinasia_recent_articles';
const MAX_RECENT = 10;

export interface RecentArticle {
  id: string;
  title: string;
  url: string;
  viewedAt: number;
  featuredImageUrl?: string;
  categoryName?: string;
  categorySlug?: string;
}

export const useRecentArticles = () => {
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);

  const readRecent = useCallback((): RecentArticle[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading recent articles:', e);
      return [];
    }
  }, []);

  const writeRecent = useCallback((items: RecentArticle[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setRecentArticles(items);
    } catch (e) {
      console.error('Error writing recent articles:', e);
    }
  }, []);

  useEffect(() => {
    setRecentArticles(readRecent());
  }, [readRecent]);

  const trackView = useCallback((article: Omit<RecentArticle, 'viewedAt'>) => {
    const current = readRecent();
    // Remove existing entry for this URL (will be re-added at top)
    const filtered = current.filter(item => item.url !== article.url);
    const entry: RecentArticle = { ...article, viewedAt: Date.now() };
    const updated = [entry, ...filtered].slice(0, MAX_RECENT);
    writeRecent(updated);
  }, [readRecent, writeRecent]);

  const getRecent = useCallback((count: number = 5, excludeUrl?: string): RecentArticle[] => {
    let items = recentArticles;
    if (excludeUrl) {
      items = items.filter(item => item.url !== excludeUrl);
    }
    return items.slice(0, count);
  }, [recentArticles]);

  return {
    recentArticles,
    trackView,
    getRecent,
  };
};
