import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Zap, Grid3X3, Calculator, Search, Terminal, Wand2, BarChart2, Shield, Activity, Languages, Newspaper } from "lucide-react";

const TOOLS = [
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
  {
    name: "Policy Tracker",
    desc: "Track AI regulation developments across Asia-Pacific governments.",
    icon: Shield,
    to: "/category/policy",
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
                className="group rounded-xl border border-border bg-card p-6 transition-all duration-200 hover:border-amber-500/50 hover:bg-amber-500/5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5"
              >
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
