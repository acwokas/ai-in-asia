import { useEffect } from 'react';

const RssRedirect = () => {
  useEffect(() => {
    // Redirect to the edge function that generates the RSS feed
    window.location.href = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-rss`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to RSS feed...</p>
    </div>
  );
};

export default RssRedirect;
