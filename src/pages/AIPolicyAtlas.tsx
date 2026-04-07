import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ToolBreadcrumb } from "@/components/ToolBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/StarRating";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Shield, Search, X, GitCompare, ChevronDown, ChevronUp, Filter, Trophy, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { awardPoints } from "@/lib/gamification";
import { toast } from "sonner";

type Stance = "innovation-friendly" | "balanced" | "restrictive";
type Region = "East Asia" | "Southeast Asia" | "South Asia" | "Oceania";

interface Country {
  name: string;
  flag: string;
  region: Region;
  stance: Stance;
  stanceRating: number;
  keyRegulation: string;
  yearEnacted: number;
  summary: string;
  details: string;
  provisions: string[];
  businessImpact: string;
  enforcement: string;
  relatedLink: string;
}

const COUNTRIES: Country[] = [
  {
    name: "Singapore",
    flag: "🇸🇬",
    region: "Southeast Asia",
    stance: "innovation-friendly",
    stanceRating: 5,
    keyRegulation: "National AI Strategy 2.0",
    yearEnacted: 2023,
    summary: "World-leading AI governance framework prioritising innovation with responsible guardrails.",
    details: "Singapore updated its National AI Strategy in December 2023, setting out plans to build AI as a transformative force. The strategy focuses on industry adoption, talent development, and trusted AI governance through the Model AI Governance Framework.",
    provisions: [
      "Model AI Governance Framework for voluntary adoption",
      "AI Verify: open-source testing toolkit for responsible AI",
      "Sector-specific guidelines for finance and healthcare",
      "S$1B investment in AI research and capabilities",
    ],
    businessImpact: "Highly favourable for AI businesses. Sandboxes and grants available. No mandatory licensing for general AI deployment.",
    enforcement: "Primarily self-regulatory with sector-specific oversight by MAS (finance) and IMDA (infocomm).",
    relatedLink: "/category/policy",
  },
  {
    name: "Japan",
    flag: "🇯🇵",
    region: "East Asia",
    stance: "innovation-friendly",
    stanceRating: 5,
    keyRegulation: "AI Strategy 2022 / AI Guidelines",
    yearEnacted: 2022,
    summary: "Pro-innovation stance with voluntary guidelines and significant public investment in AI R&D.",
    details: "Japan has adopted a light-touch approach, favouring voluntary guidelines over binding regulation. The government launched its AI Strategy 2022 and Social Principles of Human-Centric AI to promote responsible development without stifling innovation.",
    provisions: [
      "Social Principles of Human-Centric AI (non-binding)",
      "Copyright exemption for AI training data",
      "Massive public-private investment in generative AI",
      "AI safety institute established in 2024",
    ],
    businessImpact: "Very favourable. Copyright exemptions for training data are uniquely permissive globally. Strong government support for AI startups.",
    enforcement: "No dedicated AI regulator. Sector-specific agencies handle issues as they arise.",
    relatedLink: "/category/policy",
  },
  {
    name: "South Korea",
    flag: "🇰🇷",
    region: "East Asia",
    stance: "balanced",
    stanceRating: 4,
    keyRegulation: "AI Basic Act (proposed)",
    yearEnacted: 2024,
    summary: "Pursuing comprehensive AI legislation balancing innovation support with risk-based regulation.",
    details: "South Korea is developing the AI Basic Act, which would establish a risk-based regulatory framework. The country has invested heavily in AI semiconductors and talent while introducing guardrails for high-risk AI applications.",
    provisions: [
      "Risk-based classification of AI systems",
      "$7B investment in AI semiconductors",
      "AI ethics guidelines for public sector",
      "Mandatory impact assessments for high-risk AI",
    ],
    businessImpact: "Supportive of AI development with growing regulatory clarity. Government procurement programmes create demand.",
    enforcement: "Ministry of Science and ICT leads coordination. Dedicated AI ethics committee advises on policy.",
    relatedLink: "/category/policy",
  },
  {
    name: "China",
    flag: "🇨🇳",
    region: "East Asia",
    stance: "restrictive",
    stanceRating: 2,
    keyRegulation: "Interim Measures for Generative AI",
    yearEnacted: 2023,
    summary: "Comprehensive binding regulations on AI algorithms, deepfakes, and generative AI with content controls.",
    details: "China has enacted the world's most detailed AI regulations, covering recommendation algorithms (2022), deepfakes (2023), and generative AI (2023). These require security assessments, content moderation, and algorithmic transparency.",
    provisions: [
      "Mandatory algorithmic filing and security assessments",
      "Content moderation requirements for generative AI",
      "Real-name verification for AI service users",
      "Restrictions on AI-generated content contradicting state values",
    ],
    businessImpact: "Complex compliance landscape. Foreign companies face additional scrutiny. Domestic champions benefit from state support.",
    enforcement: "Cyberspace Administration of China (CAC) actively enforces. Multiple companies fined or warned for non-compliance.",
    relatedLink: "/category/policy",
  },
  {
    name: "India",
    flag: "🇮🇳",
    region: "South Asia",
    stance: "innovation-friendly",
    stanceRating: 4,
    keyRegulation: "National Strategy for AI (NITI Aayog)",
    yearEnacted: 2018,
    summary: "Pro-innovation approach focused on AI for social good with minimal binding regulation.",
    details: "India has chosen not to regulate AI directly, instead focusing on sector-specific guidelines and promoting AI for inclusive growth. The Digital India Act (proposed) may introduce some AI provisions.",
    provisions: [
      "AI for All strategy targeting healthcare, agriculture, education",
      "Responsible AI principles (non-binding)",
      "IndiaAI Mission with $1.2B allocation",
      "Sector-specific guidance for financial services",
    ],
    businessImpact: "Highly open market for AI deployment. Growing talent pool and cost advantages attract global AI companies.",
    enforcement: "No dedicated AI regulation or regulator. IT Act provisions apply to harmful content.",
    relatedLink: "/category/policy",
  },
  {
    name: "Indonesia",
    flag: "🇮🇩",
    region: "Southeast Asia",
    stance: "balanced",
    stanceRating: 3,
    keyRegulation: "National AI Strategy (Stranas KA)",
    yearEnacted: 2020,
    summary: "Developing AI governance alongside digital economy growth with ethics-first framing.",
    details: "Indonesia launched its National AI Strategy in 2020, focusing on ethics, data governance, and talent. The country is developing AI ethics guidelines while balancing rapid digital economy growth.",
    provisions: [
      "National AI Ethics Guidelines",
      "Data sovereignty requirements under PDP Law",
      "AI talent development programmes",
      "Focus on AI for government services",
    ],
    businessImpact: "Growing market with emerging regulatory clarity. Data localisation requirements add compliance costs.",
    enforcement: "Ministry of Communication and Informatics oversees digital policy. AI-specific enforcement is still developing.",
    relatedLink: "/category/policy",
  },
  {
    name: "Thailand",
    flag: "🇹🇭",
    region: "Southeast Asia",
    stance: "balanced",
    stanceRating: 3,
    keyRegulation: "Thailand AI Ethics Guidelines",
    yearEnacted: 2021,
    summary: "Voluntary AI ethics framework with growing focus on responsible development.",
    details: "Thailand released AI ethics guidelines in 2021 and is developing its National AI Strategy. The approach balances supporting digital transformation with establishing ethical guardrails.",
    provisions: [
      "AI ethics guidelines for developers and deployers",
      "Thailand 4.0 digital economy strategy",
      "Data protection under PDPA (2022)",
      "AI sandbox initiatives in fintech",
    ],
    businessImpact: "Welcoming environment for AI investment. BOI incentives available for AI companies. PDPA compliance required.",
    enforcement: "Largely voluntary compliance. PDPC enforces data protection aspects relevant to AI.",
    relatedLink: "/category/policy",
  },
  {
    name: "Vietnam",
    flag: "🇻🇳",
    region: "Southeast Asia",
    stance: "balanced",
    stanceRating: 3,
    keyRegulation: "National AI Strategy to 2030",
    yearEnacted: 2021,
    summary: "Ambitious AI development targets with focus on building domestic AI capabilities.",
    details: "Vietnam approved its National Strategy on AI Research, Development, and Application through 2030. The strategy targets making Vietnam a leading AI innovation hub in ASEAN.",
    provisions: [
      "Goal to be top-4 ASEAN in AI by 2030",
      "AI R&D centres and training programmes",
      "Cybersecurity law applies to AI data",
      "E-government AI integration targets",
    ],
    businessImpact: "Rapidly growing tech ecosystem. Low-cost talent attracts AI outsourcing and development centres.",
    enforcement: "Ministry of Science and Technology leads AI policy. Enforcement mechanisms still maturing.",
    relatedLink: "/category/policy",
  },
  {
    name: "Philippines",
    flag: "🇵🇭",
    region: "Southeast Asia",
    stance: "balanced",
    stanceRating: 3,
    keyRegulation: "National AI Roadmap",
    yearEnacted: 2021,
    summary: "Emerging AI framework focused on inclusive development and BPO industry transformation.",
    details: "The Philippines launched its National AI Roadmap to guide development while protecting its massive BPO workforce from displacement. Focus areas include government services and agriculture.",
    provisions: [
      "AI development roadmap for key sectors",
      "Data Privacy Act applies to AI systems",
      "Focus on AI upskilling for BPO workers",
      "Centre for AI Research established",
    ],
    businessImpact: "Open market for AI. Concern about BPO job displacement drives policy discussions. Strong English-speaking talent base.",
    enforcement: "National Privacy Commission handles data aspects. No dedicated AI regulatory body yet.",
    relatedLink: "/category/policy",
  },
  {
    name: "Malaysia",
    flag: "🇲🇾",
    region: "Southeast Asia",
    stance: "innovation-friendly",
    stanceRating: 4,
    keyRegulation: "National AI Roadmap (AI-Rmap)",
    yearEnacted: 2022,
    summary: "Strategic AI roadmap targeting economic transformation with strong government support.",
    details: "Malaysia's AI-Rmap outlines a comprehensive strategy for AI adoption across government and industry, backed by significant infrastructure investments including major data centre developments.",
    provisions: [
      "AI-Rmap with sector-specific implementation plans",
      "MDEC AI ecosystem development",
      "Data centre investment boom (2024-2025)",
      "AI ethics principles (voluntary)",
    ],
    businessImpact: "Very attractive for AI investment. Major tech companies establishing data centres. Tax incentives for digital economy.",
    enforcement: "MDEC coordinates AI development. Light regulatory touch with focus on enabling growth.",
    relatedLink: "/category/policy",
  },
  {
    name: "Taiwan",
    flag: "🇹🇼",
    region: "East Asia",
    stance: "innovation-friendly",
    stanceRating: 4,
    keyRegulation: "Taiwan AI Action Plan 2.0",
    yearEnacted: 2023,
    summary: "Leveraging semiconductor dominance to become an AI powerhouse with targeted policy support.",
    details: "Taiwan's AI policy builds on its semiconductor leadership, with the AI Action Plan 2.0 focusing on generative AI applications, talent cultivation, and integration with its world-leading chip manufacturing ecosystem.",
    provisions: [
      "AI Action Plan 2.0 with focus on generative AI",
      "NT$10B AI research investment",
      "Integration with semiconductor industry strategy",
      "AI basic law under discussion",
    ],
    businessImpact: "Strategic position in global AI supply chain via TSMC. Government support for AI chip development and applications.",
    enforcement: "No dedicated AI regulation. Existing laws on data protection and IP apply.",
    relatedLink: "/category/policy",
  },
  {
    name: "Australia",
    flag: "🇦🇺",
    region: "Oceania",
    stance: "balanced",
    stanceRating: 3,
    keyRegulation: "Voluntary AI Safety Standard",
    yearEnacted: 2024,
    summary: "Developing mandatory guardrails for high-risk AI while supporting responsible innovation.",
    details: "Australia released its Voluntary AI Safety Standard in 2024 and is consulting on mandatory guardrails for high-risk AI. The approach aims to align with international frameworks while addressing domestic concerns.",
    provisions: [
      "Voluntary AI Safety Standard (10 guardrails)",
      "Consultation on mandatory high-risk AI rules",
      "Responsible AI Network established",
      "AI ethics framework for government procurement",
    ],
    businessImpact: "Currently voluntary regime moving toward mandatory requirements for high-risk AI. Well-established tech ecosystem.",
    enforcement: "eSafety Commissioner handles online safety aspects. ACCC addresses consumer protection issues related to AI.",
    relatedLink: "/category/policy",
  },
  {
    name: "New Zealand",
    flag: "🇳🇿",
    region: "Oceania",
    stance: "balanced",
    stanceRating: 3,
    keyRegulation: "Algorithm Charter for Aotearoa NZ",
    yearEnacted: 2020,
    summary: "Pioneering algorithmic transparency in government with a principles-based approach.",
    details: "New Zealand's Algorithm Charter requires government agencies to be transparent about their use of algorithms in decision-making. The approach focuses on public sector accountability and indigenous data sovereignty.",
    provisions: [
      "Algorithm Charter for government agencies",
      "Transparency requirements for public sector AI",
      "Te Mana Raraunga (Maori data sovereignty)",
      "Privacy Act 2020 applies to AI systems",
    ],
    businessImpact: "Small but well-regulated market. Government transparency requirements set high bar for public sector AI vendors.",
    enforcement: "Stats NZ and Privacy Commissioner oversee aspects of AI governance. Voluntary compliance for private sector.",
    relatedLink: "/category/policy",
  },
  {
    name: "Bangladesh",
    flag: "🇧🇩",
    region: "South Asia",
    stance: "innovation-friendly",
    stanceRating: 3,
    keyRegulation: "National AI Strategy",
    yearEnacted: 2019,
    summary: "Early-stage AI strategy focused on digital inclusion and leapfrogging development challenges.",
    details: "Bangladesh adopted its National Strategy for AI in 2019 as part of the Digital Bangladesh vision. The focus is on using AI to address development challenges in healthcare, agriculture, and education.",
    provisions: [
      "AI for social development priorities",
      "Smart Bangladesh Vision 2041",
      "ICT Division leads AI coordination",
      "Focus on AI literacy and awareness",
    ],
    businessImpact: "Emerging market with growing developer community. Limited AI-specific regulation creates open environment.",
    enforcement: "Minimal AI-specific enforcement. ICT Act provisions apply broadly to digital services.",
    relatedLink: "/category/policy",
  },
  {
    name: "Pakistan",
    flag: "🇵🇰",
    region: "South Asia",
    stance: "balanced",
    stanceRating: 2,
    keyRegulation: "National AI Policy (draft)",
    yearEnacted: 2023,
    summary: "Developing comprehensive AI policy framework to guide adoption and governance.",
    details: "Pakistan is in the process of developing its National AI Policy, with draft guidelines released in 2023. The policy aims to balance AI innovation with governance, focusing on talent development and ethical AI use.",
    provisions: [
      "Draft National AI Policy framework",
      "Presidential Initiative for AI and Computing (PIAIC)",
      "Focus on AI education and skills",
      "Data protection bill under consideration",
    ],
    businessImpact: "Large talent pool with growing AI ecosystem. Regulatory framework still developing, creating some uncertainty.",
    enforcement: "No dedicated AI regulator. Ministry of IT and Telecom coordinates policy development.",
    relatedLink: "/category/policy",
  },
];

