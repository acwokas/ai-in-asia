import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Props {
  startDate: string;
  range: string;
}

export const NewUsersSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-new-users", range],
    queryFn: async () => {
      const [profilesRes, recentSessionsRes, landingRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, created_at, avatar_url")
          .gte("created_at", startDate)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("analytics_sessions")
          .select("session_id, user_id, started_at, landing_page, device_type, referrer_domain")
          .gte("started_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
          .order("started_at", { ascending: false })
          .limit(50),
        supabase
          .from("analytics_sessions")
          .select("landing_page")
          .gte("started_at", startDate)
          .not("landing_page", "is", null)
          .limit(1000),
      ]);

      const profiles = profilesRes.data || [];
      const recentSessions = recentSessionsRes.data || [];
      const landings = landingRes.data || [];

      // Top landing pages
      const landingCounts: Record<string, number> = {};
      landings.forEach(l => {
        const p = l.landing_page || "/";
        landingCounts[p] = (landingCounts[p] || 0) + 1;
      });
      const topLandings = Object.entries(landingCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([page, count]) => ({ page, count }));

      return {
        newUserCount: profiles.length,
        recentProfiles: profiles.slice(0, 8),
        activeNow: recentSessions.length,
        recentSessions: recentSessions.slice(0, 8),
        topLandings,
      };
    },
    staleTime: 60 * 1000, // refresh more often for real-time feel
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold text-green-500">{data?.newUserCount ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">New Signups</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold text-cyan-500">{data?.activeNow ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Sessions (last 15 min)</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium mb-2">Top Landing Pages</p>
          {data?.topLandings.map(l => (
            <div key={l.page} className="flex justify-between text-xs py-0.5">
              <span className="truncate max-w-[180px] font-mono">{l.page}</span>
              <Badge variant="outline" className="text-[10px] h-5">{l.count}</Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-2">Recent Signups</h4>
          <div className="space-y-1.5">
            {data?.recentProfiles.length ? data.recentProfiles.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-xs border rounded p-2">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                  {(p.username || "?")[0]?.toUpperCase()}
                </div>
                <span className="truncate flex-1">{p.username || "—"}</span>
                <span className="text-muted-foreground">{format(new Date(p.created_at), "MMM d")}</span>
              </div>
            )) : <p className="text-xs text-muted-foreground">No signups in this period</p>}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Live Sessions</h4>
          <div className="space-y-1.5">
            {data?.recentSessions.length ? data.recentSessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs border rounded p-2">
                <span className="font-mono truncate max-w-[140px]">{s.landing_page || "/"}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-5">{s.device_type || "?"}</Badge>
                  <span className="text-muted-foreground">{s.referrer_domain || "direct"}</span>
                </div>
              </div>
            )) : <p className="text-xs text-muted-foreground">No active sessions</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
