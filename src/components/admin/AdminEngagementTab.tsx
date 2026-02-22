import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, Flame, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { iconMap } from "@/lib/iconMap";

const STALE = 5 * 60 * 1000;
const sevenDaysAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

function StatCard({ title, value, icon: Icon, loading }: { title: string; value: number | string; icon: any; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{value}</div>}
      </CardContent>
    </Card>
  );
}

export function AdminEngagementTab() {
  const cutoff = sevenDaysAgo();

  // Active readers
  const { data: activeReaders = 0, isLoading: l1 } = useQuery({
    queryKey: ["admin-engagement-active-readers"],
    staleTime: STALE,
    queryFn: async () => {
      const { data } = await supabase.from("reading_history").select("user_id").gte("read_at", cutoff);
      return new Set(data?.map(r => r.user_id)).size;
    },
  });

  // Articles read
  const { data: articlesRead = 0, isLoading: l2 } = useQuery({
    queryKey: ["admin-engagement-articles-read"],
    staleTime: STALE,
    queryFn: async () => {
      const { count } = await supabase.from("reading_history").select("*", { count: "exact", head: true }).gte("read_at", cutoff);
      return count || 0;
    },
  });

  // Active streaks
  const { data: activeStreaks = 0, isLoading: l3 } = useQuery({
    queryKey: ["admin-engagement-active-streaks"],
    staleTime: STALE,
    queryFn: async () => {
      const { count } = await supabase.from("user_stats").select("*", { count: "exact", head: true }).gt("streak_days", 0);
      return count || 0;
    },
  });

  // Reactions 7d
  const { data: reactions7d = 0, isLoading: l4 } = useQuery({
    queryKey: ["admin-engagement-reactions-7d"],
    staleTime: STALE,
    queryFn: async () => {
      const { count } = await supabase.from("article_reactions").select("*", { count: "exact", head: true }).gte("created_at", cutoff);
      return count || 0;
    },
  });

  // Top articles by engagement
  const { data: topArticles = [], isLoading: l5 } = useQuery({
    queryKey: ["admin-engagement-top-articles"],
    staleTime: STALE,
    queryFn: async () => {
      const { data: reads } = await supabase.from("reading_history").select("article_id").gte("read_at", cutoff);
      if (!reads?.length) return [];

      const countMap: Record<string, number> = {};
      reads.forEach(r => { countMap[r.article_id] = (countMap[r.article_id] || 0) + 1; });

      const topIds = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);

      const { data: articles } = await supabase
        .from("articles")
        .select("id, title, slug, view_count, comment_count, categories!articles_primary_category_id_fkey(slug)")
        .in("id", topIds);

      // Get reaction counts
      const { data: reactionData } = await supabase.from("article_reactions").select("article_id").in("article_id", topIds).gte("created_at", cutoff);
      const reactionMap: Record<string, number> = {};
      reactionData?.forEach(r => { reactionMap[r.article_id] = (reactionMap[r.article_id] || 0) + 1; });

      return (articles || [])
        .map(a => ({
          ...a,
          reads: countMap[a.id] || 0,
          reactions: reactionMap[a.id] || 0,
          total: (countMap[a.id] || 0) + (reactionMap[a.id] || 0) + (a.comment_count || 0),
        }))
        .sort((a, b) => b.total - a.total);
    },
  });

  // Reaction distribution
  const { data: reactionDist = [], isLoading: l6 } = useQuery({
    queryKey: ["admin-engagement-reaction-dist"],
    staleTime: STALE,
    queryFn: async () => {
      const { data } = await supabase.from("article_reactions").select("reaction_type").gte("created_at", cutoff);
      const counts: Record<string, number> = {};
      data?.forEach(r => { counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1; });
      return Object.entries(counts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
    },
  });

  // User level distribution
  const { data: levelDist = [], isLoading: l7 } = useQuery({
    queryKey: ["admin-engagement-level-dist"],
    staleTime: STALE,
    queryFn: async () => {
      const { data } = await supabase.from("user_stats").select("level");
      const counts: Record<string, number> = {};
      data?.forEach(r => { counts[r.level || "Explorer"] = (counts[r.level || "Explorer"] || 0) + 1; });
      return Object.entries(counts).map(([level, count]) => ({ level, count })).sort((a, b) => b.count - a.count);
    },
  });

  // Recent achievements
  const { data: recentAchievements = [], isLoading: l8 } = useQuery({
    queryKey: ["admin-engagement-recent-achievements"],
    staleTime: STALE,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_achievements")
        .select("id, earned_at, achievement_id, user_id")
        .order("earned_at", { ascending: false })
        .limit(10);

      if (!data?.length) return [];

      const achievementIds = [...new Set(data.map(a => a.achievement_id))];
      const { data: achievements } = await supabase.from("achievements").select("id, name, badge_icon").in("id", achievementIds);
      const achMap = Object.fromEntries((achievements || []).map(a => [a.id, a]));

      return data.map(d => ({
        ...d,
        achievement_name: achMap[d.achievement_id]?.name || "Unknown",
        badge_icon: achMap[d.achievement_id]?.badge_icon || "trophy",
      }));
    },
  });

  const reactionEmoji: Record<string, string> = {
    insightful: "💡",
    important: "🔥",
    surprising: "😮",
    needs_update: "🤔",
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Active Readers (7d)" value={activeReaders} icon={Users} loading={l1} />
        <StatCard title="Articles Read (7d)" value={articlesRead} icon={BookOpen} loading={l2} />
        <StatCard title="Active Streaks" value={activeStreaks} icon={Flame} loading={l3} />
        <StatCard title="Reactions (7d)" value={reactions7d} icon={Heart} loading={l4} />
      </div>

      {/* Top Articles */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Top Articles by Engagement (7d)</CardTitle></CardHeader>
        <CardContent>
          {l5 ? <Skeleton className="h-40 w-full" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead className="text-right">Reads</TableHead>
                  <TableHead className="text-right">Reactions</TableHead>
                  <TableHead className="text-right">Comments</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topArticles.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link to={`/${a.categories?.slug || "news"}/${a.slug}`} className="hover:text-primary transition-colors line-clamp-1">
                        {a.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{a.reads}</TableCell>
                    <TableCell className="text-right">{a.reactions}</TableCell>
                    <TableCell className="text-right">{a.comment_count || 0}</TableCell>
                    <TableCell className="text-right font-medium">{a.total}</TableCell>
                  </TableRow>
                ))}
                {topArticles.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reaction Distribution + User Levels side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Reaction Distribution (7d)</CardTitle></CardHeader>
          <CardContent>
            {l6 ? <Skeleton className="h-24 w-full" /> : (
              <div className="space-y-3">
                {reactionDist.map((r: any) => {
                  const max = Math.max(...reactionDist.map((d: any) => d.count), 1);
                  return (
                    <div key={r.type} className="flex items-center gap-3">
                      <span className="text-lg w-6">{reactionEmoji[r.type] || "❓"}</span>
                      <span className="text-sm capitalize w-24">{r.type.replace("_", " ")}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(r.count / max) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{r.count}</span>
                    </div>
                  );
                })}
                {reactionDist.length === 0 && <p className="text-sm text-muted-foreground">No reactions yet</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">User Level Distribution</CardTitle></CardHeader>
          <CardContent>
            {l7 ? <Skeleton className="h-24 w-full" /> : (
              <div className="space-y-3">
                {levelDist.map((l: any) => {
                  const max = Math.max(...levelDist.map((d: any) => d.count), 1);
                  return (
                    <div key={l.level} className="flex items-center gap-3">
                      <span className="text-sm w-28">{l.level}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(l.count / max) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium w-10 text-right">{l.count}</span>
                    </div>
                  );
                })}
                {levelDist.length === 0 && <p className="text-sm text-muted-foreground">No users yet</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Achievements */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Achievements</CardTitle></CardHeader>
        <CardContent>
          {l8 ? <Skeleton className="h-24 w-full" /> : (
            <div className="space-y-2">
              {recentAchievements.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-lg">{(() => { const Icon = iconMap[a.badge_icon]; return Icon ? <Icon className="h-5 w-5" /> : <span>{a.badge_icon}</span>; })()}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.achievement_name}</p>
                    <p className="text-xs text-muted-foreground truncate">User: {a.user_id?.slice(0, 8)}...</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(a.earned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
              {recentAchievements.length === 0 && <p className="text-sm text-muted-foreground">No achievements yet</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
