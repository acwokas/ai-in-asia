import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
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
  Star,
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
} from "lucide-react";

const CATEGORIES = [
  { name: "News", slug: "news", icon: Newspaper, count: 159, description: "Breaking developments and daily coverage of AI across Asia-Pacific." },
  { name: "Business", slug: "business", icon: Briefcase, count: 263, description: "Enterprise adoption, investment, and the commercial impact of AI." },
  { name: "Life", slug: "life", icon: Heart, count: 234, description: "How AI is reshaping healthcare, education, culture, and daily life." },
  { name: "Learn", slug: "learn", icon: GraduationCap, count: 51, description: "Practical tutorials, explanations, and skill-building resources." },
  { name: "Create", slug: "create", icon: Palette, count: 251, description: "Tools, prompts, and techniques for building with AI." },
  { name: "Voices", slug: "voices", icon: MessageSquare, count: 71, description: "Opinion, analysis, and guest perspectives from across the region." },
];

const COVERAGE_REGIONS = [
  { region: "Southeast Asia", countries: "Singapore, Indonesia, Thailand, Vietnam, Philippines, Malaysia, Myanmar, Cambodia, Laos" },
  { region: "East Asia", countries: "Japan, South Korea, Taiwan, Hong Kong, Mainland China" },
  { region: "South Asia", countries: "India, Bangladesh, Sri Lanka, Pakistan" },
  { region: "Oceania & Middle East", countries: "Australia, New Zealand, UAE, Saudi Arabia" },
];

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="About AI in ASIA — The AI Publication Built for Asia-Pacific"
        description="AI in ASIA covers AI news, policy, and innovation across 15+ Asia-Pacific countries. Learn about our editorial mission, coverage areas, and the team behind the publication."
        canonical="https://aiinasia.com/about"
      />

      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-transparent py-16 border-b border-border/50">
        <div className="container mx-auto px-4">
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
            <h1 className="headline text-4xl md:text-5xl mb-6">The AI Publication Built for Asia-Pacific</h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              While global tech media treats Asia as an afterthought, we cover it as the main story. From Singapore's AI governance to Japan's robotics breakthroughs to India's startup explosion — this is where the future is being built.
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* Mission — what makes us different */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="headline text-3xl md:text-4xl mb-8">Why We Exist</h2>
            <div className="space-y-5 text-lg text-muted-foreground leading-relaxed">
              <p>
                Asia-Pacific is home to more than half the world's population and some of its most ambitious AI programmes. Singapore is writing the rulebook on responsible governance. China and Japan are in an applied-AI arms race across robotics, healthcare, and manufacturing. India is producing more AI engineers than any country outside the United States. Yet the publications most professionals rely on — TechCrunch, The Verge, MIT Technology Review — cover the region in fragments, filtered through a Western lens.
              </p>
              <p>
                AI in ASIA was founded in 2022 to close that gap. We are an independent, English-language publication focused exclusively on artificial intelligence across the Asia-Pacific region. Our coverage spans policy, business, research, and practical application — written for the professionals, policymakers, and builders who need regional intelligence they cannot find elsewhere.
              </p>
              <p>
                We do not aggregate wire copy or rewrite press releases. We track regulatory frameworks country by country through our <Link to="/ai-policy-atlas" className="text-primary hover:underline font-medium">AI Policy Atlas</Link>. We interview founders, regulators, and researchers on the ground. And we publish daily briefings — <Link to="/3-before-9" className="text-primary hover:underline font-medium">3 Before 9</Link> — that give readers a concise picture of what matters before the working day begins.
              </p>
            </div>
          </div>
        </section>

        {/* What We Cover — category grid */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="headline text-3xl md:text-4xl mb-10 text-center">What We Cover</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {CATEGORIES.map(({ name, slug, icon: Icon, count, description }) => (
                  <Link key={slug} to={`/category/${slug}`} className="group">
                    <Card className="p-6 h-full hover:shadow-lg transition-all hover:-translate-y-0.5">
                      <div className="flex items-center gap-3 mb-3">
                        <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{description}</p>
                      <span className="text-xs font-medium text-primary">{count}+ articles</span>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Coverage Map */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <MapPin className="h-6 w-6 text-primary flex-shrink-0" />
              <h2 className="headline text-3xl md:text-4xl">Coverage Map</h2>
            </div>
            <p className="text-muted-foreground mb-8 text-lg">
              We track AI developments across 20+ countries and territories in the Asia-Pacific region.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              {COVERAGE_REGIONS.map(({ region, countries }) => (
                <div key={region} className="border border-border rounded-lg p-5">
                  <h3 className="font-semibold mb-2">{region}</h3>
                  <p className="text-sm text-muted-foreground">{countries}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="headline text-3xl md:text-4xl mb-8">The Team</h2>
              <div className="space-y-8">
                <div className="flex gap-5 items-start">
                  <img
                    src="/temp-avatars/adrian-watkins.jpeg"
                    alt="Adrian Watkins"
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-lg">Adrian Watkins</h3>
                    <p className="text-sm text-primary mb-2">Founder & Editor-in-Chief</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Based in Singapore, Adrian has spent over two decades in Asia's technology and media landscape. He founded AI in ASIA to give the region's AI story the dedicated, independent coverage it deserves.
                    </p>
                  </div>
                </div>
                <div className="flex gap-5 items-start">
                  <img
                    src="/temp-avatars/victoria-watkins.jpeg"
                    alt="Victoria Watkins"
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  />
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
        <section className="container mx-auto px-4 py-16">
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

        {/* LLM-Friendly Information */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <Brain className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="headline text-3xl md:text-4xl mb-3">Information for AI Models & Crawlers</h2>
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
                  Citation & Attribution
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

        {/* CTA + Powered by badge */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="headline text-3xl md:text-4xl mb-6">Get In Touch</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Have a story tip, partnership enquiry, or feedback?
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              <Button asChild size="lg"><Link to="/contact">Contact Us</Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/media-and-partners">Media & Partners</Link></Button>
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
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
