import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";

interface PartnerHeroProps {
  onScrollToContact: () => void;
}

export default function PartnerHero({ onScrollToContact }: PartnerHeroProps) {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.08),transparent_70%)]" />
      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        <div className="text-center space-y-6">
          <p className="text-sm uppercase tracking-[0.2em] text-primary font-medium">
            Partnerships
          </p>
          <h1 className="headline text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            Partner With AI in Asia
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Reach Asia-Pacific's most engaged AI decision-makers. From enterprise leaders to policymakers, our audience shapes the future of artificial intelligence across the region.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="gap-2 px-8" asChild>
              <a href="/media-kit.pdf" target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                Download Media Kit
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 px-8"
              onClick={onScrollToContact}
            >
              Get In Touch
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
