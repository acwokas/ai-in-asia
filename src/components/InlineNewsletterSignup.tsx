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
    <div className="my-6 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 shrink-0">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-0.5">Enjoying this? Get more in your inbox.</h3>
            <p className="text-xs text-muted-foreground">Weekly AI news & insights from Asia.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto sm:shrink-0">
          <Input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 sm:w-40 h-9 text-sm"
            required
            disabled={isSubmitting}
          />
          <Button type="submit" size="sm" disabled={isSubmitting} className="h-9 shrink-0">
            {isSubmitting ? "..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default InlineNewsletterSignup;
