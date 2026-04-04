import { useState, useEffect, useCallback, useRef } from "react";
import { X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";
import { isNewsletterSubscribed, markNewsletterSubscribed, awardNewsletterPoints } from "@/lib/newsletterUtils";
import { trackEvent } from "@/components/GoogleAnalytics";

const emailSchema = z.string().trim().email().max(255);

const DISMISS_KEY = "aiia_newsletter_popup_dismissed";
const SESSION_KEY = "aiia_newsletter_popup_shown_session";
const DISMISS_DAYS = 14;

function wasDismissedRecently(): boolean {
  const ts = localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  const elapsed = Date.now() - parseInt(ts, 10);
  return elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function wasShownThisSession(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "true";
}

function markShownThisSession() {
  sessionStorage.setItem(SESSION_KEY, "true");
}

function markDismissed() {
  localStorage.setItem(DISMISS_KEY, Date.now().toString());
}

const NewsletterPopup = () => {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const triggered = useRef(false);
  const { user } = useAuth();

  const shouldSuppress =
    isNewsletterSubscribed() || wasDismissedRecently() || wasShownThisSession();

  // Trigger logic: 60% scroll OR 45s on site
  useEffect(() => {
    if (shouldSuppress) return;

    const show = () => {
      if (triggered.current) return;
      triggered.current = true;
      markShownThisSession();
      setVisible(true);
      trackEvent("newsletter_popup", { action: "shown" });
    };

    const handleScroll = () => {
      const scrollPercent =
        window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrollPercent >= 0.6) show();
    };

    const timer = setTimeout(show, 45_000);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [shouldSuppress]);

  const handleClose = useCallback(() => {
    setVisible(false);
    markDismissed();
    trackEvent("newsletter_popup", "engagement", "dismissed");
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        const validatedEmail = emailSchema.parse(email);

        const { data: existing } = await supabase
          .from("newsletter_subscribers")
          .select("id, unsubscribed_at")
          .eq("email", validatedEmail)
          .maybeSingle();

        if (existing) {
          if (!existing.unsubscribed_at) {
            toast.info("Already subscribed", { description: "You're already on our list!" });
          } else {
            await supabase
              .from("newsletter_subscribers")
              .update({ unsubscribed_at: null })
              .eq("id", existing.id);
            toast.success("Welcome back!", { description: "You've been re-subscribed." });
          }
        } else {
          const { error } = await supabase
            .from("newsletter_subscribers")
            .insert({ email: validatedEmail, signup_source: "popup" });
          if (error) throw error;
          toast.success("Subscribed!", { description: "Welcome to AI in Asia." });
          await awardNewsletterPoints(user?.id ?? null, supabase);
        }

        markNewsletterSubscribed();
        setIsSubscribed(true);
        trackEvent("newsletter_popup", "engagement", "subscribed");

        setTimeout(() => setVisible(false), 2000);
      } catch (err: any) {
        if (err instanceof z.ZodError) {
          toast.error("Please enter a valid email address");
        } else {
          toast.error("Something went wrong", { description: "Please try again." });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, user]
  );

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-amber-500" />
          </div>
        </div>

        {isSubscribed ? (
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold">You're in! 🎉</h2>
            <p className="text-sm text-muted-foreground">
              Check your inbox for the latest AI insights from across Asia.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2 mb-6">
              <h2 className="text-xl font-bold leading-tight">
                Join 5,000+ AI professionals across Asia
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get the week's most important AI stories, policy updates, and tool reviews — delivered free every week.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
                autoFocus
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-semibold cursor-pointer"
              >
                {isSubmitting ? "Subscribing…" : "Subscribe — It's Free"}
              </Button>
            </form>

            <p className="text-[11px] text-muted-foreground text-center mt-3">
              No spam. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default NewsletterPopup;
