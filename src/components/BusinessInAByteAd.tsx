import { ExternalLink, Rocket } from "lucide-react";
import businessInAByteLogo from "@/assets/businessinabyte-logo.png";

export const BusinessInAByteAd = () => {
  return (
    <div className="w-[300px] h-[250px] mx-auto">
      <a
        href="https://www.businessinabyte.com"
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block relative group overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 border-0"
        aria-label="Free tools and playbooks for entrepreneurs - Launch in 7 Days with Business in a Byte"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-between p-5 text-center">
          {/* Logo - Much smaller */}
          <div className="bg-white rounded-lg p-1.5 w-full max-w-[220px] transition-all duration-300 group-hover:scale-105">
            <img
              src={businessInAByteLogo}
              alt="Business in a Byte"
              className="w-full h-auto"
              width={220}
              height={107}
            />
          </div>

          {/* Content */}
          <div className="flex flex-col items-center">
            <p className="text-white text-xs leading-tight px-2">
              Free tools and playbooks. Built for entrepreneurs who move fast.
            </p>
          </div>

          {/* CTA */}
          <div className="w-full bg-black/90 text-white rounded-lg px-4 py-2.5 font-bold text-sm flex items-center justify-center gap-2 group-hover:bg-black transition-colors">
            Launch in 7 Days
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        </div>
      </a>
    </div>
  );
};
