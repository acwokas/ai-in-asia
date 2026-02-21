import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, ArrowLeft, RotateCcw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import EventCard from "@/components/events/EventCard";
import { cn } from "@/lib/utils";

// Interfaces, types, constants
interface FinderEvent {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string;
  city: string;
  country: string;
  region: string;
  website_url: string | null;
  organizer: string | null;
}

interface EventsFinderProps {
  events: FinderEvent[];
}

type Step = 0 | 1 | 2 | 3;

const STEPS = [
  { label: "Role", question: "What's your role?" },
  { label: "Interests", question: "What topics interest you?", multi: true },
  { label: "Region", question: "Where are you based?" },
  { label: "Budget", question: "Event budget?" },
];

const ROLES = [
  "Developer / Engineer",
  "Product / PM",
  "Executive / C-Suite",
  "Researcher / Academic",
  "Marketing / Growth",
  "Other",
];

const INTERESTS = [
  "LLMs & Generative AI",
  "Computer Vision",
  "MLOps & Infrastructure",
  "AI Ethics & Governance",
  "Industry / Applied AI",
  "Robotics & Hardware",
  "Data Science",
  "AI Business Strategy",
];

const REGIONS = [
  "Southeast Asia",
  "East Asia",
  "South Asia",
  "Oceania",
  "Americas",
  "Europe",
  "Middle East & Africa",
];

const BUDGETS = [
  "Free events only",
  "Under $500",
  "Under $1,000",
  "No budget limit",
];

const REGION_MAP: Record<string, string[]> = {
  "Southeast Asia": ["APAC"],
  "East Asia": ["APAC"],
  "South Asia": ["APAC"],
  "Oceania": ["APAC"],
  "Americas": ["Americas"],
  "Europe": ["EMEA"],
  "Middle East & Africa": ["Middle East & Africa", "EMEA"],
};

const ROLE_TYPE_MAP: Record<string, string[]> = {
  "Developer / Engineer": ["workshop", "hackathon", "conference"],
  "Product / PM": ["conference", "summit", "meetup"],
  "Executive / C-Suite": ["summit", "conference"],
  "Researcher / Academic": ["conference", "workshop"],
  "Marketing / Growth": ["conference", "summit", "webinar"],
  "Other": [],
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  "LLMs & Generative AI": ["llm", "generative", "gpt", "language model", "chatgpt", "gen ai", "genai", "large language"],
  "Computer Vision": ["computer vision", "image recognition", "visual", "object detection", "cv"],
  "MLOps & Infrastructure": ["mlops", "infrastructure", "deploy", "pipeline", "ml ops", "platform"],
  "AI Ethics & Governance": ["ethics", "governance", "responsible", "regulation", "policy", "bias", "safety", "alignment"],
  "Industry / Applied AI": ["industry", "applied", "enterprise", "business", "use case", "application"],
  "Robotics & Hardware": ["robot", "hardware", "autonomous", "drone", "edge"],
  "Data Science": ["data science", "analytics", "data engineer", "big data", "statistics"],
  "AI Business Strategy": ["strategy", "leadership", "transformation", "digital", "adoption", "roi"],
};

type MatchLevel = "great" | "good" | "partial";

interface ScoredEvent extends FinderEvent {
  score: number;
  matchLevel: MatchLevel;
}

