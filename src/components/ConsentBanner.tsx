import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const ConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Show banner after 2 seconds
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] bg-card border-t border-border shadow-lg pb-[env(safe-area-inset-bottom)] max-h-[50vh] overflow-y-auto">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col gap-3">
          {/* Header with close button on mobile */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Cookie Consent</h3>
            <button
              type="button"
              onClick={handleDecline}
              className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground md:hidden"
              aria-label="Dismiss cookie banner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            We use cookies to enhance your browsing experience, serve personalised
            ads or content, and analyse our traffic.{" "}
            <a href="/cookie-policy" className="text-primary hover:underline">
              Learn more
            </a>
          </p>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleDecline} size="sm">
              Decline
            </Button>
            <Button onClick={handleAccept} size="sm">
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
