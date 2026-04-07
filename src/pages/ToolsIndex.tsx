import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Zap, Grid3X3, Calculator, Search, Terminal, Wand2, BarChart2, Shield, Activity, Languages, Newspaper, Users, Globe, BookOpenText, Compass, Scale, type LucideIcon } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

interface Tool {
  name: string;
  desc: string;
  icon: LucideIcon;
  to: string;
  isNew?: boolean;
}

const TOOLS: Tool[] = [
  {
    name: "AI Readiness Score",
    desc: "8-question quiz to discover how AI-ready your career or business is.",
    icon: Zap,
    to: "/tools/ai-readiness",
  },
  {
    name: "AI Jargon Bingo",
    desc: "5×5 bingo card of AI buzzwords — play during your next meeting!",
    icon: Grid3X3,
    to: "/tools/ai-bingo",
  },
  {
    name: "AI Meeting Bingo",
    desc: "Spot meeting clichés and get 5 in a row to win — confetti included!",
    icon: Users,
    to: "/tools/ai-meeting-bingo",
    isNew: true,
  },
  {
    name: "AI Headline Generator",
    desc: "Generate hilarious satirical AI news headlines about Asia.",
    icon: Newspaper,
    to: "/tools/ai-headlines",
  },
  {
    name: "AI Jargon Translator",
    desc: "Paste any AI press release and decode the buzzwords instantly.",
    icon: Languages,
    to: "/tools/jargon-translator",
  },
  {
    name: "AI Job Impact Analyser",
    desc: "Find out how AI will affect your role and what to do about it.",
    icon: BarChart2,
    to: "/tools/ai-job-impact",
  },
  {
    name: "AI Policy Tracker",
    desc: "Explore AI regulations across 16 Asia-Pacific countries on an interactive map.",
    icon: Shield,
    to: "/tools/ai-policy-tracker",
    isNew: true,
  },
  {
    name: "AI Glossary",
    desc: "472+ AI and tech terms explained in plain language. Search, filter, explore.",
    icon: BookOpenText,
    to: "/tools/ai-glossary",
    isNew: true,
  },
  {
    name: "AI Salary Compass",
    desc: "Compare AI job salaries across 12 major Asian cities with COL adjustments.",
    icon: Compass,
    to: "/tools/salary-compass",
    isNew: true,
  },
  {
    name: "Prompt Builder",
    desc: "Craft effective AI prompts with guided templates and best practices.",
    icon: Terminal,
    to: "/category/learn",
  },
  {
    name: "Prompt Studio",
    desc: "Test and iterate on AI prompts with real-time feedback.",
    icon: Wand2,
    to: "/category/create",
  },
  {
    name: "ROI Calculator",
    desc: "Estimate the return on investment of AI adoption for your business.",
    icon: Calculator,
    to: "/category/business",
  },
  {
    name: "Tool Finder Quiz",
    desc: "Answer a few questions and get personalised AI tool recommendations.",
    icon: Search,
    to: "/category/life",
  },
  {
    name: "Pulse Tracker",
    desc: "Real-time sentiment tracking of AI news across Asia.",
    icon: Activity,
    to: "/category/news",
  },
];

const ToolsIndex = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Interactive AI Tools | AI in Asia"
        description="Free interactive tools — AI readiness quiz, jargon bingo, prompt builder, ROI calculator, and more."
        canonical="https://aiinasia.com/tools"
      />
      <Header />
      <main className="flex-1 px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Tools</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-black text-foreground mb-3">
              Interactive AI Tools
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Free tools to test your AI knowledge, decode jargon, calculate ROI, and have fun along the way.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map((tool) => (
              <Link
                key={tool.name}
                to={tool.to}
                className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-amber-500/50 hover:bg-amber-500/5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5"
              >
                {tool.isNew && (
                  <Badge className="absolute top-3 right-3 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 hover:bg-amber-500">
                    New
                  </Badge>
                )}
                <tool.icon className="h-8 w-8 text-amber-500 mb-3 transition-transform group-hover:scale-110" />
                <h2 className="font-display text-base font-bold text-foreground mb-1 group-hover:text-amber-500 transition-colors">
                  {tool.name}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tool.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ToolsIndex;
