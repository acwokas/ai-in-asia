import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Central helper: awards points, checks achievements, optionally toasts.
 */
export async function awardPoints(userId: string, points: number, reason?: string) {
  try {
    await supabase.rpc("award_points", { _user_id: userId, _points: points });

    // Check for new achievements
    const { data: before } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);
    const beforeIds = new Set((before || []).map((a) => a.achievement_id));

    await supabase.rpc("check_and_award_achievements", { _user_id: userId });

    const { data: after } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    const newAchievements = (after || []).filter(
      (a) => !beforeIds.has(a.achievement_id)
    );

    if (newAchievements.length > 0) {
      // Fetch names of newly earned achievements
      const newIds = newAchievements.map((a) => a.achievement_id);
      const { data: achievementData } = await supabase
        .from("achievements")
        .select("name")
        .in("id", newIds);

      for (const ach of achievementData || []) {
        toast("Achievement Unlocked!", {
          description: ach.name,
          duration: 5000,
        });
      }
    }

    if (reason) {
      toast(`+${points} points - ${reason}`, { duration: 3000 });
    }
  } catch (err) {
    console.error("Failed to award points:", err);
  }
}
