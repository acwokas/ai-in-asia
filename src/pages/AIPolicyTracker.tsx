import { useState, useMemo, useEffect, useRef } from "react";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, ChevronRight, ExternalLink, FileText, Globe, ArrowLeft, Search, Clock, Calendar } from "lucide-react";

const FLAG_MAP: Record<string, string> = {
  CN: "🇨🇳", JP: "🇯🇵", KR: "🇰🇷", IN: "🇮🇳", SG: "🇸🇬", ID: "🇮🇩",
  VN: "🇻🇳", TH: "🇹🇭", AU: "🇦🇺", TW: "🇹🇼", MY: "🇲🇾", PH: "🇵🇭",
  NZ: "🇳🇿", HK: "🇭🇰", BD: "🇧🇩", PK: "🇵🇰",
};

interface CountryPolicy {
  code: string;
  name: string;
  status: "Active" | "Developing" | "Emerging";
  summary: string;
  keyRegulation: string;
  regulations: string[];
  keyBody: string;
  lastUpdated: string;
}

const COUNTRIES: CountryPolicy[] = [
  { code: "CN", name: "China", status: "Active", summary: "World's most regulated AI market with binding rules on algorithms, deepfakes, and generative AI.", keyRegulation: "Interim Measures for Generative AI", regulations: ["Interim Measures for Generative AI", "Algorithm Recommendation Regulations", "Deep Synthesis Regulations", "AI Safety Governance Framework"], keyBody: "CAC / MIIT", lastUpdated: "Mar 2026" },
  { code: "JP", name: "Japan", status: "Active", summary: "Principles-based approach emphasising innovation and human-centric values with non-binding guidelines.", keyRegulation: "AI Guidelines for Business", regulations: ["AI Strategy 2022", "Social Principles of Human-Centric AI", "AI Guidelines for Business"], keyBody: "Cabinet Office / METI", lastUpdated: "Feb 2026" },
  { code: "KR", name: "South Korea", status: "Active", summary: "Pursuing an AI Basic Act with dedicated ethics committee and strong industry focus.", keyRegulation: "AI Basic Act (draft)", regulations: ["AI Basic Act (draft)", "PIPA AI amendments", "National AI Ethics Standards"], keyBody: "MSIT / PIPC", lastUpdated: "Jan 2026" },
  { code: "IN", name: "India", status: "Developing", summary: "Evolving governance with advisory frameworks and new rules on deepfakes and AI content.", keyRegulation: "Digital India Act (proposed)", regulations: ["National Strategy for AI", "IT Rules amendments for AI", "Digital India Act (proposed)"], keyBody: "MeitY / NITI Aayog", lastUpdated: "Mar 2026" },
  { code: "SG", name: "Singapore", status: "Active", summary: "Comprehensive AI governance led by Model AI Governance Framework and AI Verify Foundation.", keyRegulation: "Model AI Governance Framework", regulations: ["Model AI Governance Framework", "AI Verify Foundation", "Advisory Council on AI Ethics"], keyBody: "IMDA / Smart Nation", lastUpdated: "Feb 2026" },
  { code: "ID", name: "Indonesia", status: "Developing", summary: "National AI Strategy (Stranas KA) published with ethical guidelines and sector-specific plans.", keyRegulation: "National AI Strategy 2020-2045", regulations: ["National AI Strategy 2020-2045", "AI Ethics Guidelines (BRIN)", "Circular on AI Ethics"], keyBody: "BRIN / Kominfo", lastUpdated: "Dec 2025" },
  { code: "VN", name: "Vietnam", status: "Emerging", summary: "National AI strategy through 2030 with ambitions to become a regional hub.", keyRegulation: "National AI R&D Strategy to 2030", regulations: ["National AI R&D Strategy to 2030", "Draft AI governance framework"], keyBody: "MIC", lastUpdated: "Nov 2025" },
  { code: "TH", name: "Thailand", status: "Developing", summary: "Published AI Ethics Guidelines with focus on healthcare, agriculture, and government services.", keyRegulation: "National AI Strategy", regulations: ["National AI Strategy", "AI Ethics Guidelines", "PDPA"], keyBody: "MDES / NECTEC", lastUpdated: "Jan 2026" },
  { code: "AU", name: "Australia", status: "Developing", summary: "Voluntary AI Ethics Principles with consultations on mandatory guardrails for high-risk AI.", keyRegulation: "AI Ethics Principles", regulations: ["AI Ethics Principles", "Voluntary AI Safety Standard", "Proposed mandatory guardrails"], keyBody: "Dept of Industry", lastUpdated: "Feb 2026" },
  { code: "TW", name: "Taiwan", status: "Developing", summary: "Leveraging semiconductor leadership while drafting AI Basic Law and ethics guidelines.", keyRegulation: "AI Basic Law (draft)", regulations: ["AI Basic Law (draft)", "Executive Yuan AI Action Plan", "PDPA amendments"], keyBody: "NSTC", lastUpdated: "Jan 2026" },
  { code: "MY", name: "Malaysia", status: "Developing", summary: "National AI Roadmap (AI-Rmap) launched with ethics principles and MDEC leadership.", keyRegulation: "National AI Roadmap (AI-Rmap)", regulations: ["National AI Roadmap (AI-Rmap)", "AI Ethics Principles", "PDPA amendments"], keyBody: "MDEC", lastUpdated: "Dec 2025" },
  { code: "PH", name: "Philippines", status: "Emerging", summary: "Developing AI governance through DICT with a proposed AI Development Authority act.", keyRegulation: "Proposed AI Development Act", regulations: ["National AI Roadmap", "Proposed AI Development Act", "Data Privacy Act"], keyBody: "DICT", lastUpdated: "Nov 2025" },
];

