import { useState, useMemo, useCallback } from "react";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Scale, ArrowRight, RotateCcw, Share2, Trophy, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
interface Choice {
  text: string;
  scores: { fairness: number; privacy: number; transparency: number; accountability: number };
  consequence: string;
}

interface Scenario {
  id: number;
  emoji: string;
  title: string;
  location: string;
  description: string;
  gradient: string;
  choices: Choice[];
}

interface Profile {
  title: string;
  description: string;
  emoji: string;
}

// --- Scenario data ---
const SCENARIOS: Scenario[] = [
  {
    id: 1,
    emoji: "🏥",
    title: "Biased Triage AI",
    location: "Singapore",
    description: "A public hospital deploys an AI triage system that prioritises emergency patients. Audits reveal it systematically ranks elderly patients lower, increasing their wait times by 40%. The vendor says retraining will take 6 months.",
    gradient: "from-teal-600/30 to-cyan-900/40",
    choices: [
      {
        text: "Shut down the AI immediately and revert to manual triage",
        scores: { fairness: 3, privacy: 0, transparency: 1, accountability: 2 },
        consequence: "Wait times spike 25% across all demographics, but elderly patients are no longer disadvantaged. Staff morale drops from overwork, and two junior doctors resign within weeks."
      },
      {
        text: "Keep the AI running but add a human override for patients over 65",
        scores: { fairness: 2, privacy: 0, transparency: 2, accountability: 1 },
        consequence: "The hybrid approach reduces elderly bias by 70% while maintaining overall efficiency. However, critics argue the age-based rule creates a new form of discrimination."
      },
      {
        text: "Demand the vendor fix the bias within 30 days or face contract termination",
        scores: { fairness: 1, privacy: 0, transparency: 2, accountability: 3 },
        consequence: "The vendor rushes a patch that reduces bias but introduces new edge cases. The aggressive timeline sets a strong precedent for accountability in public AI procurement."
      }
    ]
  },
  {
    id: 2,
    emoji: "📹",
    title: "Surveillance vs Safety",
    location: "Tokyo",
    description: "A facial recognition system in a major shopping district catches 12 shoplifters in its first month. However, it also scans and stores biometric data of 10,000 innocent people daily. A privacy group threatens legal action.",
    gradient: "from-violet-600/30 to-purple-900/40",
    choices: [
      {
        text: "Disable the system entirely to protect privacy",
        scores: { fairness: 1, privacy: 3, transparency: 1, accountability: 1 },
        consequence: "Shoplifting returns to previous levels. The district earns praise from privacy advocates but merchants report a 15% increase in theft losses."
      },
      {
        text: "Limit to real-time matching only with no data storage",
        scores: { fairness: 2, privacy: 2, transparency: 2, accountability: 1 },
        consequence: "The compromise satisfies neither side fully. Effectiveness drops 60% without stored data, but the approach becomes a model for 'privacy-preserving surveillance' discussions across Japan."
      },
      {
        text: "Keep it running but publish full transparency reports monthly",
        scores: { fairness: 1, privacy: 0, transparency: 3, accountability: 2 },
        consequence: "Transparency reports reveal the system disproportionately flags tourists. Public backlash forces policy changes, but the transparency-first approach is praised internationally."
      }
    ]
  },
  {
    id: 3,
    emoji: "💼",
    title: "AI Hiring Filter",
    location: "Bangalore",
    description: "A major IT company's AI hiring tool screens 50,000 applications monthly with 85% accuracy. However, it filters out 3x more candidates from rural regions and smaller universities, despite many being qualified.",
    gradient: "from-amber-600/30 to-orange-900/40",
    choices: [
      {
        text: "Remove location and university data from the model entirely",
        scores: { fairness: 3, privacy: 2, transparency: 1, accountability: 1 },
        consequence: "Rural applicant pass-through rates triple. However, overall model accuracy drops to 72% and hiring managers complain about candidate quality. The company becomes a case study in equitable AI."
      },
      {
        text: "Add a mandatory 20% quota for underrepresented regions",
        scores: { fairness: 2, privacy: 0, transparency: 2, accountability: 2 },
        consequence: "Quota targets are met but some hiring managers game the system by interviewing quota candidates last. Still, 40% of quota hires outperform expectations, challenging biased assumptions."
      },
      {
        text: "Publish the model's decision factors and let candidates appeal",
        scores: { fairness: 1, privacy: 1, transparency: 3, accountability: 2 },
        consequence: "Transparency reveals uncomfortable truths about proxy discrimination. Appeals overwhelm the HR team initially, but the process uncovers genuine talent that the AI missed."
      }
    ]
  },
  {
    id: 4,
    emoji: "🏦",
    title: "Credit Score AI",
    location: "Jakarta",
    description: "A fintech startup uses social media data and phone usage patterns to generate credit scores for unbanked populations. It extends credit to 2 million people previously excluded, but the scoring methodology is opaque and some users report unfair denials.",
    gradient: "from-emerald-600/30 to-green-900/40",
    choices: [
      {
        text: "Ban the use of social media data in credit decisions",
        scores: { fairness: 2, privacy: 3, transparency: 1, accountability: 1 },
        consequence: "800,000 people lose access to credit as the model becomes less predictive without social signals. Privacy is protected, but financial inclusion takes a significant step backward."
      },
      {
        text: "Require the startup to explain every denial in plain language",
        scores: { fairness: 1, privacy: 1, transparency: 3, accountability: 2 },
        consequence: "Explanations reveal that posting frequency and friend count heavily influence scores. Public outcry leads to voluntary reforms, and competitor startups adopt explainable models."
      },
      {
        text: "Create an independent oversight board to audit the algorithm quarterly",
        scores: { fairness: 2, privacy: 1, transparency: 2, accountability: 3 },
        consequence: "The board identifies and corrects several biases over 12 months. The model becomes more equitable and the oversight framework is adopted by regulators across Southeast Asia."
      }
    ]
  },
  {
    id: 5,
    emoji: "🎓",
    title: "AI Exam Proctor",
    location: "Seoul",
    description: "Universities adopt AI-powered exam proctoring that monitors students' eye movements, keystrokes, and room environment via webcam. It flags 'suspicious behavior' but generates 30% false positives, disproportionately affecting students with disabilities and those in shared living spaces.",
    gradient: "from-blue-600/30 to-indigo-900/40",
    choices: [
      {
        text: "Abolish AI proctoring and return to in-person exams only",
        scores: { fairness: 2, privacy: 3, transparency: 0, accountability: 1 },
        consequence: "Students with mobility issues lose the flexibility remote exams provided. Cheating incidents rise 20% but students report significantly lower anxiety levels."
      },
      {
        text: "Keep AI proctoring but exempt flagged students and require human review",
        scores: { fairness: 3, privacy: 1, transparency: 2, accountability: 2 },
        consequence: "Human reviewers overturn 85% of AI flags, proving the system unreliable. The university publishes findings, sparking a national conversation about AI in education."
      },
      {
        text: "Mandate accessibility testing and bias audits before any AI proctor can be used",
        scores: { fairness: 2, privacy: 1, transparency: 2, accountability: 3 },
        consequence: "Only 2 of 7 proctoring vendors pass the audit. The remaining tools improve dramatically, and South Korea becomes a leader in accessible edtech standards."
      }
    ]
  },
  {
    id: 6,
    emoji: "🚗",
    title: "Autonomous Vehicle Dilemma",
    location: "Shanghai",
    description: "An autonomous taxi fleet operates safely for 18 months until an unavoidable accident scenario: the AI must choose between swerving into a barrier (risking the passenger) or continuing straight (risking a jaywalking pedestrian). The manufacturer pre-programmed 'protect the passenger' as default.",
    gradient: "from-red-600/30 to-rose-900/40",
    choices: [
      {
        text: "Require random decision-making in unavoidable scenarios to be equally fair",
        scores: { fairness: 3, privacy: 0, transparency: 1, accountability: 1 },
        consequence: "Passenger bookings drop 35% as people fear being 'sacrificed randomly'. The policy is philosophically defensible but commercially devastating."
      },
      {
        text: "Let passengers choose their own risk preference before each ride",
        scores: { fairness: 1, privacy: 1, transparency: 3, accountability: 1 },
        consequence: "98% of passengers choose 'protect me', making the choice meaningless. But the transparency of offering it builds trust, and ridership actually increases 10%."
      },
      {
        text: "Establish a government ethics committee to set the rules for all AVs",
        scores: { fairness: 2, privacy: 0, transparency: 2, accountability: 3 },
        consequence: "The committee takes 14 months to produce guidelines, during which the fleet is paused. The resulting framework becomes the gold standard for AV ethics in Asia."
      }
    ]
  },
  {
    id: 7,
    emoji: "📰",
    title: "Deepfake Detection",
    location: "Manila",
    description: "During a national election, an AI deepfake detection tool flags a viral video of a leading candidate as 'likely manipulated'. The candidate claims the video is real. The detection tool has a 92% accuracy rate, meaning 1 in 12 calls could be wrong.",
    gradient: "from-pink-600/30 to-fuchsia-900/40",
    choices: [
      {
        text: "Immediately label the video as 'likely deepfake' on all platforms",
        scores: { fairness: 1, privacy: 0, transparency: 2, accountability: 2 },
        consequence: "The label suppresses the video's reach by 80%. Post-election forensics confirm it WAS real. The incident erodes trust in AI fact-checking tools across the region."
      },
      {
        text: "Publish the AI's confidence score and let voters decide",
        scores: { fairness: 2, privacy: 0, transparency: 3, accountability: 1 },
        consequence: "Most voters lack the literacy to interpret '92% confidence'. The video goes viral anyway, but the transparency precedent leads to better media literacy programs."
      },
      {
        text: "Require independent human verification before any label is applied",
        scores: { fairness: 2, privacy: 0, transparency: 1, accountability: 3 },
        consequence: "Verification takes 72 hours, by which time the video has been seen 20 million times. But the process catches the AI's error, preserving institutional credibility."
      }
    ]
  },
  {
    id: 8,
    emoji: "🏭",
    title: "Worker Monitoring AI",
    location: "Bangkok",
    description: "A garment factory installs AI cameras that track worker productivity, bathroom breaks, and social interactions. Productivity rises 22% but workers report severe stress. The factory supplies major international brands who promote 'ethical sourcing'.",
    gradient: "from-yellow-600/30 to-amber-900/40",
    choices: [
      {
        text: "Ban all AI monitoring in workplaces and rely on traditional management",
        scores: { fairness: 2, privacy: 3, transparency: 1, accountability: 1 },
        consequence: "Productivity drops back to baseline. Workers are relieved, but the factory loses two major contracts to competitors who still use monitoring. 200 jobs are at risk."
      },
      {
        text: "Allow productivity tracking only, with strict limits on personal monitoring",
        scores: { fairness: 2, privacy: 2, transparency: 2, accountability: 1 },
        consequence: "The compromise maintains a 12% productivity gain while reducing stress reports by 60%. Workers still feel watched but acknowledge the improvement."
      },
      {
        text: "Require brands to audit and take responsibility for supplier AI practices",
        scores: { fairness: 1, privacy: 1, transparency: 2, accountability: 3 },
        consequence: "Two brands pull contracts during audits, but three others invest in 'worker-approved AI' pilot programs. The accountability shift creates a new industry standard."
      }
    ]
  },
  {
    id: 9,
    emoji: "🏥",
    title: "Mental Health Chatbot",
    location: "Kuala Lumpur",
    description: "An AI mental health chatbot serves 500,000 users in underserved areas where therapists are scarce. It detects a user expressing suicidal ideation but the user has explicitly asked for conversations to remain private. Alerting authorities could save a life but violates consent.",
    gradient: "from-cyan-600/30 to-teal-900/40",
    choices: [
      {
        text: "Alert emergency services immediately regardless of consent",
        scores: { fairness: 1, privacy: 0, transparency: 1, accountability: 3 },
        consequence: "The user is safely reached in time. But word spreads that the chatbot 'reports' users. Usage drops 45%, and those who remain share less, reducing the tool's effectiveness."
      },
      {
        text: "Gently guide the user toward crisis resources without breaking privacy",
        scores: { fairness: 2, privacy: 3, transparency: 2, accountability: 1 },
        consequence: "The user engages with a crisis hotline voluntarily. But the approach fails in 15% of similar cases where users don't follow through. The privacy-first model is debated intensely."
      },
      {
        text: "Require explicit consent for crisis intervention during onboarding",
        scores: { fairness: 2, privacy: 2, transparency: 3, accountability: 2 },
        consequence: "70% of users opt in to crisis alerts. The transparent approach becomes the industry standard, balancing safety with autonomy. Usage remains stable."
      }
    ]
  },
  {
    id: 10,
    emoji: "🌾",
    title: "Agricultural AI Divide",
    location: "Ho Chi Minh City",
    description: "An AI-powered crop advisory app doubles yields for tech-savvy farmers with smartphones, but the 60% of farmers without smartphones fall further behind. Government subsidies fund the app but not the devices needed to access it.",
    gradient: "from-lime-600/30 to-emerald-900/40",
    choices: [
      {
        text: "Redirect funding from the app to SMS-based and radio alternatives",
        scores: { fairness: 3, privacy: 1, transparency: 1, accountability: 1 },
        consequence: "All farmers gain access to basic advice. However, the simpler tools provide only 30% of the yield improvement. Tech-savvy farmers feel penalised for early adoption."
      },
      {
        text: "Keep the app but subsidise smartphones for all farmers",
        scores: { fairness: 2, privacy: 0, transparency: 1, accountability: 2 },
        consequence: "Device distribution takes 18 months and costs 5x the app budget. When complete, yields rise nationally. But device maintenance and digital literacy remain challenges."
      },
      {
        text: "Mandate the app developer to create an open API so any channel can deliver advice",
        scores: { fairness: 2, privacy: 1, transparency: 3, accountability: 2 },
        consequence: "Third-party developers create SMS, voice, and radio interfaces within 6 months. The open approach sparks an agritech ecosystem, though quality varies across channels."
      }
    ]
  }
];

