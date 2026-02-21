import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader } from "@/components/ui/card";
import { Loader2, FileText, BarChart, Home, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageCompression";
import { TrendingSuggestions } from "@/components/TrendingSuggestions";
import { useAdminActions } from "@/hooks/useAdminActions";
import {
  AdminStatCards,
  AdminStatCardsSkeleton,
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

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authorsDialogOpen, setAuthorsDialogOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [googleAdsDialogOpen, setGoogleAdsDialogOpen] = useState(false);
  const [newsletterDialogOpen, setNewsletterDialogOpen] = useState(false);
  const [googleAdsSettings, setGoogleAdsSettings] = useState({
    enabled: true,
    client_id: "",
  });
  const [newsletterSettings, setNewsletterSettings] = useState({
    enabled: true,
    delay: 5000,
    frequency: "once_per_session",
  });
  const [authorForm, setAuthorForm] = useState({
    name: "",
    slug: "",
    bio: "",
    email: "",
    job_title: "",
    avatar_url: "",
    twitter_handle: "",
    linkedin_url: "",
    website_url: "",
  });
  const [enableSecondaryQueries, setEnableSecondaryQueries] = useState(false);

  // Use the extracted admin actions hook
  const adminActions = useAdminActions();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin === true) {
      const timer = setTimeout(() => setEnableSecondaryQueries(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .or("role.eq.admin,role.eq.editor");

    if (!data || data.length === 0) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin panel.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'auth') {
      navigate("/admin/dashboard");
    }
  };

  // Stats query
  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin === true,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [articles, authors, categories, tags, comments, aiComments, subscribers, unsubscribes] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }),
        supabase.from("authors").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("tags").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
        supabase.from("ai_generated_comments").select("id", { count: "exact", head: true }),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
        supabase.from("newsletter_unsubscribes").select("id", { count: "exact", head: true }),
      ]);

      return {
        articles: articles.count || 0,
        authors: authors.count || 0,
        categories: categories.count || 0,
        tags: tags.count || 0,
        comments: (comments.count || 0) + (aiComments.count || 0),
        subscribers: subscribers.count || 0,
        unsubscribes: unsubscribes.count || 0,
      };
    },
  });

  // Recent articles query
  const { data: recentArticles } = useQuery({
    queryKey: ["recent-articles"],
    enabled: enableSecondaryQueries && isAdmin === true,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select(`id, title, status, created_at, authors (name)`)
        .order("created_at", { ascending: false })
        .limit(10);
      return data;
    },
  });

  // Pending comments query
  const { data: pendingComments } = useQuery({
    queryKey: ["pending-comments"],
    enabled: enableSecondaryQueries && isAdmin === true,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select(`id, content, author_name, created_at, articles (title, slug)`)
        .eq("approved", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data;
    },
  });

  // Authors query
  const { data: authors, refetch: refetchAuthors } = useQuery({
    queryKey: ["all-authors"],
    enabled: isAdmin === true && authorsDialogOpen,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("authors")
        .select("*")
        .order("name", { ascending: true });
      return data;
    },
  });

  // Settings query
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    enabled: isAdmin === true,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*");
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const googleAds = settings.find((s: any) => s.setting_key === 'google_ads');
      const newsletter = settings.find((s: any) => s.setting_key === 'newsletter_popup');
      
      if (googleAds && googleAds.setting_value) {
        const value = googleAds.setting_value as any;
        setGoogleAdsSettings({
          enabled: value.enabled ?? true,
          client_id: value.client_id ?? "",
        });
      }
      if (newsletter && newsletter.setting_value) {
        const value = newsletter.setting_value as any;
        setNewsletterSettings({
          enabled: value.enabled ?? true,
          delay: value.delay ?? 5000,
          frequency: value.frequency ?? "once_per_session",
        });
      }
    }
  }, [settings]);

  const getFirstName = (email: string | undefined) => {
    if (!email) return "User";
    const username = email.split("@")[0];
    return username.charAt(0).toUpperCase() + username.slice(1);
  };

  const handleOpenAuthorsDialog = () => {
    setAuthorsDialogOpen(true);
    resetAuthorForm();
  };

  const resetAuthorForm = () => {
    setEditingAuthor(null);
    setAuthorForm({
      name: "",
      slug: "",
      bio: "",
      email: "",
      job_title: "",
      avatar_url: "",
      twitter_handle: "",
      linkedin_url: "",
      website_url: "",
    });
  };

  const handleEditAuthor = (author: any) => {
    setEditingAuthor(author);
    setAuthorForm({
      name: author.name || "",
      slug: author.slug || "",
      bio: author.bio || "",
      email: author.email || "",
      job_title: author.job_title || "",
      avatar_url: author.avatar_url || "",
      twitter_handle: author.twitter_handle || "",
      linkedin_url: author.linkedin_url || "",
      website_url: author.website_url || "",
    });
  };

  const handleSaveAuthor = async () => {
    try {
      if (editingAuthor) {
        const { error } = await supabase
          .from("authors")
          .update(authorForm)
          .eq("id", editingAuthor.id);

        if (error) throw error;

        toast({
          title: "Author updated",
          description: "The author has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("authors")
          .insert([authorForm]);

        if (error) throw error;

        toast({
          title: "Author created",
          description: "The author has been created successfully",
        });
      }

      refetchAuthors();
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      resetAuthorForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save author",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAuthor = async (authorId: string) => {
    try {
      const { error } = await supabase
        .from("authors")
        .delete()
        .eq("id", authorId);

      if (error) throw error;

      toast({
        title: "Author deleted",
        description: "The author has been removed",
      });

      refetchAuthors();
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete author",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);

      const compressedFile = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.9,
        maxSizeMB: 0.5,
      });

      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      setAuthorForm({ ...authorForm, avatar_url: publicUrl });

      toast({
        title: "Image uploaded",
        description: "Avatar image has been uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAuthorForm({ ...authorForm, avatar_url: "" });
  };

  const handleSaveGoogleAdsSettings = async () => {
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({
          setting_key: 'google_ads',
          setting_value: googleAdsSettings,
          updated_by: user?.id,
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Google Ads settings have been updated",
      });

      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setGoogleAdsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const handleSaveNewsletterSettings = async () => {
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({
          setting_key: 'newsletter_popup',
          setting_value: newsletterSettings,
          updated_by: user?.id,
        }, { onConflict: 'setting_key' });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Newsletter popup settings have been updated",
      });

      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setNewsletterDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  // Loading skeleton
  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <nav className="text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-primary inline-flex items-center gap-1">
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span className="mx-2">›</span>
            <span>Admin Dashboard</span>
          </nav>
          <div className="mb-8">
            <div className="h-10 w-64 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </div>
          <AdminStatCardsSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary inline-flex items-center gap-1">
            <Home className="h-3 w-3" />
            Home
          </Link>
          <span className="mx-2">›</span>
          <span>Admin Dashboard</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="headline text-4xl mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {getFirstName(user?.email)}</p>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row">
              <Button onClick={() => navigate("/editor")} size="lg" className="w-full md:w-auto">
                <FileText className="h-4 w-4 mr-2" />
                Create New Article
              </Button>
              <Button onClick={() => navigate("/guide-editor")} size="lg" variant="outline" className="w-full md:w-auto">
                <BookOpen className="h-4 w-4 mr-2" />
                Create New Guide
              </Button>
              <Button 
                onClick={() => navigate("/admin/dashboard")}
                variant="default"
                size="lg"
                className="w-full md:w-auto"
              >
                <BarChart className="h-4 w-4 mr-2" />
                View Dashboard
              </Button>
              <Button 
                onClick={() => {
                  refetchStats();
                  toast({ title: "Stats Refreshed" });
                }}
                variant="outline"
                disabled={statsLoading}
                className="w-full md:w-auto"
              >
                {statsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <BarChart className="h-4 w-4 mr-2" />
                    Refresh Stats
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
          <AdminStatCardsSkeleton />
        ) : (
          <AdminStatCards 
            stats={stats} 
            userEmail={user?.email}
            onOpenAuthorsDialog={handleOpenAuthorsDialog}
          />
        )}

        {/* Quick Actions */}
        <AdminQuickActions
          scrapingEvents={adminActions.scrapingEvents}
          refreshingContent={adminActions.refreshingContent}
          cleaningMarkup={adminActions.cleaningMarkup}
          onScrapeEvents={adminActions.handleScrapeEvents}
          onRefreshContent={adminActions.handleRefreshFeaturedContent}
          onCleanMarkup={adminActions.handleCleanWordPressMarkup}
        />

        <TrendingSuggestions />

        {/* Tabs */}
        <Tabs defaultValue="articles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="articles">Recent Articles</TabsTrigger>
            <TabsTrigger value="comments">Pending Comments</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="tools">AI Tools</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-4">
            <AdminRecentArticlesTab articles={recentArticles as any} />
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <AdminPendingCommentsTab 
              comments={pendingComments as any}
              onApprove={adminActions.approveComment}
              onDelete={adminActions.deleteComment}
            />
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <AdminEngagementTab />
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <AdminToolsTab />
          </TabsContent>


          <TabsContent value="settings" className="space-y-4">
            <AdminSettingsTab 
              onOpenGoogleAds={() => setGoogleAdsDialogOpen(true)}
              onOpenNewsletter={() => setNewsletterDialogOpen(true)}
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <GoogleAdsDialog
          open={googleAdsDialogOpen}
          onOpenChange={setGoogleAdsDialogOpen}
          settings={googleAdsSettings}
          onSettingsChange={setGoogleAdsSettings}
          onSave={handleSaveGoogleAdsSettings}
        />

        <NewsletterDialog
          open={newsletterDialogOpen}
          onOpenChange={setNewsletterDialogOpen}
          settings={newsletterSettings}
          onSettingsChange={setNewsletterSettings}
          onSave={handleSaveNewsletterSettings}
        />

        <AuthorsDialog
          open={authorsDialogOpen}
          onOpenChange={setAuthorsDialogOpen}
          authors={authors as any}
          editingAuthor={editingAuthor}
          authorForm={authorForm}
          onAuthorFormChange={setAuthorForm}
          onEditAuthor={handleEditAuthor}
          onSaveAuthor={handleSaveAuthor}
          onDeleteAuthor={handleDeleteAuthor}
          onResetForm={resetAuthorForm}
          uploadingImage={uploadingImage}
          onImageUpload={handleImageUpload}
          onRemoveAvatar={handleRemoveAvatar}
        />
      </main>
    </div>
  );
};

export default Admin;
