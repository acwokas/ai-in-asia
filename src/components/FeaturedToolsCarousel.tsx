import { Link } from "react-router-dom";
import { Compass, Scale, Map, Clock } from "lucide-react";

const TOOLS = [
  {
    to: "/tools/salary-compass",
    icon: Compass,
    title: "AI Salary Compass",
    desc: "Explore AI job salaries across major Asian cities with cost-of-living adjustments.",
  },
  {
    to: "/tools/ethics-dilemma",
    icon: Scale,
    title: "AI Ethics Dilemma",
    desc: "Navigate choose-your-own-adventure ethical AI scenarios set across Asia.",
  },
  {
    to: "/tools/adoption-heatmap",
    icon: Map,
    title: "AI Adoption Heatmap",
    desc: "Compare AI readiness scores, investments, and startup ecosystems by country.",
  },
  {
    to: "/tools/ai-timeline",
    icon: Clock,
    title: "AI Timeline Asia",
    desc: "Scroll through 30+ major AI milestones across Asia from 2015 to 2026.",
  },
];

const FeaturedToolsCarousel = () => {
  return (
    <section className="py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="headline text-[22px] md:text-[28px] font-bold">Explore Our Latest Tools</h2>
          <p className="text-muted-foreground text-sm mt-2">Interactive, data-driven tools — free, no signup needed</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="group relative rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/50 overflow-hidden"
            >
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), transparent 60%)' }} />
              <span className="absolute top-3 right-3 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full z-10">New</span>
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <tool.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-bold mb-1.5 group-hover:text-primary transition-colors">{tool.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{tool.desc}</p>
                <span className="inline-block mt-3 text-xs font-semibold text-primary group-hover:underline">Try it →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedToolsCarousel;
