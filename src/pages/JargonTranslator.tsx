import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";
import InlineNewsletterSignup from "@/components/InlineNewsletterSignup";
import { findJargonInText, SAMPLE_TEXTS, type JargonEntry } from "@/lib/jargonDictionary";
import { Copy, Check, Share2, Twitter, Linkedin, Sparkles, BookOpen, Zap, Baby } from "lucide-react";
import { toast } from "sonner";

type TranslationMode = "plain" | "brutal" | "eli5";

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

function getScoreLabel(pct: number): { label: string; color: string } {
  if (pct < 5) return { label: "Refreshingly human", color: "text-green-400" };
  if (pct < 15) return { label: "Mildly buzzwordy", color: "text-yellow-400" };
  if (pct < 30) return { label: "Peak LinkedIn", color: "text-orange-400" };
  return { label: "Congratulations, this is legally unreadable", color: "text-red-400" };
}

function getTranslation(entry: JargonEntry, mode: TranslationMode): string {
  return mode === "brutal" ? entry.brutal : mode === "eli5" ? entry.eli5 : entry.plain;
}

export default function JargonTranslator() {
  const [inputText, setInputText] = useState("");
  const [translatedInput, setTranslatedInput] = useState("");
  const [mode, setMode] = useState<TranslationMode>("plain");
  const [hasTranslated, setHasTranslated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoveredTerm, setHoveredTerm] = useState<string | null>(null);

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
    if (!matches.length) return hasTranslated && translatedInput ? [{ type: "text" as const, content: translatedInput }] : [];
    const segments: { type: "text" | "jargon"; content: string; entry?: JargonEntry }[] = [];
    let lastIndex = 0;
    for (const match of matches) {
      if (match.startIndex > lastIndex) {
        segments.push({ type: "text", content: translatedInput.substring(lastIndex, match.startIndex) });
      }
      segments.push({ type: "jargon", content: translatedInput.substring(match.startIndex, match.endIndex), entry: match.entry });
      lastIndex = match.endIndex;
    }
    if (lastIndex < translatedInput.length) {
      segments.push({ type: "text", content: translatedInput.substring(lastIndex) });
    }
    return segments;
  }, [matches, translatedInput, hasTranslated]);

  const plainTranslatedText = useMemo(() => {
    if (!matches.length) return translatedInput;
    let result = translatedInput;
    // Replace from end to start to preserve indices
    const reversed = [...matches].reverse();
    for (const match of reversed) {
      const translation = getTranslation(match.entry, mode);
      result = result.substring(0, match.startIndex) + translation + result.substring(match.endIndex);
    }
    return result;
  }, [matches, translatedInput, mode]);

  const handleTranslate = useCallback(() => {
    setTranslatedInput(inputText);
    setHasTranslated(true);
  }, [inputText]);

  const handleExample = useCallback(() => {
    const sample = SAMPLE_TEXTS[Math.floor(Math.random() * SAMPLE_TEXTS.length)];
    setInputText(sample);
    setTranslatedInput(sample);
    setHasTranslated(true);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(plainTranslatedText);
      setCopied(true);
      toast.success("Translated text copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Failed to copy"); }
  }, [plainTranslatedText]);

  const shareUrl = "https://aiinasia.com/tools/jargon-translator";
  const shareText = `My text scored ${jargonScore}% on the AI Jargon Scale: "${getScoreLabel(jargonScore).label}" 🤖 Check yours:`;

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

      <div className="min-h-screen bg-background">
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
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  mode === m.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
                <span className="hidden sm:inline text-xs opacity-70">— {m.desc}</span>
              </button>
            ))}
          </div>

          {/* Two-Panel Layout */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Input Panel */}
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-foreground">Corporate AI Speak</h2>
                  <span className="text-xs text-muted-foreground">{inputText.length}/2000</span>
                </div>
                <Textarea
                  value={inputText}
                  onChange={(e) => {
                    if (e.target.value.length <= 2000) setInputText(e.target.value);
                  }}
                  placeholder="Paste any AI press release, LinkedIn post, or corporate announcement here..."
                  className="min-h-[200px] bg-background border-border text-foreground resize-y"
                  maxLength={2000}
                />
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button onClick={handleTranslate} disabled={!inputText.trim()}>
                    Translate
                  </Button>
                  <Button variant="outline" onClick={handleExample}>
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
                  {hasTranslated && matches.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy translation">
                        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>

                {!hasTranslated ? (
                  <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Paste text on the left and hit Translate
                  </div>
                ) : matches.length === 0 ? (
                  <div className="min-h-[200px]">
                    <p className="text-foreground leading-relaxed">{translatedInput}</p>
                    <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-green-400 font-medium text-sm">✨ Refreshingly human — no jargon detected!</p>
                    </div>
                  </div>
                ) : (
                  <div className="min-h-[200px]">
                    <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {translatedSegments.map((seg, i) =>
                        seg.type === "text" ? (
                          <span key={i}>{seg.content}</span>
                        ) : (
                          <span
                            key={i}
                            className="relative inline-block cursor-help"
                            onMouseEnter={() => setHoveredTerm(seg.content + i)}
                            onMouseLeave={() => setHoveredTerm(null)}
                            onClick={() => setHoveredTerm(hoveredTerm === seg.content + i ? null : seg.content + i)}
                          >
                            <span className="underline decoration-primary/50 decoration-2 underline-offset-2 text-primary font-medium">
                              {getTranslation(seg.entry!, mode)}
                            </span>
                            {hoveredTerm === seg.content + i && (
                              <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-lg bg-popover border border-border shadow-lg text-sm">
                                <span className="block font-semibold text-primary mb-1">"{seg.content}"</span>
                                <span className="block text-muted-foreground">{seg.entry!.plain}</span>
                                {seg.entry!.asiaContext && (
                                  <span className="block text-xs text-primary/70 mt-1">🌏 {seg.entry!.asiaContext}</span>
                                )}
                              </span>
                            )}
                          </span>
                        )
                      )}
                    </div>

                    {/* Jargon Score */}
                    <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Jargon Score</span>
                        <span className={`text-2xl font-bold ${getScoreLabel(jargonScore).color}`}>{jargonScore}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.min(jargonScore, 100)}%`,
                            background: jargonScore < 5 ? "hsl(var(--primary))" :
                              jargonScore < 15 ? "#facc15" :
                              jargonScore < 30 ? "#f97316" : "#ef4444",
                          }}
                        />
                      </div>
                      <p className={`text-sm font-medium ${getScoreLabel(jargonScore).color}`}>
                        {getScoreLabel(jargonScore).label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {matches.length} buzzword{matches.length !== 1 ? "s" : ""} found in {translatedInput.split(/\s+/).filter(Boolean).length} words
                      </p>

                      {/* Share Score */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground mr-1"><Share2 className="h-3 w-3 inline" /> Share:</span>
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&via=AI_in_Asia`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Share on X"
                        >
                          <Twitter className="h-4 w-4" />
                        </a>
                        <a
                          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Share on LinkedIn"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                            toast.success("Share text copied!");
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Copy share link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Jargon Hall of Fame */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">🏆 Jargon Hall of Fame</h2>
            <p className="text-muted-foreground text-center mb-6 text-sm">Real-ish examples of corporate AI word salad. Click any to translate.</p>
            <div className="grid gap-3 max-w-3xl mx-auto">
              {HALL_OF_FAME.map((text, i) => (
                <button
                  key={i}
                  onClick={() => { setInputText(text); setTranslatedInput(text); setHasTranslated(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="text-left p-4 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors"
                >
                  <p className="text-sm text-muted-foreground italic">"{text}"</p>
                </button>
              ))}
            </div>
          </section>

          {/* Learn More + Newsletter */}
          <section className="max-w-2xl mx-auto text-center mb-12">
            <a
              href="/guides"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium mb-8"
            >
              <BookOpen className="h-4 w-4" />
              Learn the real terms → Read our AI guides
            </a>
            <InlineNewsletterSignup variant="default" />
          </section>
        </div>
      </div>
    </>
  );
}
