import { useState, useMemo, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DollarSign, Search, ArrowUpDown, TrendingUp, Trophy, Building2, CalendarDays, Filter } from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { awardPoints } from "@/lib/gamification";

type RoundType = "Seed" | "Series A" | "Series B" | "Series C" | "Series D+" | "Pre-Seed";
type Sector = "NLP" | "Computer Vision" | "Robotics" | "Fintech AI" | "Healthcare AI" | "EdTech AI" | "Cloud AI" | "Logistics AI" | "AgriTech AI";

interface Deal {
  company: string;
  country: string;
  flag: string;
  round: RoundType;
  amount: number; // in $M
  leadInvestor: string;
  date: string;
  sector: Sector;
}

const DEALS: Deal[] = [
  { company: "MiniMax", country: "China", flag: "🇨🇳", round: "Series B", amount: 600, leadInvestor: "Tencent", date: "2025-01", sector: "NLP" },
  { company: "Sakana AI", country: "Japan", flag: "🇯🇵", round: "Series A", amount: 214, leadInvestor: "Lux Capital", date: "2024-09", sector: "NLP" },
  { company: "Krutrim", country: "India", flag: "🇮🇳", round: "Series A", amount: 50, leadInvestor: "Ola Founders", date: "2024-03", sector: "NLP" },
  { company: "Twelve Labs", country: "South Korea", flag: "🇰🇷", round: "Series A", amount: 50, leadInvestor: "NEA", date: "2024-06", sector: "Computer Vision" },
  { company: "Sarvam AI", country: "India", flag: "🇮🇳", round: "Series A", amount: 41, leadInvestor: "Lightspeed", date: "2024-07", sector: "NLP" },
  { company: "Abridge", country: "Singapore", flag: "🇸🇬", round: "Series C", amount: 150, leadInvestor: "Spark Capital", date: "2024-08", sector: "Healthcare AI" },
  { company: "ZhenFund AI", country: "China", flag: "🇨🇳", round: "Series A", amount: 120, leadInvestor: "Sequoia China", date: "2024-04", sector: "Cloud AI" },
  { company: "Deepcore AI", country: "Japan", flag: "🇯🇵", round: "Seed", amount: 18, leadInvestor: "SoftBank", date: "2024-11", sector: "Robotics" },
  { company: "eFishery", country: "Indonesia", flag: "🇮🇩", round: "Series D+", amount: 200, leadInvestor: "42XFund", date: "2024-01", sector: "AgriTech AI" },
  { company: "Pensees", country: "Singapore", flag: "🇸🇬", round: "Series B", amount: 66, leadInvestor: "EDBI", date: "2024-05", sector: "Computer Vision" },
  { company: "Lunit", country: "South Korea", flag: "🇰🇷", round: "Series C", amount: 150, leadInvestor: "Goldman Sachs", date: "2024-02", sector: "Healthcare AI" },
  { company: "PhysicsWallah", country: "India", flag: "🇮🇳", round: "Series B", amount: 210, leadInvestor: "WestBridge", date: "2024-08", sector: "EdTech AI" },
  { company: "Megvii", country: "China", flag: "🇨🇳", round: "Series D+", amount: 350, leadInvestor: "Ant Group", date: "2024-03", sector: "Computer Vision" },
  { company: "Ninja Van", country: "Singapore", flag: "🇸🇬", round: "Series B", amount: 85, leadInvestor: "GeoPost", date: "2024-10", sector: "Logistics AI" },
  { company: "FinAccel", country: "Indonesia", flag: "🇮🇩", round: "Series B", amount: 45, leadInvestor: "Square Peg", date: "2024-06", sector: "Fintech AI" },
  { company: "Pixis", country: "India", flag: "🇮🇳", round: "Series C", amount: 85, leadInvestor: "General Atlantic", date: "2024-09", sector: "Cloud AI" },
  { company: "Plang", country: "South Korea", flag: "🇰🇷", round: "Series A", amount: 28, leadInvestor: "SoftBank Ventures", date: "2024-11", sector: "EdTech AI" },
  { company: "Cinnamon AI", country: "Japan", flag: "🇯🇵", round: "Series B", amount: 55, leadInvestor: "SBI Investment", date: "2024-04", sector: "NLP" },
  { company: "Nodeflux", country: "Indonesia", flag: "🇮🇩", round: "Series A", amount: 12, leadInvestor: "Indigo Ventures", date: "2024-07", sector: "Computer Vision" },
  { company: "iMerit", country: "India", flag: "🇮🇳", round: "Series C", amount: 40, leadInvestor: "CDC Group", date: "2024-05", sector: "Cloud AI" },
  { company: "PAND.AI", country: "Singapore", flag: "🇸🇬", round: "Series A", amount: 15, leadInvestor: "Monk's Hill", date: "2024-12", sector: "Fintech AI" },
  { company: "Preferred Robotics", country: "Japan", flag: "🇯🇵", round: "Series A", amount: 32, leadInvestor: "Preferred Networks", date: "2025-02", sector: "Robotics" },
  { company: "GoTo AI Labs", country: "Indonesia", flag: "🇮🇩", round: "Series A", amount: 25, leadInvestor: "Sequoia SEA", date: "2024-10", sector: "NLP" },
  { company: "AgriTech Corp", country: "Thailand", flag: "🇹🇭", round: "Seed", amount: 8, leadInvestor: "500 Global", date: "2024-09", sector: "AgriTech AI" },
  { company: "MedLinker", country: "China", flag: "🇨🇳", round: "Series C", amount: 180, leadInvestor: "Tencent", date: "2024-06", sector: "Healthcare AI" },
  { company: "Hyper AI", country: "Vietnam", flag: "🇻🇳", round: "Pre-Seed", amount: 3, leadInvestor: "Zone Startups", date: "2024-11", sector: "NLP" },
  { company: "DocuSign Asia", country: "Australia", flag: "🇦🇺", round: "Series B", amount: 60, leadInvestor: "Accel", date: "2024-08", sector: "Cloud AI" },
  { company: "Symbio Robotics", country: "Australia", flag: "🇦🇺", round: "Series A", amount: 30, leadInvestor: "Main Sequence", date: "2024-04", sector: "Robotics" },
];

