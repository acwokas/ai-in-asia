import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsSessionStats {
  totalSessions: number;
  uniqueVisitors: number;
  avgEngagement: number;
}

const TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Query timed out")), ms)
    ),
  ]);
}

export const useAnalyticsSessionStats = (startDate: string, range: string) => {
  return useQuery<AnalyticsSessionStats>({
    queryKey: ["analytics-hub-session-stats", range],
    queryFn: async () => {
      const endDate = new Date().toISOString();

      const results = await Promise.allSettled([
        withTimeout(
          supabase
            .from("analytics_sessions")
            .select("id", { count: "exact", head: true })
            .gte("started_at", startDate),
          TIMEOUT_MS,
        ),
        withTimeout(
          supabase.rpc("get_unique_visitors", { p_start: startDate, p_end: endDate }),
          TIMEOUT_MS,
        ),
        withTimeout(
          supabase.rpc("get_avg_engagement", { p_start: startDate, p_end: endDate }),
          TIMEOUT_MS,
        ),
      ]);

      const sessionsRes = results[0].status === "fulfilled" ? results[0].value : null;
      const uniqueRes = results[1].status === "fulfilled" ? results[1].value : null;
      const engagementRes = results[2].status === "fulfilled" ? results[2].value : null;

      return {
        totalSessions: (sessionsRes as any)?.count ?? 0,
        uniqueVisitors: ((uniqueRes as any)?.data as number) ?? 0,
        avgEngagement: ((engagementRes as any)?.data as number) ?? 0,
      };
    },
    staleTime: 3 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
  });
};
