import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsSessionStats {
  totalSessions: number;
  uniqueVisitors: number;
  avgEngagement: number;
}

const RPC_TIMEOUT_MS = 10_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Query timed out")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export const useAnalyticsSessionStats = (startDate: string, range: string) => {
  return useQuery<AnalyticsSessionStats>({
    queryKey: ["analytics-hub-session-stats", range],
    queryFn: async () => {
      const endDate = new Date().toISOString();

      const sessionsPromise = withTimeout(
        supabase
          .from("analytics_sessions")
          .select("id", { count: "exact", head: true })
          .gte("started_at", startDate),
        RPC_TIMEOUT_MS,
      );

      const uniquePromise = withTimeout(
        supabase.rpc("get_unique_visitors", {
          p_start: startDate,
          p_end: endDate,
        }),
        RPC_TIMEOUT_MS,
      );

      const engagementPromise = withTimeout(
        supabase.rpc("get_avg_engagement", {
          p_start: startDate,
          p_end: endDate,
        }),
        RPC_TIMEOUT_MS,
      );

      const [sessionsRes, uniqueRes, engagementRes] = await Promise.allSettled([
        sessionsPromise,
        uniquePromise,
        engagementPromise,
      ]);

      return {
        totalSessions:
          sessionsRes.status === "fulfilled" ? (sessionsRes.value.count ?? 0) : 0,
        uniqueVisitors:
          uniqueRes.status === "fulfilled"
            ? ((uniqueRes.value.data as number) ?? 0)
            : 0,
        avgEngagement:
          engagementRes.status === "fulfilled"
            ? ((engagementRes.value.data as number) ?? 0)
            : 0,
      };
    },
    staleTime: 3 * 60 * 1000,
    retry: 1,
    retryDelay: 2000,
  });
};
