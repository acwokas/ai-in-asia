import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'aiinasia_saved_articles';

export interface SavedArticle {
  id: string;
  title: string;
  url: string;
  excerpt: string;
  savedAt: number;
  featuredImageUrl?: string;
  categoryName?: string;
  categorySlug?: string;
}

export const useSavedArticles = () => {
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);

  const readSaved = useCallback((): SavedArticle[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading saved articles:', e);
      return [];
    }
  }, []);

  const writeSaved = useCallback((items: SavedArticle[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setSavedArticles(items);
    } catch (e) {
      console.error('Error writing saved articles:', e);
    }
  }, []);

  useEffect(() => {
    setSavedArticles(readSaved());
  }, [readSaved]);

  const isSaved = useCallback((articleUrl: string): boolean => {
    return savedArticles.some(item => item.url === articleUrl);
  }, [savedArticles]);

  const saveArticle = useCallback((article: Omit<SavedArticle, 'savedAt'>) => {
    const current = readSaved();
    const exists = current.some(item => item.url === article.url);
    
    if (exists) return;
    
    const entry: SavedArticle = { ...article, savedAt: Date.now() };
    const updated = [entry, ...current].slice(0, 200); // Cap to prevent bloat
    writeSaved(updated);
  }, [readSaved, writeSaved]);

  const removeArticle = useCallback((articleUrl: string) => {
    const current = readSaved();
    const updated = current.filter(item => item.url !== articleUrl);
    writeSaved(updated);
  }, [readSaved, writeSaved]);

  const toggleSave = useCallback((article: Omit<SavedArticle, 'savedAt'>) => {
    if (isSaved(article.url)) {
      removeArticle(article.url);
      return false;
    } else {
      saveArticle(article);
      return true;
    }
  }, [isSaved, saveArticle, removeArticle]);

  return {
    savedArticles,
    isSaved,
    saveArticle,
    removeArticle,
    toggleSave,
  };
};
