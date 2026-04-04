import { Mic, ArrowRight } from "lucide-react";

export const VoicesSubmitCTA = () => {
  return (
    <section className="mb-10">
      <div
        className="relative overflow-hidden rounded-2xl p-8 md:p-10"
        style={{
          background: "linear-gradient(135deg, hsl(43 96% 56%), hsl(38 92% 50%))",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />

        <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 mb-3">
              <Mic className="h-6 w-6 text-black/70" />
              <span className="text-xs font-bold uppercase tracking-wider text-black/60">
                Community Voices
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-black text-black mb-2">
              Submit Your Voice
            </h2>
            <p className="text-sm md:text-base text-black/70 leading-relaxed max-w-md">
              Are you an AI practitioner, researcher, or thought leader in Asia? 
              Share your perspective with our growing community of 50,000+ readers.
            </p>
          </div>
          <a
            href="mailto:me@adrianwatkins.com?subject=Voices%20Submission%20—%20AI%20in%20Asia"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black text-amber-400 font-bold text-sm hover:bg-black/90 transition-colors shrink-0"
          >
            Get in Touch <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
};
