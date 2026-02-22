import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Users, Mail, Activity, Eye, TrendingUp, BarChart3,
  MessageSquare, RefreshCw, Loader2, CalendarCheck, Megaphone,
  BookOpen, Bell,
} from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompression";
import { useAdminActions } from "@/hooks/useAdminActions";
import { subDays, startOfDay, endOfDay } from "date-fns";
import {
  AdminQuickActions,
  AdminRecentArticlesTab,
  AdminPendingCommentsTab,
  AdminToolsTab,
  AdminSettingsTab,
  GoogleAdsDialog,
  NewsletterDialog,
  AuthorsDialog,
} from "@/components/admin";
import { AdminEngagementTab } from "@/components/admin/AdminEngagementTab";
import AdminEventSubmissions from "@/components/admin/AdminEventSubmissions";
import AdminEventAds from "@/components/admin/AdminEventAds";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const adminActions = useAdminActions();

  // Dialog state
  const [authorsDialogOpen, setAuthorsDialogOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [googleAdsDialogOpen, setGoogleAdsDialogOpen] = useState(false);
  const [newsletterDialogOpen, setNewsletterDialogOpen] = useState(false);
  const [googleAdsSettings, setGoogleAdsSettings] = useState({ enabled: true, client_id: "" });
  const [newsletterSettings, setNewsletterSettings] = useState({ enabled: true, delay: 5000, frequency: "once_per_session" });
  const [authorForm, setAuthorForm] = useState({
    name: "", slug: "", bio: "", email: "", job_title: "",
    avatar_url: "", twitter_handle: "", linkedin_url: "", website_url: "",
  });

  // ─── Queries ───────────────────────────────────────────────

  // Core stats
  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [articles, authors, subscribers, unsubscribes, comments, aiComments] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }),
        supabase.from("authors").select("id", { count: "exact", head: true }),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
        supabase.from("newsletter_unsubscribes").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
        supabase.from("ai_generated_comments").select("id", { count: "exact", head: true }),
      ]);
      return {
        articles: articles.count || 0,
        authors: authors.count || 0,
        subscribers: subscribers.count || 0,
        unsubscribes: unsubscribes.count || 0,
        comments: (comments.count || 0) + (aiComments.count || 0),
      };
    },
  });

  // Site analytics (7d)
  const startDate = startOfDay(subDays(new Date(), 7));
  const endDate = endOfDay(new Date());

  const { data: analyticsStats, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ["admin-analytics-stats"],
    queryFn: async () => {
      const [sessions, pageviews, uniqueVisitors] = await Promise.all([
        supabase.from("analytics_sessions").select("*", { count: "exact", head: true })
          .gte("started_at", startDate.toISOString()).lte("started_at", endDate.toISOString()),
        supabase.from("analytics_pageviews").select("*", { count: "exact", head: true })
          .gte("viewed_at", startDate.toISOString()).lte("viewed_at", endDate.toISOString()),
        supabase.rpc("get_unique_visitors", { p_start: startDate.toISOString(), p_end: endDate.toISOString() }),
      ]);
      return {
        sessions: sessions.count || 0,
        pageviews: pageviews.count || 0,
        uniqueVisitors: uniqueVisitors.data || 0,
      };
    },
  });

  // Active visitors
  const { data: activeVisitors } = useQuery({
    queryKey: ["admin-active-visitors"],
    queryFn: async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase.from("analytics_sessions")
        .select("*", { count: "exact", head: true })
        .or(`started_at.gte.${fiveMinutesAgo},ended_at.gte.${fiveMinutesAgo}`);
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Most popular article (7d)
  const { data: popularArticle, isLoading: isLoadingPopular } = useQuery({
    queryKey: ["admin-popular-article"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase.from("articles")
        .select("id, title, slug, view_count, published_at")
        .eq("status", "published")
        .gte("published_at", sevenDaysAgo.toISOString())
        .order("view_count", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Recent articles
  const { data: recentArticles } = useQuery({
    queryKey: ["recent-articles"],
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const { data } = await supabase.from("articles")
        .select("id, title, slug, status, created_at, published_at, authors (name)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data;
    },
  });

  // Pending comments
  const { data: pendingComments } = useQuery({
    queryKey: ["pending-comments"],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("comments")
        .select("id, content, author_name, created_at, articles (title, slug)")
        .eq("approved", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data;
    },
  });

  // Recent comments feed (user + AI combined)
  const { data: recentComments, isLoading: isLoadingComments } = useQuery({
    queryKey: ["admin-recent-comments"],
    queryFn: async () => {
      const [userRes, aiRes] = await Promise.all([
        supabase.from("comments")
          .select("id, content, author_name, created_at, approved, articles(title, slug)")
          .order("created_at", { ascending: false }).limit(10),
        supabase.from("ai_generated_comments")
          .select("id, content, comment_date, ai_comment_authors(name), articles(title, slug)")
          .order("created_at", { ascending: false }).limit(10),
      ]);
      const combined = [
        ...(userRes.data || []).map((c: any) => ({
          id: c.id, content: c.content, author: c.author_name || "Anonymous",
          date: c.created_at, type: "user" as const, approved: c.approved,
          articleTitle: c.articles?.title, articleSlug: c.articles?.slug,
        })),
        ...(aiRes.data || []).map((c: any) => ({
          id: c.id, content: c.content, author: c.ai_comment_authors?.name || "AI Author",
          date: c.comment_date, type: "ai" as const, approved: true,
          articleTitle: c.articles?.title, articleSlug: c.articles?.slug,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
      return combined;
    },
  });

  // Authors (lazy — only when dialog open)
  const { data: authors, refetch: refetchAuthors } = useQuery({
    queryKey: ["all-authors"],
    enabled: authorsDialogOpen,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("authors").select("*").order("name");
      return data;
    },
  });

  // Site settings
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const ga = settings.find((s: any) => s.setting_key === "google_ads");
      const nl = settings.find((s: any) => s.setting_key === "newsletter_popup");
      if (ga?.setting_value) {
        const v = ga.setting_value as any;
        setGoogleAdsSettings({ enabled: v.enabled ?? true, client_id: v.client_id ?? "" });
      }
      if (nl?.setting_value) {
        const v = nl.setting_value as any;
        setNewsletterSettings({ enabled: v.enabled ?? true, delay: v.delay ?? 5000, frequency: v.frequency ?? "once_per_session" });
      }
    }
  }, [settings]);

  // ─── Author handlers ──────────────────────────────────────

  const resetAuthorForm = () => {
    setEditingAuthor(null);
    setAuthorForm({ name: "", slug: "", bio: "", email: "", job_title: "", avatar_url: "", twitter_handle: "", linkedin_url: "", website_url: "" });
  };

  const handleEditAuthor = (author: any) => {
    setEditingAuthor(author);
    setAuthorForm({
      name: author.name || "", slug: author.slug || "", bio: author.bio || "",
      email: author.email || "", job_title: author.job_title || "",
      avatar_url: author.avatar_url || "", twitter_handle: author.twitter_handle || "",
      linkedin_url: author.linkedin_url || "", website_url: author.website_url || "",
    });
  };

  const handleSaveAuthor = async () => {
    try {
      if (editingAuthor) {
        const { error } = await supabase.from("authors").update(authorForm).eq("id", editingAuthor.id);
        if (error) throw error;
        toast("Author updated");
      } else {
        const { error } = await supabase.from("authors").insert([authorForm]);
        if (error) throw error;
        toast("Author created");
      }
      refetchAuthors();
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      resetAuthorForm();
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    }
  };

  const handleDeleteAuthor = async (authorId: string) => {
    try {
      const { error } = await supabase.from("authors").delete().eq("id", authorId);
      if (error) throw error;
      toast("Author deleted");
      refetchAuthors();
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const compressedFile = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.9, maxSizeMB: 0.5 });
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('article-images').upload(`avatars/${fileName}`, compressedFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('article-images').getPublicUrl(`avatars/${fileName}`);
      setAuthorForm({ ...authorForm, avatar_url: publicUrl });
      toast("Avatar uploaded");
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  // ─── Settings handlers ────────────────────────────────────

  const handleSaveGoogleAdsSettings = async () => {
    try {
      const { error } = await supabase.from("site_settings").upsert(
        { setting_key: "google_ads", setting_value: googleAdsSettings, updated_by: user?.id },
        { onConflict: "setting_key" }
      );
      if (error) throw error;
      toast("Google Ads settings saved");
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setGoogleAdsDialogOpen(false);
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    }
  };

  const handleSaveNewsletterSettings = async () => {
    try {
      const { error } = await supabase.from("site_settings").upsert(
        { setting_key: "newsletter_popup", setting_value: newsletterSettings, updated_by: user?.id },
        { onConflict: "setting_key" }
      );
      if (error) throw error;
      toast("Newsletter settings saved");
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setNewsletterDialogOpen(false);
    } catch (error: any) {
      toast.error("Error", { description: error.message });
    }
  };

  const getFirstName = (email: string | undefined) => {
    if (!email) return "User";
    const username = email.split("@")[0];
    return username.charAt(0).toUpperCase() + username.slice(1);
  };

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="headline text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {getFirstName(user?.email)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => navigate("/editor")} size="sm">
            <FileText className="h-4 w-4 mr-1.5" /> New Article
          </Button>
          <Button onClick={() => navigate("/admin/guide-editor")} size="sm" variant="outline">
            <BookOpen className="h-4 w-4 mr-1.5" /> New Guide
          </Button>
          <Button
            size="sm" variant="ghost"
            disabled={statsLoading}
            onClick={() => { refetchStats(); toast("Stats refreshed"); }}
          >
            {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* ── Top stat cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Articles" value={stats?.articles} icon={FileText}
          loading={statsLoading} onClick={() => navigate("/admin/articles")}
        />
        <StatCard
          label="Subscribers" value={stats?.subscribers} icon={Mail}
          loading={statsLoading} onClick={() => navigate("/admin/newsletter-manager")}
        />
        <StatCard
          label="Active Now" value={activeVisitors} icon={Activity}
          loading={false} pulse
        />
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => popularArticle?.slug && navigate(`/article/${popularArticle.slug}`)}>
          <CardHeader className="pb-1">
            <CardDescription className="flex items-center gap-1.5 text-xs">
              <TrendingUp className="h-3.5 w-3.5" /> Most Popular (7d)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPopular ? (
              <Skeleton className="h-5 w-full" />
            ) : popularArticle ? (
              <>
                <p className="text-sm font-semibold line-clamp-1">{popularArticle.title}</p>
                <p className="text-xs text-muted-foreground">{popularArticle.view_count?.toLocaleString()} views</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Actions ───────────────────────────────────── */}
      <AdminQuickActions
        scrapingEvents={adminActions.scrapingEvents}
        refreshingContent={adminActions.refreshingContent}
        cleaningMarkup={adminActions.cleaningMarkup}
        onScrapeEvents={adminActions.handleScrapeEvents}
        onRefreshContent={adminActions.handleRefreshFeaturedContent}
        onCleanMarkup={adminActions.handleCleanWordPressMarkup}
      />

      {/* ── Two-column layout ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent articles */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Recent Articles</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <AdminRecentArticlesTab articles={recentArticles as any} />
            </CardContent>
          </Card>

          {/* Pending comments */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Pending Comments</CardTitle>
                </div>
                {pendingComments && pendingComments.length > 0 && (
                  <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                    {pendingComments.length} pending
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <AdminPendingCommentsTab
                comments={pendingComments as any}
                onApprove={adminActions.approveComment}
                onDelete={adminActions.deleteComment}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">
          {/* Site analytics summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Site Analytics (7d)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingAnalytics ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <>
                  <AnalyticsMiniRow icon={Users} label="Unique Visitors" value={analyticsStats?.uniqueVisitors} />
                  <AnalyticsMiniRow icon={Eye} label="Page Views" value={analyticsStats?.pageviews} />
                  <AnalyticsMiniRow icon={TrendingUp} label="Sessions" value={analyticsStats?.sessions} />
                </>
              )}
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => navigate("/admin/site-analytics")}>
                View full analytics →
              </Button>
            </CardContent>
          </Card>

          {/* Recent comments feed */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Recent Comments</CardTitle>
              </div>
              <CardDescription>User &amp; AI comments</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingComments ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {recentComments?.map((comment) => (
                    <div key={`${comment.type}-${comment.id}`} className="p-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-xs">{comment.author}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          comment.type === "ai"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            : comment.approved
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                        }`}>
                          {comment.type === "ai" ? "AI" : comment.approved ? "✓" : "Pending"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{comment.content}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                        {comment.articleSlug ? (
                          <Link to={`/article/${comment.articleSlug}`} className="hover:text-primary truncate max-w-[160px]">
                            {comment.articleTitle}
                          </Link>
                        ) : <span>Unknown article</span>}
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

      {/* ── Tabs for remaining sections ─────────────────────── */}
      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="event-submissions" className="flex items-center gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" /> Events
          </TabsTrigger>
          <TabsTrigger value="ad-management" className="flex items-center gap-1.5">
            <Megaphone className="h-3.5 w-3.5" /> Ads
          </TabsTrigger>
          <TabsTrigger value="tools">AI Tools</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement"><AdminEngagementTab /></TabsContent>
        <TabsContent value="event-submissions"><AdminEventSubmissions /></TabsContent>
        <TabsContent value="ad-management"><AdminEventAds /></TabsContent>
        <TabsContent value="tools"><AdminToolsTab /></TabsContent>
        <TabsContent value="settings">
          <AdminSettingsTab
            onOpenGoogleAds={() => setGoogleAdsDialogOpen(true)}
            onOpenNewsletter={() => setNewsletterDialogOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <GoogleAdsDialog
        open={googleAdsDialogOpen} onOpenChange={setGoogleAdsDialogOpen}
        settings={googleAdsSettings} onSettingsChange={setGoogleAdsSettings}
        onSave={handleSaveGoogleAdsSettings}
      />
      <NewsletterDialog
        open={newsletterDialogOpen} onOpenChange={setNewsletterDialogOpen}
        settings={newsletterSettings} onSettingsChange={setNewsletterSettings}
        onSave={handleSaveNewsletterSettings}
      />
      <AuthorsDialog
        open={authorsDialogOpen} onOpenChange={setAuthorsDialogOpen}
        authors={authors as any} editingAuthor={editingAuthor}
        authorForm={authorForm} onAuthorFormChange={setAuthorForm}
        onEditAuthor={handleEditAuthor} onSaveAuthor={handleSaveAuthor}
        onDeleteAuthor={handleDeleteAuthor} onResetForm={resetAuthorForm}
        uploadingImage={uploadingImage} onImageUpload={handleImageUpload}
        onRemoveAvatar={() => setAuthorForm({ ...authorForm, avatar_url: "" })}
      />
    </div>
  );
};

// ─── Small helper components ──────────────────────────────

function StatCard({ label, value, icon: Icon, loading, onClick, pulse }: {
  label: string; value: number | undefined; icon: any; loading: boolean; onClick?: () => void; pulse?: boolean;
}) {
  return (
    <Card className={onClick ? "cursor-pointer hover:bg-accent/50 transition-colors" : ""} onClick={onClick}>
      <CardHeader className="pb-1">
        <CardDescription className="flex items-center gap-1.5 text-xs">
          <Icon className={`h-3.5 w-3.5 ${pulse ? "text-green-500 animate-pulse" : ""}`} /> {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-7 w-16" /> : (
          <p className="text-2xl font-bold">{(value ?? 0).toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsMiniRow({ icon: Icon, label, value }: { icon: any; label: string; value: number | undefined }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="text-lg font-bold">{(value ?? 0).toLocaleString()}</p>
    </div>
  );
}

export default Admin;
