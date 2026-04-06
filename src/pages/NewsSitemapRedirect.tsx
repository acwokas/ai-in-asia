import { useEffect } from 'react';
import SEOHead from "@/components/SEOHead";

const NewsSitemapRedirect = () => {
  useEffect(() => {
    window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-news-sitemap`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <SEOHead title="News Sitemap" description="AI in ASIA news sitemap redirect." noIndex={true} />
      <p>Redirecting to news sitemap...</p>
    </div>
  );
};

export default NewsSitemapRedirect;
