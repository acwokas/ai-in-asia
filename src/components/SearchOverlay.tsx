import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string | null;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Escape to close
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
          id, title, slug, excerpt, featured_image_url, published_at,
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .or(`title.ilike.${searchTerm},excerpt.ilike.${searchTerm}`)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(8);

      if (!error && data) {
        setResults(data as unknown as SearchResult[]);
      }
      setIsLoading(false);
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleSeeAll = useCallback(() => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  }, [query, navigate, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSeeAll();
  };

  const handlePopularClick = (term: string) => {
    setQuery(term);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="container mx-auto px-4 pt-8 md:pt-16 max-w-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close search"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Search input */}
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-10 pr-4 py-3 text-2xl bg-transparent border-b-2 border-border focus:border-primary outline-none transition-colors text-foreground placeholder:text-muted-foreground"
            />
            <kbd className="hidden md:inline-flex absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
              ESC
            </kbd>
          </div>
        </form>

        {/* Popular searches (when empty) */}
        {!query.trim() && (
          <div className="mt-8">
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
              {results.map((article) => (
                <li key={article.id}>
                  <Link
                    to={`/${article.categories?.slug || "news"}/${article.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-4 py-3 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors"
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
                      <p className="font-medium text-sm line-clamp-1">{article.title}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <button
              onClick={handleSeeAll}
              className="mt-4 flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              See all results <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* No results */}
        {!isLoading && query.trim() && debouncedQuery === query && results.length === 0 && (
          <p className="mt-8 text-muted-foreground text-center">
            No articles found for &lsquo;{query}&rsquo;. Try a different search term.
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
