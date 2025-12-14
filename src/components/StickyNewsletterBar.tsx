import { useState, useEffect } from "react";
import { X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" }).max(255);

const StickyNewsletterBar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has dismissed or already subscribed
    const dismissed = localStorage.getItem("newsletter-bar-dismissed");
    const subscribed = localStorage.getItem("newsletter-subscribed");
    
    if (dismissed === "true" || subscribed === "true") {
      setIsDismissed(true);
      return;
    }

    // Show after scrolling 30% of page
    const handleScroll = () => {
      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercentage > 30) {
        setIsVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem("newsletter-bar-dismissed", "true");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedEmail = emailSchema.parse(email);

      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert([{ email: validatedEmail, signup_source: "sticky_bar" }]);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already subscribed",
            description: "This email is already on our newsletter list.",
          });
        } else {
          throw error;
        }
      } else {
        localStorage.setItem("newsletter-subscribed", "true");
        toast({
          title: "Successfully subscribed!",
          description: "Welcome to the AI in ASIA newsletter!",
        });
      }
      
      setIsVisible(false);
      setIsDismissed(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid email",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Something went wrong",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDismissed || !isVisible) return null;

  return (
    <div className="hidden sm:block fixed bottom-0 left-0 right-0 z-40 bg-primary text-primary-foreground shadow-lg animate-in slide-in-from-bottom duration-300">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Mail className="h-5 w-5 shrink-0 hidden sm:block" />
            <span className="text-sm font-medium hidden md:block">
              Get weekly AI insights from Asia
            </span>
            <form onSubmit={handleSubmit} className="flex gap-2 flex-1 max-w-md">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60"
                required
                disabled={isSubmitting}
              />
              <Button 
                type="submit" 
                variant="secondary" 
                size="sm"
                disabled={isSubmitting}
                className="shrink-0"
              >
                {isSubmitting ? "..." : "Subscribe"}
              </Button>
            </form>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 shrink-0 text-primary-foreground hover:bg-primary-foreground/10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StickyNewsletterBar;
