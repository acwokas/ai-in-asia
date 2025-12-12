import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Flame, TrendingUp, Trophy, Calendar, Mail, ArrowRight, Star, Zap, Target, Award } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { z } from "zod";

const emailSchema = z.string().trim().email().max(255);

const LEVEL_THRESHOLDS = {
  explorer: { min: 0, max: 99, next: "Enthusiast", nextPoints: 100 },
  enthusiast: { min: 100, max: 499, next: "Expert", nextPoints: 500 },
  expert: { min: 500, max: 999, next: "Thought Leader", nextPoints: 1000 },
  thought_leader: { min: 1000, max: Infinity, next: null, nextPoints: null },
};

const ReadingStreakTracker = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewsletter, setShowNewsletter] = useState(false);

  useEffect(() => {
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

  const { data: userStats } = useQuery({
    queryKey: ["user-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: nextAchievement } = useQuery({
    queryKey: ["next-achievement", user?.id],
    enabled: !!user && !!userStats,
    queryFn: async () => {
      // Get user's earned achievements
      const { data: earned } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", user!.id);

      const earnedIds = earned?.map(e => e.achievement_id) || [];

      // Get next unearned achievement
      const { data: achievements } = await supabase
        .from("achievements")
        .select("*")
        .order("points_required", { ascending: true });

      // Find the first unearned achievement
      return achievements?.find(a => !earnedIds.includes(a.id)) || null;
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

  // User stats
  const points = userStats?.points || 0;
  const level = (userStats?.level as keyof typeof LEVEL_THRESHOLDS) || "explorer";
  const levelInfo = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS.explorer;
  const progressToNext = levelInfo.nextPoints 
    ? Math.min(((points - levelInfo.min) / (levelInfo.nextPoints - levelInfo.min)) * 100, 100)
    : 100;

  const getStreakBadge = (days: number) => {
    if (days >= 30) return { icon: Trophy, label: "Legend", color: "text-yellow-500" };
    if (days >= 14) return { icon: TrendingUp, label: "On Fire", color: "text-orange-500" };
    if (days >= 7) return { icon: Flame, label: "Hot Streak", color: "text-red-500" };
    return { icon: Calendar, label: "Getting Started", color: "text-blue-500" };
  };

  const getLevelIcon = (lvl: string) => {
    switch (lvl) {
      case "thought_leader": return Trophy;
      case "expert": return Star;
      case "enthusiast": return Zap;
      default: return Target;
    }
  };

  const badge = getStreakBadge(currentStreak);
  const BadgeIcon = badge.icon;
  const LevelIcon = getLevelIcon(level);

  const formatLevel = (lvl: string) => {
    return lvl.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <Card className="p-4 h-full bg-gradient-to-br from-primary/5 to-background border-primary/20">
      {/* Header with streak badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full bg-background ${badge.color}`}>
            <BadgeIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Your Progress</h3>
            <Badge variant="secondary" className="text-xs">{badge.label}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-xs font-semibold text-primary">{points} pts</span>
        </div>
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 text-center mb-4">
        <div className="bg-background/50 rounded-lg p-2">
          <div className="text-xl font-bold text-primary">{currentStreak}</div>
          <div className="text-[10px] text-muted-foreground">Streak</div>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <div className="text-xl font-bold">{longestStreak}</div>
          <div className="text-[10px] text-muted-foreground">Best</div>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <div className="text-xl font-bold">{totalArticles}</div>
          <div className="text-[10px] text-muted-foreground">Articles</div>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <div className="text-xl font-bold">{userStats?.comments_made || 0}</div>
          <div className="text-[10px] text-muted-foreground">Comments</div>
        </div>
      </div>

      {/* Level progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <LevelIcon className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium">{formatLevel(level)}</span>
          </div>
          {levelInfo.next && (
            <span className="text-[10px] text-muted-foreground">
              {levelInfo.nextPoints! - points} pts to {levelInfo.next}
            </span>
          )}
        </div>
        <Progress value={progressToNext} className="h-1.5" />
      </div>

      {/* Next achievement */}
      {nextAchievement && (
        <div className="flex items-center gap-2 p-2 bg-accent/30 rounded-lg mb-4">
          <Award className="h-4 w-4 text-accent-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{nextAchievement.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{nextAchievement.description}</p>
          </div>
        </div>
      )}

      {/* Newsletter integration */}
      {showNewsletter && (
        <div className="pt-3 border-t border-primary/20">
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
