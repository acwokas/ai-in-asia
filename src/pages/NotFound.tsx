import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Home, FileText, TrendingUp, Compass } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { track404Error } from "@/components/GoogleAnalytics";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    
    // Track 404 as an error event in Google Analytics (not a page view)
    track404Error(location.pathname, "page_not_found");
    
    // Log 404 to database for tracking
    const log404 = async () => {
      try {
        await supabase.from("page_not_found_log").insert({
          path: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
        });
      } catch (error) {
        console.error("Failed to log 404:", error);
      }
    };
    
    log404();
  }, [location.pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const popularCategories = [
    { name: "News", slug: "news", icon: FileText },
    { name: "Business", slug: "business", icon: TrendingUp },
    { name: "Learn", slug: "learn", icon: Compass },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Page Not Found - 404 | AI in ASIA</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <div className="mb-6">
            <h1 className="text-9xl font-bold text-primary/20 mb-2">404</h1>
            <h2 className="headline text-4xl md:text-5xl mb-4">Page Not Found</h2>
            <p className="text-xl text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg">
              <Link to="/">
                <Home className="mr-2 h-5 w-5" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-8 mb-12">
          <h3 className="text-2xl font-semibold mb-4 text-center">Try Searching</h3>
          <form onSubmit={handleSearch} className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for articles..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full mt-4">
              Search
            </Button>
          </form>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <h4 className="font-semibold mb-4">Popular Categories</h4>
            <div className="space-y-2">
              {popularCategories.map((category) => (
                <Link
                  key={category.slug}
                  to={`/category/${category.slug}`}
                  className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors py-2"
                >
                  <category.icon className="h-4 w-4" />
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="text-center">
            <h4 className="font-semibold mb-4">Helpful Links</h4>
            <div className="space-y-2">
              <Link to="/about" className="block text-muted-foreground hover:text-primary transition-colors py-2">
                About Us
              </Link>
              <Link to="/contact" className="block text-muted-foreground hover:text-primary transition-colors py-2">
                Contact
              </Link>
              <Link to="/articles" className="block text-muted-foreground hover:text-primary transition-colors py-2">
                All Articles
              </Link>
            </div>
          </div>

          <div className="text-center">
            <h4 className="font-semibold mb-4">More Resources</h4>
            <div className="space-y-2">
              <Link to="/category/voices" className="block text-muted-foreground hover:text-primary transition-colors py-2">
                Expert Voices
              </Link>
              <Link to="/category/create" className="block text-muted-foreground hover:text-primary transition-colors py-2">
                AI Tools & Create
              </Link>
              <Link to="/category/life" className="block text-muted-foreground hover:text-primary transition-colors py-2">
                Life Events
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            If you believe this is an error, please{" "}
            <Link to="/contact" className="text-primary hover:underline">
              contact us
            </Link>
            .
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default NotFound;
