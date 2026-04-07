import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { awardPoints } from "@/lib/gamification";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InlineNewsletterSignup from "@/components/InlineNewsletterSignup";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Shuffle, BookOpenText, Trophy, Sparkles, Globe } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category: string;
  related_terms: string[] | null;
  difficulty: string | null;
  asia_context: string | null;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  advanced: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const AIGlossary = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [viewedTerms, setViewedTerms] = useState<Set<string>>(new Set());
  const pointsAwarded = useRef(false);

  const { data: terms = [], isLoading } = useQuery({
    queryKey: ["glossary-terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glossary_terms")
        .select("id, term, definition, category, related_terms, difficulty, asia_context")
        .order("term", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GlossaryTerm[];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Term of the Day (deterministic by date)
  const termOfTheDay = useMemo(() => {
    if (terms.length === 0) return null;
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return terms[seed % terms.length];
  }, [terms]);

  // Track viewed terms for gamification
  const markViewed = useCallback(
    (termId: string) => {
      setViewedTerms((prev) => {
        const next = new Set(prev);
        next.add(termId);
        if (next.size >= 15 && !pointsAwarded.current && user) {
          pointsAwarded.current = true;
          awardPoints(user.id, 10, "Explored 15+ glossary terms");
        }
        return next;
      });
    },
    [user]
  );

  // Handle URL hash on load
  useEffect(() => {
    if (terms.length === 0) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) {
      setTimeout(() => scrollToTerm(hash), 300);
    }
  }, [terms]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    terms.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [terms]);

  const filtered = useMemo(() => {
    let result = terms;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.definition.toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      result = result.filter((t) => t.category === activeCategory);
    }
    if (activeLetter) {
      if (activeLetter === "#") {
        result = result.filter((t) => !/^[A-Za-z]/.test(t.term));
      } else {
        result = result.filter(
          (t) => t.term[0]?.toUpperCase() === activeLetter
        );
      }
    }
    return result;
  }, [terms, debouncedSearch, activeCategory, activeLetter]);

  const scrollToTerm = useCallback((term: string) => {
    const el = cardRefs.current[term.toLowerCase()];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-amber-500/60");
      setTimeout(() => el.classList.remove("ring-2", "ring-amber-500/60"), 2000);
    }
  }, []);

  const handleRelatedClick = useCallback(
    (related: string) => {
      setSearchQuery("");
      setActiveCategory(null);
      setActiveLetter(null);
      window.location.hash = encodeURIComponent(related);
      setTimeout(() => scrollToTerm(related), 100);
    },
    [scrollToTerm]
  );

  const handleRandom = useCallback(() => {
    if (terms.length === 0) return;
    const pick = terms[Math.floor(Math.random() * terms.length)];
    setSearchQuery("");
    setActiveCategory(null);
    setActiveLetter(null);
    window.location.hash = encodeURIComponent(pick.term);
    setTimeout(() => scrollToTerm(pick.term), 100);
  }, [terms, scrollToTerm]);

  const handleLetterClick = (letter: string) => {
    setActiveLetter((prev) => (prev === letter ? null : letter));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Glossary for Asia | 470+ AI Terms Explained | AI in Asia"
        description="470+ AI and tech terms explained in plain language with Asia-specific context. Search, filter by category, and explore related concepts."
        canonical="https://aiinasia.com/tools/ai-glossary"
      />
      <Header />

      <main className="flex-1 px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <ToolBreadcrumb toolName="AI Glossary" />

          {/* Hero */}
          <div className="text-center mb-8">
            <Badge className="mb-3 bg-amber-500/15 text-amber-500 border-amber-500/30 hover:bg-amber-500/20 text-xs font-bold tracking-wide">
              Free Tool
            </Badge>
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-2">
              AI Glossary for Asia
            </h1>
            <p className="text-foreground/70 max-w-lg mx-auto text-base">
              {terms.length > 0 ? terms.length : 470}+ AI and tech terms explained in plain language, with Asia-specific context. No jargon about jargon.
            </p>
          </div>

          {/* Gamification progress */}
          {viewedTerms.size > 0 && viewedTerms.size < 15 && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-card border border-border">
              <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="flex-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((viewedTerms.size / 15) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {viewedTerms.size}/15 terms for +10 pts
              </span>
            </div>
          )}
          {viewedTerms.size >= 15 && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-400 font-semibold">+10 points earned for exploring 15+ terms!</span>
            </div>
          )}

          {/* Term of the Day */}
          {termOfTheDay && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-card p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Term of the Day</span>
              </div>
              <h3
                className="font-display text-xl font-bold text-foreground mb-1 cursor-pointer hover:text-amber-500 transition-colors"
                onClick={() => {
                  window.location.hash = encodeURIComponent(termOfTheDay.term);
                  scrollToTerm(termOfTheDay.term);
                }}
              >
                {termOfTheDay.term}
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed">{termOfTheDay.definition}</p>
              {termOfTheDay.asia_context && (
                <div className="mt-2 flex items-start gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-400/90 italic">{termOfTheDay.asia_context}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Search + Random */}
          <div className="flex gap-2 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search terms or definitions..."
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleRandom}
              className="gap-1.5 shrink-0"
              title="Random term"
            >
              <Shuffle className="h-4 w-4" />
              <span className="hidden sm:inline">Random</span>
            </Button>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                activeCategory === null
                  ? "bg-amber-500 text-black border-amber-500"
                  : "bg-card text-muted-foreground border-border hover:border-amber-500/50"
              }`}
            >
              All ({terms.length})
            </button>
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() =>
                  setActiveCategory((prev) => (prev === cat ? null : cat))
                }
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  activeCategory === cat
                    ? "bg-amber-500 text-black border-amber-500"
                    : "bg-card text-muted-foreground border-border hover:border-amber-500/50"
                }`}
              >
                {cat} ({count})
              </button>
            ))}
          </div>

          {/* A-Z bar */}
          <div className="flex flex-wrap gap-1 mb-6 justify-center">
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                onClick={() => handleLetterClick(letter)}
                className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                  activeLetter === letter
                    ? "bg-amber-500 text-black"
                    : "bg-card text-muted-foreground border border-border hover:border-amber-500/50 hover:text-foreground"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>

          {/* Result count */}
          <p className="text-xs text-muted-foreground mb-4">
            Showing {filtered.length} of {terms.length} terms
          </p>

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-20 text-muted-foreground">
              Loading glossary...
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <BookOpenText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No terms found. Try a different search or filter.</p>
            </div>
          )}

          {/* Term cards */}
          <div className="space-y-3">
            {filtered.map((t) => (
              <motion.div
                key={t.id}
                ref={(el) => {
                  cardRefs.current[t.term.toLowerCase()] = el;
                }}
                data-term-id={t.id}
                id={encodeURIComponent(t.term)}
                className="rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-amber-500/30 hover:bg-amber-500/[0.02]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start gap-3 mb-2 flex-wrap">
                  <h2 className="font-display text-xl font-bold text-foreground">
                    {t.term}
                  </h2>
                  <Badge variant="outline" className="shrink-0 text-[10px] mt-0.5">
                    {t.category}
                  </Badge>
                  {t.difficulty && (
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-[10px] mt-0.5 ${DIFFICULTY_COLORS[t.difficulty] || DIFFICULTY_COLORS.beginner}`}
                    >
                      {t.difficulty.charAt(0).toUpperCase() + t.difficulty.slice(1)}
                    </Badge>
                  )}
                </div>
                <p className="text-[15px] text-foreground/80 leading-relaxed mb-2">
                  {t.definition}
                </p>
                {t.asia_context && (
                  <div className="flex items-start gap-1.5 mb-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                    <Globe className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-400/90 leading-relaxed">
                      <span className="font-semibold text-amber-500">In Asia:</span> {t.asia_context}
                    </p>
                  </div>
                )}
                {t.related_terms && t.related_terms.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Related:
                    </span>
                    {t.related_terms.map((rt) => (
                      <button
                        key={rt}
                        onClick={() => handleRelatedClick(rt)}
                        className="text-xs text-amber-500 hover:text-amber-400 underline underline-offset-2 decoration-amber-500/30 transition-colors"
                      >
                        {rt}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Newsletter */}
          <div className="mt-12">
            <InlineNewsletterSignup />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIGlossary;
