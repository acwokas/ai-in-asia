import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function useAutoRefresh() {
  const location = useLocation();

  useEffect(() => {
    // Skip auto-refresh for admin, editor, auth, and profile pages
    const isInternalPage = location.pathname.startsWith('/admin') ||
      location.pathname.startsWith('/editor') ||
      location.pathname.startsWith('/auth') ||
      location.pathname.startsWith('/profile') ||
      location.pathname.startsWith('/connection-test');

    if (isInternalPage) return;

    const intervalId = setInterval(() => {
      window.location.reload();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [location.pathname]);
}
