import { useEffect } from 'react';
import SEOHead from "@/components/SEOHead";

const SitemapRedirect = () => {
  useEffect(() => {
    window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <SEOHead title="Sitemap" description="AI in ASIA sitemap redirect." noIndex={true} />
      <p>Redirecting to sitemap...</p>
    </div>
  );
};

export default SitemapRedirect;
