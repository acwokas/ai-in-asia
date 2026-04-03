import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Zap,
  Shield,
  TrendingUp,
  Clock,
  Globe,
  Link2,
  Mail,
  ChevronRight,
  Search,
  Sparkles,
  User,
  AlertTriangle,
  RotateCcw,
  BarChart3,
} from "lucide-react";
import {
  ROLES,
  COUNTRIES,
  findBestRoleMatch,
  calculateScore,
  getScoreLabel,
  getScoreGradient,
  getCategoryStats,
  type RoleData,
  type CountryData,
} from "@/lib/jobImpactData";

const emailSchema = z.string().trim().email().max(255);

// Floating pills background animation
function FloatingPills() {
  const pills = useMemo(() => {
    const sample = [
      "Software Developer", "Accountant", "Teacher", "Nurse", "Lawyer",
      "Designer", "Chef", "Pilot", "Journalist", "Analyst",
      "Engineer", "Doctor", "Trader", "Architect", "Scientist",
    ];
    return sample.map((label, i) => ({
      label,
      left: `${(i * 17 + 5) % 90}%`,
      delay: `${i * 1.2}s`,
      duration: `${18 + (i % 5) * 4}s`,
      top: `${10 + (i * 23) % 70}%`,
      opacity: 0.08 + (i % 3) * 0.04,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {pills.map((p, i) => (
        <span
          key={i}
          className="absolute text-xs font-medium text-foreground rounded-full border border-border/30 px-3 py-1 whitespace-nowrap animate-float-pill"
          style={{
            left: p.left,
            top: p.top,
            opacity: p.opacity,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          {p.label}
        </span>
      ))}
      <style>{`
        @keyframes float-pill {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-18px) translateX(8px); }
          50% { transform: translateY(-6px) translateX(-12px); }
          75% { transform: translateY(-22px) translateX(4px); }
        }
        .animate-float-pill { animation: float-pill 20s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// Animated score gauge
function ScoreGauge({ score, label, color }: { score: number; label: string; color: string }) {
  const circumference = 2 * Math.PI * 80;
  const [animatedScore, setAnimatedScore] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let frame: number;
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const offset = circumference - (animatedScore / 100) * circumference * 0.75;

  // Interpolate color based on animated score
  const currentColor = useMemo(() => {
    const info = getScoreLabel(animatedScore);
    return info.color;
  }, [animatedScore]);

  return (
    <div className="relative w-56 h-56 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
        <circle
          cx="100" cy="100" r="80" fill="none"
          stroke="hsl(var(--muted))" strokeWidth="12"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
        />
        <circle
          cx="100" cy="100" r="80" fill="none"
          stroke={mounted ? currentColor : "hsl(var(--muted))"}
          strokeWidth="12"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-foreground">{animatedScore}</span>
        <span className="text-sm font-semibold mt-1" style={{ color }}>
          {label}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">out of 100</span>
      </div>
    </div>
  );
}

// Autocomplete input
function RoleInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!value || value.length < 2) return [];
    const q = value.toLowerCase();
    return ROLES.filter(
      (r) => r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="e.g. Software Developer, Accountant, Teacher..."
          value={value}
          onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => { if (value.length >= 2) setShowSuggestions(true); }}
          className="pl-10 h-12 text-base"
          autoComplete="off"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((role) => (
            <button
              key={role.title}
              type="button"
              className="w-full px-4 py-2.5 text-left hover:bg-muted/80 transition-colors flex items-center justify-between"
              onMouseDown={(e) => { e.preventDefault(); onChange(role.title); setShowSuggestions(false); }}
            >
              <span className="text-sm text-foreground">{role.title}</span>
              <span className="text-xs text-muted-foreground">{role.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Insight card
function InsightCard({ icon: Icon, title, items, color }: { icon: typeof Zap; title: string; items: string[]; color: string }) {
  return (
    <Card className="p-5 border-border/60" style={{ borderTopColor: color, borderTopWidth: "2px" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-5 w-5" style={{ color }} />
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color }} />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Comparison bar
function ComparisonBar({ label, value, maxValue, sublabel, color }: { label: string; value: number; maxValue: number; sublabel: string; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth((value / maxValue) * 100), 100);
    return () => clearTimeout(t);
  }, [value, maxValue]);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{value}/100</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

// Share card preview
function ShareCard({ role, country, score, scoreInfo }: { role: RoleData; country: CountryData; score: number; scoreInfo: { label: string; color: string } }) {
  const gradient = getScoreGradient(score);
  return (
    <div className={`relative overflow-hidden rounded-xl p-6 bg-gradient-to-br ${gradient} text-white`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="relative z-10">
        <p className="text-sm font-medium text-white/80 mb-1">AI Impact Score</p>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-5xl font-bold">{score}</span>
          <span className="text-lg font-semibold text-white/90">/100</span>
        </div>
        <p className="text-lg font-semibold mb-0.5">{role.title}</p>
        <p className="text-sm text-white/80">{country.name} · {scoreInfo.label}</p>
        <p className="text-xs text-white/60 mt-3">aiinasia.com/tools/ai-job-impact</p>
      </div>
    </div>
  );
}

// Newsletter CTA
function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const validated = emailSchema.parse(email);
      const { data: existing } = await supabase
        .from("newsletter_subscribers")
        .select("id, unsubscribed_at")
        .eq("email", validated)
        .maybeSingle();

      if (existing) {
        if (existing.unsubscribed_at === null) {
          toast.info("Already subscribed!");
        } else {
          await supabase.from("newsletter_subscribers").update({ unsubscribed_at: null }).eq("id", existing.id);
          toast.success("Welcome back!");
        }
      } else {
        const { error } = await supabase.from("newsletter_subscribers").insert({
          email: validated,
          signup_source: "ai_job_impact_tool",
        });
        if (error) throw error;
        toast.success("Subscribed!");
      }
      setEmail("");
    } catch {
      toast.error("Please enter a valid email address");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
      <h3 className="text-xl font-bold mb-2">Subscribe for Weekly AI Career Insights</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
        Stay ahead of AI-driven career changes across Asia-Pacific with our weekly newsletter.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSubmitting} className="flex-1" />
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "..." : "Subscribe"}</Button>
      </form>
    </Card>
  );
}

// X icon SVG
const XIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);
const LinkedInIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
);

export default function AIJobImpact() {
  const [roleQuery, setRoleQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [result, setResult] = useState<{
    role: RoleData;
    country: CountryData;
    score: number;
    scoreInfo: { label: string; color: string };
    fuzzy: boolean;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleAnalyse = () => {
    if (!roleQuery.trim()) { toast.error("Please enter your job title"); return; }
    if (!selectedCountry) { toast.error("Please select your country"); return; }

    const matchedRole = findBestRoleMatch(roleQuery);
    const country = COUNTRIES.find((c) => c.name === selectedCountry)!;

    if (!matchedRole) {
      const genericRole: RoleData = {
        title: roleQuery.trim(),
        category: "General",
        baseImpactScore: 45,
        automatableTasks: ["Routine data entry and processing", "Standard report generation", "Scheduling and calendar management", "Basic communication drafting"],
        humanTasks: ["Strategic decision-making", "Relationship building", "Creative problem solving", "Ethical judgement"],
        aiAdvantages: ["Use AI assistants to automate routine work", "Leverage AI analytics for better decisions", "Focus on uniquely human skills"],
        impactTimelineYears: [2, 6],
      };
      const score = calculateScore(genericRole, country);
      setResult({ role: genericRole, country, score, scoreInfo: getScoreLabel(score), fuzzy: true });
    } else {
      const fuzzy = matchedRole.title.toLowerCase() !== roleQuery.toLowerCase().trim();
      const score = calculateScore(matchedRole, country);
      setResult({ role: matchedRole, country, score, scoreInfo: getScoreLabel(score), fuzzy });
    }

    setShowResult(true);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleTryAnother = useCallback(() => {
    setRoleQuery("");
    setSelectedCountry("");
    setShowResult(false);
    setResult(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }, []);

  const handleShare = (platform: "twitter" | "linkedin" | "copy") => {
    if (!result) return;
    const url = "https://aiinasia.com/tools/ai-job-impact";
    const text = `My job as a ${result.role.title} in ${result.country.name} scored ${result.score}/100 on the AI impact scale! Check yours:`;

    if (platform === "copy") {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Copied to clipboard!");
    } else if (platform === "twitter") {
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&via=AI_in_Asia`, "_blank");
    } else {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, "_blank");
    }
  };

  const categoryStats = useMemo(() => {
    if (!result) return null;
    return getCategoryStats(result.role.category);
  }, [result]);

  return (
    <>
      <SEOHead
        title="Will AI Take My Job? — AI Career Impact Calculator"
        description="Discover how artificial intelligence will impact your career in Asia-Pacific. Get personalised insights for your role and country."
        canonical="https://aiinasia.com/tools/ai-job-impact"
        schemaJson={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "AI Job Impact Calculator",
          description: "Calculate how AI will impact your career in Asia-Pacific",
          url: "https://aiinasia.com/tools/ai-job-impact",
          applicationCategory: "UtilityApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          publisher: { "@type": "Organization", name: "AI in Asia", url: "https://aiinasia.com" },
        }}
      />

      <div className="min-h-screen flex flex-col">
        <Header />

        <main id="main-content" className="flex-1">
          {/* Hero */}
          <section className="border-b border-border/40 relative">
            <FloatingPills />
            <div className="container mx-auto px-4 py-16 md:py-24 max-w-3xl text-center relative z-10">
              <Breadcrumb className="mb-8 justify-center">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>AI Job Impact Calculator</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>

              <h1 className="headline text-4xl md:text-5xl lg:text-6xl mb-4 tracking-tight">
                Will AI Take My Job?
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10">
                Find out how AI might reshape your career in Asia-Pacific. Personalised insights — not scare tactics.
              </p>

              {/* Calculator Form */}
              <Card ref={formRef} className="p-6 md:p-8 text-left max-w-lg mx-auto border-border/60">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      <User className="h-3.5 w-3.5 inline mr-1.5" />
                      Your job title or role
                    </label>
                    <RoleInput value={roleQuery} onChange={setRoleQuery} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {ROLES.length}+ roles in our database
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      <Globe className="h-3.5 w-3.5 inline mr-1.5" />
                      Your country
                    </label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleAnalyse} size="lg" className="w-full text-base h-12">
                    <Zap className="h-4 w-4 mr-2" />
                    Analyse My Role
                  </Button>
                </div>
              </Card>
            </div>
          </section>

          {/* Results */}
          {showResult && result && (
            <section ref={resultRef} className="border-b border-border/40 bg-muted/30">
              <div className="container mx-auto px-4 py-16 max-w-4xl">
                {/* Fuzzy match notice */}
                {result.fuzzy && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mb-8 max-w-lg mx-auto">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>
                      Showing analysis for <strong className="text-foreground">{result.role.title}</strong>
                      {result.role.category !== "General" && ` (${result.role.category})`}
                       — closest match to your search.
                    </span>
                  </div>
                )}

                {/* Score */}
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-bold mb-2">
                    AI Impact Score for{" "}
                    <span className="text-primary">{result.role.title}</span>
                  </h2>
                  <p className="text-muted-foreground mb-6">in {result.country.name}</p>
                  <ScoreGauge score={result.score} label={result.scoreInfo.label} color={result.scoreInfo.color} />
                </div>

                {/* Insight Cards */}
                <div className="grid md:grid-cols-3 gap-5 mb-10">
                  <InsightCard icon={AlertTriangle} title="Tasks at Risk" items={result.role.automatableTasks} color="hsl(0, 84%, 60%)" />
                  <InsightCard icon={Shield} title="Tasks That Stay Human" items={result.role.humanTasks} color="hsl(142, 71%, 45%)" />
                  <InsightCard icon={TrendingUp} title="Your AI Advantage" items={result.role.aiAdvantages} color="hsl(var(--primary))" />
                </div>

                {/* How do you compare? */}
                {categoryStats && (
                  <Card className="p-6 border-border/60 mb-10">
                    <div className="flex items-center gap-2 mb-5">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground text-lg">How Do You Compare?</h3>
                    </div>
                    <div className="space-y-5">
                      <ComparisonBar
                        label={`Your Score (${result.role.title})`}
                        value={result.score}
                        maxValue={100}
                        sublabel="Your personalised AI impact score"
                        color={result.scoreInfo.color}
                      />
                      <ComparisonBar
                        label={`${result.role.category} Average`}
                        value={categoryStats.avg}
                        maxValue={100}
                        sublabel={`Average across ${result.role.category} roles`}
                        color="hsl(var(--primary))"
                      />
                      <ComparisonBar
                        label={`Most AI-Resistant: ${categoryStats.minRole.title}`}
                        value={categoryStats.minRole.baseImpactScore}
                        maxValue={100}
                        sublabel="Lowest disruption risk in this category"
                        color="hsl(142, 71%, 45%)"
                      />
                      <ComparisonBar
                        label={`Most AI-Disrupted: ${categoryStats.maxRole.title}`}
                        value={categoryStats.maxRole.baseImpactScore}
                        maxValue={100}
                        sublabel="Highest disruption risk in this category"
                        color="hsl(0, 84%, 60%)"
                      />
                    </div>
                  </Card>
                )}

                {/* Country context + Timeline */}
                <div className="grid md:grid-cols-2 gap-5 mb-10">
                  <Card className="p-5 border-border/60">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">AI Landscape in {result.country.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.country.regulatoryContext}</p>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Adoption speed:{" "}
                      <span className="font-medium text-foreground">
                        {result.country.adoptionMultiplier >= 1.15 ? "Very High" : result.country.adoptionMultiplier >= 1.0 ? "High" : result.country.adoptionMultiplier >= 0.85 ? "Moderate" : "Developing"}
                      </span>
                    </div>
                  </Card>

                  <Card className="p-5 border-border/60">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Impact Timeline</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Major AI-driven changes to this role are expected within:
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-1000"
                          style={{ width: `${Math.min(100, (result.role.impactTimelineYears[1] / 15) * 100)}%` }}
                        />
                      </div>
                      <span className="text-lg font-bold text-foreground whitespace-nowrap">
                        {result.role.impactTimelineYears[0]}–{result.role.impactTimelineYears[1]} years
                      </span>
                    </div>
                  </Card>
                </div>

                {/* Share Card + Buttons */}
                <div className="max-w-md mx-auto mb-10">
                  <h3 className="text-lg font-semibold text-center mb-4">Share Your Score</h3>
                  <ShareCard role={result.role} country={result.country} score={result.score} scoreInfo={result.scoreInfo} />
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button variant="outline" onClick={() => handleShare("copy")} className="gap-1.5">
                      <Link2 className="h-4 w-4" /> Copy Link
                    </Button>
                    <Button variant="outline" onClick={() => handleShare("twitter")} className="gap-1.5">
                      <XIcon /> Post on X
                    </Button>
                    <Button variant="outline" onClick={() => handleShare("linkedin")} className="gap-1.5">
                      <LinkedInIcon /> Share
                    </Button>
                  </div>
                </div>

                {/* Try Another */}
                <div className="text-center">
                  <Button variant="ghost" size="lg" onClick={handleTryAnother} className="gap-2 text-muted-foreground hover:text-foreground">
                    <RotateCcw className="h-4 w-4" />
                    Try Another Role
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Explore More */}
          <section className="container mx-auto px-4 py-16 max-w-3xl">
            <h2 className="text-2xl font-bold text-center mb-2">Explore More</h2>
            <p className="text-center text-muted-foreground mb-8">
              Dive deeper into how AI is transforming careers across Asia.
            </p>

            <div className="grid gap-4 mb-12">
              {[
                { title: "How AI Is Reshaping Jobs Across Southeast Asia", slug: "/category/business", desc: "Explore our coverage of AI-driven workforce changes" },
                { title: "AI Policy Atlas — Regulation by Country", slug: "/ai-policy-atlas", desc: "See how different countries are regulating AI" },
                { title: "AI Guides — Upskill for the AI Era", slug: "/guides", desc: "Practical guides to using AI tools in your career" },
              ].map((link) => (
                <Link key={link.slug} to={link.slug} className="group">
                  <Card className="p-4 hover:shadow-md transition-all hover:-translate-y-0.5 border-border/60 hover:border-primary/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">{link.title}</h3>
                        <p className="text-sm text-muted-foreground">{link.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            <NewsletterCTA />
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
