import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Compass, ChevronDown, Check, DollarSign, TrendingUp, Globe2, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const LazyBarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const LazyBar = lazy(() => import("recharts").then(m => ({ default: m.Bar })));
const LazyXAxis = lazy(() => import("recharts").then(m => ({ default: m.XAxis })));
const LazyYAxis = lazy(() => import("recharts").then(m => ({ default: m.YAxis })));
const LazyTooltip = lazy(() => import("recharts").then(m => ({ default: m.Tooltip })));
const LazyResponsiveContainer = lazy(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })));
const LazyCartesianGrid = lazy(() => import("recharts").then(m => ({ default: m.CartesianGrid })));
const LazyCell = lazy(() => import("recharts").then(m => ({ default: m.Cell })));

// Recharts needs all components rendered together, so we use a wrapper
const SalaryChart = lazy(() => Promise.resolve({ default: SalaryChartInner }));

import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

type Role = typeof ROLES[number];
type Level = "entry" | "mid" | "senior";

const ROLES = [
  "Data Scientist",
  "ML Engineer",
  "AI Product Manager",
  "NLP Specialist",
  "Computer Vision Engineer",
  "AI Ethics Officer",
  "Prompt Engineer",
  "AI Research Scientist",
  "Robotics Engineer",
  "AI Solutions Architect",
] as const;

interface CityData {
  name: string;
  flag: string;
  colIndex: number; // cost-of-living index relative to Singapore (1.0)
  salaries: Record<Role, { entry: number; mid: number; senior: number }>;
}

