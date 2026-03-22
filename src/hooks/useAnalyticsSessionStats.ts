import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsSessionStats {
  totalSessions: number;
  uniqueVisitors: number;
  avgEngagement: number;
}

export const useAnalyticsSessionStats = (startDate: string, range: string) => {
  return useQuery<AnalyticsSessionStats>({
    queryKey: ["analytics-hub-session-stats", range],
    queryFn: async () => {
      const endDate = new Date().toISOString();
      const [sessionsRes, uniqueRes, engagementRes] = await Promise.all([
        supabase
          .from("analytics_sessions")
          .select("id", { count: "exact", head: true })
          .gte("started_at", startDate),
        supabase.rpc("get_unique_visitors", {
          p_start: startDate,
          p_end: endDate,
        }),
        supabase.rpc("get_avg_engagement", {
          p_start: startDate,
          p_end: endDate,
        }),
      ]);

      return {
        totalSessions: sessionsRes.count ?? 0,
        uniqueVisitors: (uniqueRes.data as number) ?? 0,
        avgEngagement: (engagementRes.data as number) ?? 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });
};
