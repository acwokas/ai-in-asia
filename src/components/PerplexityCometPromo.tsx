import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Sparkles } from "lucide-react";
import { trackSponsorClick, trackSponsorImpression } from "@/hooks/useSponsorTracking";

interface PerplexityCometPromoProps {
  variant?: 'homepage' | 'tools';
}

const PerplexityCometPromo = ({ variant = 'homepage' }: PerplexityCometPromoProps) => {
  const placement = variant === 'homepage' ? 'perplexity_comet_homepage' : 'perplexity_comet_tools';

  useEffect(() => {
    trackSponsorImpression(placement, 'Perplexity Comet');
  }, [placement]);

  const handleClick = () => {
    trackSponsorClick(placement, 'Perplexity Comet', 'https://pplx.ai/me55304');
  };

  const cardClasses = variant === 'homepage' 
    ? "p-6 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
    : "p-6 border-2 border-accent/40 bg-gradient-to-br from-accent/15 via-background to-accent/5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]";

  return (
    <Card className={cardClasses}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wide">
              Adrian's Personal Invite
            </div>
            <h3 className="font-bold text-xl mb-2">Try Perplexity Comet + Get Pro Free</h3>
          </div>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed">
          Experience Perplexity's brilliant AI-powered Comet web browser (desktop only) and get 1 month of Pro for free!
        </p>

        <Button
          className="w-full gap-2 font-semibold" 
          asChild
          onClick={handleClick}
        >
          <a 
            href="https://pplx.ai/me55304" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Get Started
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </Card>
  );
};

export default PerplexityCometPromo;
