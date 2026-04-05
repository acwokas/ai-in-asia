import { useState, useMemo } from "react";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Share2, RotateCcw, Zap } from "lucide-react";

const QUESTIONS = [
  {
    q: "How often do you use AI tools (ChatGPT, Copilot, Midjourney, etc.)?",
    options: [
      { label: "Never heard of them", score: 0 },
      { label: "Tried once or twice", score: 1 },
      { label: "Weekly", score: 2 },
      { label: "Daily — can't live without them", score: 3 },
    ],
  },
  {
    q: "Does your company/team have a formal AI strategy?",
    options: [
      { label: "What's an AI strategy?", score: 0 },
      { label: "We've talked about it", score: 1 },
      { label: "Yes, but it's early stage", score: 2 },
      { label: "Yes, with budget and roadmap", score: 3 },
    ],
  },
  {
    q: "Have you built or shipped anything using AI?",
    options: [
      { label: "No", score: 0 },
      { label: "A personal project or experiment", score: 1 },
      { label: "A work prototype or internal tool", score: 2 },
      { label: "A production product/feature", score: 3 },
    ],
  },
  {
    q: "How do you handle AI-related risks (bias, hallucination, privacy)?",
    options: [
      { label: "Haven't thought about it", score: 0 },
      { label: "Aware but no process", score: 1 },
      { label: "Some guidelines in place", score: 2 },
      { label: "Formal governance framework", score: 3 },
    ],
  },
  {
    q: "How much of your workflow could AI automate today?",
    options: [
      { label: "Almost none", score: 0 },
      { label: "A few repetitive tasks", score: 1 },
      { label: "Significant portions", score: 2 },
      { label: "Most of it — I'm mostly orchestrating AI", score: 3 },
    ],
  },
  {
    q: "How do you stay updated on AI developments?",
    options: [
      { label: "I don't really", score: 0 },
      { label: "Social media / news occasionally", score: 1 },
      { label: "Newsletters and podcasts regularly", score: 2 },
      { label: "Research papers, conferences, and communities", score: 3 },
    ],
  },
  {
    q: "What's your team's AI skill level?",
    options: [
      { label: "No one knows much about AI", score: 0 },
      { label: "One or two enthusiasts", score: 1 },
      { label: "Most people use AI tools", score: 2 },
      { label: "Dedicated AI/ML engineers on staff", score: 3 },
    ],
  },
  {
    q: "How do you view AI's impact on your industry in Asia?",
    options: [
      { label: "Not relevant to us", score: 0 },
      { label: "Interesting but distant", score: 1 },
      { label: "It's already changing things", score: 2 },
      { label: "It's the defining shift of our generation", score: 3 },
    ],
  },
];

const TIERS = [
  { name: "AI Curious", min: 0, max: 6, icon: "Sprout", desc: "You're just getting started — and that's perfectly fine. The best time to explore AI is now." },
  { name: "AI Explorer", min: 7, max: 12, icon: "Compass", desc: "You're actively exploring AI and building awareness. Keep experimenting and learning!" },
  { name: "AI Adopter", min: 13, max: 18, icon: "Rocket", desc: "You're integrating AI into real workflows. You're ahead of most people in the region." },
  { name: "AI Native", min: 19, max: 24, icon: "Zap", desc: "AI is woven into everything you do. You're leading the charge in Asia's AI transformation." },
];

const RadialProgress = ({ score, max }: { score: number; max: number }) => {
  const pct = score / max;
  const r = 80;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="12" />
        <motion.circle
          cx="100" cy="100" r={r} fill="none"
          stroke="hsl(43 96% 56%)"
          strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-black text-foreground"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground font-medium">out of {max}</span>
      </div>
    </div>
  );
};

const AIReadiness = () => {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [finished, setFinished] = useState(false);

  const totalScore = useMemo(() => answers.reduce<number>((s, a) => s + (a ?? 0), 0), [answers]);
  const tier = TIERS.find((t) => totalScore >= t.min && totalScore <= t.max) || TIERS[0];

  const select = (score: number) => {
    const next = [...answers];
    next[current] = score;
    setAnswers(next);
  };

  const goNext = () => {
    if (current < QUESTIONS.length - 1) setCurrent(current + 1);
    else setFinished(true);
  };

  const reset = () => {
    setCurrent(0);
    setAnswers(Array(QUESTIONS.length).fill(null));
    setFinished(false);
  };

  const shareText = `I scored ${totalScore}/24 on the AI Readiness quiz — I'm an "${tier.name}"\n\nHow AI-ready are you?`;
  const shareUrl = "https://aiinasia.com/tools/ai-readiness";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Readiness Score Quiz | AI in Asia"
        description="Take this fun 8-question quiz to find out how AI-ready your business or career is. Get your score and share it!"
        canonical="https://aiinasia.com/tools/ai-readiness"
      />
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {!finished ? (
              <motion.div
                key={`q-${current}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-border bg-card p-6 md:p-8"
              >
                {/* Progress */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Question {current + 1} of {QUESTIONS.length}
                  </span>
                  <div className="flex gap-1">
                    {QUESTIONS.map((_, i) => (
                      <div
                        key={i}
                        className="h-1.5 w-6 rounded-full transition-colors"
                        style={{
                          background: i <= current
                            ? "hsl(43 96% 56%)"
                            : "hsl(var(--border))",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <h2 className="font-display text-lg md:text-xl font-bold text-foreground mb-6 leading-snug">
                  {QUESTIONS[current].q}
                </h2>

                <div className="space-y-3 mb-6">
                  {QUESTIONS[current].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => select(opt.score)}
                      className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                        answers[current] === opt.score
                          ? "border-amber-500 bg-amber-500/10 text-amber-500"
                          : "border-border bg-background text-foreground hover:border-amber-500/40 hover:bg-amber-500/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrent(Math.max(0, current - 1))}
                    disabled={current === 0}
                    className="gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={goNext}
                    disabled={answers[current] === null}
                    className="gap-1 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  >
                    {current === QUESTIONS.length - 1 ? "See Results" : "Next"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-border bg-card p-8 text-center"
              >
                <RadialProgress score={totalScore} max={24} />

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <span className="text-3xl mb-1 block font-bold text-amber-500">{tier.name}</span>
                  <h2 className="font-display text-2xl font-black text-foreground mb-1">
                    You're an <span className="text-amber-500">{tier.name}</span>
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                    {tier.desc}
                  </p>

                  {/* Share */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share on X
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-amber-500/40 transition-colors"
                    >
                      <Share2 className="h-3.5 w-3.5" /> LinkedIn
                    </a>
                  </div>

                  <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-muted-foreground">
                    <RotateCcw className="h-3.5 w-3.5" /> Take Again
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIReadiness;
