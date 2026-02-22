import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useStreakTracker } from "./useStreakTracker";

/**
 * Engagement hook: welcome-back toast for returning users + streak tracking.
 */
export function useEngagementLoop() {
  const { user } = useAuth();

  // Run streak tracker
  useStreakTracker();

  useEffect(() => {
    if (!user) return;

    const checkReturnVisitor = async () => {
      const sessionKey = "engagement-loop-checked";
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, "1");

      try {
        const { data: stats } = await supabase
          .from("user_stats")
          .select("last_active_date")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!stats?.last_active_date) return;

        const lastActive = new Date(stats.last_active_date);
        const now = new Date();
        const daysSince = Math.floor(
          (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSince >= 7) {
          // Count new articles since last visit
          const { count } = await supabase
            .from("articles")
            .select("id", { count: "exact", head: true })
            .eq("status", "published")
            .gte("published_at", lastActive.toISOString());

          toast("Welcome back!", {
            description: `${count || 0} new articles since your last visit.`,
            duration: 5000,
          });
        }
      } catch (err) {
        console.error("Engagement loop error:", err);
      }
    };

    checkReturnVisitor();
  }, [user]);
}
