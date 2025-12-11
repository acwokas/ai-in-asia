import { useState } from "react";
import { Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" }).max(255);

interface InlineNewsletterSignupProps {
  variant?: "default" | "compact";
}

const InlineNewsletterSignup = ({ variant = "default" }: InlineNewsletterSignupProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedEmail = emailSchema.parse(email);

      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert([{ email: validatedEmail }]);

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
        setIsSubscribed(true);
        toast({
          title: "Successfully subscribed!",
          description: "Welcome to the AI in ASIA newsletter!",
        });
      }
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

  if (isSubscribed) {
    return (
      <div className="my-8 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary" />
        <p className="font-semibold text-lg">You're in!</p>
        <p className="text-sm text-muted-foreground">Thanks for subscribing. Check your inbox soon.</p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="my-6 p-4 rounded-lg bg-muted/50 border border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="email"
            placeholder="Your email for weekly AI insights"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            required
            disabled={isSubmitting}
          />
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "..." : "Subscribe"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="my-10 p-6 md:p-8 rounded-xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border border-primary/20">
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 shrink-0">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Enjoying this? Get more in your inbox.</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Weekly AI news, insights, and prompts from across Asia. No spam, unsubscribe anytime.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              required
              disabled={isSubmitting}
            />
            <Button type="submit" disabled={isSubmitting} className="shrink-0">
              {isSubmitting ? "Subscribing..." : "Subscribe Free"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InlineNewsletterSignup;
