import { useState } from "react";
import { X } from "lucide-react";
import GoogleAd from "./GoogleAds";

const MobileAnchorAd = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-background border-t border-border shadow-lg">
      <div className="relative">
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-6 right-2 bg-background border border-border rounded-full p-0.5 shadow-sm"
          aria-label="Close ad"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <p className="text-[10px] text-muted-foreground text-center pt-1">Advertisement</p>
        <GoogleAd
          slot="8539668053"
          format="horizontal"
          houseAdType="banner"
        />
      </div>
    </div>
  );
};

export default MobileAnchorAd;