// Realistic salary data (USD annual). Singapore as anchor, others scaled proportionally.
const CITIES: CityData[] = [
  {
    name: "Singapore", flag: "🇸🇬", colIndex: 1.0,
    salaries: {
      "Data Scientist": { entry: 45000, mid: 75000, senior: 120000 },
      "ML Engineer": { entry: 48000, mid: 82000, senior: 135000 },
      "AI Product Manager": { entry: 50000, mid: 85000, senior: 130000 },
      "NLP Specialist": { entry: 44000, mid: 72000, senior: 115000 },
      "Computer Vision Engineer": { entry: 46000, mid: 78000, senior: 125000 },
      "AI Ethics Officer": { entry: 40000, mid: 65000, senior: 100000 },
      "Prompt Engineer": { entry: 38000, mid: 62000, senior: 95000 },
      "AI Research Scientist": { entry: 52000, mid: 90000, senior: 150000 },
      "Robotics Engineer": { entry: 47000, mid: 80000, senior: 128000 },
      "AI Solutions Architect": { entry: 50000, mid: 88000, senior: 140000 },
    },
  },
  {
    name: "Tokyo", flag: "🇯🇵", colIndex: 0.92,
    salaries: {
      "Data Scientist": { entry: 42000, mid: 72000, senior: 115000 },
      "ML Engineer": { entry: 45000, mid: 78000, senior: 128000 },
      "AI Product Manager": { entry: 46000, mid: 80000, senior: 125000 },
      "NLP Specialist": { entry: 41000, mid: 68000, senior: 110000 },
      "Computer Vision Engineer": { entry: 43000, mid: 74000, senior: 120000 },
      "AI Ethics Officer": { entry: 38000, mid: 62000, senior: 95000 },
      "Prompt Engineer": { entry: 35000, mid: 58000, senior: 88000 },
      "AI Research Scientist": { entry: 50000, mid: 88000, senior: 145000 },
      "Robotics Engineer": { entry: 48000, mid: 82000, senior: 132000 },
      "AI Solutions Architect": { entry: 48000, mid: 84000, senior: 135000 },
    },
  },
  {
    name: "Seoul", flag: "🇰🇷", colIndex: 0.85,
    salaries: {
      "Data Scientist": { entry: 38000, mid: 65000, senior: 105000 },
      "ML Engineer": { entry: 40000, mid: 70000, senior: 115000 },
      "AI Product Manager": { entry: 42000, mid: 72000, senior: 112000 },
      "NLP Specialist": { entry: 37000, mid: 62000, senior: 100000 },
      "Computer Vision Engineer": { entry: 39000, mid: 67000, senior: 108000 },
      "AI Ethics Officer": { entry: 34000, mid: 55000, senior: 85000 },
      "Prompt Engineer": { entry: 32000, mid: 52000, senior: 80000 },
      "AI Research Scientist": { entry: 45000, mid: 78000, senior: 130000 },
      "Robotics Engineer": { entry: 42000, mid: 72000, senior: 115000 },
      "AI Solutions Architect": { entry: 43000, mid: 75000, senior: 120000 },
    },
  },
  {
    name: "Bangalore", flag: "🇮🇳", colIndex: 0.35,
    salaries: {
      "Data Scientist": { entry: 15000, mid: 30000, senior: 55000 },
      "ML Engineer": { entry: 16000, mid: 33000, senior: 60000 },
      "AI Product Manager": { entry: 18000, mid: 35000, senior: 62000 },
      "NLP Specialist": { entry: 14000, mid: 28000, senior: 50000 },
      "Computer Vision Engineer": { entry: 15000, mid: 30000, senior: 55000 },
      "AI Ethics Officer": { entry: 12000, mid: 24000, senior: 42000 },
      "Prompt Engineer": { entry: 10000, mid: 22000, senior: 40000 },
      "AI Research Scientist": { entry: 18000, mid: 38000, senior: 70000 },
      "Robotics Engineer": { entry: 15000, mid: 32000, senior: 58000 },
      "AI Solutions Architect": { entry: 17000, mid: 36000, senior: 65000 },
    },
  },
  {
    name: "Shanghai", flag: "🇨🇳", colIndex: 0.65,
    salaries: {
      "Data Scientist": { entry: 32000, mid: 55000, senior: 95000 },
      "ML Engineer": { entry: 35000, mid: 60000, senior: 105000 },
      "AI Product Manager": { entry: 36000, mid: 62000, senior: 100000 },
      "NLP Specialist": { entry: 30000, mid: 52000, senior: 88000 },
      "Computer Vision Engineer": { entry: 33000, mid: 57000, senior: 98000 },
      "AI Ethics Officer": { entry: 28000, mid: 46000, senior: 75000 },
      "Prompt Engineer": { entry: 25000, mid: 42000, senior: 70000 },
      "AI Research Scientist": { entry: 38000, mid: 68000, senior: 120000 },
      "Robotics Engineer": { entry: 35000, mid: 60000, senior: 100000 },
      "AI Solutions Architect": { entry: 36000, mid: 64000, senior: 110000 },
    },
  },
  {
    name: "Hong Kong", flag: "🇭🇰", colIndex: 1.05,
    salaries: {
      "Data Scientist": { entry: 48000, mid: 80000, senior: 130000 },
      "ML Engineer": { entry: 50000, mid: 85000, senior: 140000 },
      "AI Product Manager": { entry: 52000, mid: 88000, senior: 135000 },
      "NLP Specialist": { entry: 46000, mid: 75000, senior: 120000 },
      "Computer Vision Engineer": { entry: 48000, mid: 80000, senior: 130000 },
      "AI Ethics Officer": { entry: 42000, mid: 68000, senior: 105000 },
      "Prompt Engineer": { entry: 40000, mid: 65000, senior: 100000 },
      "AI Research Scientist": { entry: 55000, mid: 95000, senior: 160000 },
      "Robotics Engineer": { entry: 50000, mid: 85000, senior: 135000 },
      "AI Solutions Architect": { entry: 52000, mid: 92000, senior: 148000 },
    },
  },
  {
    name: "Jakarta", flag: "🇮🇩", colIndex: 0.38,
    salaries: {
      "Data Scientist": { entry: 14000, mid: 28000, senior: 50000 },
      "ML Engineer": { entry: 15000, mid: 30000, senior: 55000 },
      "AI Product Manager": { entry: 16000, mid: 32000, senior: 55000 },
      "NLP Specialist": { entry: 13000, mid: 26000, senior: 45000 },
      "Computer Vision Engineer": { entry: 14000, mid: 28000, senior: 50000 },
      "AI Ethics Officer": { entry: 11000, mid: 22000, senior: 38000 },
      "Prompt Engineer": { entry: 10000, mid: 20000, senior: 36000 },
      "AI Research Scientist": { entry: 17000, mid: 35000, senior: 62000 },
      "Robotics Engineer": { entry: 14000, mid: 29000, senior: 52000 },
      "AI Solutions Architect": { entry: 16000, mid: 33000, senior: 58000 },
    },
  },
  {
    name: "Kuala Lumpur", flag: "🇲🇾", colIndex: 0.42,
    salaries: {
      "Data Scientist": { entry: 18000, mid: 32000, senior: 55000 },
      "ML Engineer": { entry: 20000, mid: 35000, senior: 60000 },
      "AI Product Manager": { entry: 21000, mid: 36000, senior: 58000 },
      "NLP Specialist": { entry: 17000, mid: 30000, senior: 50000 },
      "Computer Vision Engineer": { entry: 18000, mid: 32000, senior: 55000 },
      "AI Ethics Officer": { entry: 15000, mid: 26000, senior: 42000 },
      "Prompt Engineer": { entry: 14000, mid: 24000, senior: 40000 },
      "AI Research Scientist": { entry: 22000, mid: 40000, senior: 68000 },
      "Robotics Engineer": { entry: 19000, mid: 34000, senior: 58000 },
      "AI Solutions Architect": { entry: 21000, mid: 38000, senior: 62000 },
    },
  },
  {
    name: "Bangkok", flag: "🇹🇭", colIndex: 0.40,
    salaries: {
      "Data Scientist": { entry: 16000, mid: 30000, senior: 52000 },
      "ML Engineer": { entry: 18000, mid: 33000, senior: 58000 },
      "AI Product Manager": { entry: 19000, mid: 34000, senior: 55000 },
      "NLP Specialist": { entry: 15000, mid: 28000, senior: 48000 },
      "Computer Vision Engineer": { entry: 16000, mid: 30000, senior: 52000 },
      "AI Ethics Officer": { entry: 14000, mid: 24000, senior: 40000 },
      "Prompt Engineer": { entry: 12000, mid: 22000, senior: 38000 },
      "AI Research Scientist": { entry: 20000, mid: 38000, senior: 65000 },
      "Robotics Engineer": { entry: 17000, mid: 32000, senior: 55000 },
      "AI Solutions Architect": { entry: 19000, mid: 36000, senior: 60000 },
    },
  },
  {
    name: "Taipei", flag: "🇹🇼", colIndex: 0.70,
    salaries: {
      "Data Scientist": { entry: 28000, mid: 48000, senior: 82000 },
      "ML Engineer": { entry: 30000, mid: 52000, senior: 90000 },
      "AI Product Manager": { entry: 32000, mid: 54000, senior: 85000 },
      "NLP Specialist": { entry: 26000, mid: 45000, senior: 75000 },
      "Computer Vision Engineer": { entry: 28000, mid: 48000, senior: 82000 },
      "AI Ethics Officer": { entry: 24000, mid: 40000, senior: 65000 },
      "Prompt Engineer": { entry: 22000, mid: 38000, senior: 62000 },
      "AI Research Scientist": { entry: 35000, mid: 60000, senior: 100000 },
      "Robotics Engineer": { entry: 30000, mid: 52000, senior: 88000 },
      "AI Solutions Architect": { entry: 32000, mid: 56000, senior: 92000 },
    },
  },
  {
    name: "Ho Chi Minh City", flag: "🇻🇳", colIndex: 0.32,
    salaries: {
      "Data Scientist": { entry: 12000, mid: 24000, senior: 45000 },
      "ML Engineer": { entry: 13000, mid: 26000, senior: 48000 },
      "AI Product Manager": { entry: 14000, mid: 28000, senior: 48000 },
      "NLP Specialist": { entry: 11000, mid: 22000, senior: 40000 },
      "Computer Vision Engineer": { entry: 12000, mid: 24000, senior: 45000 },
      "AI Ethics Officer": { entry: 10000, mid: 18000, senior: 32000 },
      "Prompt Engineer": { entry: 8000, mid: 16000, senior: 30000 },
      "AI Research Scientist": { entry: 15000, mid: 30000, senior: 55000 },
      "Robotics Engineer": { entry: 12000, mid: 25000, senior: 46000 },
      "AI Solutions Architect": { entry: 14000, mid: 28000, senior: 52000 },
    },
  },
  {
    name: "Manila", flag: "🇵🇭", colIndex: 0.36,
    salaries: {
      "Data Scientist": { entry: 13000, mid: 26000, senior: 48000 },
      "ML Engineer": { entry: 14000, mid: 28000, senior: 52000 },
      "AI Product Manager": { entry: 15000, mid: 30000, senior: 50000 },
      "NLP Specialist": { entry: 12000, mid: 24000, senior: 42000 },
      "Computer Vision Engineer": { entry: 13000, mid: 26000, senior: 48000 },
      "AI Ethics Officer": { entry: 10000, mid: 20000, senior: 35000 },
      "Prompt Engineer": { entry: 9000, mid: 18000, senior: 32000 },
      "AI Research Scientist": { entry: 16000, mid: 32000, senior: 58000 },
      "Robotics Engineer": { entry: 14000, mid: 28000, senior: 50000 },
      "AI Solutions Architect": { entry: 15000, mid: 30000, senior: 55000 },
    },
  },
];