const ROUND_TYPES: RoundType[] = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D+"];
const SECTORS: Sector[] = ["NLP", "Computer Vision", "Robotics", "Fintech AI", "Healthcare AI", "EdTech AI", "Cloud AI", "Logistics AI", "AgriTech AI"];

const ROUND_COLORS: Record<RoundType, string> = {
  "Pre-Seed": "bg-violet-500/20 text-violet-400",
  Seed: "bg-emerald-500/20 text-emerald-400",
  "Series A": "bg-sky-500/20 text-sky-400",
  "Series B": "bg-amber-500/20 text-amber-400",
  "Series C": "bg-rose-500/20 text-rose-400",
  "Series D+": "bg-fuchsia-500/20 text-fuchsia-400",
};

const CHART_COLORS = [
  "hsl(38 92% 50%)", "hsl(200 80% 55%)", "hsl(142 71% 45%)", "hsl(280 70% 55%)",
  "hsl(350 80% 55%)", "hsl(170 70% 45%)", "hsl(45 90% 55%)", "hsl(220 70% 55%)",
];

type SortKey = "date" | "amount" | "company";

const TOP_INVESTORS = [
  { name: "Tencent", deals: 4, focus: "NLP, Healthcare" },
  { name: "Sequoia (China/SEA)", deals: 3, focus: "Cloud AI, NLP" },
  { name: "SoftBank / SB Ventures", deals: 3, focus: "Robotics, EdTech" },
  { name: "Lightspeed India", deals: 2, focus: "NLP, Cloud AI" },
  { name: "Goldman Sachs", deals: 2, focus: "Healthcare AI" },
  { name: "500 Global", deals: 2, focus: "AgriTech, Seed stage" },
];

