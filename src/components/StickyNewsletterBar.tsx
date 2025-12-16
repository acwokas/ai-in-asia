import { useState, useEffect } from "react";
import { X, Sparkles, ArrowRight } from "lucide-react";
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
    const dismissed = localStorage.getItem("newsletter-bar-dismissed");
    const subscribed = localStorage.getItem("newsletter-subscribed");
    
    if (dismissed === "true" || subscribed === "true") {
      setIsDismissed(true);
      return;
    }

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
    <div className="hidden sm:block fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom duration-500">
      {/* Gradient border top */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="bg-background/95 backdrop-blur-md border-t border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Left side - branding & text */}
            <div className="flex items-center gap-4">
              <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-foreground">
                  Stay ahead of the curve
                </p>
                <p className="text-xs text-muted-foreground">
                  Weekly AI insights from across Asia
                </p>
              </div>
              <p className="text-sm font-medium text-foreground lg:hidden">
                Get weekly AI insights
              </p>
            </div>

            {/* Center - form */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative flex-1">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 pr-4 bg-muted/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 text-sm"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <Button 
                type="submit" 
                size="sm"
                disabled={isSubmitting}
                className="h-10 px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <>
                    Subscribe
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Right side - dismiss */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyNewsletterBar;
