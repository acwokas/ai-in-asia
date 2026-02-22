import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { awardPoints } from "@/lib/gamification";

/**
 * Tracks daily visit streaks for authenticated users.
 * Awards 3 points per day visited.
 */
export function useStreakTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const trackStreak = async () => {
      const today = new Date().toISOString().split("T")[0];
      const sessionKey = `streak-tracked-${today}`;

      // Only run once per day per session
      if (sessionStorage.getItem(sessionKey)) return;

      try {
        const { data: stats } = await supabase
          .from("user_stats")
          .select("last_active_date, streak_days")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!stats) return;

        const lastActive = stats.last_active_date;
        const currentStreak = stats.streak_days || 0;

        if (lastActive === today) {
          // Already tracked today
          sessionStorage.setItem(sessionKey, "1");
          return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let newStreak: number;
        if (lastActive === yesterdayStr) {
          newStreak = currentStreak + 1;
        } else {
          newStreak = 1;
        }

        await supabase
          .from("user_stats")
          .update({
            last_active_date: today,
            streak_days: newStreak,
          })
          .eq("user_id", user.id);

        await awardPoints(user.id, 3);

        sessionStorage.setItem(sessionKey, "1");
      } catch (err) {
        console.error("Streak tracking error:", err);
      }
    };

    trackStreak();
  }, [user]);
}
