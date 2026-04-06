import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, CalendarDays, FlaskConical, Layers, ArrowRight, Check } from "lucide-react";
import { useFadeInOnScroll } from "./useFadeInOnScroll";
import { cn } from "@/lib/utils";

const PARTNERSHIPS = [
  {
    id: "editorial_sponsorship",
    icon: Newspaper,
    title: "Editorial Sponsorship",
    description:
      "Sponsor a content vertical or recurring series. Your brand becomes the presenting partner for high-value editorial coverage, such as our weekly AI policy roundup, enterprise adoption reports, or regional deep dives.",
    includes: [
      "Branded presenting partner credit across the series",
      "Logo placement on all sponsored content pages",
      "Dedicated sponsor spotlight card within each article",
      "Monthly performance reporting with engagement metrics",
      "Social media amplification across our channels",
    ],
  },
  {
    id: "event_partnership",
    icon: CalendarDays,
    title: "Event Partnership",
    description:
      "Co-branded events that connect your brand with Asia-Pacific's AI community. From virtual webinar series to in-person conference coverage, we create meaningful touchpoints with engaged audiences.",
    includes: [
      "Co-branded event landing page and promotional assets",
      "Speaker and panelist coordination across the region",
      "Live coverage and post-event editorial content",
      "Attendee data sharing (with consent) for follow-up",
      "Cross-promotion to our subscriber base",
    ],
  },
  {
    id: "research_collaboration",
    icon: FlaskConical,
    title: "Research Collaboration",
    description:
      "Joint reports, industry surveys, and data partnerships that position your organization as a thought leader. We bring editorial credibility and regional distribution, you bring domain expertise.",
    includes: [
      "Co-authored research reports with full editorial production",
      "Custom survey design and data collection across Asian markets",
      "Exclusive data visualizations and interactive features",
      "Press release support and media distribution",
      "Ongoing citation as a research partner",
    ],
  },
  {
    id: "brand_integration",
    icon: Layers,
    title: "Brand Integration",
    description:
      "Thoughtful native content that serves your audience while showcasing your platform. Sponsored guides, tool reviews, and integration tutorials that deliver genuine value to readers.",
    includes: [
      "Sponsored how-to guides written by our editorial team",
      "Tool review and comparison features with transparent labelling",
      "Integration into our AI tools directory with premium placement",
      "Sponsored prompts and workflow templates",
      "Clearly labelled partner content with full editorial quality",
    ],
  },
] as const;

interface Props {
  onScrollToContact: () => void;
}

export default function PartnershipOpportunities({ onScrollToContact }: Props) {
  const [activeId, setActiveId] = useState<string>(PARTNERSHIPS[0].id);
  const { ref, isVisible } = useFadeInOnScroll();
  const active = PARTNERSHIPS.find((p) => p.id === activeId) ?? PARTNERSHIPS[0];

  return (
    <section
      ref={ref}
      className={`py-16 md:py-20 border-t border-border/50 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="headline text-2xl md:text-3xl font-bold mb-3">
            Partnership Opportunities
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We offer structured collaboration models that maintain editorial integrity while delivering measurable outcomes for partners.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {PARTNERSHIPS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeId === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <p.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{p.title}</span>
            </button>
          ))}
        </div>

        {/* Active panel */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6 md:pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <active.icon className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">{active.title}</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-6 max-w-3xl">
              {active.description}
            </p>
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                What is included
              </h4>
              <ul className="space-y-2">
                {active.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Button onClick={onScrollToContact} className="gap-2">
              Learn More
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
