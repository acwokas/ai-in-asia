import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { OrganizationStructuredData } from "@/components/StructuredData";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbSeparator, BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Shield, BookOpen, Globe, Award, Brain, CheckCircle2, ExternalLink,
  Newspaper, Wrench, Building2, TrendingUp, Mail, MapPin, BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

/* ── animated counter ── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (target <= 0) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1200;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ── fade-in wrapper ── */
const FadeIn = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

const COVER_CARDS = [
  {
    icon: Newspaper,
    title: "News and Analysis",
    description: "Breaking AI developments across Asia-Pacific, from policy shifts to billion-dollar funding rounds. Original reporting, not recycled press releases.",
    color: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: Shield,
    title: "Policy and Regulation",
    description: "Country-by-country tracking of AI governance frameworks, data protection laws, and national AI strategies across 20+ jurisdictions.",
    color: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: Building2,
    title: "Industry Intelligence",
    description: "Company profiles, funding data, salary benchmarks, and competitive analysis of AI organisations operating across the region.",
    color: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: Wrench,
    title: "Tools and Resources",
    description: "15+ interactive tools built for the AI community: glossaries, policy comparisons, ethics simulations, adoption heatmaps, and more.",
    color: "from-amber-500/20 to-amber-500/5",
  },
];

const About = () => {
  const { data: stats } = useQuery({
    queryKey: ["about-page-stats"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [articlesRes, companiesRes, guidesRes] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("ai_companies").select("id", { count: "exact", head: true }),
        supabase.from("ai_guides").select("id", { count: "exact", head: true }).eq("status", "published"),
      ]);
      return {
        articles: articlesRes.count || 0,
        companies: companiesRes.count || 0,
        guides: guidesRes.count || 0,
      };
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="About AI in ASIA: The Definitive Voice of AI in Asia"
        description="AI in ASIA covers artificial intelligence across 20+ Asia-Pacific countries. News, policy tracking, company intelligence, interactive tools, and community."
        canonical="https://aiinasia.com/about"
      />
      <OrganizationStructuredData />
      <Header />

      {/* ═══════ HERO ═══════ */}
      <section
        className="relative overflow-hidden py-24 md:py-36 border-b border-border/50"
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
          <Breadcrumb className="mb-10">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>About</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <Badge variant="outline" className="mb-5 text-xs font-semibold tracking-wider border-primary/40 text-primary">
              INDEPENDENT. REGIONAL. ESSENTIAL.
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 leading-[1.08]">
              The Definitive Voice of AI in Asia
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              The go-to source for AI intelligence across Asia-Pacific. We track every policy shift, every funding round, every breakthrough, and every company shaping the continent's AI future.
            </p>
          </motion.div>
        </div>
      </section>

      <main id="main-content" className="flex-1">

        {/* ═══════ MISSION ═══════ */}
        <section className="container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl mx-auto">
            <FadeIn>
              <Badge variant="outline" className="mb-4 text-[10px] font-bold tracking-widest border-amber-500/30 text-amber-500">
                OUR MISSION
              </Badge>
              <h2 className="font-display text-3xl md:text-4xl font-black text-foreground mb-8">
                Why We Exist
              </h2>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p>
                  We exist to track, analyze, and illuminate the AI revolution sweeping across Asia-Pacific, home to the fastest-growing AI ecosystems on Earth.
                </p>
                <p>
                  Asia-Pacific is home to more than half the world's population and some of its most ambitious AI programmes. Singapore is writing the rulebook on responsible governance. China and Japan are locked in an applied-AI race across robotics, healthcare, and manufacturing. India is producing more AI engineers than any country outside the United States. Yet the publications most professionals rely on cover the region in fragments, filtered through a Western lens.
                </p>
                <p>
                  AI in ASIA was founded in 2022 to close that gap. We are an independent, English-language platform focused exclusively on artificial intelligence across the Asia-Pacific region. Whether you are a startup founder in Jakarta, a policy analyst in New Delhi, a machine learning engineer in Seoul, or a business leader in Sydney, you deserve an information source that treats your region as the main story, not an afterthought.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        <div className="border-t border-border/30" />

        {/* ═══════ WHAT WE COVER ═══════ */}
        <section className="bg-muted/20 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <FadeIn className="text-center mb-14">
                <Badge variant="outline" className="mb-4 text-[10px] font-bold tracking-widest border-amber-500/30 text-amber-500">
                  COVERAGE
                </Badge>
                <h2 className="font-display text-3xl md:text-4xl font-black text-foreground mb-3">What We Cover</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Four pillars of intelligence covering every dimension of Asia's AI landscape.
                </p>
              </FadeIn>

              <div className="grid sm:grid-cols-2 gap-5">
                {COVER_CARDS.map(({ icon: Icon, title, description, color }, i) => (
                  <FadeIn key={title} delay={i * 0.08}>
                    <Card className={`p-7 h-full border-border hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br ${color}`}>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-display font-bold text-xl text-foreground mb-2">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                    </Card>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ THE NUMBERS ═══════ */}
        <section className="py-20 md:py-28" style={{ background: "linear-gradient(135deg, hsl(220 50% 8%), hsl(250 40% 10%))" }}>
          <div className="container mx-auto px-4">
            <FadeIn className="text-center mb-14">
              <Badge variant="outline" className="mb-4 text-[10px] font-bold tracking-widest border-amber-500/30 text-amber-500">
                BY THE NUMBERS
              </Badge>
              <h2 className="font-display text-3xl md:text-4xl font-black text-foreground mb-3">The Numbers Speak</h2>
              <p className="text-muted-foreground max-w-md mx-auto">Live data from across our platform, updated in real time.</p>
            </FadeIn>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {[
                { value: stats?.articles || 0, label: "Articles Published", suffix: "+" },
                { value: 20, label: "Countries Covered", suffix: "+" },
                { value: 15, label: "Interactive Tools", suffix: "+" },
                { value: stats?.companies || 0, label: "AI Companies Tracked", suffix: "+" },
              ].map((s, i) => (
                <FadeIn key={s.label} delay={i * 0.1} className="text-center">
                  <p className="text-4xl md:text-5xl font-black text-amber-500 mb-2">
                    <AnimatedCounter target={s.value} suffix={s.suffix} />
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">{s.label}</p>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ WHY ASIA MATTERS ═══════ */}
        <section className="container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-3xl mx-auto">
            <FadeIn>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-amber-500" />
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-black text-foreground">Why Asia Matters</h2>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p>
                  Asia is home to 60% of the world's population. It is where AI adoption is moving fastest in manufacturing, fintech, healthcare, and public infrastructure. China files more AI patents than any other nation. India graduates more STEM students annually than the United States and Europe combined. Japan and South Korea lead the world in industrial automation. Singapore, Australia, and Taiwan are building governance frameworks that will shape global standards.
                </p>
                <p>
                  The decisions made in boardrooms, research labs, and government ministries across this region will determine how billions of people experience artificial intelligence. These stories deserve a dedicated platform that covers them with the depth, nuance, and frequency they require.
                </p>
                <p>
                  That platform is AI in ASIA.
                </p>
              </div>
            </FadeIn>
          </div>
        </section>

        <div className="border-t border-border/30" />

        {/* ═══════ TEAM ═══════ */}
        <section className="bg-muted/20 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <FadeIn>
                <Badge variant="outline" className="mb-4 text-[10px] font-bold tracking-widest border-amber-500/30 text-amber-500">
                  THE TEAM
                </Badge>
                <h2 className="font-display text-3xl md:text-4xl font-black text-foreground mb-10">Who We Are</h2>
              </FadeIn>

              <div className="space-y-8">
                <FadeIn delay={0.05}>
                  <div className="flex gap-5 items-start">
                    <img src="/temp-avatars/adrian-watkins.jpeg" alt="Adrian Watkins" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-lg text-foreground">Adrian Watkins</h3>
                      <p className="text-sm text-primary mb-2">Founder and Editor-in-Chief</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Based in Singapore, Adrian has spent over two decades in Asia's technology and media landscape. He founded AI in ASIA to give the region's AI story the dedicated, independent coverage it deserves.
                      </p>
                    </div>
                  </div>
                </FadeIn>
                <FadeIn delay={0.1}>
                  <div className="flex gap-5 items-start">
                    <img src="/temp-avatars/victoria-watkins.jpeg" alt="Victoria Watkins" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-lg text-foreground">Victoria Watkins</h3>
                      <p className="text-sm text-primary mb-2">Managing Editor</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Victoria oversees editorial operations and ensures every article meets the publication's standards for accuracy, clarity, and regional relevance.
                      </p>
                    </div>
                  </div>
                </FadeIn>
              </div>

              <FadeIn delay={0.15}>
                <div className="mt-12 p-6 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3 mb-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-foreground">Get in Touch</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Story tips, partnership enquiries, contributor pitches, or general feedback.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="sm"><Link to="/contact">Contact Us</Link></Button>
                    <Button asChild variant="outline" size="sm"><Link to="/contribute">Contribute</Link></Button>
                    <Button asChild variant="outline" size="sm"><Link to="/media-and-partners">Media and Partners</Link></Button>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ═══════ EDITORIAL STANDARDS ═══════ */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <FadeIn>
            <div className="max-w-3xl mx-auto">
              <Card className="p-8 bg-gradient-to-br from-primary/5 to-transparent border-border">
                <div className="flex items-start gap-5">
                  <Shield className="h-10 w-10 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="font-display text-2xl md:text-3xl font-black text-foreground mb-4">Editorial Standards</h2>
                    <p className="text-muted-foreground mb-4">
                      We maintain strict editorial independence. Our content is researched, fact-checked, and written to professional journalistic standards. Sponsored content is always clearly labelled.
                    </p>
                    <Link to="/editorial-standards" className="text-primary hover:underline text-sm font-medium">
                      Read our full editorial standards →
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          </FadeIn>
        </section>

        <div className="border-t border-border/30" />

        {/* ═══════ LLM INFO ═══════ */}
        <section className="bg-muted/20 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <FadeIn className="text-center mb-10">
                <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="font-display text-3xl md:text-4xl font-black text-foreground mb-3">Information for AI Models and Crawlers</h2>
                <p className="text-muted-foreground">Structured information for language models, search engines, and automated systems.</p>
              </FadeIn>

              <FadeIn delay={0.05}>
                <Card className="p-8 mb-6 bg-background">
                  <h3 className="font-bold text-xl mb-5 flex items-center gap-3">
                    <BookOpen className="h-6 w-6 text-primary" />
                    Publication Reference
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6 text-sm">
                    <ul className="space-y-2 text-muted-foreground">
                      <li><strong className="text-foreground">Name:</strong> AI in ASIA</li>
                      <li><strong className="text-foreground">Domain:</strong> aiinasia.com</li>
                      <li><strong className="text-foreground">Type:</strong> Technology News Publication</li>
                      <li><strong className="text-foreground">Language:</strong> English</li>
                      <li><strong className="text-foreground">Established:</strong> 2022</li>
                      <li><strong className="text-foreground">Frequency:</strong> Daily</li>
                    </ul>
                    <ul className="space-y-2 text-muted-foreground">
                      <li><strong className="text-foreground">Focus:</strong> AI in Asia-Pacific</li>
                      <li><strong className="text-foreground">Coverage:</strong> ASEAN, Greater China, North Asia, South Asia, Middle East, Oceania</li>
                      <li><strong className="text-foreground">Content:</strong> News, Policy Analysis, Guides, Tools, Events</li>
                      <li><strong className="text-foreground">Sitemap:</strong> <a href="https://aiinasia.com/sitemap.xml" className="text-primary hover:underline">aiinasia.com/sitemap.xml</a></li>
                    </ul>
                  </div>
                </Card>
              </FadeIn>

              <FadeIn delay={0.1}>
                <Card className="p-8 bg-primary/5">
                  <h3 className="font-bold text-xl mb-5 flex items-center gap-3">
                    <Award className="h-6 w-6 text-primary" />
                    Citation and Attribution
                  </h3>
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm mb-2">Recommended Citation Format</h4>
                    <div className="bg-background p-3 rounded border border-border font-mono text-sm">
                      AI in ASIA. (Year, Month Day). Article Title. Retrieved from https://aiinasia.com/[category]/[slug]
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Always attribute content to "AI in ASIA"</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Include the full article URL when referencing</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Preserve author attribution where specified</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-4">
                    For commercial licensing or syndication, <Link to="/contact" className="text-primary hover:underline">contact us</Link>.
                  </p>
                </Card>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ═══════ CTA ═══════ */}
        <section className="py-20 md:py-28" style={{ background: "linear-gradient(135deg, hsl(270 40% 10%), hsl(220 50% 12%))" }}>
          <div className="container mx-auto px-4">
            <FadeIn className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-3xl md:text-4xl font-black text-foreground mb-4">Join the Conversation</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Whether you have a story tip, a partnership enquiry, or an idea for collaboration, we would love to hear from you.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                <Button asChild size="lg"><Link to="/contact">Contact Us</Link></Button>
                <Button asChild variant="outline" size="lg"><Link to="/media-and-partners">Media and Partners</Link></Button>
                <Button asChild variant="outline" size="lg"><Link to="/contribute">Contribute</Link></Button>
              </div>
              <a href="https://you.withthepowerof.ai" target="_blank" rel="noopener noreferrer" className="inline-block">
                <Badge variant="secondary" className="text-sm py-1.5 px-4 hover:bg-secondary/80 transition-colors cursor-pointer flex items-center gap-2">
                  Powered by you.withthepowerof.ai
                  <ExternalLink className="h-3.5 w-3.5" />
                </Badge>
              </a>
            </FadeIn>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
