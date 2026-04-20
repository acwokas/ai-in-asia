import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, X, Building2, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip
} from "recharts";

interface Company {
  name: string;
  country: string;
  flag: string;
  focus: string[];
  founded: number;
  scores: { research: number; product: number; market: number; talent: number; investment: number };
  desc: string;
}

const COMPANIES: Company[] = [
  { name: "ByteDance", country: "China", flag: "🇨🇳", focus: ["NLP", "Cloud AI"], founded: 2012, scores: { research: 8, product: 10, market: 10, talent: 9, investment: 10 }, desc: "Creator of TikTok, pioneering AI-powered content recommendation at massive scale." },
  { name: "Samsung AI", country: "South Korea", flag: "🇰🇷", focus: ["Computer Vision", "Robotics"], founded: 1969, scores: { research: 9, product: 9, market: 10, talent: 8, investment: 9 }, desc: "AI research centers across the globe driving on-device intelligence and robotics." },
  { name: "SenseTime", country: "China", flag: "🇨🇳", focus: ["Computer Vision", "Cloud AI"], founded: 2014, scores: { research: 9, product: 7, market: 7, talent: 8, investment: 8 }, desc: "Leading Asian AI software company specializing in computer vision and deep learning." },
  { name: "Grab", country: "Singapore", flag: "🇸🇬", focus: ["Fintech AI", "Cloud AI"], founded: 2012, scores: { research: 5, product: 8, market: 9, talent: 6, investment: 7 }, desc: "Southeast Asia's super-app leveraging AI for transport, payments, and delivery." },
  { name: "Flipkart AI", country: "India", flag: "🇮🇳", focus: ["NLP", "Computer Vision"], founded: 2007, scores: { research: 6, product: 7, market: 8, talent: 7, investment: 6 }, desc: "India's e-commerce giant using AI for personalization, logistics, and voice commerce." },
  { name: "Kakao Brain", country: "South Korea", flag: "🇰🇷", focus: ["NLP", "Computer Vision"], founded: 2017, scores: { research: 8, product: 6, market: 5, talent: 7, investment: 6 }, desc: "Kakao's AI research lab building large-scale language and vision models." },
  { name: "Preferred Networks", country: "Japan", flag: "🇯🇵", focus: ["Robotics", "Cloud AI"], founded: 2014, scores: { research: 9, product: 6, market: 4, talent: 8, investment: 7 }, desc: "Japan's most valued AI startup focusing on deep learning for robotics and drug discovery." },
  { name: "Sea Group", country: "Singapore", flag: "🇸🇬", focus: ["Fintech AI", "NLP"], founded: 2009, scores: { research: 5, product: 8, market: 9, talent: 6, investment: 8 }, desc: "Parent of Shopee and SeaMoney, applying AI to e-commerce and digital finance across SEA." },
  { name: "Infosys AI", country: "India", flag: "🇮🇳", focus: ["Cloud AI", "NLP"], founded: 1981, scores: { research: 7, product: 7, market: 9, talent: 8, investment: 7 }, desc: "Global IT services giant with AI platforms for enterprise automation and consulting." },
  { name: "Baidu", country: "China", flag: "🇨🇳", focus: ["NLP", "Cloud AI", "Robotics"], founded: 2000, scores: { research: 10, product: 9, market: 9, talent: 9, investment: 9 }, desc: "China's search leader and AI powerhouse behind ERNIE LLM and Apollo autonomous driving." },
  { name: "Alibaba DAMO", country: "China", flag: "🇨🇳", focus: ["NLP", "Cloud AI"], founded: 2017, scores: { research: 9, product: 8, market: 9, talent: 9, investment: 10 }, desc: "Alibaba's research academy driving breakthroughs in NLP, vision, and cloud intelligence." },
  { name: "NEC", country: "Japan", flag: "🇯🇵", focus: ["Computer Vision", "Cloud AI"], founded: 1899, scores: { research: 8, product: 7, market: 8, talent: 7, investment: 7 }, desc: "Century-old tech giant with world-leading face recognition and public safety AI." },
  { name: "GoTo", country: "Indonesia", flag: "🇮🇩", focus: ["Fintech AI", "Cloud AI"], founded: 2021, scores: { research: 4, product: 7, market: 7, talent: 5, investment: 6 }, desc: "Indonesia's largest tech group using AI for ride-hailing, payments, and merchant services." },
  { name: "Naver", country: "South Korea", flag: "🇰🇷", focus: ["NLP", "Computer Vision", "Robotics"], founded: 1999, scores: { research: 8, product: 8, market: 7, talent: 8, investment: 8 }, desc: "Korea's top internet company building HyperCLOVA LLM and autonomous robot systems." },
  { name: "Tencent AI", country: "China", flag: "🇨🇳", focus: ["NLP", "Computer Vision", "Cloud AI"], founded: 1998, scores: { research: 9, product: 9, market: 10, talent: 9, investment: 10 }, desc: "Tech conglomerate with vast AI research labs powering gaming, social media, and cloud." },
  { name: "LG AI Research", country: "South Korea", flag: "🇰🇷", focus: ["NLP", "Robotics"], founded: 2020, scores: { research: 7, product: 6, market: 6, talent: 7, investment: 7 }, desc: "LG's dedicated AI lab developing EXAONE multimodal model and smart home intelligence." },
  { name: "TCS AI", country: "India", flag: "🇮🇳", focus: ["Cloud AI", "NLP"], founded: 1968, scores: { research: 7, product: 7, market: 9, talent: 8, investment: 7 }, desc: "India's largest IT firm offering AI-powered enterprise solutions and research." },
  { name: "Rakuten", country: "Japan", flag: "🇯🇵", focus: ["NLP", "Fintech AI"], founded: 1997, scores: { research: 6, product: 7, market: 8, talent: 6, investment: 7 }, desc: "Japan's e-commerce and fintech giant integrating AI across its ecosystem of services." },
  { name: "Ant Group", country: "China", flag: "🇨🇳", focus: ["Fintech AI", "Cloud AI"], founded: 2014, scores: { research: 8, product: 9, market: 9, talent: 8, investment: 9 }, desc: "Fintech powerhouse behind Alipay, pioneering AI in credit scoring and risk management." },
  { name: "Wipro AI", country: "India", flag: "🇮🇳", focus: ["Cloud AI", "NLP"], founded: 1945, scores: { research: 6, product: 6, market: 8, talent: 7, investment: 6 }, desc: "Global IT services company with AI labs focused on enterprise automation and analytics." },
];

