import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Search, Mail, FileText, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useDebounce } from "@/hooks/useDebounce";

interface Contributor {
  name: string;
  initials: string;
  role: string;
  org: string;
  bio: string;
  country: string;
  flag: string;
  articles: number;
  tags: string[];
  featured?: boolean;
  slug: string;
}

const CONTRIBUTORS: Contributor[] = [
  { name: "Dr. Wei Lin Chen", initials: "WC", role: "AI Research Director", org: "National University of Singapore", bio: "Leading research on responsible AI governance and multilingual NLP systems for Southeast Asian languages.", country: "Singapore", flag: "🇸🇬", articles: 14, tags: ["NLP", "Governance", "Research"], featured: true, slug: "wei-lin-chen" },
  { name: "Priya Sharma", initials: "PS", role: "Chief AI Officer", org: "Tata Consultancy Services", bio: "Driving enterprise AI adoption across India's largest IT services firm with a focus on scalable automation.", country: "India", flag: "🇮🇳", articles: 11, tags: ["Enterprise AI", "Automation", "Strategy"], featured: true, slug: "priya-sharma" },
  { name: "Takeshi Yamamoto", initials: "TY", role: "Robotics Engineer", org: "Toyota Research Institute", bio: "Building next-generation industrial robotics powered by reinforcement learning and computer vision.", country: "Japan", flag: "🇯🇵", articles: 9, tags: ["Robotics", "Computer Vision", "Manufacturing"], featured: true, slug: "takeshi-yamamoto" },
  { name: "Sarah Tan", initials: "ST", role: "AI Policy Analyst", org: "Asia Internet Coalition", bio: "Tracking AI regulation across ASEAN and advising governments on balanced innovation frameworks.", country: "Singapore", flag: "🇸🇬", articles: 8, tags: ["Policy", "Regulation", "ASEAN"], slug: "sarah-tan" },
  { name: "Park Joon-Ho", initials: "PJ", role: "ML Engineer", org: "NAVER Corporation", bio: "Working on large language models for Korean and cross-lingual understanding at scale.", country: "South Korea", flag: "🇰🇷", articles: 7, tags: ["NLP", "LLMs", "Search"], slug: "park-joon-ho" },
  { name: "Aisha Rahman", initials: "AR", role: "Founder and CEO", org: "DataSense AI", bio: "Building AI-powered fintech solutions for underbanked communities across Southeast Asia.", country: "Malaysia", flag: "🇲🇾", articles: 6, tags: ["Fintech", "Startups", "Inclusion"], slug: "aisha-rahman" },
  { name: "Dr. Amit Patel", initials: "AP", role: "Professor of CS", org: "Indian Institute of Technology Bombay", bio: "Researching computer vision applications for agriculture and healthcare in rural India.", country: "India", flag: "🇮🇳", articles: 5, tags: ["Computer Vision", "Healthcare", "Agriculture"], slug: "amit-patel" },
  { name: "Lina Nguyen", initials: "LN", role: "Data Science Lead", org: "VNG Corporation", bio: "Leading AI initiatives in Vietnam's largest tech company, focused on recommendation systems.", country: "Vietnam", flag: "🇻🇳", articles: 5, tags: ["Data Science", "Recommendations", "E-commerce"], slug: "lina-nguyen" },
  { name: "Chen Xiaoming", initials: "CX", role: "AI Ethics Researcher", org: "Tsinghua University", bio: "Publishing on fairness, accountability, and transparency in Chinese AI systems.", country: "China", flag: "🇨🇳", articles: 7, tags: ["Ethics", "Research", "Fairness"], slug: "chen-xiaoming" },
  { name: "Riza Santos", initials: "RS", role: "CTO", org: "Kumu.ph", bio: "Building AI-powered social platforms and exploring generative AI for Filipino content creation.", country: "Philippines", flag: "🇵🇭", articles: 4, tags: ["Social Media", "Generative AI", "Startups"], slug: "riza-santos" },
  { name: "Yuki Tanaka", initials: "YT", role: "AI Product Manager", org: "Rakuten", bio: "Shipping AI-driven personalization features to hundreds of millions of e-commerce users.", country: "Japan", flag: "🇯🇵", articles: 6, tags: ["Product", "E-commerce", "Personalization"], slug: "yuki-tanaka" },
  { name: "Anwar Hossain", initials: "AH", role: "ML Researcher", org: "BRAC University", bio: "Developing NLP tools for Bangla language processing and low-resource machine translation.", country: "Bangladesh", flag: "🇧🇩", articles: 3, tags: ["NLP", "Low-Resource", "Research"], slug: "anwar-hossain" },
  { name: "Sophie Chang", initials: "SC", role: "AI Strategy Consultant", org: "McKinsey Greater China", bio: "Advising C-suite leaders across Greater China on AI transformation and organizational readiness.", country: "Taiwan", flag: "🇹🇼", articles: 5, tags: ["Strategy", "Consulting", "Enterprise AI"], slug: "sophie-chang" },
  { name: "Arjun Nair", initials: "AN", role: "Founder", org: "HealthAI Labs", bio: "Using deep learning for early disease detection in partnership with hospitals across South India.", country: "India", flag: "🇮🇳", articles: 4, tags: ["Healthcare", "Deep Learning", "Startups"], slug: "arjun-nair" },
  { name: "Maya Puspitasari", initials: "MP", role: "Government AI Advisor", org: "Ministry of Communication, Indonesia", bio: "Shaping Indonesia's national AI strategy and digital literacy programmes.", country: "Indonesia", flag: "🇮🇩", articles: 6, tags: ["Policy", "Government", "Digital Literacy"], slug: "maya-puspitasari" },
  { name: "James Lau", initials: "JL", role: "VC Partner", org: "Sequoia Capital Southeast Asia", bio: "Investing in early-stage AI startups across ASEAN with a focus on applied AI and infrastructure.", country: "Hong Kong", flag: "🇭🇰", articles: 4, tags: ["Venture Capital", "Startups", "Investment"], slug: "james-lau" },
  { name: "Dr. Fatima Khan", initials: "FK", role: "AI Researcher", org: "LUMS Lahore", bio: "Working on Urdu NLP, speech recognition, and making AI accessible in local languages.", country: "Pakistan", flag: "🇵🇰", articles: 3, tags: ["NLP", "Speech", "Accessibility"], slug: "fatima-khan" },
  { name: "Tom Henderson", initials: "TH", role: "AI Correspondent", org: "Independent", bio: "Covering the intersection of AI regulation and trade policy across the Asia-Pacific region.", country: "Australia", flag: "🇦🇺", articles: 8, tags: ["Policy", "Trade", "Journalism"], slug: "tom-henderson" },
];

