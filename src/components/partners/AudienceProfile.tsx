import { Card, CardContent } from "@/components/ui/card";
import { Code2, Briefcase, Scale, GraduationCap } from "lucide-react";
import { useFadeInOnScroll } from "./useFadeInOnScroll";

const AUDIENCE_SEGMENTS = [
  {
    icon: Code2,
    title: "AI Practitioners and Engineers",
    description:
      "Technical professionals building, deploying, and scaling AI systems across Asia-Pacific enterprises and startups.",
  },
  {
    icon: Briefcase,
    title: "C-Suite and Business Leaders",
    description:
      "Decision-makers evaluating AI strategy, vendor selection, and enterprise adoption across diverse Asian markets.",
  },
  {
    icon: Scale,
    title: "Policy Makers and Regulators",
    description:
      "Government officials and advisors shaping AI governance, data regulation, and ethical frameworks in the region.",
  },
  {
    icon: GraduationCap,
    title: "Researchers and Academics",
    description:
      "University researchers and institutional scholars advancing AI knowledge with a focus on regional applications.",
  },
] as const;

export default function AudienceProfile() {
  const { ref, isVisible } = useFadeInOnScroll();

  return (
    <section
      ref={ref}
      className={`py-16 md:py-20 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="headline text-2xl md:text-3xl font-bold mb-3">
            Our Audience
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            AI in Asia reaches the professionals who are building, governing, and adopting artificial intelligence across the region.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {AUDIENCE_SEGMENTS.map((seg) => (
            <Card key={seg.title} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6 flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <seg.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{seg.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {seg.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