const STANCE_COLORS: Record<Stance, string> = {
  "innovation-friendly": "hsl(142 71% 45%)",
  balanced: "hsl(38 92% 50%)",
  restrictive: "hsl(0 84% 60%)",
};

const STANCE_BG: Record<Stance, string> = {
  "innovation-friendly": "bg-green-500/10 border-green-500/30",
  balanced: "bg-amber-500/10 border-amber-500/30",
  restrictive: "bg-red-500/10 border-red-500/30",
};

const STANCE_BADGE: Record<Stance, string> = {
  "innovation-friendly": "bg-green-500/20 text-green-400",
  balanced: "bg-amber-500/20 text-amber-400",
  restrictive: "bg-red-500/20 text-red-400",
};

const REGIONS: Region[] = ["East Asia", "Southeast Asia", "South Asia", "Oceania"];
const STANCES: Stance[] = ["innovation-friendly", "balanced", "restrictive"];

const AIPolicyAtlas = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState<Region | "all">("all");
  const [stanceFilter, setStanceFilter] = useState<Stance | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [explored, setExplored] = useState<Set<string>>(new Set());
  const [pointsAwarded, setPointsAwarded] = useState(false);

  const filtered = useMemo(() => {
    return COUNTRIES.filter((c) => {
      if (regionFilter !== "all" && c.region !== regionFilter) return false;
      if (stanceFilter !== "all" && c.stance !== stanceFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, regionFilter, stanceFilter]);

  const handleExpand = useCallback((name: string) => {
    if (compareMode) {
      setSelected((prev) =>
        prev.includes(name) ? prev.filter((n) => n !== name) : prev.length < 3 ? [...prev, name] : prev
      );
    } else {
      setExpanded((prev) => (prev === name ? null : name));
      setExplored((prev) => new Set(prev).add(name));
    }
  }, [compareMode]);

  useEffect(() => {
    if (explored.size >= 5 && !pointsAwarded && user) {
      setPointsAwarded(true);
      awardPoints(user.id, 15, "Policy Atlas Explorer");
    }
  }, [explored.size, pointsAwarded, user]);

  const comparedCountries = COUNTRIES.filter((c) => selected.includes(c.name));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="AI Policy Atlas | AI Regulations Across Asia"
        description="Interactive directory of AI regulations and policies across 15+ Asian countries. Compare policy stances, key regulations, and business impact."
        canonical="https://aiinasia.com/tools/policy-atlas"
      />
      <Header />
      <main className="flex-1 px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <ToolBreadcrumb toolName="AI Policy Atlas" />

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <Shield className="h-8 w-8 text-amber-500" />
              <h1 className="font-display text-3xl md:text-4xl font-black text-foreground">
                AI Policy Atlas
              </h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore AI regulations and governance frameworks across 15+ Asian countries. Compare policy stances, discover key provisions, and understand business impact.
            </p>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STANCE_COLORS["innovation-friendly"] }} />
                Innovation-friendly
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STANCE_COLORS.balanced }} />
                Balanced
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STANCE_COLORS.restrictive }} />
                Restrictive
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value as Region | "all")}
                className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Regions</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                value={stanceFilter}
                onChange={(e) => setStanceFilter(e.target.value as Stance | "all")}
                className="bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground capitalize"
              >
                <option value="all">All Stances</option>
                {STANCES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s.replace("-", " ")}</option>
                ))}
              </select>
            </div>
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={() => { setCompareMode(!compareMode); setSelected([]); }}
              className="ml-auto"
            >
              <GitCompare className="h-4 w-4 mr-1" />
              {compareMode ? "Exit Compare" : "Compare"}
            </Button>
          </div>

          {compareMode && (
            <p className="text-sm text-muted-foreground mb-4">
              Select up to 3 countries to compare side-by-side. <span className="text-amber-500 font-medium">{selected.length}/3 selected</span>
            </p>
          )}

          {/* Country Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filtered.map((country) => {
              const isExpanded = expanded === country.name && !compareMode;
              const isSelected = selected.includes(country.name);
              return (
                <motion.div
                  key={country.name}
                  layout
                  className={isExpanded ? "sm:col-span-2 lg:col-span-3" : ""}
                >
                  <Card
                    className={`cursor-pointer transition-all duration-200 border ${STANCE_BG[country.stance]} ${
                      isSelected ? "ring-2 ring-amber-500" : ""
                    } hover:shadow-lg hover:shadow-amber-500/5`}
                    onClick={() => handleExpand(country.name)}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{country.flag}</span>
                          <div>
                            <h2 className="font-display font-bold text-foreground text-lg">{country.name}</h2>
                            <span className="text-xs text-muted-foreground">{country.region}</span>
                          </div>
                        </div>
                        <Badge className={`${STANCE_BADGE[country.stance]} text-[10px] font-bold capitalize border-0`}>
                          {country.stance.replace("-", " ")}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <StarRating rating={country.stanceRating} size={14} />
                        <span className="text-xs text-muted-foreground">Innovation openness</span>
                      </div>

                      <div className="mb-2">
                        <span className="text-xs font-semibold text-amber-500">{country.keyRegulation}</span>
                        <span className="text-xs text-muted-foreground ml-2">({country.yearEnacted})</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{country.summary}</p>

                      <div className="flex items-center justify-end mt-3 text-muted-foreground">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 border-t border-border/50 pt-4 space-y-4">
                            <div>
                              <h3 className="text-sm font-bold text-foreground mb-1">Overview</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed">{country.details}</p>
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground mb-2">Key Provisions</h3>
                              <ul className="space-y-1">
                                {country.provisions.map((p, i) => (
                                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-amber-500 mt-1">•</span> {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground mb-1">Business Impact</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed">{country.businessImpact}</p>
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-foreground mb-1">Enforcement</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed">{country.enforcement}</p>
                            </div>
                            <a
                              href={country.relatedLink}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors font-medium"
                            >
                              Related articles <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No countries match your filters.</p>
          )}

          {/* Comparison Table */}
          <AnimatePresence>
            {compareMode && comparedCountries.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mb-8"
              >
                <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <GitCompare className="h-5 w-5 text-amber-500" />
                  Side-by-Side Comparison
                </h2>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Dimension</TableHead>
                        {comparedCountries.map((c) => (
                          <TableHead key={c.name}>
                            <span className="flex items-center gap-2">
                              {c.flag} {c.name}
                              <button onClick={() => setSelected(selected.filter((n) => n !== c.name))}>
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Policy Stance</TableCell>
                        {comparedCountries.map((c) => (
                          <TableCell key={c.name}>
                            <Badge className={`${STANCE_BADGE[c.stance]} capitalize border-0 text-[10px]`}>
                              {c.stance.replace("-", " ")}
                            </Badge>
                          </TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Innovation Rating</TableCell>
                        {comparedCountries.map((c) => (
                          <TableCell key={c.name}><StarRating rating={c.stanceRating} size={14} /></TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Key Regulation</TableCell>
                        {comparedCountries.map((c) => (
                          <TableCell key={c.name} className="text-sm">{c.keyRegulation} ({c.yearEnacted})</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Business Impact</TableCell>
                        {comparedCountries.map((c) => (
                          <TableCell key={c.name} className="text-sm text-muted-foreground">{c.businessImpact}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Enforcement</TableCell>
                        {comparedCountries.map((c) => (
                          <TableCell key={c.name} className="text-sm text-muted-foreground">{c.enforcement}</TableCell>
                        ))}
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Key Provisions</TableCell>
                        {comparedCountries.map((c) => (
                          <TableCell key={c.name}>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {c.provisions.map((p, i) => (
                                <li key={i}>• {p}</li>
                              ))}
                            </ul>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Points badge */}
          {pointsAwarded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed bottom-6 right-6 bg-card border border-amber-500/30 rounded-xl p-4 shadow-2xl flex items-center gap-3 z-50"
            >
              <Trophy className="h-6 w-6 text-amber-500" />
              <div>
                <p className="text-sm font-bold text-foreground">+15 Points</p>
                <p className="text-xs text-muted-foreground">Policy Atlas Explorer</p>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AIPolicyAtlas;
