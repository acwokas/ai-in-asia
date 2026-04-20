import { useState, useMemo, useCallback, useEffect } from "react";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Map, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Trophy, Filter, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
type Region = "East Asia" | "Southeast Asia" | "South Asia" | "Oceania";
type Sector = "Healthcare" | "Finance" | "Manufacturing" | "Education" | "Agriculture" | "Defence" | "Logistics" | "Retail";
type Trend = "up" | "down" | "stable";
type SortKey = "score" | "investment" | "startups";

interface Country {
  name: string;
  flag: string;
  region: Region;
  score: number;
  sectors: Sector[];
  govBudget: string;
  startups: number;
  topCompany: string;
  trend: Trend;
  investmentM: number; // millions USD for sorting
  highlights: string[];
}

// --- Data ---
const COUNTRIES: Country[] = [
  {
    name: "Singapore", flag: "🇸🇬", region: "Southeast Asia", score: 87,
    sectors: ["Finance", "Healthcare", "Logistics"],
    govBudget: "$1.1B", startups: 1200, topCompany: "Grab AI Lab",
    trend: "up", investmentM: 1800,
    highlights: ["National AI Strategy 2.0 launched 2024", "AI Verify governance framework adopted globally", "Smart Nation initiative drives public-sector AI adoption"]
  },
  {
    name: "Japan", flag: "🇯🇵", region: "East Asia", score: 82,
    sectors: ["Manufacturing", "Healthcare", "Retail"],
    govBudget: "$2.8B", startups: 2800, topCompany: "Preferred Networks",
    trend: "up", investmentM: 4200,
    highlights: ["Society 5.0 framework integrates AI across industries", "Leading in industrial robotics and automation", "Ageing population drives healthcare AI innovation"]
  },
  {
    name: "South Korea", flag: "🇰🇷", region: "East Asia", score: 80,
    sectors: ["Manufacturing", "Finance", "Defence"],
    govBudget: "$2.1B", startups: 2200, topCompany: "Naver / Kakao Brain",
    trend: "up", investmentM: 3100,
    highlights: ["K-AI Strategy targets top-3 global AI power by 2027", "Samsung, LG investing heavily in on-device AI", "Strong semiconductor ecosystem supports AI hardware"]
  },
  {
    name: "China", flag: "🇨🇳", region: "East Asia", score: 85,
    sectors: ["Manufacturing", "Finance", "Healthcare", "Defence"],
    govBudget: "$15.0B", startups: 15000, topCompany: "Baidu / SenseTime",
    trend: "stable", investmentM: 25000,
    highlights: ["World's 2nd largest AI ecosystem by investment", "Leading in computer vision and NLP applications", "Strict AI governance regulations enacted 2023-2025"]
  },
  {
    name: "India", flag: "🇮🇳", region: "South Asia", score: 72,
    sectors: ["Finance", "Healthcare", "Agriculture", "Education"],
    govBudget: "$1.5B", startups: 3500, topCompany: "Infosys / Ola Krutrim",
    trend: "up", investmentM: 5200,
    highlights: ["IndiaAI Mission allocates $1.25B for compute infrastructure", "Largest AI talent pool in Asia by volume", "AgriTech AI adoption accelerating in rural states"]
  },
  {
    name: "Indonesia", flag: "🇮🇩", region: "Southeast Asia", score: 48,
    sectors: ["Finance", "Agriculture", "Logistics"],
    govBudget: "$220M", startups: 450, topCompany: "GoTo AI Division",
    trend: "up", investmentM: 680,
    highlights: ["National AI Strategy (Stranas KA) published 2020", "Digital banking driving fintech AI adoption", "Emerging agritech sector serves 30M+ farmers"]
  },
  {
    name: "Malaysia", flag: "🇲🇾", region: "Southeast Asia", score: 55,
    sectors: ["Manufacturing", "Finance", "Healthcare"],
    govBudget: "$350M", startups: 520, topCompany: "AirAsia AI / Fusionex",
    trend: "up", investmentM: 780,
    highlights: ["MyDIGITAL initiative targets AI-driven economy", "$4.3B data centre investments from hyperscalers", "Penang emerging as AI hardware testing hub"]
  },
  {
    name: "Thailand", flag: "🇹🇭", region: "Southeast Asia", score: 50,
    sectors: ["Manufacturing", "Agriculture", "Healthcare"],
    govBudget: "$180M", startups: 380, topCompany: "AIGEN / Appman",
    trend: "stable", investmentM: 420,
    highlights: ["Thailand 4.0 policy promotes AI in manufacturing", "Eastern Economic Corridor attracts AI investment", "Agriculture AI addressing rice yield optimization"]
  },
  {
    name: "Vietnam", flag: "🇻🇳", region: "Southeast Asia", score: 45,
    sectors: ["Manufacturing", "Finance", "Education"],
    govBudget: "$150M", startups: 320, topCompany: "VinAI Research",
    trend: "up", investmentM: 350,
    highlights: ["National AI Strategy targets $1B industry by 2030", "VinAI producing world-class computer vision research", "Fast-growing developer community and AI talent"]
  },
  {
    name: "Philippines", flag: "🇵🇭", region: "Southeast Asia", score: 38,
    sectors: ["Finance", "Retail", "Education"],
    govBudget: "$80M", startups: 180, topCompany: "Voyager Innovations",
    trend: "stable", investmentM: 210,
    highlights: ["BPO sector beginning AI-augmentation shift", "GCash and fintech driving financial AI adoption", "Government AI roadmap still in early stages"]
  },
  {
    name: "Taiwan", flag: "🇹🇼", region: "East Asia", score: 78,
    sectors: ["Manufacturing", "Healthcare", "Defence"],
    govBudget: "$800M", startups: 1100, topCompany: "TSMC AI / Appier",
    trend: "up", investmentM: 2100,
    highlights: ["Semiconductor dominance crucial for global AI supply chain", "TSMC powering AI chips for NVIDIA and Apple", "Strong government R&D funding for AI applications"]
  },
  {
    name: "Hong Kong", flag: "🇭🇰", region: "East Asia", score: 75,
    sectors: ["Finance", "Healthcare", "Logistics"],
    govBudget: "$500M", startups: 800, topCompany: "SenseTime HQ",
    trend: "stable", investmentM: 1500,
    highlights: ["Financial hub driving AI in wealth management", "Smart city initiatives across transport and health", "Strong university AI research output"]
  },
  {
    name: "Australia", flag: "🇦🇺", region: "Oceania", score: 76,
    sectors: ["Healthcare", "Finance", "Agriculture", "Defence"],
    govBudget: "$1.2B", startups: 1800, topCompany: "Canva AI / Atlassian",
    trend: "up", investmentM: 2800,
    highlights: ["National AI Centre established for responsible AI", "Mining and agriculture sectors adopting AI at scale", "Strong AI ethics and governance framework"]
  },
  {
    name: "New Zealand", flag: "🇳🇿", region: "Oceania", score: 68,
    sectors: ["Agriculture", "Healthcare", "Education"],
    govBudget: "$120M", startups: 280, topCompany: "Soul Machines",
    trend: "stable", investmentM: 320,
    highlights: ["World-leading AI ethics research and policy", "AgriTech AI for dairy and farming optimization", "Small but innovative startup ecosystem"]
  },
  {
    name: "Bangladesh", flag: "🇧🇩", region: "South Asia", score: 28,
    sectors: ["Finance", "Agriculture", "Education"],
    govBudget: "$40M", startups: 85, topCompany: "bKash (AI features)",
    trend: "up", investmentM: 60,
    highlights: ["Emerging mobile-first AI applications", "Government digitization program expanding", "Garment industry exploring quality-control AI"]
  },
  {
    name: "Pakistan", flag: "🇵🇰", region: "South Asia", score: 32,
    sectors: ["Finance", "Agriculture", "Education"],
    govBudget: "$55M", startups: 120, topCompany: "Ailaaj / RetailO",
    trend: "up", investmentM: 90,
    highlights: ["Presidential initiative on AI launched 2024", "Freelance developer ecosystem driving AI skills", "Healthcare AI addressing doctor shortage in rural areas"]
  },
];

