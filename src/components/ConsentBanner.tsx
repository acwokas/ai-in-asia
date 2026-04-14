import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getConsent, setConsent, loadTrackingScripts, removeTrackingScripts } from "@/lib/cookieConsent";

const ConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (consent === "accepted") {
      loadTrackingScripts();
      return;
    }
    if (consent === null) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    // declined — do nothing
  }, []);

  const handleAccept = () => {
    setConsent("accepted");
    setIsVisible(false);
    loadTrackingScripts();
  };

  const handleDecline = () => {
    setConsent("declined");
    setIsVisible(false);
    removeTrackingScripts();
  };

  return (
    <div
      data-nosnippet
      className={`fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4 transition-all duration-500 ease-out ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="w-full max-w-4xl bg-card border-t border-border shadow-lg rounded-t-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <p className="text-sm text-muted-foreground flex-1">
            We use cookies to enhance your experience. By continuing to visit
            this site you agree to our use of cookies.{" "}
            <Link
              to="/cookie-policy"
              className="text-primary hover:underline font-medium"
            >
              Cookie Policy
            </Link>
          </p>

          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              className="min-w-[80px]"
            >
              Decline
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="min-w-[80px] bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
