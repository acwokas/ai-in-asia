import { useState, useEffect } from "react";
import { X, Mail, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email" }).max(255);

const FloatingNewsletterPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed or subscribed
    const dismissed = localStorage.getItem("floating-newsletter-dismissed");
    const subscribed = localStorage.getItem("newsletter-subscribed");
    
    if (dismissed || subscribed) {
      setIsDismissed(true);
      return;
    }

    // Show popup after scrolling 40% of the page or after 15 seconds
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent > 40 && !isDismissed) {
        setIsVisible(true);
        window.removeEventListener("scroll", handleScroll);
      }
    };

    const timer = setTimeout(() => {
      if (!isDismissed) {
        setIsVisible(true);
      }
    }, 15000);

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // Remember dismissal for 7 days
    localStorage.setItem("floating-newsletter-dismissed", Date.now().toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast({
        title: "Invalid email",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Check if already subscribed
      const { data: existing } = await supabase
        .from("newsletter_subscribers")
        .select("id, unsubscribed_at")
        .eq("email", validation.data)
        .maybeSingle();

      if (existing && !existing.unsubscribed_at) {
        toast({
          title: "Already subscribed",
          description: "You're already on our list!",
        });
        localStorage.setItem("newsletter-subscribed", "true");
        setIsVisible(false);
        return;
      }

      if (existing && existing.unsubscribed_at) {
        // Resubscribe
        await supabase
          .from("newsletter_subscribers")
          .update({ unsubscribed_at: null, confirmed: true })
          .eq("id", existing.id);
      } else {
        // New subscription
        await supabase
          .from("newsletter_subscribers")
          .insert({ email: validation.data, confirmed: true });
      }

      toast({
        title: "Welcome aboard!",
        description: "You've successfully subscribed to our newsletter.",
      });
      
      localStorage.setItem("newsletter-subscribed", "true");
      setIsVisible(false);
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 slide-in-from-right-5 duration-300">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-5 w-[380px] max-w-[calc(100vw-2rem)] relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="pr-6">
            <h3 className="font-semibold text-lg text-foreground">
              Enjoying this article?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get the latest AI insights delivered straight to your inbox. No spam, just quality content.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 h-10"
              required
              maxLength={255}
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="h-10 px-5">
            {isSubmitting ? "..." : "Subscribe"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          Join 10,000+ readers. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
};

export default FloatingNewsletterPopup;
