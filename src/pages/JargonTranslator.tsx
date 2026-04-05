import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InlineNewsletterSignup from "@/components/InlineNewsletterSignup";
import { findJargonInText, SAMPLE_TEXTS, type JargonEntry } from "@/lib/jargonDictionary";
import { Copy, Check, Share2, Sparkles, BookOpen, Zap, Baby, Send, ArrowDown } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type TranslationMode = "plain" | "brutal" | "eli5";

const MODE_COLORS: Record<TranslationMode, { highlight: string; underline: string; badge: string }> = {
  plain: { highlight: "bg-primary/25", underline: "decoration-primary/80", badge: "bg-primary/20 text-primary" },
  brutal: { highlight: "bg-orange-500/25", underline: "decoration-orange-400/80", badge: "bg-orange-500/20 text-orange-400" },
  eli5: { highlight: "bg-violet-500/25", underline: "decoration-violet-400/80", badge: "bg-violet-500/20 text-violet-400" },
};

const MODES: { key: TranslationMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: "plain", label: "Plain English", icon: <BookOpen className="h-4 w-4" />, desc: "Clear & simple" },
  { key: "brutal", label: "Brutally Honest", icon: <Zap className="h-4 w-4" />, desc: "Sarcastic but accurate" },
  { key: "eli5", label: "Explain Like I'm 5", icon: <Baby className="h-4 w-4" />, desc: "Ultra-simple" },
];

const HALL_OF_FAME = [
  "We are uniquely positioned to leverage our AI-powered, best-in-class platform to operationalize transformative synergies across the enterprise ecosystem.",
  "Our cutting-edge, next-generation solution harnesses the power of multimodal foundation models to democratize AI-driven insights at scale.",
  "This paradigm shift enables seamless integration of our revolutionary end-to-end AI copilot into mission-critical workflows.",
  "By leveraging our proprietary data flywheel and state-of-the-art RAG pipeline, we've achieved unparalleled product-market fit in the B2B vertical.",
  "Our holistic approach to responsible AI governance ensures robust guardrails while unlocking value through innovative, future-proof scalable solutions.",
];

function getScoreLabel(pct: number): { label: string; color: string; bg: string } {
  if (pct < 5) return { label: "Refreshingly human", color: "text-green-400", bg: "bg-green-500" };
  if (pct < 15) return { label: "Mildly buzzwordy", color: "text-yellow-400", bg: "bg-yellow-500" };
  if (pct < 30) return { label: "Peak LinkedIn", color: "text-orange-400", bg: "bg-orange-500" };
  return { label: "Congratulations, this is legally unreadable", color: "text-red-400", bg: "bg-red-500" };
}

function getTranslation(entry: JargonEntry, mode: TranslationMode): string {
  return mode === "brutal" ? entry.brutal : mode === "eli5" ? entry.eli5 : entry.plain;
}

