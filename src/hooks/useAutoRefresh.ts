import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const AWAY_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

export function useAutoRefresh() {
  const location = useLocation();
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const isInternalPage =
      location.pathname.startsWith('/admin') ||
      location.pathname.startsWith('/editor') ||
      location.pathname.startsWith('/auth') ||
      location.pathname.startsWith('/profile') ||
      location.pathname.startsWith('/connection-test');

    if (isInternalPage) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
      } else {
        if (hiddenAtRef.current !== null) {
          const awayMs = Date.now() - hiddenAtRef.current;
          if (awayMs >= AWAY_THRESHOLD_MS) {
            window.location.reload();
          }
        }
        hiddenAtRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [location.pathname]);
}
