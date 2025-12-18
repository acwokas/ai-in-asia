import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mic } from "lucide-react";
import { trackSponsorClick, trackSponsorImpression } from "@/hooks/useSponsorTracking";

interface ElevenLabsPromoProps {
  variant?: 'homepage' | 'tools';
}

const ElevenLabsPromo = ({ variant = 'homepage' }: ElevenLabsPromoProps) => {
  const placement = variant === 'homepage' ? 'elevenlabs_homepage' : 'elevenlabs_tools';

  useEffect(() => {
    trackSponsorImpression(placement, 'ElevenLabs');
  }, [placement]);

  const handleClick = () => {
    trackSponsorClick(placement, 'ElevenLabs', 'https://try.elevenlabs.io/hl2h6rt26ia8');
  };

  const cardClasses = variant === 'homepage' 
    ? "p-6 border-2 border-accent/30 bg-gradient-to-br from-accent/10 via-background to-accent/5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
    : "p-6 border-2 border-accent/40 bg-gradient-to-br from-accent/15 via-background to-accent/5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]";

  return (
    <Card className={cardClasses}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
            <Mic className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-accent mb-1 uppercase tracking-wide">
              Adrian's Personal Invite
            </div>
            <h3 className="font-bold text-xl mb-2">Create Studio Voices With ElevenLabs</h3>
          </div>
        </div>

        <p className="text-sm text-foreground/90 leading-relaxed">
          For a limited time, start creating studio-quality AI voices with ElevenLabs using my link below and tap into one of the most in-demand creator tools online.
        </p>

        <Button
          className="w-full gap-2 font-semibold" 
          asChild
          onClick={handleClick}
        >
          <a 
            href="https://try.elevenlabs.io/hl2h6rt26ia8" 
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

export default ElevenLabsPromo;
