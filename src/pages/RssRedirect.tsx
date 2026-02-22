import { useEffect } from 'react';
import SEOHead from "@/components/SEOHead";

const RssRedirect = () => {
  useEffect(() => {
    window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-rss`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <SEOHead title="RSS Feed" description="AI in ASIA RSS feed redirect." noIndex={true} />
      <p>Redirecting to RSS feed...</p>
    </div>
  );
};

export default RssRedirect;
