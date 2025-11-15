import { ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import aiinasiaLogo from "@/assets/aiinasia-logo.png";
import businessInAByteLogo from "@/assets/businessinabyte-logo.png";
import promptAndGoLogo from "@/assets/promptandgo-logo.png";
import myOfferClubLogo from "@/assets/myofferclub-logo.png";
import aiAcademyLogo from "@/assets/aiacademy-logo.png";

const collectiveLinks: Array<{
  subdomain: string;
  url: string;
  displayName: string;
  logo: string;
  comingSoon?: boolean;
}> = [
  {
    subdomain: "discover.withthepowerof.ai",
    url: "https://www.aiinasia.com",
    displayName: "AIinASIA.com",
    logo: aiinasiaLogo,
  },
  {
    subdomain: "prompt.withthepowerof.ai",
    url: "https://www.promptandgo.ai",
    displayName: "PromptAndGo.ai",
    logo: promptAndGoLogo,
  },
  {
    subdomain: "startup.withthepowerof.ai",
    url: "https://www.businessinabyte.com",
    displayName: "BusinessInAByte.com",
    logo: businessInAByteLogo,
  },
  {
    subdomain: "shop.withthepowerof.ai",
    url: "https://www.myofferclub.com",
    displayName: "MyOfferClub.com",
    logo: myOfferClubLogo,
  },
  {
    subdomain: "learn.withthepowerof.ai",
    url: "https://www.aiacademy.asia",
    displayName: "AIAcademy.asia",
    logo: aiAcademyLogo,
  },
];

export const CollectiveFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <TooltipProvider>
      <footer className="bg-[hsl(0,0%,7%)] text-white py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Section 1 - Main Intro */}
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-[hsl(0,0%,100%)]">
              Part of the{" "}
              <a
                href="https://you.withthepowerof.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[hsl(198,100%,50%)] hover:underline inline-flex items-center gap-1 transition-colors break-words"
              >
                <span className="break-all">
                  You.
                  <br className="sm:hidden" />
                  WithThePowerOf.AI
                </span>
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
              </a>{" "}
              Collective
            </h2>
            <p className="text-[hsl(0,0%,100%)] text-lg max-w-3xl mx-auto">
              Every project under You.WithThePowerOf.AI focuses on a different part of the
              journey, but all share one goal: making AI accessible and empowering for everyone.{" "}
              <span className="text-[hsl(198,100%,50%)] font-semibold">#DemocratisingAI</span>
            </p>
          </div>

          {/* Section 2 - Explore the Collective */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-center mb-8 text-[hsl(0,0%,100%)]">
              Explore the Collective
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 justify-items-center">
              {collectiveLinks.map((link) => (
                <Tooltip key={link.subdomain}>
                  <TooltipTrigger asChild>
                    {link.comingSoon ? (
                      <div className="flex flex-col items-center gap-3 cursor-not-allowed">
                        <div className="w-40 h-28 bg-white rounded-lg p-3 flex items-center justify-center">
                          <img
                            src={link.logo}
                            alt={link.displayName}
                            className={`max-w-full max-h-full object-contain ${
                              link.subdomain === "shop.withthepowerof.ai" || link.subdomain === "learn.withthepowerof.ai"
                                ? "scale-125"
                                : ""
                            }`}
                            loading="lazy"
                            width={136}
                            height={76}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-sm font-medium opacity-50">
                          {link.subdomain}
                        </div>
                      </div>
                    ) : (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-3 group"
                      >
                        <div className="w-40 h-28 bg-white rounded-lg p-3 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-2 group-hover:border-[hsl(198,100%,50%)] group-hover:shadow-lg group-hover:shadow-[hsl(198,100%,50%)]/20">
                          <img
                            src={link.logo}
                            alt={link.displayName}
                            className={`max-w-full max-h-full object-contain ${
                              link.subdomain === "shop.withthepowerof.ai" || link.subdomain === "learn.withthepowerof.ai"
                                ? "scale-125"
                                : ""
                            }`}
                            loading="lazy"
                            width={136}
                            height={76}
                          />
                        </div>
                        <div className="flex items-center gap-1 text-[hsl(198,100%,50%)] text-sm font-medium">
                          {link.subdomain}
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </a>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{link.comingSoon ? "Coming Soon" : link.displayName}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Section 3 - Copyright */}
          <div className="pt-8 border-t border-[hsl(0,0%,20%)] text-center">
            <p className="text-[hsl(0,0%,60%)] text-sm">
              © {currentYear} You.WithThePowerOf.AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </TooltipProvider>
  );
};