const LEVEL_LABELS: Record<Level, string> = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior Level",
};

const formatSalary = (n: number) => `$${Math.round(n / 1000)}k`;
const formatSalaryFull = (n: number) => `$${n.toLocaleString()}`;

function SalaryChartInner({
  data,
  level,
  colAdjusted,
}: {
  data: { name: string; salary: number; tier: string }[];
  level: Level;
  colAdjusted: boolean;
}) {
  const getBarColor = (tier: string) => {
    if (tier === "above") return "hsl(142, 60%, 45%)";
    if (tier === "below") return "hsl(0, 70%, 55%)";
    return "hsl(37, 78%, 60%)";
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsla(220, 20%, 30%, 0.3)" />
        <XAxis
          dataKey="name"
          tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          interval={0}
          height={80}
        />
        <YAxis
          tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 11 }}
          tickFormatter={(v: number) => formatSalary(v)}
        />
        <ReTooltip
          contentStyle={{
            background: "hsl(220, 25%, 12%)",
            border: "1px solid hsl(220, 20%, 25%)",
            borderRadius: 8,
            color: "hsl(220, 10%, 90%)",
          }}
          formatter={(value: number) => [formatSalaryFull(value), colAdjusted ? "COL-Adjusted" : LEVEL_LABELS[level]]}
          labelStyle={{ color: "hsl(37, 78%, 60%)" }}
        />
        <Bar dataKey="salary" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={getBarColor(entry.tier)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AISalaryCompass() {
  const [selectedRole, setSelectedRole] = useState<Role>("Data Scientist");
  const [level, setLevel] = useState<Level>("mid");
  const [colAdjusted, setColAdjusted] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exploredCities, setExploredCities] = useState<Set<string>>(new Set());
  const [pointsAwarded, setPointsAwarded] = useState(false);

  const filteredRoles = useMemo(() => {
    if (!searchQuery) return ROLES;
    const q = searchQuery.toLowerCase();
    return ROLES.filter(r => r.toLowerCase().includes(q));
  }, [searchQuery]);

  // Compute average salary for the selected role + level across all cities
  const avgSalary = useMemo(() => {
    const salaries = CITIES.map(c => {
      const raw = c.salaries[selectedRole][level];
      return colAdjusted ? raw / c.colIndex : raw;
    });
    return salaries.reduce((a, b) => a + b, 0) / salaries.length;
  }, [selectedRole, level, colAdjusted]);

  const chartData = useMemo(() => {
    return CITIES.map(city => {
      const raw = city.salaries[selectedRole][level];
      const salary = colAdjusted ? Math.round(raw / city.colIndex) : raw;
      const tier = salary > avgSalary * 1.15 ? "above" : salary < avgSalary * 0.85 ? "below" : "average";
      return { name: city.name, salary, tier, flag: city.flag };
    }).sort((a, b) => b.salary - a.salary);
  }, [selectedRole, level, colAdjusted, avgSalary]);

  const trackCityExplore = useCallback((cityName: string) => {
    setExploredCities(prev => {
      const next = new Set(prev);
      next.add(cityName);
      return next;
    });
  }, []);

  // Award points when 3+ cities explored
  useEffect(() => {
    if (exploredCities.size >= 3 && !pointsAwarded) {
      setPointsAwarded(true);
      // Points integration placeholder - fires once
    }
  }, [exploredCities.size, pointsAwarded]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Salary Compass | Compare AI Salaries Across Asia"
        description="Explore and compare AI job salaries across 12 major Asian cities. Filter by role, experience level, and cost of living."
        canonical="https://aiinasia.com/tools/salary-compass"
      />
      <Header />
      <main className="flex-1 px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <ToolBreadcrumb toolName="AI Salary Compass" />

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-500 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
              <Compass className="h-3.5 w-3.5" /> INTERACTIVE TOOL
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-3">
              AI Salary Compass
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Compare AI job salaries across 12 major cities in Asia. Filter by role, experience level, and toggle cost-of-living adjustments.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-8 items-start sm:items-center justify-center">
            {/* Role dropdown */}
            <div className="relative w-full sm:w-72">
              <button
                onClick={() => setRoleDropdownOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:border-amber-500/50 transition-colors"
              >
                <span className="truncate">{selectedRole}</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", roleDropdownOpen && "rotate-180")} />
              </button>
              {roleDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-xl max-h-72 overflow-auto">
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Search roles..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                      autoFocus
                    />
                  </div>
                  {filteredRoles.map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        setSelectedRole(role);
                        setRoleDropdownOpen(false);
                        setSearchQuery("");
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-amber-500/10 transition-colors",
                        selectedRole === role && "text-amber-500 font-semibold"
                      )}
                    >
                      {selectedRole === role && <Check className="h-3.5 w-3.5 shrink-0" />}
                      <span className={selectedRole !== role ? "ml-5.5" : ""}>{role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Level pills */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["entry", "mid", "senior"] as Level[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium transition-colors",
                    level === l
                      ? "bg-amber-500 text-black"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-amber-500/10"
                  )}
                >
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>

            {/* COL toggle */}
            <button
              onClick={() => setColAdjusted(a => !a)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                colAdjusted
                  ? "border-amber-500 bg-amber-500/15 text-amber-500"
                  : "border-border bg-card text-muted-foreground hover:border-amber-500/50"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              COL Adjusted
            </button>
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-border bg-card p-4 md:p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <h2 className="font-display text-lg font-bold text-foreground">
                {selectedRole} {colAdjusted ? "(COL-Adjusted)" : ""} — {LEVEL_LABELS[level]}
              </h2>
            </div>
            <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "hsl(142, 60%, 45%)" }} /> Above avg</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "hsl(37, 78%, 60%)" }} /> Average</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "hsl(0, 70%, 55%)" }} /> Below avg</span>
            </div>
            <Suspense fallback={<div className="h-[400px] animate-pulse bg-muted rounded" />}>
              <SalaryChartInner data={chartData} level={level} colAdjusted={colAdjusted} />
            </Suspense>
          </div>

          {/* City Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
            {chartData.map(cityItem => {
              const city = CITIES.find(c => c.name === cityItem.name)!;
              const salaryData = city.salaries[selectedRole];

              const getSalary = (l: Level) => {
                const raw = salaryData[l];
                return colAdjusted ? Math.round(raw / city.colIndex) : raw;
              };

              const tierColor = cityItem.tier === "above"
                ? "border-green-500/30 bg-green-500/5"
                : cityItem.tier === "below"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-amber-500/30 bg-amber-500/5";

              const tierAccent = cityItem.tier === "above"
                ? "text-green-400"
                : cityItem.tier === "below"
                  ? "text-red-400"
                  : "text-amber-400";

              return (
                <div
                  key={city.name}
                  onMouseEnter={() => trackCityExplore(city.name)}
                  onClick={() => trackCityExplore(city.name)}
                  className={cn(
                    "rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-default",
                    tierColor
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{city.flag}</span>
                    <h3 className="font-display text-sm font-bold text-foreground">{city.name}</h3>
                  </div>

                  <div className="space-y-2">
                    {(["entry", "mid", "senior"] as Level[]).map(l => {
                      const sal = getSalary(l);
                      const isActive = l === level;
                      return (
                        <div key={l} className={cn("flex items-center justify-between text-sm", isActive ? "font-semibold" : "opacity-60")}>
                          <span className="text-muted-foreground">{LEVEL_LABELS[l]}</span>
                          <span className={isActive ? tierAccent : "text-foreground"}>
                            {formatSalaryFull(sal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {colAdjusted && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Globe2 className="h-3 w-3" />
                        <span>COL Index: {city.colIndex.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Points badge */}
          {pointsAwarded && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-500 px-4 py-2 rounded-full text-sm font-semibold animate-in fade-in slide-in-from-bottom-2 duration-500">
                <DollarSign className="h-4 w-4" />
                +15 points earned for exploring 3+ cities!
              </div>
            </div>
          )}

          {/* Methodology note */}
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground max-w-3xl mx-auto">
            <h3 className="font-display text-base font-bold text-foreground mb-2">About This Data</h3>
            <p className="leading-relaxed">
              Salary ranges are based on aggregated data from job boards, industry reports, and recruitment agencies across Asia-Pacific as of early 2026. All figures are in USD (annual). Cost-of-living adjustments use a relative index with Singapore as the baseline (1.0). Actual salaries may vary based on company size, specific skills, and market conditions.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
