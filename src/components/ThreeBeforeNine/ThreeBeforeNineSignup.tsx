import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

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
      // Check for existing subscription
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
        // Reactivate subscription
        await supabase
          .from("briefing_subscriptions")
          .update({ is_active: true, unsubscribed_at: null })
          .eq("id", existing.id);
      } else {
        // New subscription
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
      <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <Check className="h-6 w-6 text-amber-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">You're in!</h3>
        <p className="text-slate-400 text-sm">
          3-Before-9 will land in your inbox every weekday morning.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Mail className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Get 3-Before-9 in your inbox
          </h3>
          <p className="text-slate-400 text-sm">
            Three signals, every weekday, before 9am.
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20"
          disabled={isLoading}
          required
        />
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-6"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Subscribe"
          )}
        </Button>
      </form>
      
      <p className="text-slate-500 text-xs mt-3 text-center sm:text-left">
        Free forever. Unsubscribe anytime. No spam.
      </p>
    </div>
  );
}