export default function EventsFinder({ events }: EventsFinderProps) {
  const [step, setStep] = useState<Step>(0);
  const [role, setRole] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const toggleInterest = useCallback((interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  }, []);

  const canProceed = step === 0 ? !!role : step === 1 ? interests.length > 0 : step === 2 ? !!region : !!budget;

  const handleNext = useCallback(() => {
    if (step < 3) setStep((s) => (s + 1) as Step);
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => (s - 1) as Step);
  }, [step]);

  const handleFind = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowResults(true);
      setCollapsed(true);
    }, 1200);
  }, []);

  const handleReset = useCallback(() => {
    setStep(0);
    setRole(null);
    setInterests([]);
    setRegion(null);
    setBudget(null);
    setShowResults(false);
    setCollapsed(false);
  }, []);

  const results = useMemo<ScoredEvent[]>(() => {
    if (!showResults || !region) return [];

    const regionCodes = REGION_MAP[region] || [];
    const roleTypes = role ? ROLE_TYPE_MAP[role] || [] : [];
    const topicKws = interests.flatMap((i) => TOPIC_KEYWORDS[i] || []);

    const scored: ScoredEvent[] = events.map((event) => {
      let score = 0;
      const eType = event.event_type.toLowerCase();
      const text = `${event.title} ${event.description || ""}`.toLowerCase();

      if (regionCodes.includes(event.region)) score += 3;
      if (roleTypes.includes(eType)) score += 2;

      let topicHits = 0;
      for (const kw of topicKws) {
        if (text.includes(kw)) { topicHits++; if (topicHits >= 3) break; }
      }
      score += topicHits;

      const isFree = text.includes("free") || eType.includes("free");
      if (budget === "Free events only") {
        if (isFree) score += 1;
      } else if (budget === "No budget limit") {
        score += 1;
      } else {
        score += 0.5;
      }

      const matchLevel: MatchLevel = score >= 5 ? "great" : score >= 3 ? "good" : "partial";

      return { ...event, score, matchLevel };
    });

    scored.sort((a, b) => b.score - a.score || new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    const meaningful = scored.filter((e) => e.score >= 2);
    if (meaningful.length === 0) {
      const regionFallback = events
        .filter((e) => regionCodes.includes(e.region))
        .slice(0, 6)
        .map((e) => ({ ...e, score: 1, matchLevel: "partial" as MatchLevel }));
      return regionFallback;
    }

    return scored.filter((e) => e.score >= 1).slice(0, 12);
  }, [showResults, events, role, interests, region, budget]);

  const summaryText = [role, interests.join(", "), region, budget].filter(Boolean).join(" · ");

  const PillButton = ({
    label,
    selected,
    onClick,
  }: {
    label: string;
    selected: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "px-5 py-2 rounded-[20px] text-sm font-medium transition-all duration-200 border cursor-pointer",
        selected
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-transparent text-foreground/80 border-foreground/20 hover:border-foreground/40 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );

  const MatchBadge = ({ level }: { level: MatchLevel }) => {
    const config = {
      great: { label: "Great match", className: "bg-green-500/15 text-green-400 border-green-500/20" },
      good: { label: "Good match", className: "bg-primary/15 text-primary border-primary/20" },
      partial: { label: "Partial match", className: "bg-muted text-muted-foreground border-border" },
    };
    const c = config[level];
    return <Badge className={cn("text-[10px] font-medium", c.className)}>{c.label}</Badge>;
  };

  return (
    <section className="py-10 md:py-12">
      <div className="mb-6">
        <h2
          className="text-2xl md:text-3xl font-extrabold mb-2"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Find Your Perfect Event
        </h2>
        <p className="text-sm text-muted-foreground">
          Answer a few quick questions and we'll recommend the best events for you.
        </p>
      </div>

      <div
        className="rounded-xl border border-border/50 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.7) 100%)`,
          boxShadow: "0 0 0 1px hsl(var(--primary) / 0.08), 0 8px 32px hsl(var(--background) / 0.5)",
        }}
      >
        {/* Collapsed summary */}
        {collapsed && showResults && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/30">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground truncate">{summaryText}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCollapsed(false)}
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                Edit preferences
              </button>
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Questionnaire */}
        {!collapsed && (
          <div className="p-5 md:p-6">
            {/* Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Step {step + 1} of 4 — {STEPS[step].label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {STEPS[step].multi ? "Select multiple" : "Select one"}
                </span>
              </div>
              <Progress value={((step + 1) / 4) * 100} className="h-1.5" />
            </div>

            {/* Question */}
            <h3 className="text-lg font-bold mb-4">{STEPS[step].question}</h3>

            {/* Options */}
            <div className="flex flex-wrap gap-2.5 mb-6">
              {step === 0 &&
                ROLES.map((r) => (
                  <PillButton key={r} label={r} selected={role === r} onClick={() => setRole(r)} />
                ))}
              {step === 1 &&
                INTERESTS.map((i) => (
                  <PillButton
                    key={i}
                    label={i}
                    selected={interests.includes(i)}
                    onClick={() => toggleInterest(i)}
                  />
                ))}
              {step === 2 &&
                REGIONS.map((r) => (
                  <PillButton key={r} label={r} selected={region === r} onClick={() => setRegion(r)} />
                ))}
              {step === 3 &&
                BUDGETS.map((b) => (
                  <PillButton key={b} label={b} selected={budget === b} onClick={() => setBudget(b)} />
                ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={step === 0}
                className="gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>

              {step < 3 ? (
                <Button size="sm" onClick={handleNext} disabled={!canProceed} className="gap-1.5">
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button size="sm" onClick={handleFind} disabled={!canProceed || loading} className="gap-1.5">
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Finding...
                    </>
                  ) : (
                    <>
                      Find Events <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Expand button when collapsed */}
        {collapsed && !showResults && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full px-5 py-3 text-sm text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
          >
            <ChevronDown className="w-3.5 h-3.5" /> Show Event Finder
          </button>
        )}
      </div>

      {/* Results */}
      {showResults && !loading && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold">
              We found{" "}
              <span className="text-primary">{results.length}</span>{" "}
              event{results.length !== 1 ? "s" : ""} for you
            </h3>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Start Over
            </button>
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No exact matches found. Try adjusting your preferences.
            </p>
          ) : (
            <div className="space-y-4">
              {results.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute top-3 right-3 z-10">
                    <MatchBadge level={event.matchLevel} />
                  </div>
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
