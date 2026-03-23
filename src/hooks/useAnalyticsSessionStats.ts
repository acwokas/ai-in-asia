import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsSessionStats {
  totalSessions: number | null;
  uniqueVisitors: number | null;
  avgEngagement: number | null;
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
          supabase.rpc("get_total_sessions", { p_start: startDate, p_end: endDate }),
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

      const extract = (r: PromiseSettledResult<any>): number | null => {
        if (r.status !== "fulfilled") return null;
        const { data, error } = r.value ?? {};
        if (error || data == null) return null;
        return Number(data);
      };

      return {
        totalSessions: extract(results[0]),
        uniqueVisitors: extract(results[1]),
        avgEngagement: extract(results[2]),
      };
    },
    staleTime: 3 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
  });
};
