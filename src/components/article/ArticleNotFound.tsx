import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { track404Error } from "@/components/GoogleAnalytics";

export const ArticleNotFound = () => {
  useEffect(() => {
    track404Error(window.location.pathname, "article_not_found");
    
    const log404 = async () => {
      try {
        await supabase.from("page_not_found_log").insert({
          path: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        });
      } catch (error) {
        console.error("Failed to log article 404:", error);
      }
    };
    log404();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Article Not Found - 404 | AI in ASIA</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">The article you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/">Go to Homepage</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ArticleNotFound;
