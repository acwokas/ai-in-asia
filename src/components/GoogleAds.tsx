import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/components/GoogleAnalytics";

const GOOGLE_ADS_CLIENT = "ca-pub-4181437297386228";

const HOUSE_AD_URL = "https://open.spotify.com/show/3aHz4AvuZTHjiKJaZ9FUdW?si=XsoU_jpdTOWJHZtGxYkiJw";
const HOUSE_AD_IMG = "/ads/3b9-spotify-300x250.png";
// Delay before checking if AdSense filled the slot (ms)
const FILL_CHECK_DELAY = 2000;

interface GoogleAdProps {
  slot: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  className?: string;
  adPosition?: string;
}

const HouseAd = ({ position }: { position: string }) => (
  <a
    href={HOUSE_AD_URL}
    target="_blank"
    rel="noopener noreferrer"
    onClick={() => trackEvent("house_ad_click", { ad_name: "3b9-spotify", ad_position: position })}
    style={{ display: "block", width: "300px", margin: "0 auto" }}
  >
    <img
      src={HOUSE_AD_IMG}
      alt="3 Before 9 — Daily Asian AI news on Spotify"
      width={300}
      height={250}
      style={{ display: "block" }}
    />
  </a>
);

const GoogleAd = ({
  slot,
  format = "auto",
  responsive = true,
  className,
  adPosition = "unknown",
}: GoogleAdProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [showHouseAd, setShowHouseAd] = useState(false);

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

    // After delay, check if AdSense filled the slot; show house ad if not
    const timer = setTimeout(() => {
      const el = adRef.current;
      if (!el) return;
      const status = el.getAttribute("data-ad-status");
      const hasIframe = !!el.querySelector("iframe");
      if (status === "unfilled" || (!hasIframe && el.offsetHeight === 0)) {
        setShowHouseAd(true);
      }
    }, FILL_CHECK_DELAY);

    return () => clearTimeout(timer);
  }, []);

  if (!import.meta.env.PROD) {
    return (
      <div
        className={cn(
          "bg-muted/50 border border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground text-xs",
          className,
        )}
        style={{
          width: isVertical ? "300px" : "100%",
          minHeight: isVertical ? "600px" : "90px",
          margin: isVertical ? "0 auto" : undefined,
        }}
      >
        Ad: {slot} ({format})
      </div>
    );
  }

  if (showHouseAd) {
    return <HouseAd position={adPosition} />;
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
    <p className="text-[10px] text-muted-foreground/50 text-center mb-1 uppercase tracking-wider">
      Advertisement
    </p>
    <GoogleAd slot="3478913062" format="rectangle" adPosition="in-article" />
  </div>
);

/** Sidebar ad - desktop article rail */
export const SidebarAd = ({ className }: { className?: string }) => (
  <div className={cn("w-full overflow-hidden", className)}>
    <p className="text-[10px] text-muted-foreground/50 text-center mb-1 uppercase tracking-wider">
      Advertisement
    </p>
    <GoogleAd slot="1044321413" format="vertical" adPosition="sidebar" />
  </div>
);

/** Multiplex ad - below article content */
export const MultiplexAd = ({ className }: { className?: string }) => (
  <div className={cn("my-8 max-w-full overflow-hidden", className)}>
    <p className="text-[10px] text-muted-foreground/50 text-center mb-1 uppercase tracking-wider">
      Advertisement
    </p>
    <GoogleAd slot="8539668053" format="auto" adPosition="multiplex" />
  </div>
);