const TIMELINE: { date: string; title: string; country: string }[] = [
  { date: "Mar 2026", title: "China releases updated AI Safety Governance Framework with binding provisions for foundation models.", country: "China" },
  { date: "Feb 2026", title: "Singapore launches AI Verify 2.0, an open-source toolkit for responsible AI testing.", country: "Singapore" },
  { date: "Feb 2026", title: "Australia publishes draft mandatory guardrails for high-risk AI systems.", country: "Australia" },
  { date: "Jan 2026", title: "South Korea's National Assembly advances AI Basic Act to committee stage.", country: "South Korea" },
  { date: "Jan 2026", title: "Thailand issues updated AI Ethics Guidelines covering generative AI applications.", country: "Thailand" },
  { date: "Dec 2025", title: "Indonesia's BRIN publishes sector-specific AI ethics guidelines for healthcare and finance.", country: "Indonesia" },
  { date: "Nov 2025", title: "India's MeitY releases advisory on AI-generated content labeling requirements.", country: "India" },
  { date: "Oct 2025", title: "Japan and South Korea sign bilateral AI safety cooperation agreement.", country: "Japan" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Active: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  Developing: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  Emerging: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
};

const AIPolicyTracker = () => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [exploredCountries, setExploredCountries] = useState<Set<string>>(new Set());
  const pointsAwarded = useRef(false);
  const { user } = useAuth();

  const { data: policyArticles } = useQuery({
    queryKey: ["policy-tracker-articles"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, slug, excerpt, published_at, categories:primary_category_id(slug)")
        .eq("status", "published")
        .or("topic_tags.cs.{policy},topic_tags.cs.{regulation},topic_tags.cs.{governance}")
        .order("published_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  // Track explored countries for gamification
  useEffect(() => {
    if (selectedCountry && !exploredCountries.has(selectedCountry)) {
      setExploredCountries((prev) => new Set(prev).add(selectedCountry));
    }
  }, [selectedCountry]);

  // Award points after 5+ countries explored
  useEffect(() => {
    if (exploredCountries.size >= 5 && user && !pointsAwarded.current) {
      pointsAwarded.current = true;
      supabase.rpc("award_points", { _user_id: user.id, _points: 15 }).catch(() => {});
    }
  }, [exploredCountries.size, user]);

  const filtered = useMemo(() => {
    let result = COUNTRIES;
    if (filterStatus !== "All") {
      result = result.filter((c) => c.status === filterStatus);
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    return result;
  }, [filterStatus, searchQuery]);

  const selected = selectedCountry ? COUNTRIES.find((c) => c.code === selectedCountry) : null;

  const relatedArticles = useMemo(() => {
    if (!selected || !policyArticles) return [];
    const name = selected.name.toLowerCase();
    return policyArticles.filter((a: any) =>
      a.title?.toLowerCase().includes(name) || a.excerpt?.toLowerCase().includes(name)
    ).slice(0, 4);
  }, [selected, policyArticles]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Policy Tracker: Regulation Across Asia | AI in Asia"
        description="Track AI governance, regulation, and policy developments across Asia-Pacific nations. Compare frameworks, timelines, and regulatory bodies."
        canonical="https://aiinasia.com/tools/policy-tracker"
      />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section
          className="relative overflow-hidden"
          style={{ background: "linear-gradient(180deg, hsl(220 20% 6%) 0%, hsl(45 40% 10%) 50%, hsl(220 20% 8%) 100%)" }}
        >
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
          <div className="container mx-auto px-4 pt-12 pb-10 md:pt-16 md:pb-14 relative z-10">
            <ToolBreadcrumb toolName="AI Policy Tracker" />
            <div className="text-center max-w-3xl mx-auto mt-6">
              <Badge className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: "hsl(45 80% 50%)", color: "#000" }}>
                Interactive Tool
              </Badge>
              <h1
                className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.1] tracking-tight mb-4"
                style={{
                  background: "linear-gradient(135deg, #FFFFFF 20%, #eab308 80%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                AI Policy Tracker: Regulation Across Asia
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
                Track AI governance, regulation, and policy developments across Asia-Pacific nations.
              </p>

              {/* Search + filters */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by country..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-background/60 border-border/50 backdrop-blur-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                {["All", "Active", "Developing", "Emerging"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setFilterStatus(s); setSelectedCountry(null); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all border ${
                      filterStatus === s
                        ? "bg-amber-500 text-black border-amber-500"
                        : "bg-transparent text-foreground/80 border-border hover:border-amber-500/40"
                    }`}
                  >
                    {s} {s !== "All" && `(${COUNTRIES.filter((c) => c.status === s).length})`}
                  </button>
                ))}
              </div>

              {exploredCountries.size > 0 && exploredCountries.size < 5 && (
                <p className="text-xs text-muted-foreground mt-4">
                  {exploredCountries.size}/5 countries explored. Explore {5 - exploredCountries.size} more to earn +15 points.
                </p>
              )}
              {exploredCountries.size >= 5 && (
                <p className="text-xs text-emerald-400 mt-4 font-semibold">+15 points earned for exploring 5+ countries.</p>
              )}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-10">
          {/* Country cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
            {filtered.map((c) => {
              const styles = STATUS_STYLES[c.status];
              const isSelected = selectedCountry === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => setSelectedCountry(c.code)}
                  className={`text-left rounded-xl p-4 transition-all duration-200 border ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20"
                      : "bg-card border-border/50 hover:border-amber-500/30 hover:bg-card/80"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{FLAG_MAP[c.code]}</span>
                    <div className="min-w-0">
                      <span className="font-bold text-foreground text-sm block truncate">{c.name}</span>
                    </div>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${styles.bg} ${styles.text} border ${styles.border}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 font-medium mb-1.5 truncate">{c.keyRegulation}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.summary}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {c.lastUpdated}</span>
                    <span className="text-primary font-medium flex items-center gap-0.5">Details <ChevronRight className="w-3 h-3" /></span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="rounded-2xl border border-amber-500/20 bg-card p-6 mb-12 animate-fade-in max-w-3xl mx-auto">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{FLAG_MAP[selected.code]}</span>
                  <div>
                    <h2 className="font-display text-2xl font-black text-foreground">{selected.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[selected.status].bg} ${STATUS_STYLES[selected.status].text} border ${STATUS_STYLES[selected.status].border}`}>
                        {selected.status}
                      </span>
                      <span className="text-xs text-muted-foreground">Updated {selected.lastUpdated}</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Led by {selected.keyBody}</span>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">{selected.summary}</p>

              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" /> Key Regulations and Frameworks
              </h3>
              <ul className="space-y-2 mb-6">
                {selected.regulations.map((reg) => (
                  <li key={reg} className="flex items-start gap-2 text-sm text-foreground/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    {reg}
                  </li>
                ))}
              </ul>

              {relatedArticles.length > 0 && (
                <>
                  <h3 className="text-sm font-bold text-foreground mb-3">Related Articles</h3>
                  <div className="space-y-2">
                    {relatedArticles.map((a: any) => (
                      <Link
                        key={a.id}
                        to={`/${a.categories?.slug || "policy"}/${a.slug}`}
                        className="group flex items-center gap-2 rounded-lg p-2 hover:bg-amber-500/5 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="text-sm text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">{a.title}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              <div className="mt-6 pt-4 border-t border-border">
                <Link to="/category/policy" className="text-sm text-amber-500 font-semibold hover:underline inline-flex items-center gap-1">
                  Browse all policy articles <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Timeline section */}
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-5 h-5 text-amber-500" />
              <h2 className="font-display text-xl md:text-2xl font-bold">Recent Policy Milestones</h2>
              <div className="flex-1 h-px bg-border/40" />
            </div>

            <div className="relative pl-6 border-l-2 border-border/40 space-y-6">
              {TIMELINE.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[calc(1.5rem+5px)] w-3 h-3 rounded-full bg-amber-500 border-2 border-background" />
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-amber-500">{item.date}</span>
                    <span className="text-xs text-muted-foreground">/ {item.country}</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{item.title}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-border text-center">
            <Link to="/tools" className="text-sm text-amber-500 font-semibold hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to all tools
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIPolicyTracker;
