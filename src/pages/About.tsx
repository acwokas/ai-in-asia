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
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Shield,
  BookOpen,
  Globe,
  Award,
  Brain,
  CheckCircle2,
  ExternalLink,
  Newspaper,
  Briefcase,
  Heart,
  GraduationCap,
  Palette,
  MessageSquare,
  MapPin,
  Wrench,
  Building2,
  FileText,
  Target,
  Eye,
  Lightbulb,
  Users,
} from "lucide-react";

const CATEGORIES = [
  { name: "News", slug: "news", icon: Newspaper, description: "Breaking developments and daily coverage of AI across the Asia-Pacific region." },
  { name: "Business", slug: "business", icon: Briefcase, description: "Enterprise adoption, investment trends, and the commercial impact of AI across industries." },
  { name: "Life", slug: "life", icon: Heart, description: "How AI is reshaping healthcare, education, culture, and daily life for billions." },
  { name: "Learn", slug: "learn", icon: GraduationCap, description: "Practical tutorials, skill-building guides, and explanations for every experience level." },
  { name: "Create", slug: "create", icon: Palette, description: "Tools, prompts, and techniques for building with AI today." },
  { name: "Voices", slug: "voices", icon: MessageSquare, description: "Opinion, analysis, and guest perspectives from practitioners across the region." },
];

const COVERAGE_REGIONS = [
  { region: "Southeast Asia", countries: "Singapore, Indonesia, Thailand, Vietnam, Philippines, Malaysia, Myanmar, Cambodia, Laos", flag: "🌏" },
  { region: "East Asia", countries: "Japan, South Korea, Taiwan, Hong Kong, Mainland China", flag: "🌏" },
  { region: "South Asia", countries: "India, Bangladesh, Sri Lanka, Pakistan", flag: "🌍" },
  { region: "Oceania and Middle East", countries: "Australia, New Zealand, UAE, Saudi Arabia", flag: "🌐" },
];

