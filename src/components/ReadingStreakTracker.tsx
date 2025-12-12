import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Flame, TrendingUp, Trophy, Calendar, Mail, ArrowRight } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { z } from "zod";

const emailSchema = z.string().trim().email().max(255);

const ReadingStreakTracker = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewsletter, setShowNewsletter] = useState(false);

  useEffect(() => {
    // Show newsletter prompt if not subscribed
    const subscribed = localStorage.getItem("newsletter-subscribed");
    setShowNewsletter(subscribed !== "true");
  }, []);

  const { data: streak } = useQuery({
    queryKey: ["reading-streak", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reading_streaks")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const updateStreak = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("update_reading_streak", {
        p_user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading-streak", user?.id] });
    },
  });

  useEffect(() => {
    if (user) {
      updateStreak.mutate();
    }
  }, [user]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedEmail = emailSchema.parse(email);
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert([{ email: validatedEmail }]);

      if (error && error.code !== "23505") throw error;

      localStorage.setItem("newsletter-subscribed", "true");
      setShowNewsletter(false);
      toast({
        title: "Subscribed!",
        description: "You'll get our weekly AI digest.",
      });
    } catch {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !streak) return null;

  const currentStreak = streak.current_streak || 0;
  const longestStreak = streak.longest_streak || 0;
  const totalArticles = streak.total_articles_read || 0;

  const getStreakBadge = (days: number) => {
    if (days >= 30) return { icon: Trophy, label: "Legend", color: "text-yellow-500" };
    if (days >= 14) return { icon: TrendingUp, label: "On Fire", color: "text-orange-500" };
    if (days >= 7) return { icon: Flame, label: "Hot Streak", color: "text-red-500" };
    return { icon: Calendar, label: "Getting Started", color: "text-blue-500" };
  };

  const badge = getStreakBadge(currentStreak);
  const BadgeIcon = badge.icon;

  return (
    <Card className="p-4 h-full bg-gradient-to-br from-primary/5 to-background border-primary/20">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-full bg-background ${badge.color}`}>
          <BadgeIcon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Reading Streak</h3>
          <Badge variant="secondary" className="text-xs">{badge.label}</Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-bold text-primary">{currentStreak}</div>
          <div className="text-xs text-muted-foreground">Current</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{longestStreak}</div>
          <div className="text-xs text-muted-foreground">Best</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{totalArticles}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
      </div>

      {/* Newsletter integration */}
      {showNewsletter && (
        <div className="mt-4 pt-4 border-t border-primary/20">
          <p className="text-xs text-muted-foreground mb-2">
            Keep your streak going with our weekly digest
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
            <Input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-8 text-xs"
              required
              disabled={isSubmitting}
            />
            <Button type="submit" size="sm" className="h-8 px-2" disabled={isSubmitting}>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
};

export default ReadingStreakTracker;
