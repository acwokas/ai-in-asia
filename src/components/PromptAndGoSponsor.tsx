import { useEffect } from "react";
import promptAndGoLogo from "@/assets/promptandgo-logo.png";
import { trackSponsorClick, trackSponsorImpression } from "@/hooks/useSponsorTracking";

export const PromptAndGoSponsor = () => {
  useEffect(() => {
    trackSponsorImpression('prompt_and_go_sidebar', 'Prompt and Go');
  }, []);

  const handleClick = () => {
    trackSponsorClick('prompt_and_go_sidebar', 'Prompt and Go', 'https://www.promptandgo.ai');
  };

  return (
    <div className="sticky top-24">
      <a
        href="https://www.promptandgo.ai"
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
        aria-label="Prompt and Go AI - Your AI prompt companion"
        onClick={handleClick}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <img
            src={promptAndGoLogo}
            alt="Prompt and Go AI"
            className="w-full max-w-[200px] h-auto object-contain"
          />
          
          <p className="text-sm text-muted-foreground text-center italic">
            Your AI prompt companion
          </p>
        </div>
      </a>
    </div>
  );
};