// Animated count-up number
function AnimatedScore({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 800;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return <>{value}</>;
}

// Typewriter reveal for output
function TypewriterText({ children, trigger }: { children: React.ReactNode; trigger: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <div className={`transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
      {visible && children}
    </div>
  );
}

// X icon
const XIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);
const LinkedInIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
);

export default function JargonTranslator() {
  const [inputText, setInputText] = useState("");
  const [translatedInput, setTranslatedInput] = useState("");
  const [mode, setMode] = useState<TranslationMode>("plain");
  const [hasTranslated, setHasTranslated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationKey, setTranslationKey] = useState(0);
  const [submissionText, setSubmissionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCleanVersion, setShowCleanVersion] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    if (!hasTranslated || !translatedInput) return [];
    return findJargonInText(translatedInput);
  }, [translatedInput, hasTranslated]);

  const jargonScore = useMemo(() => {
    if (!matches.length || !translatedInput) return 0;
    const wordCount = translatedInput.split(/\s+/).filter(Boolean).length;
    if (!wordCount) return 0;
    return Math.round((matches.length / wordCount) * 100);
  }, [matches, translatedInput]);

  const translatedSegments = useMemo(() => {
    if (!matches.length) return hasTranslated && translatedInput ? [{ type: "text" as const, content: translatedInput, original: "" }] : [];
    const segments: { type: "text" | "jargon"; content: string; original: string; entry?: JargonEntry }[] = [];
    let lastIndex = 0;
    for (const match of matches) {
      if (match.startIndex > lastIndex) {
        segments.push({ type: "text", content: translatedInput.substring(lastIndex, match.startIndex), original: "" });
      }
      const original = translatedInput.substring(match.startIndex, match.endIndex);
      segments.push({ type: "jargon", content: original, original, entry: match.entry });
      lastIndex = match.endIndex;
    }
    if (lastIndex < translatedInput.length) {
      segments.push({ type: "text", content: translatedInput.substring(lastIndex), original: "" });
    }
    return segments;
  }, [matches, translatedInput, hasTranslated]);

  const plainTranslatedText = useMemo(() => {
    if (!matches.length) return translatedInput;
    let result = translatedInput;
    const reversed = [...matches].reverse();
    for (const match of reversed) {
      const translation = getTranslation(match.entry, mode);
      result = result.substring(0, match.startIndex) + translation + result.substring(match.endIndex);
    }
    return result;
  }, [matches, translatedInput, mode]);

  const outputWordCount = useMemo(() => {
    return plainTranslatedText ? plainTranslatedText.split(/\s+/).filter(Boolean).length : 0;
  }, [plainTranslatedText]);

  const handleTranslate = useCallback(() => {
    setIsTranslating(true);
    setTimeout(() => {
      setTranslatedInput(inputText);
      setHasTranslated(true);
      setTranslationKey((k) => k + 1);
      setIsTranslating(false);
      setTimeout(() => scoreRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 300);
    }, 600);
  }, [inputText]);

  const handleHallOfFame = useCallback((text: string) => {
    setInputText(text);
    setIsTranslating(true);
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      setTranslatedInput(text);
      setHasTranslated(true);
      setTranslationKey((k) => k + 1);
      setIsTranslating(false);
    }, 800);
  }, []);

  const handleExample = useCallback(() => {
    const sample = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    setInputText(sample);
    setIsTranslating(true);
    setTimeout(() => {
      setTranslatedInput(sample);
      setHasTranslated(true);
      setTranslationKey((k) => k + 1);
      setIsTranslating(false);
    }, 600);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(plainTranslatedText);
      setCopied(true);
      toast.success("Translated text copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Failed to copy"); }
  }, [plainTranslatedText]);

  const handleSubmitJargon = useCallback(async () => {
    const trimmed = submissionText.trim();
    if (!trimmed || trimmed.length < 10) {
      toast.error("Please enter at least 10 characters");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("jargon_submissions").insert({ text: trimmed });
      if (error) throw error;
      toast.success("Thanks! Your jargon has been submitted");
      setSubmissionText("");
    } catch {
      toast.error("Submission failed — please try again");
    } finally {
      setIsSubmitting(false);
    }
  }, [submissionText]);

  const shareUrl = "https://aiinasia.com/tools/jargon-translator";
  const scoreLabel = getScoreLabel(jargonScore);
  const shareText = `I just translated a press release that scored ${jargonScore}% jargon — "${scoreLabel.label}" Try it:`;
  const modeColors = MODE_COLORS[mode];

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AI Jargon Translator",
    url: shareUrl,
    description: "Paste any AI press release and get a plain-English translation. Cut through the corporate jargon.",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "AI in Asia", url: "https://aiinasia.com" },
  };

  return (
    <>
      <SEOHead
        title="AI Jargon Translator — Decode the Buzzwords"
        description="Paste any AI press release and get a plain-English translation. Cut through the corporate jargon with AI in Asia's Jargon Translator."
        canonical={shareUrl}
        schemaJson={schemaJson}
      />

      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        {/* Breadcrumb */}
        <div className="container max-w-6xl mx-auto px-4 pt-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/tools">Tools</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>AI Jargon Translator</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {/* Hero */}
        <div className="border-b border-border bg-muted/30">
          <div className="container max-w-6xl mx-auto px-4 py-12 md:py-16 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" /> Free Tool
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
              AI Jargon Translator
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
              Because <em>"leveraging synergistic AI-driven paradigm shifts"</em> means absolutely nothing
            </p>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-4 py-8 md:py-12">
          {/* Mode Toggle */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {MODES.map((m) => {
              const isActive = mode === m.key;
              const colors = MODE_COLORS[m.key];
              return (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    isActive
                      ? `${colors.badge} border-current`
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                  <span className="hidden sm:inline text-xs opacity-70">— {m.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Two-Panel Layout */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Input Panel */}
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-foreground">Corporate AI Speak</h2>
                  <span className="text-xs text-muted-foreground">{inputText.length}/2000</span>
                </div>
                <Textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => { if (e.target.value.length <= 2000) setInputText(e.target.value); }}
                  placeholder="Paste any AI press release, LinkedIn post, or corporate announcement here..."
                  className="min-h-[200px] bg-background border-border text-foreground resize-y"
                  maxLength={2000}
                />
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button onClick={handleTranslate} disabled={!inputText.trim() || isTranslating}>
                    {isTranslating ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Decoding...
                      </span>
                    ) : "Translate"}
                  </Button>
                  <Button variant="outline" onClick={handleExample} disabled={isTranslating}>
                    Try an example
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Output Panel */}
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                   <h2 className="font-semibold text-foreground">What They Actually Mean</h2>
                   <div className="flex items-center gap-2">
                     {hasTranslated && matches.length > 0 && (
                       <button
                         onClick={() => setShowCleanVersion((v) => !v)}
                         className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
                           showCleanVersion
                             ? "bg-primary/15 text-primary border-primary/30"
                             : "bg-muted text-muted-foreground border-border hover:text-foreground"
                         }`}
                       >
                         <Sparkles className="h-3 w-3" />
                         {showCleanVersion ? "Clean version" : "Show clean"}
                       </button>
                     )}
                     {hasTranslated && outputWordCount > 0 && (
                       <span className="text-xs text-muted-foreground">{outputWordCount} words</span>
                     )}
                     {hasTranslated && matches.length > 0 && (
                       <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-muted-foreground">
                         {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                         <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
                       </Button>
                     )}
                   </div>
                 </div>

                {isTranslating ? (
                  <div className="min-h-[200px] flex flex-col items-center justify-center gap-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">Decoding corporate speak...</p>
                  </div>
                ) : !hasTranslated ? (
                  <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Paste text on the left and hit Translate
                  </div>
                ) : matches.length === 0 ? (
                  <div className="min-h-[200px]">
                    <TypewriterText trigger={translationKey}>
                      <p className="text-foreground leading-relaxed">{translatedInput}</p>
                      <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-green-400 font-medium text-sm">Refreshingly human — no jargon detected!</p>
                      </div>
                    </TypewriterText>
                  </div>
                ) : showCleanVersion ? (
                   <div className="min-h-[200px]">
                     <p className="text-foreground leading-relaxed whitespace-pre-wrap">{plainTranslatedText}</p>
                   </div>
                 ) : (
                   <div className="min-h-[200px]">
                     <TypewriterText trigger={translationKey}>
                       <p className="text-foreground leading-loose whitespace-pre-wrap">
                         {translatedSegments.map((seg, i) =>
                           seg.type === "text" ? (
                             <span key={i}>{seg.content}</span>
                           ) : (
                             <span
                               key={i}
                               className="relative inline-block cursor-help"
                               onMouseEnter={() => setHoveredTerm(seg.original + i)}
                               onMouseLeave={() => setHoveredTerm(null)}
                               onClick={() => setHoveredTerm(hoveredTerm === seg.original + i ? null : seg.original + i)}
                             >
                               <span className={`border-b-2 ${modeColors.underline.replace('decoration-', 'border-')} ${modeColors.highlight} rounded-sm px-0.5 py-0.5`}>
                                 {getTranslation(seg.entry!, mode)}
                               </span>
                               {hoveredTerm === seg.original + i && (
                                 <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 rounded-lg bg-popover border border-border shadow-xl text-sm pointer-events-none" style={{ lineHeight: '1.4' }}>
                                   <span className="block font-semibold text-primary mb-1">"{seg.original}"</span>
                                   <span className="block text-muted-foreground text-xs mb-1">{seg.entry!.plain}</span>
                                   {seg.entry!.asiaContext && (
                                     <span className="block text-xs text-primary/70 mt-1">{seg.entry!.asiaContext}</span>
                                   )}
                                   <span className={`inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${modeColors.badge}`}>
                                     {mode === "plain" ? "Plain English" : mode === "brutal" ? "Brutally Honest" : "ELI5"}
                                   </span>
                                 </span>
                               )}
                             </span>
                           )
                         )}
                       </p>
                     </TypewriterText>
                   </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Jargon Score — prominent display between panels and rest */}
          {hasTranslated && !isTranslating && matches.length > 0 && (
            <div ref={scoreRef} className="mb-12 animate-fade-in">
              <Card className="border-border bg-card overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                    {/* Score number */}
                    <div className="text-center md:text-left shrink-0">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Jargon Score</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-6xl md:text-7xl font-bold ${scoreLabel.color}`}>
                          <AnimatedScore target={jargonScore} />
                        </span>
                        <span className={`text-2xl font-bold ${scoreLabel.color}`}>%</span>
                      </div>
                      <p className={`text-sm font-semibold mt-1 ${scoreLabel.color} ${jargonScore >= 30 ? "animate-pulse" : ""}`}>
                        {scoreLabel.label}
                      </p>
                    </div>

                    {/* Score bar + details */}
                    <div className="flex-1 w-full">
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${scoreLabel.bg}`}
                          style={{ width: `${Math.min(jargonScore, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        {matches.length} buzzword{matches.length !== 1 ? "s" : ""} found in {translatedInput.split(/\s+/).filter(Boolean).length} words
                      </p>

                      {/* Share buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground"><Share2 className="h-3 w-3 inline mr-1" />Share your score:</span>
                        <a
                          href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&via=AI_in_Asia`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                        >
                          <XIcon /> Post on X
                        </a>
                        <a
                          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                        >
                          <LinkedInIcon /> Share
                        </a>
                        <button
                          onClick={() => { navigator.clipboard.writeText(`${shareText} ${shareUrl}`); toast.success("Share text copied!"); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Jargon Hall of Fame */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-2 text-center">Jargon Hall of Fame</h2>
            <p className="text-muted-foreground text-center mb-6 text-sm">Real-ish examples of corporate AI word salad. Click any to auto-translate.</p>
            <div className="grid gap-3 max-w-3xl mx-auto">
              {HALL_OF_FAME.map((text, i) => (
                <button
                  key={i}
                  onClick={() => handleHallOfFame(text)}
                  className="group text-left p-4 rounded-lg bg-card border border-border hover:border-primary/40 transition-all hover:-translate-y-0.5"
                >
                  <p className="text-sm text-muted-foreground italic group-hover:text-foreground transition-colors">"{text}"</p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary/60 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowDown className="h-3 w-3" /> Click to translate
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Submit Your Own */}
          <section className="mb-12 max-w-2xl mx-auto">
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-1">Submit Your Own</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Found corporate AI jargon in the wild? Paste the worst offender here and help build the Hall of Shame.
                </p>
                <Textarea
                  value={submissionText}
                  onChange={(e) => { if (e.target.value.length <= 2000) setSubmissionText(e.target.value); }}
                  placeholder="Paste the most jargon-filled sentence you've found..."
                  className="min-h-[80px] bg-background border-border text-foreground resize-y mb-3"
                  maxLength={2000}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{submissionText.length}/2000</span>
                  <Button
                    onClick={handleSubmitJargon}
                    disabled={isSubmitting || submissionText.trim().length < 10}
                    size="sm"
                    className="gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Learn More + Newsletter */}
          <section className="max-w-2xl mx-auto text-center mb-12">
            <a href="/guides" className="inline-flex items-center gap-2 text-primary hover:underline font-medium mb-8">
              <BookOpen className="h-4 w-4" />
              Learn the real terms → Read our AI guides
            </a>
            <InlineNewsletterSignup variant="default" />
          </section>
        </div>
        <Footer />
      </div>
    </>
  );
}
