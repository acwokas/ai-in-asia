import { useEffect } from 'react';

const SitemapRedirect = () => {
  useEffect(() => {
    // Redirect to the edge function that generates the sitemap
    window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to sitemap...</p>
    </div>
  );
};

export default SitemapRedirect;