const APPROACH_ITEMS = [
  { icon: Eye, title: "Ground-Level Reporting", text: "We track regulatory frameworks, interview founders, and follow research labs across the region. No rewriting press releases, no aggregating wire copy." },
  { icon: Target, title: "Regional Specificity", text: "Each country has its own AI trajectory. We cover them individually, from Singapore's governance model to India's scale-first approach to Japan's industrial automation leadership." },
  { icon: Lightbulb, title: "Practical Intelligence", text: "Beyond headlines, we build interactive tools, publish step-by-step guides, and maintain a living directory of AI companies so professionals can act on what they read." },
  { icon: Users, title: "Community First", text: "Readers earn points, unlock achievements, and contribute to discussions. Our platform is designed for participation, not passive consumption." },
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
        title="About AI in ASIA: Asia's Definitive AI Intelligence Platform"
        description="AI in ASIA covers artificial intelligence across 20+ Asia-Pacific countries. Hundreds of articles, interactive tools, company profiles, daily briefings, and community engagement."
        canonical="https://aiinasia.com/about"
      />
      <OrganizationStructuredData />

      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28 border-b border-border/50" style={{ background: 'linear-gradient(160deg, hsl(270 40% 8%), hsl(220 50% 10%), hsl(200 40% 8%))' }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="container mx-auto px-4 relative z-10">
          <Breadcrumb className="mb-8">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>About</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-4 text-xs font-semibold tracking-wider border-primary/40 text-primary">INDEPENDENT. REGIONAL. ESSENTIAL.</Badge>
            <h1 className="headline text-4xl md:text-5xl lg:text-6xl mb-6 leading-[1.1]">Asia's Definitive AI Intelligence Platform</h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              Covering the entire continent's AI ecosystem, from government policy and academic research to startup innovation and enterprise deployment. This is where the future is being built, and we document every dimension of it.
            </p>
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-3xl">
            {[
              { value: stats?.articles || 0, label: "Articles Published", suffix: "+" },
              { value: 20, label: "Countries Covered", suffix: "+" },
              { value: stats?.companies || 0, label: "AI Companies Tracked", suffix: "+" },
              { value: stats?.guides || 0, label: "Guides and Tutorials", suffix: "+" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl md:text-3xl font-bold text-[#F28C0F]">{s.value.toLocaleString()}{s.suffix}</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main id="main-content" className="flex-1">
        {/* Mission */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="headline text-3xl md:text-4xl mb-8">Our Mission</h2>
            <div className="space-y-5 text-lg text-muted-foreground leading-relaxed">
              <p>
                Asia-Pacific is home to more than half the world's population and some of its most ambitious AI programmes. Singapore is writing the rulebook on responsible governance. China and Japan are locked in an applied-AI race across robotics, healthcare, and manufacturing. India is producing more AI engineers than any country outside the United States. Yet the publications most professionals rely on cover the region in fragments, filtered through a Western lens.
              </p>
              <p>
                AI in ASIA was founded in 2022 to close that gap. We are an independent, English-language platform focused exclusively on artificial intelligence across the Asia-Pacific region. Our coverage spans policy, business, research, and practical application, written for the professionals, policymakers, and builders who need regional intelligence they cannot find elsewhere.
              </p>
              <p>
                Our goal is simple: to democratise AI knowledge across Asia. Whether you are a startup founder in Jakarta, a policy analyst in New Delhi, a machine learning engineer in Seoul, or a business leader in Sydney, you deserve an information source that treats your region as the main story, not an afterthought.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-border/30" />

        {/* What We Cover: categories */}
        <section className="bg-muted/20 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="headline text-3xl md:text-4xl mb-3">What We Cover</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">Six editorial pillars covering every dimension of the AI landscape, from breaking news to hands-on creation.</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {CATEGORIES.map(({ name, slug, icon: Icon, description }) => (
                  <Link key={slug} to={`/category/${slug}`} className="group">
                    <Card className="p-6 h-full hover:shadow-lg transition-all hover:-translate-y-0.5 border-border hover:border-primary/40">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                        </div>
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Coverage Map */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
              <h2 className="headline text-3xl md:text-4xl">Where We Cover</h2>
            </div>
            <p className="text-muted-foreground mb-10 text-lg max-w-2xl">
              We track AI developments across 20+ countries and territories spanning four major subregions. Each country's AI journey is distinct, and we cover them on their own terms.
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              {COVERAGE_REGIONS.map(({ region, countries, flag }) => (
                <Card key={region} className="p-6 border-border hover:border-primary/30 transition-colors">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <span>{flag}</span> {region}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{countries}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-border/30" />

        {/* Our Approach */}
        <section className="bg-muted/20 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="headline text-3xl md:text-4xl mb-3">Our Approach</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  We do not aggregate wire copy or rewrite press releases. Everything we publish is built on original reporting, structured data, and regional expertise.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                {APPROACH_ITEMS.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex gap-4">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base mb-1.5">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What we deliver */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="headline text-3xl md:text-4xl mb-10 text-center">What We Deliver</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Newspaper, title: "Daily Briefings", text: "3 Before 9 lands in your inbox every morning with the three stories you need before the working day begins.", link: "/3-before-9" },
                { icon: FileText, title: "Deep Analysis", text: "Long-form articles on policy shifts, industry trends, and technology breakthroughs across every APAC market.", link: "/articles" },
                { icon: Wrench, title: "Interactive Tools", text: "15+ free tools including salary comparisons, ethics simulations, adoption heatmaps, and company radar charts.", link: "/tools" },
                { icon: Building2, title: "Company Directory", text: "A searchable database of AI organisations operating across the region, from startups to enterprise labs.", link: "/directory" },
                { icon: Globe, title: "Policy Atlas", text: "Country-by-country tracking of AI regulation, governance frameworks, and national strategies.", link: "/ai-policy-atlas" },
                { icon: BookOpen, title: "Guides Library", text: "Step-by-step tutorials and learning resources for professionals at every stage of their AI journey.", link: "/guides" },
              ].map((item) => (
                <Link key={item.title} to={item.link} className="group">
                  <Card className="p-5 h-full border-border hover:border-primary/40 hover:-translate-y-0.5 transition-all">
                    <item.icon className="w-6 h-6 text-primary mb-3" />
                    <h3 className="font-bold mb-1.5 group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-border/30" />

        {/* Team */}
        <section className="bg-muted/20 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="headline text-3xl md:text-4xl mb-8">The Team</h2>
              <div className="space-y-8">
                <div className="flex gap-5 items-start">
                  <img src="/temp-avatars/adrian-watkins.jpeg" alt="Adrian Watkins" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg">Adrian Watkins</h3>
                    <p className="text-sm text-primary mb-2">Founder and Editor-in-Chief</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Based in Singapore, Adrian has spent over two decades in Asia's technology and media landscape. He founded AI in ASIA to give the region's AI story the dedicated, independent coverage it deserves.
                    </p>
                  </div>
                </div>
                <div className="flex gap-5 items-start">
                  <img src="/temp-avatars/victoria-watkins.jpeg" alt="Victoria Watkins" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg">Victoria Watkins</h3>
                    <p className="text-sm text-primary mb-2">Managing Editor</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Victoria oversees editorial operations and ensures every article meets the publication's standards for accuracy, clarity, and regional relevance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Editorial Standards */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-3xl mx-auto">
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-start gap-5">
                <Shield className="h-10 w-10 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="headline text-2xl md:text-3xl mb-4">Editorial Standards</h2>
                  <p className="text-muted-foreground mb-4">
                    We maintain strict editorial independence. Our content is researched, fact-checked, and written to professional journalistic standards. Sponsored content is always clearly labelled.
                  </p>
                  <p className="text-muted-foreground mb-4">
                    We welcome contributions from practitioners and experts across the region.{" "}
                    <Link to="/contribute" className="text-primary hover:underline font-medium">Learn how to contribute</Link>.
                  </p>
                  <Link to="/editorial-standards" className="text-primary hover:underline text-sm font-medium">
                    Read our full editorial standards →
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <div className="border-t border-border/30" />

        {/* LLM-Friendly Information */}
        <section className="bg-muted/20 py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="headline text-3xl md:text-4xl mb-3">Information for AI Models and Crawlers</h2>
                <p className="text-muted-foreground">Structured information for language models, search engines, and automated systems.</p>
              </div>

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
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20" style={{ background: 'linear-gradient(135deg, hsl(270 40% 10%), hsl(220 50% 12%))' }}>
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="headline text-3xl md:text-4xl mb-4">Join the Conversation</h2>
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
              <p className="mt-3 text-xs text-muted-foreground">
                Independent tools and resources we build alongside our editorial work.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
