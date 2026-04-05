import { useState, useMemo } from "react";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Shield, ChevronRight, ExternalLink, FileText, Globe, ArrowLeft } from "lucide-react";

interface CountryPolicy {
  code: string;
  name: string;
  status: "Advanced" | "Developing" | "Early" | "None";
  summary: string;
  regulations: string[];
  keyBody: string;
  lastUpdated: string;
}

const COUNTRIES: CountryPolicy[] = [
  { code: "SG", name: "Singapore", status: "Advanced", summary: "Singapore has one of Asia's most comprehensive AI governance frameworks, led by the Model AI Governance Framework and IMDA's initiatives.", regulations: ["Model AI Governance Framework", "AI Verify Foundation", "Advisory Council on AI Ethics"], keyBody: "IMDA / Smart Nation", lastUpdated: "2024" },
  { code: "CN", name: "China", status: "Advanced", summary: "China has enacted binding regulations on algorithmic recommendations, deepfakes, and generative AI, making it the world's most regulated AI market.", regulations: ["Interim Measures for Generative AI", "Algorithm Recommendation Regulations", "Deep Synthesis Regulations", "AI Safety Governance Framework"], keyBody: "CAC / MIIT", lastUpdated: "2024" },
  { code: "KR", name: "South Korea", status: "Advanced", summary: "South Korea is pursuing an AI Basic Act and has established a dedicated AI ethics committee. Strong focus on fostering AI industry while managing risks.", regulations: ["AI Basic Act (draft)", "Personal Information Protection Act (AI amendments)", "National AI Ethics Standards"], keyBody: "MSIT / PIPC", lastUpdated: "2024" },
  { code: "JP", name: "Japan", status: "Advanced", summary: "Japan takes a principles-based, non-binding approach to AI governance emphasising innovation and human-centric values.", regulations: ["AI Strategy 2022", "Social Principles of Human-Centric AI", "AI Guidelines for Business"], keyBody: "Cabinet Office / METI", lastUpdated: "2024" },
  { code: "AU", name: "Australia", status: "Developing", summary: "Australia has released voluntary AI Ethics Principles and is consulting on mandatory guardrails for high-risk AI.", regulations: ["AI Ethics Principles", "Voluntary AI Safety Standard (draft)", "Proposed mandatory guardrails"], keyBody: "Dept of Industry", lastUpdated: "2024" },
  { code: "IN", name: "India", status: "Developing", summary: "India's AI governance is evolving with advisory frameworks from NITI Aayog and new rules on deepfakes and AI-generated content.", regulations: ["National Strategy for AI (NITI Aayog)", "IT Rules amendments for AI", "Digital India Act (proposed)"], keyBody: "MeitY / NITI Aayog", lastUpdated: "2024" },
  { code: "TH", name: "Thailand", status: "Developing", summary: "Thailand has published AI Ethics Guidelines and a National AI Strategy focusing on healthcare, agriculture, and government services.", regulations: ["National AI Strategy", "AI Ethics Guidelines", "PDPA (data protection)"], keyBody: "MDES / NECTEC", lastUpdated: "2024" },
  { code: "VN", name: "Vietnam", status: "Early", summary: "Vietnam has a national AI strategy through 2030 with ambitions to become a regional AI hub, but binding regulation is still nascent.", regulations: ["National AI Research & Development Strategy to 2030", "Draft AI governance framework"], keyBody: "MIC", lastUpdated: "2024" },
  { code: "PH", name: "Philippines", status: "Early", summary: "The Philippines is developing AI governance through DICT and has proposed an AI Development Authority act.", regulations: ["National AI Roadmap", "Proposed AI Development Act", "Data Privacy Act"], keyBody: "DICT", lastUpdated: "2024" },
  { code: "ID", name: "Indonesia", status: "Developing", summary: "Indonesia has published a National AI Strategy (Stranas KA) and ethical AI guidelines, with plans for sector-specific regulation.", regulations: ["National AI Strategy 2020-2045", "AI Ethics Guidelines (BRIN)", "Circular on AI Ethics"], keyBody: "BRIN / Kominfo", lastUpdated: "2024" },
  { code: "MY", name: "Malaysia", status: "Developing", summary: "Malaysia launched the National AI Roadmap (AI-Rmap) and established AHAM to drive responsible AI adoption.", regulations: ["National AI Roadmap (AI-Rmap)", "Malaysia AI Ethics Principles", "PDPA amendments"], keyBody: "MDEC", lastUpdated: "2024" },
  { code: "TW", name: "Taiwan", status: "Developing", summary: "Taiwan has published AI guidelines and is leveraging its semiconductor leadership to position itself in global AI governance.", regulations: ["AI Basic Law (draft)", "Executive Yuan AI Action Plan", "Personal Data Protection Act amendments"], keyBody: "NSTC", lastUpdated: "2024" },
  { code: "NZ", name: "New Zealand", status: "Developing", summary: "New Zealand applies its Algorithm Charter for government use of AI and is developing broader AI principles.", regulations: ["Algorithm Charter", "AI Strategy", "Privacy Act 2020 (AI provisions)"], keyBody: "Stats NZ / DIA", lastUpdated: "2024" },
  { code: "HK", name: "Hong Kong", status: "Developing", summary: "Hong Kong is developing an AI governance framework alongside its smart city strategy, led by OGCIO.", regulations: ["Ethical AI Framework (pilot)", "Smart City Blueprint 2.0", "PCPD AI guidance"], keyBody: "OGCIO / PCPD", lastUpdated: "2024" },
  { code: "BD", name: "Bangladesh", status: "Early", summary: "Bangladesh has a National AI Strategy focused on capacity building and leveraging AI for SDGs.", regulations: ["National Strategy for AI (2019)", "Digital Security Act"], keyBody: "ICT Division", lastUpdated: "2023" },
  { code: "PK", name: "Pakistan", status: "Early", summary: "Pakistan's National AI Policy focuses on education, skills, and R&D but binding regulation is limited.", regulations: ["National AI Policy 2023", "Draft AI Ethics Framework"], keyBody: "MoIT", lastUpdated: "2023" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Advanced: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  Developing: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  Early: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  None: { bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30" },
};

const AIPolicyTracker = () => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("All");

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

  const filtered = useMemo(() => {
    if (filterStatus === "All") return COUNTRIES;
    return COUNTRIES.filter((c) => c.status === filterStatus);
  }, [filterStatus]);

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
        title="AI Policy Tracker — Asia-Pacific Regulations | AI in Asia"
        description="Track AI regulations and governance frameworks across 16 Asia-Pacific countries. Compare policy maturity, key regulations, and governing bodies."
        canonical="https://aiinasia.com/tools/ai-policy-tracker"
      />
      <Header />
      <main className="flex-1 px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <ToolBreadcrumb toolName="AI Policy Tracker" />
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-500 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
              <Shield className="h-3.5 w-3.5" /> INTERACTIVE TOOL
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-2">
              AI Policy Tracker
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Explore AI regulations and governance frameworks across Asia-Pacific.
            </p>
          </div>

          {/* Status filter */}
          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
            {["All", "Advanced", "Developing", "Early"].map((s) => (
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

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mb-6 text-xs">
            {Object.entries(STATUS_COLORS).filter(([k]) => k !== "None").map(([status, colors]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${colors.bg} border ${colors.border}`} />
                <span className="text-muted-foreground">{status}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Country list */}
            <div className="lg:col-span-1">
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 scrollbar-hide">
                {filtered.map((c) => {
                  const colors = STATUS_COLORS[c.status];
                  const isSelected = selectedCountry === c.code;
                  return (
                    <button
                      key={c.code}
                      onClick={() => setSelectedCountry(c.code)}
                      className={`w-full text-left rounded-xl p-4 transition-all duration-200 border ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500/40"
                          : "bg-card border-border hover:border-amber-500/30 hover:bg-card/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <span className="font-bold text-foreground text-sm">{c.name}</span>
                            <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                              {c.status}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "rotate-90 text-amber-500" : "text-muted-foreground"}`} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 pl-7">{c.summary}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-2">
              {selected ? (
                <div className="rounded-2xl border border-amber-500/20 bg-card p-6 animate-fade-in">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-display text-2xl font-black text-foreground">{selected.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[selected.status].bg} ${STATUS_COLORS[selected.status].text} border ${STATUS_COLORS[selected.status].border}`}>
                          {selected.status}
                        </span>
                        <span className="text-xs text-muted-foreground">Updated {selected.lastUpdated}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">Led by {selected.keyBody}</span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">{selected.summary}</p>

                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-500" /> Key Regulations & Frameworks
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
              ) : (
                <div className="rounded-2xl border border-border bg-card/50 p-10 flex flex-col items-center justify-center text-center min-h-[400px]">
                  <Shield className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground font-semibold">Select a country</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Click any country to view its AI policy landscape</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border text-center">
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
