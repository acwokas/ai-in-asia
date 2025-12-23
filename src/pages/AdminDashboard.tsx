import { useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Bell, TrendingUp, Mail, Calendar, Brain, MessageSquare, BarChart3, Eye, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, startOfDay, endOfDay } from "date-fns";
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: isLoadingAdmin } = useAdminRole();

  useEffect(() => {
    if (!isLoadingAdmin && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, isLoadingAdmin, navigate]);

  // Fetch newsletter subscribers
  const { data: newsletterStats, isLoading: isLoadingNewsletter } = useQuery({
    queryKey: ["admin-newsletter-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      const { count } = await supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true })
        .is("unsubscribed_at", null);
      
      return { recent: data || [], total: count || 0 };
    },
    enabled: isAdmin,
  });

  // Fetch daily digest subscribers
  const { data: digestStats, isLoading: isLoadingDigest } = useQuery({
    queryKey: ["admin-digest-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*, profiles(first_name, avatar_url)")
        .eq("daily_digest", true)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      const { count } = await supabase
        .from("notification_preferences")
        .select("*", { count: "exact", head: true })
        .eq("daily_digest", true);
      
      return { recent: data || [], total: count || 0 };
    },
    enabled: isAdmin,
  });

  // Fetch most popular article (last 7 days)
  const { data: popularArticle, isLoading: isLoadingPopular } = useQuery({
    queryKey: ["admin-popular-article"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, view_count, published_at")
        .eq("status", "published")
        .gte("published_at", sevenDaysAgo.toISOString())
        .order("view_count", { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch recent articles
  const { data: recentArticles, isLoading: isLoadingRecent } = useQuery({
    queryKey: ["admin-recent-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, status, published_at")
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Site Analytics - last 7 days
  const startDate = startOfDay(subDays(new Date(), 7));
  const endDate = endOfDay(new Date());

  const { data: analyticsStats, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["admin-analytics-stats"],
    queryFn: async () => {
      // Get sessions count
      const { count: sessionsCount } = await supabase
        .from("analytics_sessions")
        .select("*", { count: "exact", head: true })
        .gte("started_at", startDate.toISOString())
        .lte("started_at", endDate.toISOString());

      // Get pageviews count
      const { count: pageviewsCount } = await supabase
        .from("analytics_pageviews")
        .select("*", { count: "exact", head: true })
        .gte("viewed_at", startDate.toISOString())
        .lte("viewed_at", endDate.toISOString());

      // Get unique visitors via RPC
      const { data: uniqueVisitors } = await supabase.rpc("get_unique_visitors", {
        p_start: startDate.toISOString(),
        p_end: endDate.toISOString(),
      });

      return {
        sessions: sessionsCount || 0,
        pageviews: pageviewsCount || 0,
        uniqueVisitors: uniqueVisitors || 0,
      };
    },
    enabled: isAdmin,
  });

  // Active visitors (sessions in last 5 minutes)
  const { data: activeVisitors, isLoading: isLoadingActive } = useQuery({
    queryKey: ["admin-active-visitors"],
    queryFn: async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("analytics_sessions")
        .select("*", { count: "exact", head: true })
        .or(`started_at.gte.${fiveMinutesAgo},ended_at.gte.${fiveMinutesAgo}`);
      
      return count || 0;
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  // Fetch recent comments (both user and AI)
  const { data: recentComments, isLoading: isLoadingComments } = useQuery({
    queryKey: ["admin-recent-comments"],
    queryFn: async () => {
      // Fetch user comments
      const { data: userComments, error: userError } = await supabase
        .from("comments")
        .select("id, content, author_name, created_at, approved, articles(title, slug)")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (userError) throw userError;

      // Fetch AI comments
      const { data: aiComments, error: aiError } = await supabase
        .from("ai_generated_comments")
        .select("id, content, comment_date, ai_comment_authors(name), articles(title, slug)")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (aiError) throw aiError;

      // Combine and sort by date
      const combined = [
        ...(userComments || []).map((c: any) => ({
          id: c.id,
          content: c.content,
          author: c.author_name || "Anonymous",
          date: c.created_at,
          type: "user" as const,
          approved: c.approved,
          articleTitle: c.articles?.title,
          articleSlug: c.articles?.slug,
        })),
        ...(aiComments || []).map((c: any) => ({
          id: c.id,
          content: c.content,
          author: c.ai_comment_authors?.name || "AI Author",
          date: c.comment_date,
          type: "ai" as const,
          approved: true,
          articleTitle: c.articles?.title,
          articleSlug: c.articles?.slug,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

      return combined;
    },
    enabled: isAdmin,
  });

  if (isLoadingAdmin) {
    return (
      <>
        <Header />
        <div className="min-h-screen pt-20 px-4">
          <div className="container mx-auto py-8">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <Header />
      <div className="min-h-screen pt-20 px-4 bg-background">
        <div className="container mx-auto py-8">
          <h1 className="headline text-4xl mb-8">Admin Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Admin Panel</CardTitle>
                <CardDescription>Manage site settings and content</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Access the full admin panel for comprehensive site management
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/editor")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Create Article</CardTitle>
                <CardDescription>Write a new article</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Start creating new content for your publication
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/admin/knowledge-engine")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Brain className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle>Knowledge Engine</CardTitle>
                <CardDescription>AI-powered semantic enrichment</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Extract entities, topics, and build semantic intelligence
                </p>
              </CardContent>
            </Card>

            {/* Site Analytics */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer lg:col-span-2" onClick={() => navigate("/site-analytics")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle>Site Analytics</CardTitle>
                      <CardDescription>Last 7 days performance</CardDescription>
                    </div>
                  </div>
                  {!isLoadingActive && activeVisitors !== undefined && activeVisitors > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                      <Activity className="h-4 w-4 text-green-500 animate-pulse" />
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {activeVisitors} active now
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAnalytics ? (
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Users className="h-4 w-4" />
                        Unique Visitors
                      </div>
                      <p className="text-2xl font-bold">{analyticsStats?.uniqueVisitors?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Eye className="h-4 w-4" />
                        Page Views
                      </div>
                      <p className="text-2xl font-bold">{analyticsStats?.pageviews?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <TrendingUp className="h-4 w-4" />
                        Sessions
                      </div>
                      <p className="text-2xl font-bold">{analyticsStats?.sessions?.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/newsletter-manager")}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Mail className="h-8 w-8 text-primary" />
                  {isLoadingNewsletter ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <span className="text-3xl font-bold">{newsletterStats?.total}</span>
                  )}
                </div>
                <CardTitle>Newsletter Subscribers</CardTitle>
                <CardDescription>Total active subscribers</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingNewsletter ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recent signups:</p>
                    {newsletterStats?.recent.slice(0, 3).map((sub) => (
                      <div key={sub.id} className="text-sm text-muted-foreground truncate">
                        {sub.email} - {new Date(sub.subscribed_at).toLocaleDateString()}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Digest Subscribers */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Bell className="h-8 w-8 text-primary" />
                  {isLoadingDigest ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <span className="text-3xl font-bold">{digestStats?.total}</span>
                  )}
                </div>
                <CardTitle>Daily Digest</CardTitle>
                <CardDescription>Users subscribed to daily digests</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingDigest ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recent signups:</p>
                    {digestStats?.recent.slice(0, 3).map((pref) => (
                      <div key={pref.id} className="text-sm text-muted-foreground truncate">
                        User {pref.user_id.slice(0, 8)}... - {new Date(pref.created_at!).toLocaleDateString()}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Most Popular Article */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  {isLoadingPopular ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <span className="text-3xl font-bold">{popularArticle?.view_count || 0}</span>
                  )}
                </div>
                <CardTitle>Most Popular (7d)</CardTitle>
                <CardDescription>Top article this week</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPopular ? (
                  <Skeleton className="h-16 w-full" />
                ) : popularArticle ? (
                  <Link to={`/article/${popularArticle.slug}`} className="block hover:text-primary transition-colors">
                    <p className="font-medium line-clamp-2">{popularArticle.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {popularArticle.view_count} views
                    </p>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Articles */}
            <Card className="lg:col-span-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-primary" />
                  <CardTitle>Recent Articles</CardTitle>
                </div>
                <CardDescription>Latest content on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRecent ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentArticles?.map((article) => (
                      <div key={article.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                        <div className="flex-1">
                          <Link to={`/article/${article.slug}`} className="font-medium hover:text-primary transition-colors line-clamp-1">
                            {article.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {article.published_at ? new Date(article.published_at).toLocaleDateString() : "Draft"}
                          </div>
                        </div>
                        <div className="ml-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            article.status === "published" 
                              ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                              : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                          }`}>
                            {article.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Comments */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-primary" />
                  <CardTitle>Recent Comments</CardTitle>
                </div>
                <CardDescription>Latest user and AI comments</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingComments ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {recentComments?.map((comment) => (
                      <div key={`${comment.type}-${comment.id}`} className="p-3 rounded-lg border border-border hover:bg-accent transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{comment.author}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            comment.type === "ai" 
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" 
                              : comment.approved 
                                ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                          }`}>
                            {comment.type === "ai" ? "AI" : comment.approved ? "Approved" : "Pending"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                          {comment.content}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          {comment.articleSlug ? (
                            <Link to={`/article/${comment.articleSlug}`} className="hover:text-primary truncate max-w-[180px]">
                              {comment.articleTitle}
                            </Link>
                          ) : (
                            <span>Unknown article</span>
                          )}
                          <span>{new Date(comment.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    {(!recentComments || recentComments.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AdminDashboard;
