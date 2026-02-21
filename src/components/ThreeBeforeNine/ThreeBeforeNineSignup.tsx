import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const AMBER = "hsl(37, 78%, 60%)";

export default function ThreeBeforeNineSignup() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      const { data: existing } = await supabase
        .from("briefing_subscriptions")
        .select("id, is_active")
        .eq("email", email.toLowerCase())
        .eq("briefing_type", "3-before-9")
        .maybeSingle();

      if (existing?.is_active) {
        toast.info("You're already subscribed to 3-Before-9!");
        setIsSubscribed(true);
        return;
      }

      if (existing && !existing.is_active) {
        await supabase
          .from("briefing_subscriptions")
          .update({ is_active: true, unsubscribed_at: null })
          .eq("id", existing.id);
      } else {
        const { error } = await supabase
          .from("briefing_subscriptions")
          .insert({
            email: email.toLowerCase(),
            briefing_type: "3-before-9",
            is_active: true
          });
        if (error) throw error;
      }

      setIsSubscribed(true);
      toast.success("Welcome to 3-Before-9! Check your inbox weekday mornings.");
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="rounded-xl p-8 text-center border" style={{ backgroundColor: 'hsla(37, 78%, 60%, 0.1)', borderColor: 'hsla(37, 78%, 60%, 0.2)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'hsla(37, 78%, 60%, 0.2)' }}>
          <Check className="h-6 w-6" style={{ color: AMBER }} />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">You're in!</h3>
        <p className="text-muted-foreground text-sm">
          3-Before-9 will land in your inbox every weekday morning.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 border border-border rounded-xl p-8 text-center">
      <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'hsla(37, 78%, 60%, 0.2)' }}>
        <Mail className="h-5 w-5" style={{ color: AMBER }} />
      </div>
      <h3 className="text-[22px] font-bold text-foreground mb-1">
        Get 3-Before-9 in your inbox
      </h3>
      <p className="text-muted-foreground text-base mb-5">
        Three signals, every weekday, before 9am
      </p>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={isLoading}
          required
        />
        <Button 
          type="submit" 
          disabled={isLoading}
          className="px-6 text-white hover:opacity-90"
          style={{ backgroundColor: AMBER }}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Subscribe"
          )}
        </Button>
      </form>
      
      <p className="text-muted-foreground/60 text-[13px] mt-3">
        Free forever. Unsubscribe anytime. No spam.
      </p>
    </div>
  );
}