const COUNTRIES = [...new Set(COMPANIES.map(c => c.country))].sort();
const FOCUSES = ["NLP", "Computer Vision", "Robotics", "Cloud AI", "Fintech AI"];
const DIMENSIONS = ["Research Output", "Product Innovation", "Market Reach", "AI Talent Pool", "Investment Scale"] as const;
const DIM_KEYS: (keyof Company["scores"])[] = ["research", "product", "market", "talent", "investment"];
const COLORS = ["hsl(var(--primary))", "hsl(142 70% 50%)", "hsl(38 92% 55%)"];

const AICompanyRadar = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
  const [focusFilter, setFocusFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [badgeEarned, setBadgeEarned] = useState(false);

  const filtered = useMemo(() => {
    return COMPANIES.filter(c => {
      if (countryFilter && c.country !== countryFilter) return false;
      if (focusFilter && !c.focus.includes(focusFilter)) return false;
      return true;
    });
  }, [countryFilter, focusFilter]);

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      if (prev.includes(name)) return prev.filter(n => n !== name);
      if (prev.length >= 3) return prev;
      const next = [...prev, name];
      if (next.length >= 3 && !badgeEarned) setBadgeEarned(true);
      return next;
    });
  };

  const radarData = DIMENSIONS.map((dim, i) => {
    const point: Record<string, string | number> = { dimension: dim };
    selected.forEach(name => {
      const co = COMPANIES.find(c => c.name === name);
      if (co) point[name] = co.scores[DIM_KEYS[i]];
    });
    return point;
  });

  const avgScore = (c: Company) => {
    const vals = Object.values(c.scores);
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead title="AI Company Radar - Compare Top Asian AI Companies | AI in Asia" description="Compare 20 leading AI companies across Asia on research, innovation, market reach, talent, and investment with interactive radar charts." />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <ToolBreadcrumb toolName="AI Company Radar" />

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">🏢 AI Company Radar</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">Select up to 3 companies to compare across 5 key dimensions with an interactive radar chart.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="bg-card border border-border rounded-md px-3 py-1.5 text-sm text-foreground">
            <option value="">All Countries</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={focusFilter} onChange={e => setFocusFilter(e.target.value)} className="bg-card border border-border rounded-md px-3 py-1.5 text-sm text-foreground">
            <option value="">All Focus Areas</option>
            {FOCUSES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          {selected.length > 0 && (
            <div className="flex gap-2 ml-auto flex-wrap">
              {selected.map((name, i) => (
                <Badge key={name} variant="secondary" className="gap-1 cursor-pointer" style={{ borderColor: COLORS[i] }} onClick={() => toggleSelect(name)}>
                  {name} <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Radar Chart */}
        <AnimatePresence>
          {selected.length >= 2 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="p-4 md:p-6 mb-8 bg-card border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4 text-center">Company Comparison</h2>
                <ResponsiveContainer width="100%" height={380}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    {selected.map((name, i) => (
                      <Radar key={name} name={name} dataKey={name} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
                    ))}
                    <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Company Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map(co => {
            const isSelected = selected.includes(co.name);
            const isExpanded = expanded === co.name;
            return (
              <motion.div key={co.name} layout>
                <Card
                  className={`p-4 bg-card border transition-all cursor-pointer ${isSelected ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40"}`}
                  onClick={() => toggleSelect(co.name)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm leading-tight">{co.name}</h3>
                        <span className="text-xs text-muted-foreground">{co.flag} {co.country}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{avgScore(co)}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {co.focus.map(f => <Badge key={f} variant="secondary" className="text-[10px] px-1.5 py-0">{f}</Badge>)}
                  </div>

                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={e => { e.stopPropagation(); setExpanded(isExpanded ? null : co.name); }}
                  >
                    {isExpanded ? "Less" : "More"}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 text-xs text-muted-foreground space-y-1 overflow-hidden">
                        <p>{co.desc}</p>
                        <p><span className="text-foreground">Founded:</span> {co.founded}</p>
                        <div className="space-y-0.5 pt-1">
                          {DIMENSIONS.map((d, i) => (
                            <div key={d} className="flex items-center gap-2">
                              <span className="w-28 truncate">{d}</span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${co.scores[DIM_KEYS[i]] * 10}%` }} />
                              </div>
                              <span className="w-4 text-right">{co.scores[DIM_KEYS[i]]}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Badge */}
        <AnimatePresence>
          {badgeEarned && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-6 right-6 z-50">
              <Card className="p-4 bg-card border-primary flex items-center gap-3 shadow-lg">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Company Analyst</p>
                  <p className="text-xs text-muted-foreground">+15 points for comparing companies</p>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

export default AICompanyRadar;
