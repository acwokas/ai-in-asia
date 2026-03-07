import { useLocation, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Home, FileText, TrendingUp, Compass, Flag, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { track404Error } from "@/components/GoogleAnalytics";

const BOT_PATTERNS = [
  '/wp-', '/.env', '/phpMyAdmin', '/xmlrpc', '/admin.php',
  '/config.php', '/setup.php', '/install.php', '/.git',
  '/cgi-bin', '/boaform', '/telescope', '/vendor',
  '/owa/', '/autodiscover', '/ecp/', '/api/v1/pods',
  '/console', '/actuator', '/solr/', '/jmx-console',
];

const isBotPath = (path: string) =>
  BOT_PATTERNS.some(p => path.toLowerCase().includes(p.toLowerCase()));

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  // ── 1. Check redirect table first ──────────────────────────────────────────
  const { data: redirectRule, isLoading: checkingRedirect } = useQuery({
    queryKey: ["redirect-check", location.pathname],
    queryFn: async () => {
      const { data } = await supabase
        .from("redirects")
        .select("to_path")
        .eq("from_path", location.pathname)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── 2. Log 404 + fire GA (only once redirect check is done and no rule found) ─
  useEffect(() => {
    if (checkingRedirect || redirectRule) return;
    if (!isBotPath(location.pathname)) {
      track404Error(location.pathname, "page_not_found");
      const log = async () => {
        try {
          await supabase.from("page_not_found_log").insert({
            path: location.pathname,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
          });
        } catch {}
      };
      log();
    }
  }, [checkingRedirect, redirectRule, location.pathname]);

  // ── 3. Contextual article suggestions from URL slug ────────────────────────
  const pathKeywords = location.pathname
    .split("/")
    .filter(Boolean)
    .join(" ")
    .replace(/-/g, " ")
    .replace(/\b\d{4}\b/g, "")
    .trim();

  const { data: suggestedArticles } = useQuery({
    queryKey: ["404-suggestions", location.pathname],
    enabled: !checkingRedirect && !redirectRule && pathKeywords.length > 3,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const terms = pathKeywords.split(" ").filter(w => w.length > 3).slice(0, 3);
      if (terms.length === 0) return [];
      const { data } = await supabase
        .from("articles")
        .select("slug, title, categories:primary_category_id(slug)")
        .eq("status", "published")
        .or(terms.map(t => `title.ilike.%${t}%`).join(","))
        .limit(3);
      return data || [];
    },
  });

  // ── 4. Report broken link ──────────────────────────────────────────────────
  const handleReport = async () => {
    setReporting(true);
    try {
      await supabase.from("page_not_found_log").insert({
        path: location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        resolved: false,
        user_reported: true,
      });
      setReported(true);
    } catch {}
    setReporting(false);
  };

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

  // ── Redirect lookup in progress — show slim progress bar, no flash ─────────
  if (checkingRedirect) {
    return (
      <>
        <div className="fixed top-0 left-0 w-full h-1 bg-muted z-50 overflow-hidden">
          <div
            className="h-full bg-primary animate-pulse"
            style={{ width: "60%", transition: "width 0.4s ease" }}
          />
        </div>
      </>
    );
  }

  // ── Redirect rule found — bounce silently ──────────────────────────────────
  if (redirectRule?.to_path) {
    return <Navigate to={redirectRule.to_path} replace />;
  }

  // ── Full 404 page ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Page Not Found - 404"
        description="The page you're looking for doesn't exist or has been moved."
        noIndex={true}
      />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-9xl font-bold text-primary/20 mb-2">404</h1>
          <h2 className="headline text-4xl md:text-5xl mb-4">Page Not Found</h2>
          <p className="text-xl text-muted-foreground mb-8">
            This page doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/"><Home className="mr-2 h-5 w-5" />Back to Home</Link>
            </Button>
            {!reported ? (
              <Button
                size="lg"
                variant="outline"
                onClick={handleReport}
                disabled={reporting}
              >
                <Flag className="mr-2 h-4 w-4" />
                {reporting ? "Reporting..." : "Report this broken link"}
              </Button>
            ) : (
              <Button size="lg" variant="outline" disabled>
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                Thanks — we'll fix it
              </Button>
            )}
          </div>
          {document.referrer && (
            <p className="mt-4 text-xs text-muted-foreground">
              You arrived from:{" "}
              <span className="font-mono">
                {(() => { try { return new URL(document.referrer).hostname; } catch { return document.referrer; } })()}
              </span>
            </p>
          )}
        </div>

        {/* Contextual suggestions — shown when slug keywords match articles */}
        {suggestedArticles && suggestedArticles.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-semibold mb-4 text-center">You might be looking for</h3>
            <div className="space-y-3">
              {suggestedArticles.map((article: any) => (
                <Link
                  key={article.slug}
                  to={`/${article.categories?.slug}/${article.slug}`}
                  className="block p-4 bg-muted/30 rounded-lg hover:bg-muted/60 transition-colors font-medium hover:text-primary"
                >
                  {article.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
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
            <Button type="submit" className="w-full mt-4">Search</Button>
          </form>
        </div>

        {/* Fallback categories — only shown when no suggestions */}
        {(!suggestedArticles || suggestedArticles.length === 0) && (
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
                <Link to="/about" className="block text-muted-foreground hover:text-primary transition-colors py-2">About Us</Link>
                <Link to="/contact" className="block text-muted-foreground hover:text-primary transition-colors py-2">Contact</Link>
                <Link to="/articles" className="block text-muted-foreground hover:text-primary transition-colors py-2">All Articles</Link>
              </div>
            </div>
            <div className="text-center">
              <h4 className="font-semibold mb-4">More Resources</h4>
              <div className="space-y-2">
                <Link to="/category/voices" className="block text-muted-foreground hover:text-primary transition-colors py-2">Expert Voices</Link>
                <Link to="/category/create" className="block text-muted-foreground hover:text-primary transition-colors py-2">AI Tools & Create</Link>
                <Link to="/category/life" className="block text-muted-foreground hover:text-primary transition-colors py-2">Life Events</Link>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
