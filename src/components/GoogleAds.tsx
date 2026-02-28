import { useEffect, useState, useRef } from "react";
import { BusinessInAByteAd } from "./BusinessInAByteAd";
import { PromptAndGoBanner } from "./PromptAndGoBanner";
import { trackSponsorImpression, SponsorPlacement } from "@/hooks/useSponsorTracking";

interface GoogleAdProps {
  slot: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  className?: string;
  houseAdType?: "mpu" | "banner" | "none";
  placement?: SponsorPlacement;
}

// Google Ads Publisher ID
const GOOGLE_ADS_CLIENT = "ca-pub-4181437297386228";

const GoogleAd = ({
  slot,
  format = "auto",
  responsive = true,
  className = "",
  houseAdType = "mpu",
  placement,
}: GoogleAdProps) => {
  const [showHouseAd, setShowHouseAd] = useState(false);
  const adRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const impressionTracked = useRef(false);

  // Track Google Ad impression when ad loads successfully
  useEffect(() => {
    if (!showHouseAd && placement && !impressionTracked.current) {
      impressionTracked.current = true;
      trackSponsorImpression(placement, 'Google AdSense', { slot });
    }
  }, [showHouseAd, placement, slot]);

  useEffect(() => {
    // Only load in production
    if (import.meta.env.PROD) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        
        // Check if ad loaded after 2 seconds
        timeoutRef.current = setTimeout(() => {
          if (adRef.current) {
            const adElement = adRef.current;
            const hasContent = adElement.innerHTML.length > 0;
            const hasHeight = adElement.offsetHeight > 0;
            
            // If ad has no content or height, show house ad
            if (!hasContent || !hasHeight) {
              setShowHouseAd(true);
            }
          }
        }, 2000);
      } catch (err) {
        console.error("AdSense error:", err);
        setShowHouseAd(true);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Don't render ads in development - show house ads
  if (import.meta.env.DEV) {
    if (houseAdType === "banner") {
      return (
        <div className={className}>
          <p className="text-xs text-muted-foreground mb-2 text-center">Advertisement</p>
          <PromptAndGoBanner />
        </div>
      );
    }
    if (houseAdType === "mpu") {
      return (
        <div className={className}>
          <p className="text-xs text-muted-foreground mb-2 text-center">Advertisement</p>
          <BusinessInAByteAd />
        </div>
      );
    }
    return (
      <div
        className={`bg-muted border border-border rounded-lg flex items-center justify-center text-muted-foreground text-sm ${className}`}
        style={{ minHeight: "280px" }}
      >
        Ad Placeholder ({format})
      </div>
    );
  }

  // Show house ad if Google Ad failed to load
  if (showHouseAd) {
    if (houseAdType === "banner") {
      return (
        <div className={className}>
          <p className="text-xs text-muted-foreground mb-2 text-center">Advertisement</p>
          <PromptAndGoBanner />
        </div>
      );
    }
    if (houseAdType === "mpu") {
      return (
        <div className={className}>
          <p className="text-xs text-muted-foreground mb-2 text-center">Advertisement</p>
          <BusinessInAByteAd />
        </div>
      );
    }
    return null;
  }

  return (
    <ins
      ref={adRef as any}
      className={`adsbygoogle ${className}`}
      style={{ display: "block" }}
      data-ad-client={GOOGLE_ADS_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive.toString()}
    />
  );
};

export default GoogleAd;

// Pre-configured ad components for common placements
export const SidebarAd = ({ className = "" }: { className?: string }) => (
  <div className={className}>
    <GoogleAd
      slot="1044321413"
      format="vertical"
      houseAdType="mpu"
      placement="google_ad_sidebar"
    />
  </div>
);

export const InArticleAd = () => (
  <div className="my-8">
    <GoogleAd
      slot="3478913062"
      format="rectangle"
      houseAdType="mpu"
      placement="google_ad_in_article"
    />
  </div>
);

export const FooterAd = () => (
  <div className="container mx-auto px-4 py-6" style={{ minHeight: '120px', overflow: 'visible' }}>
    <GoogleAd
      slot="8539668053"
      format="horizontal"
      houseAdType="banner"
      placement="google_ad_footer"
    />
  </div>
);

// MPU Ad for Category pages (300x250)
export const MPUAd = ({ className = "" }: { className?: string }) => (
  <div className={className}>
    <GoogleAd
      slot="1044321413"
      format="rectangle"
      responsive={false}
      houseAdType="mpu"
      placement="google_ad_mpu"
    />
  </div>
);

// Load Google AdSense script
export const loadGoogleAdsScript = () => {
  if (
    import.meta.env.PROD &&
    !document.querySelector('script[src*="adsbygoogle"]')
  ) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GOOGLE_ADS_CLIENT}`;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }
};
