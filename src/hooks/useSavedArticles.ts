import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STORAGE_KEY = 'aiinasia_saved_articles';
const SYNC_DISMISSED_KEY = 'aiinasia_sync_dismissed';

export interface SavedArticle {
  id: string; // article UUID for Supabase, or URL-based id for localStorage
  articleId?: string; // Supabase article UUID
  title: string;
  url: string;
  excerpt: string;
  savedAt: number;
  featuredImageUrl?: string;
  categoryName?: string;
  categorySlug?: string;
}

type SyncStatus = 'idle' | 'checking' | 'syncing' | 'done';

// ── localStorage helpers ──
const readLocal = (): SavedArticle[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const writeLocal = (items: SavedArticle[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error writing saved articles:', e);
  }
};

const clearLocal = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

export const useSavedArticles = () => {
  const { user } = useAuth();
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [loading, setLoading] = useState(false);
  const syncChecked = useRef(false);

  // ── Fetch from Supabase ──
  const fetchSupabaseBookmarks = useCallback(async (): Promise<SavedArticle[]> => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id, article_id, created_at, articles(title, slug, excerpt, featured_image_url, categories:primary_category_id(name, slug))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) { console.error('Bookmarks fetch error:', error); return []; }
    return (data || []).map((b: any) => {
      const cat = b.articles?.categories as any;
      return {
        id: b.article_id,
        articleId: b.article_id,
        title: b.articles?.title || '',
        url: `/${cat?.slug || 'article'}/${b.articles?.slug || ''}`,
        excerpt: b.articles?.excerpt || '',
        savedAt: new Date(b.created_at).getTime(),
        featuredImageUrl: b.articles?.featured_image_url || undefined,
        categoryName: cat?.name || undefined,
        categorySlug: cat?.slug || undefined,
      };
    });
  }, [user]);

  // ── Load data ──
  const reload = useCallback(async () => {
    if (user) {
      setLoading(true);
      const items = await fetchSupabaseBookmarks();
      setSavedArticles(items);
      setLoading(false);
    } else {
      setSavedArticles(readLocal());
    }
  }, [user, fetchSupabaseBookmarks]);

  useEffect(() => { reload(); }, [reload]);

  // ── Sync check on login ──
  useEffect(() => {
    if (!user || syncChecked.current) return;
    syncChecked.current = true;

    const dismissed = sessionStorage.getItem(SYNC_DISMISSED_KEY);
    if (dismissed) return;

    const localItems = readLocal();
    if (localItems.length === 0) return;

    setSyncStatus('checking');
    // Show sync offer
    toast(`You have ${localItems.length} saved article${localItems.length > 1 ? 's' : ''} on this device`, {
      description: 'Sync them to your account to access anywhere?',
      duration: 15000,
      action: {
        label: 'Sync',
        onClick: () => syncLocalToSupabase(),
      },
      cancel: {
        label: 'Dismiss',
        onClick: () => {
          sessionStorage.setItem(SYNC_DISMISSED_KEY, '1');
          setSyncStatus('idle');
        },
      },
    });
  }, [user]);

  const syncLocalToSupabase = useCallback(async () => {
    if (!user) return;
    setSyncStatus('syncing');
    const localItems = readLocal();
    let synced = 0;

    for (const item of localItems) {
      // Try to find article by slug from URL
      const slug = item.url.split('/').pop();
      if (!slug) continue;
      const { data: article } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!article) continue;

      const { error } = await supabase
        .from('bookmarks')
        .upsert({ user_id: user.id, article_id: article.id }, { onConflict: 'user_id,article_id' });
      if (!error) synced++;
    }

    clearLocal();
    setSyncStatus('done');
    toast.success(`Synced ${synced} article${synced !== 1 ? 's' : ''} to your account`);
    reload();
  }, [user, reload]);

  // ── isSaved ──
  const isSaved = useCallback((identifier: string): boolean => {
    // identifier can be a URL (localStorage) or article UUID (Supabase)
    return savedArticles.some(
      item => item.url === identifier || item.id === identifier || item.articleId === identifier
    );
  }, [savedArticles]);

  // ── Save ──
  const saveArticle = useCallback(async (article: Omit<SavedArticle, 'savedAt'> & { articleId?: string }) => {
    if (user && article.articleId) {
      // Supabase save
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: user.id, article_id: article.articleId });
      if (error && error.code !== '23505') {
        console.error('Bookmark save error:', error);
        return;
      }
      // Also cache locally
      const entry: SavedArticle = { ...article, savedAt: Date.now() };
      const current = readLocal();
      if (!current.some(i => i.url === article.url)) {
        writeLocal([entry, ...current].slice(0, 200));
      }
      reload();
    } else {
      // localStorage only
      const current = readLocal();
      if (current.some(i => i.url === article.url)) return;
      const entry: SavedArticle = { ...article, savedAt: Date.now() };
      const updated = [entry, ...current].slice(0, 200);
      writeLocal(updated);
      setSavedArticles(updated);
    }
  }, [user, reload]);

  // ── Remove ──
  const removeArticle = useCallback(async (identifier: string) => {
    if (user) {
      // Try removing by article_id
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('article_id', identifier);
      // Also remove from localStorage cache
      const current = readLocal();
      writeLocal(current.filter(i => i.url !== identifier && i.id !== identifier && i.articleId !== identifier));
      reload();
    } else {
      const current = readLocal();
      const updated = current.filter(i => i.url !== identifier && i.id !== identifier);
      writeLocal(updated);
      setSavedArticles(updated);
    }
  }, [user, reload]);

  // ── Clear all ──
  const clearAll = useCallback(async () => {
    if (user) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id);
      clearLocal();
      setSavedArticles([]);
    } else {
      clearLocal();
      setSavedArticles([]);
    }
  }, [user]);

  // ── Toggle ──
  const toggleSave = useCallback(async (article: Omit<SavedArticle, 'savedAt'> & { articleId?: string }) => {
    const identifier = article.articleId || article.url;
    if (isSaved(identifier)) {
      await removeArticle(article.articleId || article.url);
      return false;
    } else {
      await saveArticle(article);
      return true;
    }
  }, [isSaved, saveArticle, removeArticle]);

  return {
    savedArticles,
    isSaved,
    saveArticle,
    removeArticle,
    clearAll,
    toggleSave,
    syncStatus,
    loading,
  };
};
