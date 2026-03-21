import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Props {
  startDate: string;
  range: string;
}

export const ReturningUsersSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-returning", range],
    queryFn: async () => {
      const [sessionsRes, streaksRes, readingHistoryRes] = await Promise.all([
        supabase
          .from("analytics_sessions")
          .select("user_id, session_id, is_bounce, duration_seconds, page_count")
          .gte("started_at", startDate)
          .limit(1000),
        supabase
          .from("reading_streaks")
          .select("user_id, current_streak, longest_streak, total_articles_read")
          .order("current_streak", { ascending: false })
          .limit(20),
        supabase
          .from("reading_history")
          .select("user_id")
          .gte("read_at", startDate)
          .limit(1000),
      ]);

      const sessions = sessionsRes.data || [];
      const streaks = streaksRes.data || [];
      const history = readingHistoryRes.data || [];

      // Count sessions per user
      const userSessionCounts: Record<string, number> = {};
      sessions.forEach(s => {
        const key = s.user_id || s.session_id;
        userSessionCounts[key] = (userSessionCounts[key] || 0) + 1;
      });
      const totalUnique = Object.keys(userSessionCounts).length;
      const returning = Object.values(userSessionCounts).filter(c => c > 1).length;
      const returnRate = totalUnique > 0 ? Math.round((returning / totalUnique) * 100) : 0;

      const bounceRate = sessions.length > 0
        ? Math.round((sessions.filter(s => s.is_bounce).length / sessions.length) * 100)
        : 0;

      const avgPages = sessions.length > 0
        ? (sessions.reduce((s, v) => s + (v.page_count || 1), 0) / sessions.length).toFixed(1)
        : "0";

      const readingUsers = new Set(history.map(h => h.user_id)).size;

      return {
        returnRate,
        bounceRate,
        avgPages,
        returning,
        totalUnique,
        readingUsers,
        topStreaks: streaks.slice(0, 8),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Return Rate", value: `${data?.returnRate}%`, sub: `${data?.returning}/${data?.totalUnique}` },
          { label: "Bounce Rate", value: `${data?.bounceRate}%` },
          { label: "Avg Pages/Session", value: data?.avgPages || "0" },
          { label: "Active Readers", value: data?.readingUsers ?? 0 },
        ].map(s => (
          <div key={s.label} className="rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            {s.sub && <p className="text-[10px] text-muted-foreground">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Top Reading Streaks</h4>
        <div className="space-y-2">
          {data?.topStreaks.length ? data.topStreaks.map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-sm border rounded p-2">
              <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center rounded-full p-0">
                {i + 1}
              </Badge>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span>Current: {s.current_streak}d</span>
                  <span className="text-muted-foreground">Best: {s.longest_streak}d</span>
                </div>
                <Progress value={Math.min((s.current_streak / Math.max(s.longest_streak, 1)) * 100, 100)} className="h-1.5" />
              </div>
              <span className="text-xs text-muted-foreground">{s.total_articles_read} read</span>
            </div>
          )) : <p className="text-xs text-muted-foreground">No streak data yet</p>}
        </div>
      </div>
    </div>
  );
};