const AIFundingTracker = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [roundFilter, setRoundFilter] = useState<RoundType | "all">("all");
  const [sectorFilter, setSectorFilter] = useState<Sector | "all">("all");
  const [minAmount, setMinAmount] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [viewedDeals, setViewedDeals] = useState<Set<string>>(new Set());
  const [pointsAwarded, setPointsAwarded] = useState(false);

  const countries = useMemo(() => [...new Set(DEALS.map((d) => d.country))].sort(), []);

  const filtered = useMemo(() => {
    let list = DEALS.filter((d) => {
      if (countryFilter !== "all" && d.country !== countryFilter) return false;
      if (roundFilter !== "all" && d.round !== roundFilter) return false;
      if (sectorFilter !== "all" && d.sector !== sectorFilter) return false;
      if (d.amount < minAmount) return false;
      if (search && !d.company.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === "date") return sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      if (sortBy === "amount") return sortAsc ? a.amount - b.amount : b.amount - a.amount;
      return sortAsc ? a.company.localeCompare(b.company) : b.company.localeCompare(a.company);
    });
    return list;
  }, [search, countryFilter, roundFilter, sectorFilter, minAmount, sortBy, sortAsc]);

  // Chart data
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    DEALS.forEach((d) => { map[d.country] = (map[d.country] || 0) + d.amount; });
    return Object.entries(map)
      .map(([country, total]) => ({ country, total }))
      .sort((a, b) => b.total - a.total);
  }, []);

  // Summary stats
  const stats = useMemo(() => {
    const totalFunding = DEALS.reduce((s, d) => s + d.amount, 0);
    return {
      deals: DEALS.length,
      totalFunding,
      avgDeal: Math.round(totalFunding / DEALS.length),
      topCountry: chartData[0]?.country || "N/A",
    };
  }, [chartData]);

  const handleDealView = (company: string) => {
    setViewedDeals((prev) => new Set(prev).add(company));
  };

  useEffect(() => {
    if (viewedDeals.size >= 10 && !pointsAwarded && user) {
      setPointsAwarded(true);
      awardPoints(user.id, 15, "Funding Tracker Explorer");
    }
  }, [viewedDeals.size, pointsAwarded, user]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) { setSortAsc(!sortAsc); } else { setSortBy(key); setSortAsc(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Funding Tracker | Startup Funding Across Asia"
        description="Track 25+ AI startup funding rounds across Asia. Compare deals by country, sector, and round type with interactive charts."
        canonical="https://aiinasia.com/tools/funding-tracker"
      />
      <Header />
      <main className="flex-1 px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <ToolBreadcrumb toolName="AI Funding Tracker" />

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <DollarSign className="h-8 w-8 text-amber-500" />
              <h1 className="font-display text-3xl md:text-4xl font-black text-foreground">
                AI Funding Tracker
              </h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Visual dashboard of AI startup funding rounds across Asia. All figures are sample data for illustration purposes.
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Deals", value: stats.deals.toString(), icon: Building2 },
              { label: "Total Raised", value: `$${(stats.totalFunding / 1000).toFixed(1)}B`, icon: TrendingUp },
              { label: "Avg Deal Size", value: `$${stats.avgDeal}M`, icon: DollarSign },
              { label: "Top Country", value: stats.topCountry, icon: CalendarDays },
            ].map((s) => (
              <Card key={s.label} className="p-4 border-border bg-card">
                <div className="flex items-center gap-3">
                  <s.icon className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-2xl font-black text-foreground">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Funding by Country Chart */}
          <Card className="p-6 border-border bg-card mb-8">
            <h2 className="font-display text-lg font-bold text-foreground mb-4">Total Funding by Country</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <XAxis dataKey="country" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `$${v}M`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`$${value}M`, "Total Raised"]}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
              <option value="all">All Countries</option>
              {countries.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <select value={roundFilter} onChange={(e) => setRoundFilter(e.target.value as RoundType | "all")} className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
              <option value="all">All Rounds</option>
              {ROUND_TYPES.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
            <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value as Sector | "all")} className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
              <option value="all">All Sectors</option>
              {SECTORS.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
            <select value={minAmount} onChange={(e) => setMinAmount(Number(e.target.value))} className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground">
              <option value={0}>Any Amount</option>
              <option value={10}>$10M+</option>
              <option value={50}>$50M+</option>
              <option value={100}>$100M+</option>
            </select>
          </div>

          {/* Sort controls */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            {(["date", "amount", "company"] as SortKey[]).map((key) => (
              <Button key={key} variant={sortBy === key ? "default" : "outline"} size="sm" onClick={() => toggleSort(key)} className="text-xs capitalize">
                {key} <ArrowUpDown className="h-3 w-3 ml-1" />
              </Button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} deals</span>
          </div>

          {/* Deal Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {filtered.map((deal, i) => (
              <motion.div
                key={deal.company}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onViewportEnter={() => handleDealView(deal.company)}
              >
                <Card className="p-5 border-border bg-card hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-display font-bold text-foreground text-base">{deal.flag} {deal.company}</h3>
                      <p className="text-xs text-muted-foreground">{deal.country}</p>
                    </div>
                    <Badge className={`${ROUND_COLORS[deal.round]} border-0 text-[10px] font-bold`}>{deal.round}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Amount</span>
                      <span className="text-sm font-black text-amber-500">${deal.amount}M</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Lead Investor</span>
                      <span className="text-xs text-foreground font-medium">{deal.leadInvestor}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Sector</span>
                      <span className="text-xs text-foreground">{deal.sector}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Date</span>
                      <span className="text-xs text-foreground">{deal.date}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No deals match your filters.</p>
          )}

          {/* Top Investors */}
          <Card className="p-6 border-border bg-card mb-8">
            <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              Top Investors in Asian AI
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TOP_INVESTORS.map((inv, i) => (
                <div key={inv.name} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                  <span className="text-lg font-black text-amber-500/70 w-6 text-center">{i + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{inv.name}</p>
                    <p className="text-xs text-muted-foreground">{inv.deals} deals · {inv.focus}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">Based on sample data for illustration purposes only.</p>
          </Card>

          {/* Points toast */}
          {pointsAwarded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed bottom-6 right-6 bg-card border border-amber-500/30 rounded-xl p-4 shadow-2xl flex items-center gap-3 z-50"
            >
              <Trophy className="h-6 w-6 text-amber-500" />
              <div>
                <p className="text-sm font-bold text-foreground">+15 Points</p>
                <p className="text-xs text-muted-foreground">Funding Tracker Explorer</p>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIFundingTracker;