const ALL_SECTORS: Sector[] = ["Healthcare", "Finance", "Manufacturing", "Education", "Agriculture", "Defence", "Logistics", "Retail"];
const ALL_REGIONS: Region[] = ["East Asia", "Southeast Asia", "South Asia", "Oceania"];

const getScoreColor = (score: number) => {
  if (score >= 80) return { bg: "bg-green-500/15", border: "border-green-500/40", text: "text-green-400", bar: "bg-green-500" };
  if (score >= 60) return { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", bar: "bg-emerald-500" };
  if (score >= 40) return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", bar: "bg-amber-500" };
  return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", bar: "bg-red-500" };
};

const TrendIcon = ({ trend }: { trend: Trend }) => {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-400" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export default function AIAdoptionHeatmap() {
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | "All">("All");
  const [selectedSector, setSelectedSector] = useState<Sector | "All">("All");
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [showFilters, setShowFilters] = useState(false);
  const [exploredCountries, setExploredCountries] = useState<Set<string>>(new Set());
  const [pointsAwarded, setPointsAwarded] = useState(false);

  const filtered = useMemo(() => {
    let list = COUNTRIES.filter(c => {
      if (selectedRegion !== "All" && c.region !== selectedRegion) return false;
      if (selectedSector !== "All" && !c.sectors.includes(selectedSector)) return false;
      if (c.score < scoreRange[0] || c.score > scoreRange[1]) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "investment") return b.investmentM - a.investmentM;
      return b.startups - a.startups;
    });

    return list;
  }, [selectedRegion, selectedSector, scoreRange, sortBy]);

  const handleExpand = useCallback((name: string) => {
    setExpandedCountry(prev => prev === name ? null : name);
    setExploredCountries(prev => {
      const next = new Set(prev);
      next.add(name);
      return next;
    });
  }, []);

  useEffect(() => {
    if (exploredCountries.size >= 5 && !pointsAwarded) {
      setPointsAwarded(true);
    }
  }, [exploredCountries.size, pointsAwarded]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Adoption Heatmap | AI Readiness Across Asia-Pacific"
        description="Explore AI adoption scores, investment levels, and startup ecosystems across 16 Asia-Pacific countries with interactive filters."
        canonical="https://aiinasia.com/tools/adoption-heatmap"
      />
      <Header />
      <main className="flex-1 px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <ToolBreadcrumb toolName="AI Adoption Heatmap" />

          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-500 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
              <Map className="h-3.5 w-3.5" /> INTERACTIVE TOOL
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-3">
              AI Adoption Heatmap
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Explore AI readiness scores, government investment, and startup ecosystems across 16 Asia-Pacific countries.
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500" /> 80+ Leader</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> 60-79 Advancing</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500" /> 40-59 Emerging</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" /> &lt;40 Early</span>
          </div>

          {/* Filter toggle + Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                showFilters ? "border-amber-500 bg-amber-500/15 text-amber-500" : "border-border bg-card text-muted-foreground hover:border-amber-500/50"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {(selectedRegion !== "All" || selectedSector !== "All" || scoreRange[0] > 0 || scoreRange[1] < 100) && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortKey)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              >
                <option value="score">Sort by Score</option>
                <option value="investment">Sort by Investment</option>
                <option value="startups">Sort by Startups</option>
              </select>
            </div>
          </div>

          {/* Filters panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                  {/* Region */}
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">Region</label>
                    <div className="flex flex-wrap gap-2">
                      {(["All", ...ALL_REGIONS] as const).map(r => (
                        <button
                          key={r}
                          onClick={() => setSelectedRegion(r as Region | "All")}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            selectedRegion === r ? "bg-amber-500 text-black" : "bg-muted/30 text-muted-foreground hover:bg-amber-500/10"
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sector */}
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">Sector Focus</label>
                    <div className="flex flex-wrap gap-2">
                      {(["All", ...ALL_SECTORS] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setSelectedSector(s as Sector | "All")}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            selectedSector === s ? "bg-amber-500 text-black" : "bg-muted/30 text-muted-foreground hover:bg-amber-500/10"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Score range */}
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">
                      Score Range: {scoreRange[0]} - {scoreRange[1]}
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range" min={0} max={100} value={scoreRange[0]}
                        onChange={e => setScoreRange([Math.min(Number(e.target.value), scoreRange[1]), scoreRange[1]])}
                        className="flex-1 accent-amber-500"
                      />
                      <input
                        type="range" min={0} max={100} value={scoreRange[1]}
                        onChange={e => setScoreRange([scoreRange[0], Math.max(Number(e.target.value), scoreRange[0])])}
                        className="flex-1 accent-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4">
            Showing {filtered.length} of {COUNTRIES.length} countries
          </p>

          {/* Country Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {filtered.map(country => {
              const colors = getScoreColor(country.score);
              const isExpanded = expandedCountry === country.name;

              return (
                <motion.div
                  key={country.name}
                  layout
                  className={cn(
                    "rounded-xl border overflow-hidden transition-all cursor-pointer",
                    colors.border,
                    isExpanded ? "col-span-1 sm:col-span-2" : ""
                  )}
                  onClick={() => handleExpand(country.name)}
                >
                  {/* Card header */}
                  <div className={cn("p-5", colors.bg)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{country.flag}</span>
                        <div>
                          <h3 className="font-display text-sm font-bold text-foreground">{country.name}</h3>
                          <span className="text-[11px] text-muted-foreground">{country.region}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendIcon trend={country.trend} />
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">AI Readiness</span>
                        <span className={cn("font-bold", colors.text)}>{country.score}/100</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", colors.bar)} style={{ width: `${country.score}%` }} />
                      </div>
                    </div>

                    {/* Key stats */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gov Budget</span>
                        <span className="text-foreground font-medium">{country.govBudget}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Startups</span>
                        <span className="text-foreground font-medium">{country.startups.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Sectors */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {country.sectors.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-full bg-muted/20 text-[10px] text-muted-foreground font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 bg-card border-t border-border space-y-4">
                          <div>
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Top AI Company</span>
                            <p className="text-sm text-foreground font-medium mt-1">{country.topCompany}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total AI Investment</span>
                            <p className="text-sm text-foreground font-medium mt-1">
                              ${country.investmentM >= 1000 ? `${(country.investmentM / 1000).toFixed(1)}B` : `${country.investmentM}M`}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Key Highlights</span>
                            <ul className="mt-2 space-y-1.5">
                              {country.highlights.map((h, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                                  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                                  {h}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No countries match your filters</p>
              <p className="text-sm mt-1">Try adjusting the region, sector, or score range.</p>
            </div>
          )}

          {/* Points badge */}
          {pointsAwarded && (
            <div className="text-center mb-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-500 px-4 py-2 rounded-full text-sm font-semibold"
              >
                <Trophy className="h-4 w-4" />
                +15 points earned for exploring 5+ countries!
              </motion.div>
            </div>
          )}

          {/* Methodology */}
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground max-w-3xl mx-auto">
            <h3 className="font-display text-base font-bold text-foreground mb-2">About This Data</h3>
            <p className="leading-relaxed">
              AI readiness scores are composite indices based on government AI strategy maturity, private-sector investment, talent availability, research output, and regulatory environment. Data is aggregated from the Oxford Insights AI Readiness Index, Stanford AI Index, and regional government publications as of early 2026. Investment figures include both public and private funding.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
