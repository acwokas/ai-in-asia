import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Clock, Trophy, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
type Category = "Policy" | "Research" | "Industry" | "Startup" | "Infrastructure";

interface Milestone {
  year: number;
  month?: string;
  title: string;
  flag: string;
  country: string;
  description: string;
  category: Category;
}

const CATEGORY_COLORS: Record<Category, { dot: string; bg: string; text: string }> = {
  Policy: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-400" },
  Research: { dot: "bg-violet-500", bg: "bg-violet-500/10", text: "text-violet-400" },
  Industry: { dot: "bg-amber-500", bg: "bg-amber-500/10", text: "text-amber-400" },
  Startup: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  Infrastructure: { dot: "bg-rose-500", bg: "bg-rose-500/10", text: "text-rose-400" },
};

const ALL_CATEGORIES: Category[] = ["Policy", "Research", "Industry", "Startup", "Infrastructure"];

// --- Data (30+ entries) ---
const MILESTONES: Milestone[] = [
  { year: 2015, month: "Mar", title: "Baidu launches DeepSpeech 2", flag: "🇨🇳", country: "China", category: "Research", description: "Baidu Research publishes DeepSpeech 2, a speech recognition system rivalling human accuracy. The breakthrough demonstrates China's growing AI research capabilities and Silicon Valley-level talent." },
  { year: 2016, month: "Mar", title: "AlphaGo defeats Lee Sedol in Seoul", flag: "🇰🇷", country: "South Korea", category: "Research", description: "Google DeepMind's AlphaGo defeats world Go champion Lee Sedol 4-1 in Seoul, captivating Asia and sparking massive government AI investment across the region." },
  { year: 2016, month: "Oct", title: "SenseTime raises $120M Series B", flag: "🇨🇳", country: "China", category: "Startup", description: "Computer vision startup SenseTime raises one of the largest AI funding rounds in Asia at the time, signaling the explosive growth of China's AI startup ecosystem." },
  { year: 2017, month: "Jul", title: "China releases New Generation AI Development Plan", flag: "🇨🇳", country: "China", category: "Policy", description: "The State Council issues a comprehensive national AI strategy aiming for China to become the world leader in AI by 2030, with $150B in planned investment. The plan galvanizes the global AI race." },
  { year: 2017, month: "Nov", title: "South Korea announces AI R&D Strategy", flag: "🇰🇷", country: "South Korea", category: "Policy", description: "Following AlphaGo's impact, South Korea allocates $863M for AI research, establishing national AI research institutes and setting ambitious talent development goals." },
  { year: 2018, month: "Jun", title: "Japan publishes Social Principles of AI", flag: "🇯🇵", country: "Japan", category: "Policy", description: "Japan's Cabinet Office releases human-centric AI social principles, becoming one of the first Asian nations to establish a comprehensive AI ethics framework." },
  { year: 2018, month: "Sep", title: "Grab launches AI Lab in Singapore", flag: "🇸🇬", country: "Singapore", category: "Startup", description: "Southeast Asia's super-app Grab establishes a dedicated AI research lab in Singapore, focusing on transportation optimization, fraud detection, and mapping for the region." },
  { year: 2019, month: "Jan", title: "India launches National AI Strategy (NITI Aayog)", flag: "🇮🇳", country: "India", category: "Policy", description: "NITI Aayog releases 'National Strategy for Artificial Intelligence' identifying healthcare, agriculture, education, smart cities, and transportation as priority sectors for AI adoption." },
  { year: 2019, month: "May", title: "Vietnam's VinAI Research publishes at NeurIPS", flag: "🇻🇳", country: "Vietnam", category: "Research", description: "VinAI Research, backed by conglomerate Vingroup, publishes papers at top ML conferences, putting Vietnam on the global AI research map for the first time." },
  { year: 2019, month: "Nov", title: "Singapore launches National AI Strategy", flag: "🇸🇬", country: "Singapore", category: "Policy", description: "Singapore announces its National AI Strategy focusing on transport, healthcare, education, safety, and government, with dedicated funding and a new national AI office." },
  { year: 2020, month: "Jun", title: "Japan's Fugaku becomes world's fastest supercomputer", flag: "🇯🇵", country: "Japan", category: "Infrastructure", description: "RIKEN's Fugaku supercomputer tops the TOP500 list, providing massive computational power for AI research and becoming a cornerstone of Japan's AI infrastructure strategy." },
  { year: 2020, month: "Aug", title: "Indonesia releases National AI Strategy (Stranas KA)", flag: "🇮🇩", country: "Indonesia", category: "Policy", description: "Indonesia publishes its national AI roadmap covering healthcare, bureaucratic reform, food security, mobility, and smart cities, signaling Southeast Asia's largest economy entering the AI race." },
  { year: 2020, month: "Nov", title: "Taiwan's TSMC begins 5nm AI chip production", flag: "🇹🇼", country: "Taiwan", category: "Infrastructure", description: "TSMC begins mass production of 5nm chips powering the world's most advanced AI processors, cementing Taiwan's irreplaceable role in the global AI supply chain." },
  { year: 2021, month: "Mar", title: "India launches 'AI for All' initiative", flag: "🇮🇳", country: "India", category: "Policy", description: "India's MeitY launches the Responsible AI for All framework, emphasizing democratic access to AI while establishing seven AI centres of excellence across the country." },
  { year: 2021, month: "Jul", title: "Kakao Brain releases KoGPT", flag: "🇰🇷", country: "South Korea", category: "Research", description: "Kakao Brain releases KoGPT, a Korean-language GPT-3 equivalent, marking a major milestone in building large language models for non-English Asian languages." },
  { year: 2021, month: "Sep", title: "Singapore launches AI Verify", flag: "🇸🇬", country: "Singapore", category: "Policy", description: "Singapore's IMDA introduces AI Verify, a first-of-its-kind governance testing framework allowing companies to validate their AI systems against international principles." },
  { year: 2022, month: "Feb", title: "Naver launches HyperCLOVA", flag: "🇰🇷", country: "South Korea", category: "Industry", description: "Korean tech giant Naver launches HyperCLOVA, a 204-billion parameter Korean language model, powering AI features across its search, commerce, and cloud platforms." },
  { year: 2022, month: "Jun", title: "Baidu rolls out Apollo Go robotaxis in 10 cities", flag: "🇨🇳", country: "China", category: "Industry", description: "Baidu expands its autonomous taxi service Apollo Go to 10 Chinese cities, completing over 1 million rides and becoming the world's largest autonomous ride-hailing fleet." },
  { year: 2022, month: "Oct", title: "Australia establishes National AI Centre", flag: "🇦🇺", country: "Australia", category: "Policy", description: "Australia's Department of Industry establishes the National AI Centre to coordinate responsible AI adoption, support SME uptake, and position Australia as a trusted AI leader in the Indo-Pacific." },
  { year: 2023, month: "Jan", title: "China enacts generative AI regulations", flag: "🇨🇳", country: "China", category: "Policy", description: "China's Cyberspace Administration implements interim regulations for generative AI services, requiring security assessments and content labeling. It becomes the world's first comprehensive GenAI law." },
  { year: 2023, month: "Apr", title: "South Korea invests $7B in AI semiconductors", flag: "🇰🇷", country: "South Korea", category: "Infrastructure", description: "South Korea announces a $7B investment plan to develop AI-optimized semiconductors, build sovereign compute capacity, and reduce reliance on foreign AI chip suppliers." },
  { year: 2023, month: "Jul", title: "India's Krutrim raises $50M pre-launch", flag: "🇮🇳", country: "India", category: "Startup", description: "Ola founder Bhavish Aggarwal raises $50M for Krutrim, an AI company building a multilingual LLM supporting 22 Indian languages, addressing the subcontinent's linguistic diversity." },
  { year: 2023, month: "Sep", title: "Japan allocates $13B for AI and semiconductor strategy", flag: "🇯🇵", country: "Japan", category: "Infrastructure", description: "PM Kishida announces a $13B package to boost domestic AI compute and semiconductor manufacturing, including support for Rapidus chip fabrication and AI data centres." },
  { year: 2024, month: "Jan", title: "Malaysia attracts $4.3B in AI data centre investments", flag: "🇲🇾", country: "Malaysia", category: "Infrastructure", description: "Microsoft, Google, and AWS announce combined $4.3B investments in Malaysian AI data centres, making the country Southeast Asia's emerging AI infrastructure hub." },
  { year: 2024, month: "Mar", title: "India launches IndiaAI Mission with $1.25B", flag: "🇮🇳", country: "India", category: "Policy", description: "The Indian Cabinet approves the IndiaAI Mission with Rs 10,372 crore ($1.25B) budget for AI compute infrastructure, datasets, innovation centres, and a national AI marketplace." },
  { year: 2024, month: "May", title: "Singapore updates National AI Strategy 2.0", flag: "🇸🇬", country: "Singapore", category: "Policy", description: "Singapore launches NAIS 2.0, expanding its AI strategy to focus on AI as a force multiplier for the economy, with $1B in new funding for compute, talent, and industry AI adoption." },
  { year: 2024, month: "Aug", title: "Indonesia launches National AI Strategy 2045", flag: "🇮🇩", country: "Indonesia", category: "Policy", description: "Indonesia updates its AI roadmap targeting AI-driven economic transformation by 2045, with dedicated AI zones, talent programs, and regulatory sandboxes for AI startups." },
  { year: 2024, month: "Oct", title: "TSMC begins 2nm chip production for AI", flag: "🇹🇼", country: "Taiwan", category: "Infrastructure", description: "TSMC commences risk production of 2nm process technology, powering the next generation of AI accelerators and maintaining Taiwan's dominance of advanced semiconductor manufacturing." },
  { year: 2025, month: "Jan", title: "China's DeepSeek R1 rivals GPT-4 at fraction of cost", flag: "🇨🇳", country: "China", category: "Research", description: "DeepSeek releases R1, a reasoning model matching GPT-4 performance while being trained at a fraction of the cost. The breakthrough challenges assumptions about AI development requiring massive budgets." },
  { year: 2025, month: "Apr", title: "South Korea announces K-AI Strategy for global top 3", flag: "🇰🇷", country: "South Korea", category: "Policy", description: "President Yoon announces the K-AI Strategy targeting South Korea as a top-3 global AI power by 2027, with $15B in combined public-private investment and aggressive talent acquisition." },
  { year: 2025, month: "Jul", title: "Japan launches Society 5.0 AI integration program", flag: "🇯🇵", country: "Japan", category: "Industry", description: "Japan operationalises its Society 5.0 vision with nationwide AI integration across healthcare, agriculture, and disaster response, deploying AI systems in 1,000+ municipalities." },
  { year: 2025, month: "Sep", title: "Preferred Networks IPO on Tokyo Stock Exchange", flag: "🇯🇵", country: "Japan", category: "Startup", description: "Japan's most valuable AI startup Preferred Networks completes its long-awaited IPO, raising $2.8B and becoming Asia's largest pure-play AI company listing." },
  { year: 2026, month: "Jan", title: "ASEAN AI Governance Framework ratified", flag: "🇸🇬", country: "Singapore", category: "Policy", description: "All 10 ASEAN member states ratify a unified AI governance framework, creating the world's largest regional AI regulatory alignment covering 700 million people." },
  { year: 2026, month: "Mar", title: "India reaches 1M AI professionals milestone", flag: "🇮🇳", country: "India", category: "Industry", description: "India's AI workforce crosses 1 million professionals, driven by government upskilling programs and private-sector demand. The talent pool makes India the largest AI services exporter globally." },
];

