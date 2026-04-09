import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Search, FileText, Globe, Building2, ArrowRight, X, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getCategoryColor } from "@/lib/categoryColors";
import { getOptimizedThumbnail } from "@/lib/imageOptimization";

const ROTATING_PHRASES = ["News", "Analysis", "Policy", "Industry Intelligence", "Tools & Data"];

const useTypewriter = (phrases: string[], typingSpeed = 80, pauseMs = 2200, deleteSpeed = 40) => {
  const [text, setText] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && text === current) {
      timeout = setTimeout(() => setIsDeleting(true), pauseMs);
    } else if (isDeleting && text === "") {
      setIsDeleting(false);
      setPhraseIdx((prev) => (prev + 1) % phrases.length);
    } else {
      const speed = isDeleting ? deleteSpeed : typingSpeed;
      timeout = setTimeout(() => {
        setText(isDeleting ? current.slice(0, text.length - 1) : current.slice(0, text.length + 1));
      }, speed);
    }

    return () => clearTimeout(timeout);
  }, [text, phraseIdx, isDeleting, phrases, typingSpeed, pauseMs, deleteSpeed]);

  return text;
};

const useCountUp = (target: number, duration = 1600) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const animatedTarget = useRef(0);

  useEffect(() => {
    if (!target || target === animatedTarget.current) return;
    animatedTarget.current = target;

    const runAnimation = () => {
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!ref.current) { runAnimation(); return; }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          runAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
};

const HeroHeadlineBanner = ({ excludeIds = [] }: { excludeIds?: string[] }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("hero_banner_dismissed") === "1");
  const typedText = useTypewriter(ROTATING_PHRASES);

  // Live stats
  const { data: stats } = useQuery({
    queryKey: ["hero-banner-stats"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [articlesRes, companiesRes, guidesRes] = await Promise.all([
        supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("ai_companies").select("*", { count: "exact", head: true }),
        supabase.from("ai_guides").select("*", { count: "exact", head: true }).eq("status", "published"),
      ]);
      return {
        articles: articlesRes.count ?? 0,
        companies: companiesRes.count ?? 0,
        guides: guidesRes.count ?? 0,
      };
    },
  });

  // Latest 3 articles for "Highlighted" row (exclude hero IDs)
  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);
  const { data: breakingArticles } = useQuery({
    queryKey: ["hero-breaking-articles", excludeIds],
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id, title, slug, excerpt, featured_image_url, published_at, reading_time_minutes,
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .neq("article_type", "three_before_nine")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(20);
      if (error) throw error;
      return (data || []).filter((a: any) => !excludeSet.has(a.id)).slice(0, 3);
    },
  });

  const articleCount = useCountUp(stats?.articles || 0);
  const guidesCount = useCountUp(stats?.guides || 0);
  const countriesCount = useCountUp(12);
  const companiesCount = useCountUp(stats?.companies || 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("hero_banner_dismissed", "1");
  };

  if (dismissed) return null;

  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(220 20% 6%) 0%, hsl(220 25% 10%) 60%, hsl(220 20% 8%) 100%)" }}>
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 z-20 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
        aria-label="Close for this visit"
        title="Close for this visit"
      >
        <X className="w-4 h-4" />
      </button>
      {/* Subtle grid texture */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      <div className="container mx-auto px-4 pt-10 pb-8 md:pt-16 md:pb-10 relative z-10">
        {/* Headline */}
        <div className="text-center max-w-4xl mx-auto mb-6">
          <h2
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-extrabold leading-[1.1] tracking-tight mb-4"
            style={{
              background: "linear-gradient(135deg, #FFFFFF 30%, #F5D580 70%, #F28C0F 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            The Definitive Source for AI in Asia
          </h2>

          {/* Typewriter subtitle */}
          <div className="flex items-center justify-center gap-2 text-lg md:text-xl text-muted-foreground mb-6">
            <span>Covering</span>
            <span className="font-semibold text-[#F28C0F] min-w-[180px] text-left inline-block">
              {typedText}
              <span className="animate-pulse">|</span>
            </span>
            <span className="hidden sm:inline">across Asia-Pacific</span>
          </div>

          {/* Live stats */}
          <div ref={articleCount.ref} className="flex items-center justify-center gap-6 md:gap-10 text-sm md:text-base mb-8">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#F28C0F]" />
              <span className="font-bold text-foreground">{articleCount.count.toLocaleString()}</span>
              <span className="text-muted-foreground">Articles</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#F28C0F]" />
              <span className="font-bold text-foreground">{guidesCount.count.toLocaleString()}</span>
              <span className="text-muted-foreground">Guides</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#F28C0F]" />
              <span className="font-bold text-foreground">{countriesCount.count}+</span>
              <span className="text-muted-foreground">Countries</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#F28C0F]" />
              <span className="font-bold text-foreground">{companiesCount.count.toLocaleString()}</span>
              <span className="text-muted-foreground">AI Companies</span>
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search AI news across Asia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 h-12 text-base rounded-full bg-background/60 border-border/50 backdrop-blur-sm focus-visible:ring-[#F28C0F]/40"
              />
            </div>
          </form>
        </div>

        {/* Breaking / Latest 3 articles */}
        {breakingArticles && breakingArticles.length > 0 && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#F28C0F]">Highlighted</span>
              <div className="flex-1 h-px bg-border/40" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {breakingArticles.map((article: any) => {
                const catColor = getCategoryColor(article.categories?.slug);
                const link = `/${article.categories?.slug || "news"}/${article.slug}`;
                return (
                  <Link
                    key={article.id}
                    to={link}
                    className="group flex gap-3 p-3 rounded-lg border border-border/40 bg-card/30 backdrop-blur-sm hover:border-border/70 transition-all duration-200"
                  >
                    {article.featured_image_url && (
                      <img
                        src={getOptimizedThumbnail(article.featured_image_url, 160, 100)}
                        alt={article.title}
                        loading="lazy"
                        className="w-20 h-16 rounded object-cover shrink-0"
                        width={80}
                        height={64}
                      />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: catColor }}>
                        {article.categories?.name || "News"}
                      </span>
                      <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <span className="text-[11px] text-muted-foreground mt-auto pt-1">
                        {article.reading_time_minutes || 5} min read
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroHeadlineBanner;
