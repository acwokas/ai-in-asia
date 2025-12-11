import { useState } from "react";
import { Mail, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" }).max(255);

const EndOfContentNewsletter = () => {
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
            description: "You're already on our list!",
          });
          setIsSubscribed(true);
        } else {
          throw error;
        }
      } else {
        localStorage.setItem("newsletter-subscribed", "true");
        setIsSubscribed(true);
        toast({
          title: "You're in!",
          description: "Welcome to the AI in ASIA newsletter.",
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
      <div className="my-12 p-8 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">You're on the list!</h3>
        <p className="text-muted-foreground">
          Thanks for subscribing. We'll send you the best AI content from Asia every week.
        </p>
      </div>
    );
  }

  return (
    <div className="my-12 p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border border-primary/20">
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Liked this? There's more.</h3>
        <p className="text-muted-foreground mb-6">
          Join our weekly newsletter for the latest AI news, tools, and insights from across Asia. 
          Free, no spam, unsubscribe anytime.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            required
            disabled={isSubmitting}
          />
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? "Subscribing..." : (
              <>
                Subscribe <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default EndOfContentNewsletter;
