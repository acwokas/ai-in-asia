import { useState } from "react";
import { Bell, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DISMISSED_KEY = "event-alerts-dismissed";

const regions = [
  { value: "all", label: "All Regions" },
  { value: "APAC", label: "APAC" },
  { value: "Americas", label: "Americas" },
  { value: "EMEA", label: "EMEA" },
  { value: "Middle East & Africa", label: "Middle East & Africa" },
];

interface EventAlertSignupProps {
  sponsorName?: string | null;
  sponsorLogoUrl?: string | null;
  sponsorUrl?: string | null;
}

const EventAlertSignup = ({ sponsorName, sponsorLogoUrl, sponsorUrl }: EventAlertSignupProps) => {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISSED_KEY) === "true"
  );
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("all");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");

  if (dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const handleSubscribe = async () => {
    setError("");
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { error: dbError } = await supabase
        .from("event_alert_subscribers")
        .insert({ email: trimmed, region_preference: region });

      if (dbError) {
        if (dbError.code === "23505") {
          setError("This email is already subscribed.");
        } else {
          setError("Something went wrong. Please try again.");
        }
        return;
      }
      setSubscribed(true);
      toast.success("Subscribed to event alerts!");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const regionLabel = regions.find((r) => r.value === region)?.label ?? "All Regions";

  return (
    <section
      className="relative -mx-4 px-4 py-8 md:py-10 my-12 border-t border-b border-border/30"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--card) / 0.6) 0%, hsl(var(--card) / 0.3) 100%)",
      }}
    >
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-4 md:top-4 md:right-6 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="container mx-auto max-w-5xl">
        {subscribed ? (
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Check className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm md:text-base text-foreground">
              You're subscribed! We'll send weekly event alerts for{" "}
              <span className="font-semibold text-primary">{regionLabel}</span> to{" "}
              <span className="font-semibold text-primary">{email.trim()}</span>.
            </p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            {/* Left / Top */}
            <div className="flex items-start gap-3 md:min-w-[260px] shrink-0">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mt-0.5 shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3
                  className="text-lg font-extrabold leading-tight mb-1"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  Never Miss an AI Event
                </h3>
                <p className="text-sm text-muted-foreground">
                  Get weekly alerts for new events in your region
                </p>
              </div>
            </div>

            {/* Right / Bottom */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  className="h-10 bg-background border-border flex-1 min-w-0"
                />
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="h-10 w-full sm:w-[160px] bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="h-10 px-5 shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Subscribe →"
                  )}
                </Button>
              </div>
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Sponsor attribution */}
      {sponsorName && (
        <div className="container mx-auto max-w-5xl mt-3 flex items-center justify-center gap-2">
          <span className="text-[10px] text-muted-foreground/40">Event alerts powered by</span>
          {sponsorUrl ? (
            <a href={sponsorUrl} target="_blank" rel="noopener noreferrer sponsored" className="inline-flex items-center gap-1.5">
              {sponsorLogoUrl && <img src={sponsorLogoUrl} alt={sponsorName} className="h-3.5 w-auto" loading="lazy" />}
              <span className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">{sponsorName}</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              {sponsorLogoUrl && <img src={sponsorLogoUrl} alt={sponsorName} className="h-3.5 w-auto" loading="lazy" />}
              <span className="text-[10px] text-muted-foreground/60">{sponsorName}</span>
            </span>
          )}
        </div>
      )}
    </section>
  );
};

export default EventAlertSignup;
