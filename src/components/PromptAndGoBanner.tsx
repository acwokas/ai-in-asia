import { ExternalLink } from "lucide-react";
import promptAndGoLogo from "@/assets/promptandgo-logo.png";

export const PromptAndGoBanner = () => {
  return (
    <div className="w-full max-w-[640px] md:max-w-full mx-auto">
      <a
        href="https://www.promptandgo.ai"
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block relative group overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 h-[100px] md:h-[140px]"
        aria-label="Better and faster AI results, every time - Browse 3,000+ tested prompts at Prompt and Go AI"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
        
        {/* Content */}
        <div className="absolute inset-0 flex items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
          {/* Text content */}
          <div className="flex-1 pr-3 md:pr-8">
            {/* Mobile text */}
            <p className="text-white font-bold text-sm leading-tight md:hidden">
              Battle-ready prompts which Scout optimises for any chatbot for free.
            </p>
            
            {/* Desktop text */}
            <div className="hidden md:block">
              <p className="text-white font-bold text-xl leading-tight mb-1">
                Better and faster AI results, every time
              </p>
              <p className="text-white/90 text-base mb-1">
                Browse 3,000+ tested prompts and let Scout optimise the prompt for your favourite AI chatbot
              </p>
              <p className="text-white/80 text-sm">
                100% Free
              </p>
            </div>
          </div>

          {/* Logo on white background */}
          <div className="flex-shrink-0 bg-white rounded-lg px-1.5 py-1 md:px-4 md:py-2 flex items-center justify-center h-[90px] md:h-[130px] transition-all duration-300 group-hover:scale-105">
            <img
              src={promptAndGoLogo}
              alt="Prompt and Go AI"
              className="h-full w-auto object-contain max-h-[86px] max-w-[220px] md:max-h-[124px] md:max-w-[500px]"
              width={500}
              height={124}
            />
          </div>

          {/* Hover indicator */}
          <div className="absolute top-2 right-2 md:top-3 md:right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ExternalLink className="w-3 h-3 md:w-4 md:h-4 text-white drop-shadow-lg" />
          </div>
        </div>
      </a>
    </div>
  );
};
