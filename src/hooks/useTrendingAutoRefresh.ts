import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'aiinasia_trending_checked';
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useTrendingAutoRefresh() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, 'true');

    (async () => {
      try {
        const { data: timestamp } = await supabase.rpc('get_trending_refresh_timestamp');
        const isStale = !timestamp || (Date.now() - new Date(timestamp).getTime()) > STALE_THRESHOLD_MS;
        if (isStale) {
          supabase.rpc('rotate_trending_articles').then(() => {
            console.log('Trending articles auto-refreshed');
          });
        }
      } catch (e) {
        console.log('Trending auto-refresh check failed:', e);
      }
    })();
  }, []);
}