// --- Profile logic ---
const PROFILES: { key: string; profile: Profile; test: (s: Record<string, number>) => boolean }[] = [
  {
    key: "privacy_guardian",
    profile: { title: "The Privacy Guardian", description: "You consistently prioritise individual privacy rights, even when it means sacrificing some efficiency or convenience. In Asia's rapidly digitising societies, voices like yours are crucial.", emoji: "🛡️" },
    test: (s) => s.privacy >= s.fairness && s.privacy >= s.transparency && s.privacy >= s.accountability
  },
  {
    key: "fairness_champion",
    profile: { title: "The Fairness Champion", description: "Equity is your north star. You gravitate toward solutions that protect the most vulnerable, even at the cost of speed or scale. You'd make an excellent AI ethics board member.", emoji: "⚖️" },
    test: (s) => s.fairness >= s.privacy && s.fairness >= s.transparency && s.fairness >= s.accountability
  },
  {
    key: "transparency_advocate",
    profile: { title: "The Transparency Advocate", description: "You believe sunlight is the best disinfectant. Your instinct is to open the black box and let people decide for themselves. Radical openness is your superpower.", emoji: "🔍" },
    test: (s) => s.transparency >= s.fairness && s.transparency >= s.privacy && s.transparency >= s.accountability
  },
  {
    key: "accountability_hawk",
    profile: { title: "The Accountability Hawk", description: "You focus on building systems, institutions, and frameworks that hold power to account. You know that good AI governance requires strong guardrails, not just good intentions.", emoji: "🏛️" },
    test: (s) => s.accountability >= s.fairness && s.accountability >= s.privacy && s.accountability >= s.transparency
  },
];