const ALL_TAGS = [...new Set(CONTRIBUTORS.flatMap((c) => c.tags))].sort();
const ALL_COUNTRIES = [...new Set(CONTRIBUTORS.map((c) => c.country))].sort();

const FadeIn = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.45, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

const ContributorCard = ({ c, large = false }: { c: Contributor; large?: boolean }) => (
  <Link to={`/category/voices`} className="group block h-full">
    <Card className={`${large ? "p-7" : "p-5"} h-full border-border hover:border-primary/40 hover:-translate-y-1 transition-all duration-300`}>
      <div className="flex items-start gap-4">
        <div className={`${large ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm"} rounded-full bg-amber-500/15 text-amber-500 font-bold flex items-center justify-center shrink-0`}>
          {c.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className={`${large ? "text-lg" : "text-base"} font-bold text-foreground group-hover:text-primary transition-colors truncate`}>
              {c.name}
            </h3>
            <span className="text-sm shrink-0">{c.flag}</span>
          </div>
          <p className="text-xs text-primary font-medium mb-2 truncate">{c.role}, {c.org}</p>
          <p className={`text-sm text-muted-foreground leading-relaxed ${large ? "" : "line-clamp-2"} mb-3`}>{c.bio}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">
              <FileText className="h-2.5 w-2.5 mr-0.5" />
              {c.articles} articles
            </Badge>
            {c.tags.slice(0, large ? 4 : 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  </Link>
);

const Voices = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [tagFilter, setTagFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");

  const featured = CONTRIBUTORS.filter((c) => c.featured);

  const filtered = useMemo(() => {
    return CONTRIBUTORS.filter((c) => {
      if (c.featured && tagFilter === "all" && countryFilter === "all" && !debouncedSearch) return true;
      if (tagFilter !== "all" && !c.tags.includes(tagFilter)) return false;
      if (countryFilter !== "all" && c.country !== countryFilter) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.org.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [debouncedSearch, tagFilter, countryFilter]);

  const nonFeatured = filtered.filter((c) => !c.featured || tagFilter !== "all" || countryFilter !== "all" || debouncedSearch);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Voices of AI in Asia | Contributors and Thought Leaders"
        description="Perspectives from the leaders, builders, and thinkers shaping Asia's AI future. Read expert analysis from contributors across 15+ countries."
        canonical="https://aiinasia.com/voices"
      />
      <Header />

      {/* Hero */}
      <section
        className="relative overflow-hidden py-20 md:py-28 border-b border-border/50"
        style={{ background: "linear-gradient(160deg, hsl(270 40% 8%), hsl(220 50% 10%), hsl(200 40% 8%))" }}
      >
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.35) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <Breadcrumb className="mb-8">
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Voices</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
            <Badge variant="outline" className="mb-5 text-xs font-semibold tracking-wider border-primary/40 text-primary">
              THOUGHT LEADERSHIP
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-4 leading-[1.08]">
              Voices of AI in Asia
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Perspectives from the leaders, builders, and thinkers shaping Asia's AI future. {CONTRIBUTORS.length} contributors from {ALL_COUNTRIES.length} countries and territories.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1">
        {/* Featured Voices */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <FadeIn>
            <h2 className="font-display text-2xl md:text-3xl font-black text-foreground mb-8">Featured Voices</h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5">
            {featured.map((c, i) => (
              <FadeIn key={c.slug} delay={i * 0.08}>
                <ContributorCard c={c} large />
              </FadeIn>
            ))}
          </div>
        </section>

        <div className="border-t border-border/30" />

        {/* All Contributors */}
        <section className="bg-muted/20 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <FadeIn>
              <h2 className="font-display text-2xl md:text-3xl font-black text-foreground mb-6">All Contributors</h2>
            </FadeIn>

            {/* Filters */}
            <FadeIn delay={0.05}>
              <div className="flex flex-wrap gap-2 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search contributors..."
                    className="pl-10"
                  />
                </div>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground"
                >
                  <option value="all">All Expertise</option>
                  {ALL_TAGS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground"
                >
                  <option value="all">All Countries</option>
                  {ALL_COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </FadeIn>

            <p className="text-xs text-muted-foreground mb-4">Showing {nonFeatured.length} contributors</p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nonFeatured.map((c, i) => (
                <FadeIn key={c.slug} delay={Math.min(i * 0.04, 0.3)}>
                  <ContributorCard c={c} />
                </FadeIn>
              ))}
            </div>

            {nonFeatured.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                No contributors match your filters. Try adjusting your search.
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20" style={{ background: "linear-gradient(135deg, hsl(270 40% 10%), hsl(220 50% 12%))" }}>
          <div className="container mx-auto px-4">
            <FadeIn className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-3xl md:text-4xl font-black text-foreground mb-4">Become a Contributor</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Share your perspective with Asia's AI community. We welcome original analysis, opinion, and research from practitioners, academics, and industry leaders across the region.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a href="mailto:voices@aiinasia.com">
                  <Button size="lg" className="gap-2">
                    <Mail className="h-4 w-4" />
                    voices@aiinasia.com
                  </Button>
                </a>
                <Button asChild variant="outline" size="lg">
                  <Link to="/contribute">Contributor Guidelines</Link>
                </Button>
              </div>
            </FadeIn>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Voices;
