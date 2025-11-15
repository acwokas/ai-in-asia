import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Flame, TrendingUp, Trophy, Calendar } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { useEffect } from "react";

const ReadingStreakTracker = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-background border-primary/20">
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
    </Card>
  );
};

export default ReadingStreakTracker;