function getProfile(scores: Record<string, number>): Profile {
  for (const p of PROFILES) {
    if (p.test(scores)) return p.profile;
  }
  return PROFILES[0].profile;
}

// --- Component ---
export default function AIEthicsDilemma() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [scores, setScores] = useState({ fairness: 0, privacy: 0, transparency: 0, accountability: 0 });
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(false);

  const scenario = SCENARIOS[currentIndex];
  const progress = finished ? 100 : (currentIndex / SCENARIOS.length) * 100;

  const profile = useMemo(() => getProfile(scores), [scores]);

  const totalScore = useMemo(() => {
    const max = SCENARIOS.length * 3; // max 3 per dimension per scenario
    const total = scores.fairness + scores.privacy + scores.transparency + scores.accountability;
    return Math.round((total / (max * 4)) * 100);
  }, [scores]);

  const handleChoice = useCallback((idx: number) => {
    if (chosenIndex !== null) return;
    setChosenIndex(idx);
    const choice = SCENARIOS[currentIndex].choices[idx];
    setScores(prev => ({
      fairness: prev.fairness + choice.scores.fairness,
      privacy: prev.privacy + choice.scores.privacy,
      transparency: prev.transparency + choice.scores.transparency,
      accountability: prev.accountability + choice.scores.accountability,
    }));
    setAnswers(prev => [...prev, idx]);
  }, [chosenIndex, currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex >= SCENARIOS.length - 1) {
      setFinished(true);
      setPointsAwarded(true);
    } else {
      setCurrentIndex(i => i + 1);
      setChosenIndex(null);
    }
  }, [currentIndex]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setChosenIndex(null);
    setScores({ fairness: 0, privacy: 0, transparency: 0, accountability: 0 });
    setAnswers([]);
    setFinished(false);
  }, []);

  const handleShare = useCallback(() => {
    const text = `I'm "${profile.title}" according to the AI Ethics Dilemma tool! My ethics score: ${totalScore}/100. Try it yourself:`;
    const url = "https://aiinasia.com/tools/ethics-dilemma";
    if (navigator.share) {
      navigator.share({ title: "AI Ethics Dilemma Results", text, url }).catch(() => {});
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
    }
  }, [profile.title, totalScore]);

  const maxDimension = Math.max(scores.fairness, scores.privacy, scores.transparency, scores.accountability, 1);

  const DimensionBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="text-foreground font-bold">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value / maxDimension) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Ethics Dilemma | Navigate Moral AI Choices in Asia"
        description="A choose-your-own-adventure game exploring real ethical AI dilemmas across Asia. Discover your ethics profile across Fairness, Privacy, Transparency, and Accountability."
        canonical="https://aiinasia.com/tools/ethics-dilemma"
      />
      <Header />
      <main className="flex-1 px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <ToolBreadcrumb toolName="AI Ethics Dilemma" />

          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-500 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
              <Scale className="h-3.5 w-3.5" /> INTERACTIVE TOOL
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-3">
              AI Ethics Dilemma
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Navigate 10 real-world ethical AI scenarios from across Asia. Your choices reveal your ethics profile.
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{finished ? "Complete" : `Scenario ${currentIndex + 1} of ${SCENARIOS.length}`}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-amber-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!finished ? (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
              >
                {/* Scenario card */}
                <div className={cn("rounded-2xl border border-border overflow-hidden mb-6")}>
                  <div className={cn("bg-gradient-to-br p-6 md:p-8", scenario.gradient)}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl">{scenario.emoji}</span>
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">{scenario.title}</h2>
                        <span className="text-sm text-muted-foreground">{scenario.location}</span>
                      </div>
                    </div>
                    <p className="text-foreground/90 leading-relaxed text-sm md:text-base">
                      {scenario.description}
                    </p>
                  </div>

                  {/* Choices */}
                  <div className="p-4 md:p-6 space-y-3 bg-card">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2">What do you do?</p>
                    {scenario.choices.map((choice, idx) => {
                      const isChosen = chosenIndex === idx;
                      const isRevealed = chosenIndex !== null;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleChoice(idx)}
                          disabled={isRevealed}
                          className={cn(
                            "w-full text-left rounded-xl border p-4 transition-all duration-200",
                            isChosen
                              ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30"
                              : isRevealed
                                ? "border-border/50 opacity-40 cursor-default"
                                : "border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className={cn(
                              "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5",
                              isChosen ? "bg-amber-500 text-black" : "bg-muted/50 text-muted-foreground"
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="text-sm text-foreground leading-relaxed">{choice.text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Consequence */}
                <AnimatePresence>
                  {chosenIndex !== null && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.4 }}
                      className="mb-6"
                    >
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                        <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider mb-2">Consequence</p>
                        <p className="text-sm text-foreground/90 leading-relaxed mb-4">
                          {scenario.choices[chosenIndex].consequence}
                        </p>
                        <div className="grid grid-cols-4 gap-3 pt-3 border-t border-amber-500/10">
                          {(["fairness", "privacy", "transparency", "accountability"] as const).map(dim => {
                            const val = scenario.choices[chosenIndex].scores[dim];
                            return (
                              <div key={dim} className="text-center">
                                <div className={cn(
                                  "text-lg font-bold",
                                  val >= 3 ? "text-green-400" : val >= 2 ? "text-amber-400" : "text-muted-foreground"
                                )}>
                                  +{val}
                                </div>
                                <div className="text-[10px] text-muted-foreground capitalize">{dim}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={handleNext}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors"
                      >
                        {currentIndex >= SCENARIOS.length - 1 ? "See My Ethics Profile" : "Next Scenario"}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Profile card */}
                <div className="rounded-2xl border border-amber-500/30 overflow-hidden mb-6">
                  <div className="bg-gradient-to-br from-amber-600/20 to-orange-900/30 p-8 text-center">
                    <span className="text-6xl mb-4 block">{profile.emoji}</span>
                    <h2 className="font-display text-2xl md:text-3xl font-black text-foreground mb-2">
                      {profile.title}
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
                      {profile.description}
                    </p>
                  </div>
                  <div className="bg-card p-6">
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-sm font-semibold text-foreground">Ethics Score</span>
                      <span className="text-2xl font-black text-amber-500">{totalScore}/100</span>
                    </div>
                    <div className="space-y-4">
                      <DimensionBar label="Fairness" value={scores.fairness} color="hsl(142, 60%, 45%)" />
                      <DimensionBar label="Privacy" value={scores.privacy} color="hsl(262, 60%, 55%)" />
                      <DimensionBar label="Transparency" value={scores.transparency} color="hsl(37, 78%, 60%)" />
                      <DimensionBar label="Accountability" value={scores.accountability} color="hsl(200, 70%, 50%)" />
                    </div>
                  </div>
                </div>

                {/* Points badge */}
                {pointsAwarded && (
                  <div className="text-center mb-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-500 px-4 py-2 rounded-full text-sm font-semibold"
                    >
                      <Trophy className="h-4 w-4" />
                      +20 points earned for completing all 10 dilemmas!
                    </motion.div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    Share Results
                  </button>
                  <button
                    onClick={handleRestart}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-foreground font-bold text-sm hover:border-amber-500/50 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Play Again
                  </button>
                </div>

                {/* Methodology */}
                <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground mt-8">
                  <h3 className="font-display text-base font-bold text-foreground mb-2">About This Tool</h3>
                  <p className="leading-relaxed">
                    These scenarios are inspired by real-world AI ethics challenges across Asia-Pacific. Each choice is scored across four dimensions: Fairness, Privacy, Transparency, and Accountability. There are no "right" answers. The goal is to explore the trade-offs inherent in AI governance and discover your ethical priorities.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}
