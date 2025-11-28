import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
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
  Sparkles,
  Trophy,
  Users,
  Target,
  Zap,
  Shield,
  BookOpen,
  TrendingUp,
  Globe,
  Award,
  Star,
  Brain,
  Rocket,
  CheckCircle2,
  GraduationCap,
  ExternalLink
} from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>About AI in ASIA - Leading AI News & Insights Platform</title>
        <meta name="description" content="Learn about AI in ASIA, your trusted source for AI news, insights, and education. Part of the you.withthepowerof.ai ecosystem, democratizing artificial intelligence across Asia." />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <link rel="canonical" href="https://aiinasia.com/about" />
        <meta property="og:title" content="About AI in ASIA - Leading AI News & Insights Platform" />
        <meta property="og:description" content="Learn about AI in ASIA and our mission to democratize artificial intelligence across Asia." />
        <meta property="og:url" content="https://aiinasia.com/about" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="About AI in ASIA" />
        <meta name="twitter:description" content="Learn about AI in ASIA and our mission to democratize artificial intelligence across Asia." />
      </Helmet>

      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 border-b">
        <div className="container mx-auto px-4">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>About</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-12 w-12 text-primary" />
              <h1 className="headline text-4xl md:text-6xl">About AI in ASIA</h1>
            </div>
            <p className="text-xl md:text-2xl text-muted-foreground mb-6">
              Connect with the fastest-growing technology story on the planet. We are your trusted, independent source for essential news, expert insights, and diverse perspectives focused entirely on Asia's dynamic AI ecosystem.
            </p>
            <a href="https://you.withthepowerof.ai" target="_blank" rel="noopener noreferrer" className="inline-block">
              <Badge variant="secondary" className="text-base py-2 px-4 hover:bg-secondary/80 transition-colors cursor-pointer flex items-center gap-2">
                Powered by you.withthepowerof.ai
                <ExternalLink className="h-4 w-4" />
              </Badge>
            </a>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* Mission Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
              <div>
                <h2 className="headline text-3xl md:text-4xl mb-6 flex items-center gap-3">
                  <Target className="h-8 w-8 text-primary" />
                  Our Mission
                </h2>
                <p className="text-lg text-muted-foreground mb-4">
                  AI in ASIA empowers the region's builders, innovators, and decision-makers with timely, accurate, and actionable AI intelligence.
                </p>
                <p className="text-lg text-muted-foreground">
                  From breakthrough research to practical applications, we cover the stories that matter most to Asia's rapidly evolving AI landscape.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <Target className="h-10 w-10 text-primary" />
                    <strong className="text-2xl font-bold text-primary">2022</strong>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">Covering Asia's AI evolution since 2022</p>
                </Card>
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="h-10 w-10 text-primary" />
                    <strong className="text-2xl font-bold text-primary">20+</strong>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">Read by professionals in 20+ countries across Asia-Pacific</p>
                </Card>
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-10 w-10 text-primary" />
                    <strong className="text-2xl font-bold text-primary">4000+</strong>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">Home to 4,000+ reader insights and discussions</p>
                </Card>
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="h-10 w-10 text-primary" />
                    <strong className="text-2xl font-bold text-primary">24/7</strong>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">Updated daily with AI news, analysis, and research across the region</p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Coverage Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="headline text-3xl md:text-4xl mb-12 text-center">What We Cover</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <Zap className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-bold text-xl mb-3">Breaking News</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Latest AI developments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Regional AI trends</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Industry updates</span>
                    </li>
                  </ul>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <Brain className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-bold text-xl mb-3">Deep Insights</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>In-depth analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Expert interviews</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Research deep-dives</span>
                    </li>
                  </ul>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <Rocket className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-bold text-xl mb-3">Practical Guides</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Implementation guides</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Tool reviews</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Best practices</span>
                    </li>
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Editorial Standards */}
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <Shield className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h2 className="headline text-2xl md:text-3xl mb-4">Editorial Standards</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    We maintain strict editorial independence and transparency. Our content is researched, fact-checked, and written to the highest journalistic standards.
                  </p>
                  <p className="text-lg text-muted-foreground">
                    Our gamification system is designed to reward engagement, not influence editorial decisions.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Learning is Rewarding Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="headline text-3xl md:text-4xl mb-4">Learning is Rewarding</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Learning about AI should be engaging and rewarding. Earn points, unlock achievements, and access exclusive benefits.
                </p>
              </div>

            {/* How to Earn Points */}
            <Card className="p-8 mb-8">
              <h3 className="font-bold text-2xl mb-6 flex items-center gap-3">
                <Star className="h-8 w-8 text-primary" />
                How to Earn Points
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Sign Up (20-50+ points)</h4>
                    <p className="text-sm text-muted-foreground">Create your account and complete your profile</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Read Articles (10 points)</h4>
                    <p className="text-sm text-muted-foreground">Stay informed and earn points for every article</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Subscribe (25 points)</h4>
                    <p className="text-sm text-muted-foreground">
                      <Link to="/newsletter" className="text-primary hover:underline">Subscribe to our newsletter</Link>
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Target className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Engage & Share</h4>
                    <p className="text-sm text-muted-foreground">Comment, bookmark, and participate in the community</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Member Levels */}
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              <Card className="p-6 border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-4xl mb-3">🌟</div>
                  <h4 className="font-bold text-lg mb-2 text-blue-600 dark:text-blue-400">Explorer</h4>
                  <p className="text-sm font-semibold mb-3">0-99 points</p>
                  <p className="text-sm text-muted-foreground">Basic Scout AI access & personalized feed</p>
                </div>
              </Card>
              
              <Card className="p-6 border-2 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-4xl mb-3">⚡</div>
                  <h4 className="font-bold text-lg mb-2 text-purple-600 dark:text-purple-400">Enthusiast</h4>
                  <p className="text-sm font-semibold mb-3">100-499 points</p>
                  <p className="text-sm text-muted-foreground">Enhanced Scout AI & early content access</p>
                </div>
              </Card>
              
              <Card className="p-6 border-2 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-4xl mb-3">🏆</div>
                  <h4 className="font-bold text-lg mb-2 text-orange-600 dark:text-orange-400">Expert</h4>
                  <p className="text-sm font-semibold mb-3">500-999 points</p>
                  <p className="text-sm text-muted-foreground">Premium Scout AI & member-only articles</p>
                </div>
              </Card>
              
              <Card className="p-6 border-2 border-red-200 dark:border-red-800 hover:shadow-lg transition-shadow">
                <div className="text-center">
                  <div className="text-4xl mb-3">👑</div>
                  <h4 className="font-bold text-lg mb-2 text-red-600 dark:text-red-400">Thought Leader</h4>
                  <p className="text-sm font-semibold mb-3">1000+ points</p>
                  <p className="text-sm text-muted-foreground">Unlimited Scout AI & VIP benefits</p>
                </div>
              </Card>
            </div>
            </div>
          </div>
        </section>

        {/* Ecosystem Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="headline text-3xl md:text-4xl mb-4 text-center">Our Ecosystem</h2>
              <p className="text-center text-lg text-muted-foreground mb-12 max-w-3xl mx-auto">
                AI in ASIA is part of the <a href="https://you.withthepowerof.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">you.withthepowerof.ai <span className="inline-block">→</span></a> collective of connected brands built to help people and businesses get real value from AI. <span className="font-semibold">#democratizing AI for all.</span>
              </p>
              <p className="text-center text-lg text-muted-foreground mb-12 max-w-3xl mx-auto">
                From education and media to tools, startups, and smart shopping - everything we create is designed to help you do more, with the power of AI.
              </p>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <a href="https://aiinasia.com" target="_blank" rel="noopener noreferrer">
                  <Card className="p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">AI in ASIA</h3>
                    <p className="text-sm text-muted-foreground">Trusted AI news & insights</p>
                  </Card>
                </a>
                
                <a href="https://promptandgo.ai" target="_blank" rel="noopener noreferrer">
                  <Card className="p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center">
                      <Zap className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">PromptAndGo</h3>
                    <p className="text-sm text-muted-foreground">Prompt engineering tools</p>
                  </Card>
                </a>
                
                <a href="https://businessinabyte.com" target="_blank" rel="noopener noreferrer">
                  <Card className="p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Business In A Byte</h3>
                    <p className="text-sm text-muted-foreground">AI business strategies</p>
                  </Card>
                </a>
                
                <a href="https://aiacademy.asia" target="_blank" rel="noopener noreferrer">
                  <Card className="p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1 h-full">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center">
                      <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">AI Academy</h3>
                    <p className="text-sm text-muted-foreground">Structured learning paths</p>
                  </Card>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* LLM-Friendly Information Section */}
        <section className="container mx-auto px-4 py-16 border-t">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="headline text-3xl md:text-4xl mb-4">Information for AI Models & Crawlers</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Structured information specifically formatted for language models, search engines, and automated systems
              </p>
            </div>

            {/* Quick Reference Facts */}
            <Card className="p-8 mb-8 bg-muted/30">
              <h3 className="font-bold text-2xl mb-6 flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                Publication Reference Information
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-lg">Core Details</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Name:</strong> AI in ASIA</li>
                    <li><strong>Domain:</strong> aiinasia.com</li>
                    <li><strong>Type:</strong> Technology News Publication, AI Media Platform</li>
                    <li><strong>Primary Language:</strong> English</li>
                    <li><strong>Established:</strong> 2022</li>
                    <li><strong>Update Frequency:</strong> Daily (multiple articles per day)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-lg">Coverage Scope</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Focus:</strong> Artificial Intelligence in Asia-Pacific</li>
                    <li><strong>Geographic Coverage:</strong> ASEAN, Greater China, North Asia, South Asia, Middle East</li>
                    <li><strong>Content Types:</strong> News, Policy Analysis, Industry Reports, Event Coverage, Tools Directory</li>
                    <li><strong>Sitemap:</strong> <a href="https://aiinasia.com/sitemap.xml" className="text-primary hover:underline">aiinasia.com/sitemap.xml</a></li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Primary Topics */}
            <Card className="p-8 mb-8">
              <h3 className="font-bold text-2xl mb-6 flex items-center gap-3">
                <Target className="h-8 w-8 text-primary" />
                Primary Topics & Coverage Areas
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">Policy & Governance</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• AI Regulation & Compliance</li>
                    <li>• Government Policy Frameworks</li>
                    <li>• AI Ethics & Responsible AI</li>
                    <li>• Data Privacy & Security</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">Technology</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Machine Learning Applications</li>
                    <li>• Generative AI & LLMs</li>
                    <li>• Computer Vision</li>
                    <li>• Natural Language Processing</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">Industry Applications</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• AI in Healthcare</li>
                    <li>• AI in Finance (FinTech)</li>
                    <li>• Smart Cities & IoT</li>
                    <li>• Autonomous Systems</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">Business & Economy</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Corporate AI Strategy</li>
                    <li>• AI Investment & Funding</li>
                    <li>• Startup Ecosystem</li>
                    <li>• Industry Transformation</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">Research & Development</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• AI Research Breakthroughs</li>
                    <li>• Academic Institutions</li>
                    <li>• Innovation Hubs</li>
                    <li>• Cross-border Collaboration</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">Society & Workforce</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• AI Skills & Education</li>
                    <li>• Workforce Transformation</li>
                    <li>• Social Impact</li>
                    <li>• Digital Inclusion</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Citation Guidelines */}
            <Card className="p-8 mb-8 bg-primary/5">
              <h3 className="font-bold text-2xl mb-6 flex items-center gap-3">
                <Award className="h-8 w-8 text-primary" />
                Citation & Attribution Guidelines
              </h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Recommended Citation Format</h4>
                  <div className="bg-background p-4 rounded border border-border font-mono text-sm">
                    AI in ASIA. (Year, Month Day). Article Title. Retrieved from https://aiinasia.com/[category]/[article-slug]
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Attribution Requirements</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Always attribute content to "AI in ASIA"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Include the full article URL when referencing specific content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Preserve author attribution when specified in articles</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>Link back to original articles when republishing excerpts</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Content Reusability</h4>
                  <p className="text-muted-foreground">
                    Content may be referenced and quoted with proper attribution. For commercial licensing, 
                    bulk content use, or syndication inquiries, please <Link to="/contact" className="text-primary hover:underline">contact us</Link>.
                  </p>
                </div>
              </div>
            </Card>

            {/* Key Differentiators */}
            <Card className="p-8">
              <h3 className="font-bold text-2xl mb-6 flex items-center gap-3">
                <Star className="h-8 w-8 text-primary" />
                Unique Value Proposition
              </h3>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong>Regional Specialization:</strong> Unlike Western-centric AI publications, AI in ASIA provides 
                  region-specific insights accounting for local regulatory environments, cultural contexts, and market dynamics 
                  across diverse Asian economies.
                </p>
                <p>
                  <strong>Policy Expertise:</strong> Comprehensive tracking of AI governance frameworks through our AI Policy Atlas, 
                  offering comparative analysis and regulatory trend forecasting across Asia-Pacific nations.
                </p>
                <p>
                  <strong>Market Access Intelligence:</strong> Direct coverage from key AI innovation hubs including Singapore, 
                  Shenzhen, Beijing, Bangalore, Tokyo, and Seoul, with on-ground perspectives not widely available in 
                  international tech media.
                </p>
                <p>
                  <strong>Content Freshness:</strong> Daily updates ensure timely coverage of fast-moving AI developments, 
                  with weekly in-depth analysis and regular policy framework updates.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="headline text-3xl md:text-4xl mb-6">Get In Touch</h2>
              <p className="text-xl text-muted-foreground mb-8">
                Have a story tip, partnership enquiry, or feedback?
              </p>
              <Button asChild size="lg" className="text-lg px-8">
                <Link to="/contact">Contact Us</Link>
              </Button>
              <p className="mt-8 text-sm text-muted-foreground">
                Part of the <strong>you.withthepowerof.ai</strong> family – Empowering everyone with accessible AI
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
