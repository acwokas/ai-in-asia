import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Eye, MessageSquare, Heart } from "lucide-react";

interface Props {
  startDate: string;
  range: string;
}

export const ContentRankingsSection = ({ startDate, range }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics-hub-rankings", range],
    queryFn: async () => {
      const [articlesRes, guidesRes, trendingRes] = await Promise.all([
        supabase
          .from("articles")
          .select("id, title, slug, view_count, like_count, comment_count, trending_score, article_type, published_at")
          .eq("status", "published")
          .order("view_count", { ascending: false })
          .limit(15),
        supabase
          .from("ai_guides")
          .select("id, title, slug, view_count, guide_category, difficulty")
          .eq("status", "published")
          .order("view_count", { ascending: false })
          .limit(10),
        supabase
          .from("articles")
          .select("id, title, slug, view_count, trending_score")
          .eq("is_trending", true)
          .eq("status", "published")
          .order("trending_score", { ascending: false })
          .limit(10),
      ]);

      return {
        topArticles: articlesRes.data || [],
        topGuides: guidesRes.data || [],
        trending: trendingRes.data || [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-6">
      {/* Top Articles */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4" /> Top Articles by Views
        </h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right"><Eye className="h-3 w-3 inline" /></TableHead>
              <TableHead className="text-right"><Heart className="h-3 w-3 inline" /></TableHead>
              <TableHead className="text-right"><MessageSquare className="h-3 w-3 inline" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.topArticles.map((a, i) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="max-w-[250px] truncate text-xs">{a.title}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{a.article_type}</Badge></TableCell>
                <TableCell className="text-right font-mono text-xs">{(a.view_count || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-xs">{a.like_count || 0}</TableCell>
                <TableCell className="text-right font-mono text-xs">{a.comment_count || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Trending */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Currently Trending
          </h4>
          <div className="space-y-1.5">
            {data?.trending.map((a, i) => (
              <div key={a.id} className="flex items-center gap-2 text-xs border rounded p-2">
                <span className="font-bold text-muted-foreground w-5">{i + 1}</span>
                <span className="truncate flex-1">{a.title}</span>
                <Badge variant="secondary" className="text-[10px]">{Math.round(a.trending_score || 0)}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Top Guides */}
        <div>
          <h4 className="text-sm font-medium mb-3">Top Guides</h4>
          <div className="space-y-1.5">
            {data?.topGuides.map((g, i) => (
              <div key={g.id} className="flex items-center gap-2 text-xs border rounded p-2">
                <span className="font-bold text-muted-foreground w-5">{i + 1}</span>
                <span className="truncate flex-1">{g.title}</span>
                <Badge variant="outline" className="text-[10px]">{g.difficulty || "—"}</Badge>
                <span className="font-mono text-muted-foreground">{(g.view_count || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
