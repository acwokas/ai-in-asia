import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ArrowRight, Clock, Trash2, Bot, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { trackEvent } from "@/components/GoogleAnalytics";
import { dualPush } from "@/lib/dualTrack";
import { getSearchHistory, addToSearchHistory, clearSearchHistory } from "@/lib/searchUtils";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  reading_time_minutes: number | null;
  categories: { name: string; slug: string } | null;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_SEARCHES = ["ChatGPT", "Singapore AI", "Japan", "Regulation", "Startups", "India"];

const SearchOverlay = ({ isOpen, onClose }: SearchOverlayProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
      setHistory(getSearchHistory());
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Search query
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      const searchTerm = `%${debouncedQuery.trim()}%`;
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id, title, slug, excerpt, featured_image_url, published_at, reading_time_minutes,
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .or(`title.ilike.${searchTerm},excerpt.ilike.${searchTerm}`)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(8);

      if (!error && data) {
        setResults(data as unknown as SearchResult[]);
        trackEvent("search_performed", {
          search_term: debouncedQuery.trim(),
          result_count: data.length,
        });
      }
      setIsLoading(false);
    };

    fetchResults();
  }, [debouncedQuery]);

  // Reset selection when results change
  useEffect(() => { setSelectedIndex(-1); }, [results]);

  const goToResult = useCallback((article: SearchResult) => {
    addToSearchHistory(query);
    navigate(`/${article.categories?.slug || "news"}/${article.slug}`);
    onClose();
  }, [query, navigate, onClose]);

  const handleSeeAll = useCallback(() => {
    if (query.trim()) {
      addToSearchHistory(query.trim());
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  }, [query, navigate, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      dualPush("search_performed", { search_term: query.trim() });
    }
    // If an item is selected via keyboard, go to it
    if (selectedIndex >= 0 && selectedIndex < results.length) {
      goToResult(results[selectedIndex]);
      return;
    }
    handleSeeAll();
  };

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    // total items = results + 1 ("see all" row)
    const max = results.length; // 0..results.length-1 = results, results.length = see all
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < max ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : max));
    } else if (e.key === "Enter" && selectedIndex === results.length) {
      e.preventDefault();
      handleSeeAll();
    }
  };

  const handlePopularClick = (term: string) => {
    setQuery(term);
  };

  const handleHistoryClear = () => {
    clearSearchHistory();
    setHistory([]);
  };

  if (!isOpen) return null;

  const showHistory = !query.trim() && history.length > 0;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-xl animate-in fade-in duration-200"
      style={{ isolation: 'isolate' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="container mx-auto px-4 pt-8 md:pt-16 max-w-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close search"
        >
          <X className="h-5 w-5" />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyNav}
              placeholder="Search articles..."
              className="w-full pl-10 pr-4 py-3 text-2xl bg-transparent border-b-2 border-border focus:border-primary outline-none transition-colors text-foreground placeholder:text-muted-foreground"
            />
            <kbd className="hidden md:inline-flex absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
              ESC
            </kbd>
          </div>
        </form>

        {/* Recent searches */}
        {showHistory && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Recent searches
              </p>
              <button
                onClick={handleHistoryClear}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((term) => (
                <button
                  key={term}
                  onClick={() => handlePopularClick(term)}
                  className="px-3 py-1.5 text-sm rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular searches */}
        {!query.trim() && (
          <div className={showHistory ? "mt-6" : "mt-8"}>
            <p className="text-sm text-muted-foreground mb-3">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => handlePopularClick(term)}
                  className="px-3 py-1.5 text-sm rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>

            {/* Ask Scout link */}
            <Link
              to="/ask-scout"
              onClick={onClose}
              className="mt-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Bot className="h-4 w-4" />
              <span>Or ask Scout AI a question about AI in Asia</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Loading */}
        {isLoading && query.trim() && (
          <div className="mt-8 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        )}

        {/* Results */}
        {!isLoading && results.length > 0 && (
          <div className="mt-6">
            <ul className="divide-y divide-border">
              {results.map((article, i) => (
                <li key={article.id}>
                  <button
                    onClick={() => goToResult(article)}
                    className={`flex items-center gap-4 py-3 w-full text-left hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors ${
                      selectedIndex === i ? "bg-muted/50" : ""
                    }`}
                  >
                    {article.featured_image_url && (
                      <img
                        src={article.featured_image_url}
                        alt=""
                        className="w-14 h-14 rounded object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {article.categories?.name && (
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {article.categories.name}
                          </span>
                        )}
                        {article.published_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(article.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm line-clamp-1 text-foreground" dangerouslySetInnerHTML={{ __html: highlightMatch(article.title, query) }} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={handleSeeAll}
              className={`mt-2 w-full flex items-center justify-between gap-2 text-sm font-medium text-primary hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors ${
                selectedIndex === results.length ? "bg-muted/50" : ""
              }`}
            >
              <span>Press Enter to see all results</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            {/* Scout CTA */}
            <Link
              to={`/ask-scout?q=${encodeURIComponent(query)}`}
              onClick={onClose}
              className="mt-3 flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Bot className="h-3.5 w-3.5" />
              Can't find what you need? Ask Scout AI →
            </Link>
          </div>
        )}

        {/* No results */}
        {!isLoading && query.trim() && debouncedQuery === query && results.length === 0 && (
          <div className="mt-8 text-center">
            <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              No articles found for &lsquo;{query}&rsquo;.
            </p>
            <Link
              to={`/ask-scout?q=${encodeURIComponent(query)}`}
              onClick={onClose}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Bot className="h-4 w-4" />
              Ask Scout AI about "{query}"
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