const ALL_COUNTRIES = [...new Set(MILESTONES.map(m => m.country))].sort();

// --- Timeline entry with scroll reveal ---
function TimelineEntry({ milestone, index, side }: { milestone: Milestone; index: number; side: "left" | "right" }) {
  const [visible, setVisible] = useState(false);
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setVisible(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const colors = CATEGORY_COLORS[milestone.category];

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full mb-8 md:mb-0",
        side === "left" ? "md:justify-start" : "md:justify-end"
      )}
    >
      {/* Center dot (desktop) */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-6 z-10 items-center justify-center">
        <span className={cn("w-4 h-4 rounded-full border-2 border-background", colors.dot)} />
      </div>

      {/* Mobile dot */}
      <div className="md:hidden absolute left-0 top-6 z-10 flex items-center justify-center">
        <span className={cn("w-3.5 h-3.5 rounded-full border-2 border-background", colors.dot)} />
      </div>

      {/* Card */}
      <div
        className={cn(
          "w-full ml-7 md:ml-0 md:w-[46%] transition-all duration-500",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
          side === "left" ? "md:pr-8" : "md:pl-8"
        )}
        style={{ transitionDelay: `${Math.min(index * 50, 200)}ms` }}
      >
        <div className="rounded-xl border border-border bg-card p-5 hover:border-amber-500/30 transition-colors">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{milestone.flag}</span>
              <span className="text-xs text-muted-foreground font-medium">
                {milestone.month && `${milestone.month} `}{milestone.year}
              </span>
            </div>
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", colors.bg, colors.text)}>
              {milestone.category}
            </span>
          </div>
          <h3 className="font-display text-sm font-bold text-foreground mb-2 leading-snug">
            {milestone.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {milestone.description}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Main component ---
export default function AITimelineAsia() {
  const [selectedCountry, setSelectedCountry] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [showFilters, setShowFilters] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return MILESTONES.filter(m => {
      if (selectedCountry !== "All" && m.country !== selectedCountry) return false;
      if (selectedCategory !== "All" && m.category !== selectedCategory) return false;
      return true;
    });
  }, [selectedCountry, selectedCategory]);

  // Group by year
  const grouped = useMemo(() => {
    const map = new Map<number, Milestone[]>();
    for (const m of filtered) {
      if (!map.has(m.year)) map.set(m.year, []);
      map.get(m.year)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  // Track scroll to bottom for points
  useEffect(() => {
    if (pointsAwarded || !bottomRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setPointsAwarded(true); },
      { threshold: 0.5 }
    );
    obs.observe(bottomRef.current);
    return () => obs.disconnect();
  }, [pointsAwarded, filtered]);

  let globalIndex = 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Timeline Asia | Major AI Milestones 2015-2026"
        description="Explore 30+ major AI milestones across Asia-Pacific from 2015 to 2026. Filter by country, category, and discover the events shaping Asia's AI landscape."
        canonical="https://aiinasia.com/tools/ai-timeline"
      />
      <Header />
      <main className="flex-1 px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <ToolBreadcrumb toolName="AI Timeline Asia" />

          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-500 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
              <Clock className="h-3.5 w-3.5" /> INTERACTIVE TOOL
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-3">
              AI Timeline Asia
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              A decade of AI milestones across Asia-Pacific. Scroll through the events shaping the region's AI future.
            </p>
          </div>

          {/* Category legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6 text-xs">
            {ALL_CATEGORIES.map(cat => {
              const c = CATEGORY_COLORS[cat];
              return (
                <span key={cat} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className={cn("w-2.5 h-2.5 rounded-full", c.dot)} />
                  {cat}
                </span>
              );
            })}
          </div>

          {/* Filter toggle */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                showFilters ? "border-amber-500 bg-amber-500/15 text-amber-500" : "border-border bg-card text-muted-foreground hover:border-amber-500/50"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {(selectedCountry !== "All" || selectedCategory !== "All") && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-8"
              >
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">Country</label>
                    <div className="flex flex-wrap gap-2">
                      {["All", ...ALL_COUNTRIES].map(c => (
                        <button
                          key={c}
                          onClick={() => setSelectedCountry(c)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            selectedCountry === c ? "bg-amber-500 text-black" : "bg-muted/30 text-muted-foreground hover:bg-amber-500/10"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {(["All", ...ALL_CATEGORIES] as const).map(c => (
                        <button
                          key={c}
                          onClick={() => setSelectedCategory(c as Category | "All")}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            selectedCategory === c ? "bg-amber-500 text-black" : "bg-muted/30 text-muted-foreground hover:bg-amber-500/10"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-6 text-center">
            {filtered.length} milestone{filtered.length !== 1 ? "s" : ""} shown
          </p>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line - desktop center, mobile left */}
            <div className="absolute md:left-1/2 left-[7px] md:-translate-x-px top-0 bottom-0 w-0.5 bg-border" />

            {grouped.map(([year, milestones]) => (
              <div key={year}>
                {/* Year marker */}
                <div className="relative flex justify-center md:justify-center mb-6 mt-10 first:mt-0">
                  <div className="relative z-10 px-5 py-2 rounded-full border border-amber-500/30 bg-background">
                    <span className="font-display text-lg font-black text-amber-500">{year}</span>
                  </div>
                </div>

                {/* Entries */}
                <div className="md:space-y-10 space-y-0">
                  {milestones.map((m, i) => {
                    const entryIndex = globalIndex++;
                    const side = entryIndex % 2 === 0 ? "left" : "right";
                    return <TimelineEntry key={`${m.year}-${m.title}`} milestone={m} index={entryIndex} side={side as "left" | "right"} />;
                  })}
                </div>
              </div>
            ))}

            {/* Bottom sentinel for points */}
            <div ref={bottomRef} className="h-4" />
          </div>

          {/* Points badge */}
          {pointsAwarded && (
            <div className="text-center mt-8 mb-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-500 px-4 py-2 rounded-full text-sm font-semibold"
              >
                <Trophy className="h-4 w-4" />
                +10 points earned for scrolling through the timeline!
              </motion.div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium">No milestones match your filters</p>
              <p className="text-sm mt-1">Try adjusting the country or category filter.</p>
            </div>
          )}

          {/* Methodology */}
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground max-w-2xl mx-auto mt-10">
            <h3 className="font-display text-base font-bold text-foreground mb-2">About This Timeline</h3>
            <p className="leading-relaxed">
              This timeline tracks significant AI milestones across the Asia-Pacific region from 2015 to 2026, covering policy, research breakthroughs, industry adoption, startup ecosystem developments, and infrastructure investments. Entries are curated from official government announcements, research publications, and verified news reports.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
