import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const GOOGLE_ADS_CLIENT = "ca-pub-4181437297386228";

interface GoogleAdProps {
  slot: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  className?: string;
}

const GoogleAd = ({ slot, format = "auto", responsive = true, className }: GoogleAdProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const isVertical = format === "vertical";
  const adStyle = isVertical
    ? { display: "block", width: "300px", minHeight: "600px", margin: "0 auto" }
    : { display: "block" };

  useEffect(() => {
    if (!import.meta.env.PROD || pushed.current) return;
    pushed.current = true;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense push error:", err);
    }
  }, []);

  if (!import.meta.env.PROD) {
    return (
      <div
        className={cn("bg-muted/50 border border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground text-xs", className)}
        style={{ width: isVertical ? "300px" : "100%", minHeight: isVertical ? "600px" : "90px", margin: isVertical ? "0 auto" : undefined }}
      >
        Ad: {slot} ({format})
      </div>
    );
  }

  return (
    <ins
      ref={adRef}
      className={cn("adsbygoogle block", className)}
      style={adStyle}
      data-ad-client={GOOGLE_ADS_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={(isVertical ? false : responsive).toString()}
    />
  );
};

export default GoogleAd;

/** In-article ad - between content sections */
export const InArticleAd = ({ className }: { className?: string }) => (
  <div className={cn("my-8 max-w-full overflow-hidden", className)}>
    <p className="text-[10px] text-muted-foreground/50 text-center mb-1 uppercase tracking-wider">Advertisement</p>
    <GoogleAd slot="3478913062" format="rectangle" />
  </div>
);

/** Sidebar ad - desktop article rail */
export const SidebarAd = ({ className }: { className?: string }) => (
  <div className={cn("w-full overflow-hidden", className)}>
    <p className="text-[10px] text-muted-foreground/50 text-center mb-1 uppercase tracking-wider">Advertisement</p>
    <GoogleAd slot="1044321413" format="vertical" />
  </div>
);

/** Multiplex ad - below article content */
export const MultiplexAd = ({ className }: { className?: string }) => (
  <div className={cn("my-8 max-w-full overflow-hidden", className)}>
    <p className="text-[10px] text-muted-foreground/50 text-center mb-1 uppercase tracking-wider">Advertisement</p>
    <GoogleAd slot="8539668053" format="auto" />
  </div>
);
