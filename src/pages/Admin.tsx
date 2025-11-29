import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, Users, Tag, Folder, MessageSquare, Mail, BarChart, Home, Pencil, Trash2, Plus, Upload, X, ExternalLink, Settings, Calendar, Wrench, Link2, Activity, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageCompression";
import AIToolsManager from "./AIToolsManager";
import { TrendingSuggestions } from "@/components/TrendingSuggestions";

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
  const [scrapingEvents, setScrapingEvents] = useState(false);
  const [fixingDates, setFixingDates] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [cleaningMarkup, setCleaningMarkup] = useState(false);
  const [refreshingContent, setRefreshingContent] = useState(false);
  const [calculatingReadingTimes, setCalculatingReadingTimes] = useState(false);
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

  useEffect(() => {
    checkAdminStatus();
  }, []);

  // Enable secondary queries after main stats load
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
    
    // Only redirect if explicitly coming from auth (via URL parameter)
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'auth') {
      navigate("/admin/dashboard");
    }
  };

  // Optimized stats query - already batched with Promise.all
  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    enabled: isAdmin === true,
    staleTime: 2 * 60 * 1000, // 2 minutes cache - stats don't change frequently
    queryFn: async () => {
      const [articles, authors, categories, tags, comments, aiComments, subscribers] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }),
        supabase.from("authors").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("tags").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
        supabase.from("ai_generated_comments").select("id", { count: "exact", head: true }),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
      ]);

      return {
        articles: articles.count || 0,
        authors: authors.count || 0,
        categories: categories.count || 0,
        tags: tags.count || 0,
        comments: (comments.count || 0) + (aiComments.count || 0),
        subscribers: subscribers.count || 0,
      };
    },
  });

  // Defer: Recent articles - load after stats
  const { data: recentArticles } = useQuery({
    queryKey: ["recent-articles"],
    enabled: enableSecondaryQueries && isAdmin === true,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Always refetch on mount
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          status,
          created_at,
          authors (name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);
      return data;
    },
  });

  // Defer: Pending comments - load after stats
  const { data: pendingComments } = useQuery({
    queryKey: ["pending-comments"],
    enabled: enableSecondaryQueries && isAdmin === true,
    staleTime: 30 * 1000, // 30 seconds cache - comments update frequently
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          author_name,
          created_at,
          articles (title, slug)
        `)
        .eq("approved", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data;
    },
  });

  // Authors query - already optimized (only loads when dialog opens)
  const { data: authors, refetch: refetchAuthors } = useQuery({
    queryKey: ["all-authors"],
    enabled: isAdmin === true && authorsDialogOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes - authors don't change often
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
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*");
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

  const approveComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ approved: true })
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: "Comment approved",
        description: "The comment is now visible on the article",
      });

      queryClient.invalidateQueries({ queryKey: ['pendingComments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve comment",
        variant: "destructive",
      });
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: "Comment deleted",
        description: "The comment has been removed",
      });

      queryClient.invalidateQueries({ queryKey: ['pendingComments'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const getFirstName = (email: string | undefined) => {
    if (!email) return "User";
    const username = email.split("@")[0];
    return username.charAt(0).toUpperCase() + username.slice(1);
  };

  const handleAutoScheduleComments = async () => {
    try {
      setAutoScheduling(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('auto-schedule-comments', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Success",
        description: `Comment generation scheduled for ${response.data.articlesScheduled} articles`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule comments",
        variant: "destructive",
      });
    } finally {
      setAutoScheduling(false);
    }
  };

  const handleCleanWordPressMarkup = async () => {
    try {
      setCleaningMarkup(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('clean-wordpress-markup', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Success",
        description: `Cleaned ${response.data.cleaned} of ${response.data.processed} articles`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to clean markup",
        variant: "destructive",
      });
    } finally {
      setCleaningMarkup(false);
    }
  };

  const handleCalculateReadingTimes = async () => {
    try {
      setCalculatingReadingTimes(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('calculate-reading-times', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Success",
        description: response.data.message || "Reading times calculated successfully",
      });
      
      // Refresh the page data
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to calculate reading times",
        variant: "destructive",
      });
    } finally {
      setCalculatingReadingTimes(false);
    }
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

      // Compress the image
      const compressedFile = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.9,
        maxSizeMB: 0.5,
      });

      // Generate unique filename
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('article-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      // Update form with the new URL
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

  const handleScrapeEvents = async () => {
    try {
      setScrapingEvents(true);
      
      const { data, error } = await supabase.functions.invoke('scrape-ai-events');
      
      if (error) throw error;

      const results = data?.results;
      toast({
        title: "Events scraped successfully!",
        description: `Inserted: ${results?.inserted || 0}, Updated: ${results?.updated || 0}, Skipped: ${results?.skipped || 0} (${results?.unique_events || 0} unique from ${results?.total_extracted || 0} extracted)`,
      });

      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events-widget"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (error: any) {
      toast({
        title: "Error scraping events",
        description: error.message || "Failed to scrape events",
        variant: "destructive",
      });
    } finally {
      setScrapingEvents(false);
    }
  };

  const handleFixArticleDates = async () => {
    try {
      setFixingDates(true);
      
      toast({
        title: "Processing dates...",
        description: "This will take 2-3 minutes. Please wait.",
      });
      
      // Fetch the CSV file from public folder
      const csvResponse = await fetch('/import-data/ai-in-asia-export2-updated.csv');
      const csvData = await csvResponse.text();
      
      // Use a longer timeout since this operation takes ~3 minutes
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 300000) // 5 minute timeout
      );
      
      const requestPromise = supabase.functions.invoke('fix-article-dates', {
        body: { csvData }
      });
      
      const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any;
      
      if (error) throw error;

      const results = data?.results;
      toast({
        title: "Article dates fixed!",
        description: `${results?.updated || 0} articles updated, ${results?.skipped || 0} skipped`,
      });

      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      // Even if timeout occurs, the function might still succeed in the background
      if (error.message === 'timeout' || error.message?.includes('fetch')) {
        toast({
          title: "Processing may still be running",
          description: "The operation is taking longer than expected. Check the logs or refresh the page in a minute.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error fixing dates",
          description: error.message || "Failed to fix article dates",
          variant: "destructive",
        });
      }
    } finally {
      setFixingDates(false);
    }
  };

  const handleRefreshFeaturedContent = async () => {
    try {
      setRefreshingContent(true);
      
      toast({
        title: "Refreshing content...",
        description: "Updating editors picks and trending articles",
      });

      const { data, error } = await supabase.functions.invoke('auto-refresh-featured-content', {
        body: { manual: true }
      });
      
      if (error) throw error;

      const results = data;
      const messages = [];
      
      if (results.editorsPicksRefreshed) {
        messages.push("Editors picks refreshed");
      }
      if (results.trendingRefreshed) {
        messages.push("Category trending refreshed");
      }
      if (results.homepageTrendingRefreshed) {
        messages.push("Homepage trending refreshed");
      }

      toast({
        title: "Content refreshed successfully!",
        description: messages.length > 0 ? messages.join(", ") : "All content is up to date",
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["editors-picks"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["trending-articles"] });
    } catch (error: any) {
      toast({
        title: "Error refreshing content",
        description: error.message || "Failed to refresh featured content",
        variant: "destructive",
      });
    } finally {
      setRefreshingContent(false);
    }
  };

  // Show header immediately while checking admin status
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
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

        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="headline text-4xl mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {getFirstName(user?.email)}</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                onClick={() => navigate("/admin/dashboard")}
                variant="default"
                size="lg"
                className="flex-1 md:flex-initial"
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
                className="flex-1 md:flex-initial"
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
              <Button onClick={() => navigate("/editor")} size="lg" className="flex-1 md:flex-initial">
                <FileText className="h-4 w-4 mr-2" />
                Create New Article
              </Button>
            </div>
          </div>
        </div>

        {/* Show skeleton cards while stats are loading */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate("/admin/articles")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.articles || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Click to manage all</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={handleOpenAuthorsDialog}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Authors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.authors || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Click to manage all</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Newsletter Subscribers</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.subscribers || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Folder className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.categories || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tags</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.tags || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.comments || 0}</div>
            </CardContent>
          </Card>
        </div>
        )}

        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Content Tools & Utilities
            </CardTitle>
            <CardDescription>
              Publishing operations, analytics, and content management tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Publishing Tools */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Publishing & Operations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button onClick={() => navigate("/admin/publish-all")} variant="outline" className="justify-start">
                  Publish All Articles
                </Button>
                <Button onClick={() => navigate("/admin/bulk-operations")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                  Bulk Operations
                </Button>
                <Button 
                  onClick={handleScrapeEvents} 
                  variant="outline" 
                  className="justify-start"
                  disabled={scrapingEvents}
                >
                  {scrapingEvents ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Scraping Events...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Scrape AI Events
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleFixArticleDates} 
                  variant="outline" 
                  className="justify-start bg-amber-500/10 border-amber-500 text-amber-700 hover:bg-amber-500/20"
                  disabled={fixingDates}
                >
                  {fixingDates ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fixing Dates...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Fix Article Dates from CSV
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Analytics & Insights */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Analytics & Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button onClick={() => navigate("/admin/analytics")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                  Content Analytics
                </Button>
                <Button onClick={() => navigate("/admin/seo-tools")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                  SEO Tools
                </Button>
              </div>
            </div>

            {/* Management */}
            <div>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Content Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button onClick={() => navigate("/admin/author-management")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                  Author Management
                </Button>
                <Button onClick={() => navigate("/admin/editors-picks")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                  Editor's Picks
                </Button>
                <Button onClick={() => navigate("/admin/category-sponsors")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                  Category Sponsors
                </Button>
                <Button onClick={() => navigate("/admin/ai-comments")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  AI Comments
                </Button>
                <Button onClick={() => navigate("/admin/knowledge-engine")} variant="outline" className="justify-start bg-purple-500/10 border-purple-500 text-purple-700 hover:bg-purple-500/20">
                  <Wrench className="h-4 w-4 mr-2" />
                  Knowledge Engine
                </Button>
                <Button onClick={() => navigate("/admin/internal-links")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                  <Link2 className="h-4 w-4 mr-2" />
                  Internal Links Manager
                </Button>
                <Button onClick={() => navigate("/admin/fix-broken-links")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                  <Link2 className="h-4 w-4 mr-2" />
                  Fix Broken Links
                </Button>
                <Button onClick={() => navigate("/admin/link-health")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                  <Activity className="h-4 w-4 mr-2" />
                  Link Health Monitor
                </Button>
                <Button onClick={() => navigate("/admin/content-freshness")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                  <Clock className="h-4 w-4 mr-2" />
                  Content Freshness Tracker
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <TrendingSuggestions />

        <Tabs defaultValue="articles" className="space-y-4">
          <TabsList>
            <TabsTrigger value="articles">Recent Articles</TabsTrigger>
            <TabsTrigger value="comments">Pending Comments</TabsTrigger>
            <TabsTrigger value="tools">AI Tools</TabsTrigger>
            <TabsTrigger value="migration">Migration</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Articles</CardTitle>
              <CardDescription>Latest articles across all statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentArticles?.map((article: any) => (
                  <div key={article.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{article.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        by {article.authors?.name || "Unknown"} • {article.status}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/editor?id=${article.id}`)}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={() => navigate("/admin/articles")}>
                  View All Articles
                </Button>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Comments</CardTitle>
                <CardDescription>Comments awaiting moderation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingComments?.map((comment: any) => (
                    <div key={comment.id} className="p-4 bg-destructive/10 border-2 border-destructive rounded-lg hover:bg-destructive/20 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-destructive">{comment.author_name}</p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => approveComment(comment.id)}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteComment(comment.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm mb-2 text-foreground">{comment.content}</p>
                      <button 
                        onClick={() => {
                          const article = comment.articles as any;
                          if (article?.slug) {
                            const categorySlug = article.categories?.slug || 'uncategorized';
                            window.open(`/${categorySlug}/${article.slug}#comments`, '_blank');
                          }
                        }}
                        className="text-xs text-destructive hover:underline flex items-center gap-1 font-medium"
                      >
                        On: {comment.articles?.title}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {(!pendingComments || pendingComments.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">
                      No pending comments
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <AIToolsManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="migration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Migration Tools & Utilities
                </CardTitle>
                <CardDescription>
                  Bulk operations, content migration, image processing, and AI-powered tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Migration & Import Tools */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Migration & Import</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Button onClick={() => navigate("/admin/migration-dashboard")} variant="outline" className="justify-start">
                      Migration Dashboard
                    </Button>
                    <Button onClick={() => navigate("/admin/bulk-import")} variant="outline" className="justify-start">
                      Bulk Import Articles
                    </Button>
                    <Button onClick={() => navigate("/admin/migrate-category-urls")} variant="outline" className="justify-start bg-primary/10 border-primary text-primary hover:bg-primary/20">
                      Migrate to Category URLs
                    </Button>
                    <Button onClick={() => navigate("/admin/bulk-redirects")} variant="outline" className="justify-start">
                      Bulk URL Redirects
                    </Button>
                    <Button onClick={() => navigate("/admin/extract-image-urls")} variant="outline" className="justify-start">
                      Extract Image URLs
                    </Button>
                    <Button onClick={() => navigate("/admin/category-mapper")} variant="outline" className="justify-start">
                      Category Mapper
                    </Button>
                  </div>
                </div>

                {/* Content Processing */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Content Processing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Button onClick={() => navigate("/admin/clean-articles")} variant="outline" className="justify-start">
                      Clean Article Formatting
                    </Button>
                    <Button onClick={() => navigate("/admin/content-processor")} variant="outline" className="justify-start">
                      Content Processor
                    </Button>
                    <Button onClick={() => navigate("/admin/assign-categories")} variant="outline" className="justify-start">
                      Auto-Assign Categories
                    </Button>
                    <Button 
                      onClick={handleCalculateReadingTimes} 
                      variant="outline" 
                      className="justify-start bg-blue-500/10 border-blue-500 text-blue-700 hover:bg-blue-500/20"
                      disabled={calculatingReadingTimes}
                    >
                      {calculatingReadingTimes ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Calculate Reading Times
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Image Tools */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">Image Management</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Button onClick={() => navigate("/admin/image-migration")} variant="outline" className="justify-start">
                      Image Migration
                    </Button>
                    <Button onClick={() => navigate("/admin/update-article-images")} variant="outline" className="justify-start">
                      Update Article Images
                    </Button>
                    <Button onClick={() => navigate("/admin/fix-broken-image")} variant="outline" className="justify-start">
                      Fix Broken Images
                    </Button>
                  </div>
                </div>

                {/* AI & Generation Tools */}
                <div>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase">AI & Generation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Button onClick={() => navigate("/admin/generate-tldr")} variant="outline" className="justify-start">
                      Generate TLDR (Bulk)
                    </Button>
                    <Button onClick={() => navigate("/admin/bulk-comments")} variant="outline" className="justify-start">
                      Generate Comments (Bulk)
                    </Button>
                    <Button onClick={() => navigate("/admin/ai-comments")} variant="outline" className="justify-start bg-green-500/10 border-green-500 text-green-700 hover:bg-green-500/20">
                      AI Comments Manager
                    </Button>
                    <Button onClick={() => navigate("/admin/knowledge-engine")} variant="outline" className="justify-start bg-purple-500/10 border-purple-500 text-purple-700 hover:bg-purple-500/20">
                      Knowledge Engine
                    </Button>
                    <Button onClick={() => navigate("/admin/process-comments")} variant="outline" className="justify-start bg-green-500/10 border-green-500 text-green-700 hover:bg-green-500/20">
                      Process Pending Comments
                    </Button>
                    <Button onClick={() => navigate("/admin/migrate-toplist-images")} variant="outline" className="justify-start bg-blue-500/10 border-blue-500 text-blue-700 hover:bg-blue-500/20">
                      Migrate Top List Images
                    </Button>
                    <Button
                      onClick={handleAutoScheduleComments}
                      variant="outline" 
                      className="justify-start bg-primary/5"
                      disabled={autoScheduling}
                    >
                      {autoScheduling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Auto-Scheduling...
                        </>
                      ) : (
                        "Auto-Schedule Missing Comments"
                      )}
                    </Button>
                    <Button 
                      onClick={handleCleanWordPressMarkup} 
                      variant="outline" 
                      className="justify-start bg-blue-500/10 border-blue-500 text-blue-700 hover:bg-blue-500/20"
                      disabled={cleaningMarkup}
                    >
                      {cleaningMarkup ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Cleaning Markup...
                        </>
                      ) : (
                        "Clean WordPress Markup"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Global Settings</CardTitle>
                <CardDescription>Configure site-wide options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Google Ads</h4>
                    <p className="text-sm text-muted-foreground">Enable or disable ads site-wide</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setGoogleAdsDialogOpen(true)}
                  >
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Newsletter Popup</h4>
                    <p className="text-sm text-muted-foreground">Manage newsletter signup popup</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => setNewsletterDialogOpen(true)}
                  >
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Comment Moderation</h4>
                    <p className="text-sm text-muted-foreground">Moderate and manage comments</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "View Pending Comments",
                        description: "Switch to the Comments tab above to moderate pending comments.",
                      });
                    }}
                  >
                    Configure
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Featured Content Refresh</h4>
                    <p className="text-sm text-muted-foreground">Manually update editors picks and trending articles</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleRefreshFeaturedContent}
                    disabled={refreshingContent}
                  >
                    {refreshingContent ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <Activity className="mr-2 h-4 w-4" />
                        Refresh Now
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">URL Redirects</h4>
                    <p className="text-sm text-muted-foreground">Manage SEO redirects and migrations</p>
                  </div>
                  <Button variant="outline" onClick={() => navigate("/redirects")}>
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Google Ads Configuration Dialog */}
        <Dialog open={googleAdsDialogOpen} onOpenChange={setGoogleAdsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Google Ads Configuration</DialogTitle>
              <DialogDescription>
                Configure Google Ads settings for your site
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Google Ads</Label>
                  <p className="text-sm text-muted-foreground">
                    Show ads across the site
                  </p>
                </div>
                <Switch
                  checked={googleAdsSettings.enabled}
                  onCheckedChange={(checked) => 
                    setGoogleAdsSettings({ ...googleAdsSettings, enabled: checked })
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client_id">Google Ads Client ID</Label>
                <Input
                  id="client_id"
                  value={googleAdsSettings.client_id}
                  onChange={(e) => 
                    setGoogleAdsSettings({ ...googleAdsSettings, client_id: e.target.value })
                  }
                  placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                />
                <p className="text-sm text-muted-foreground">
                  Your Google AdSense publisher ID
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setGoogleAdsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveGoogleAdsSettings}>
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Newsletter Popup Configuration Dialog */}
        <Dialog open={newsletterDialogOpen} onOpenChange={setNewsletterDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Newsletter Popup Configuration</DialogTitle>
              <DialogDescription>
                Configure newsletter popup behavior
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Newsletter Popup</Label>
                  <p className="text-sm text-muted-foreground">
                    Show newsletter signup popup to visitors
                  </p>
                </div>
                <Switch
                  checked={newsletterSettings.enabled}
                  onCheckedChange={(checked) => 
                    setNewsletterSettings({ ...newsletterSettings, enabled: checked })
                  }
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delay">Popup Delay (milliseconds)</Label>
                <Input
                  id="delay"
                  type="number"
                  value={newsletterSettings.delay}
                  onChange={(e) => 
                    setNewsletterSettings({ ...newsletterSettings, delay: parseInt(e.target.value) || 0 })
                  }
                  placeholder="5000"
                />
                <p className="text-sm text-muted-foreground">
                  How long to wait before showing the popup (in milliseconds)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="frequency">Popup Frequency</Label>
                <select
                  id="frequency"
                  value={newsletterSettings.frequency}
                  onChange={(e) => 
                    setNewsletterSettings({ ...newsletterSettings, frequency: e.target.value })
                  }
                  className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background"
                >
                  <option value="once_per_session">Once per session</option>
                  <option value="once_per_day">Once per day</option>
                  <option value="always">Every visit</option>
                </select>
                <p className="text-sm text-muted-foreground">
                  How often to show the popup to the same visitor
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewsletterDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNewsletterSettings}>
                Save Settings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Authors Management Dialog */}
        <Dialog open={authorsDialogOpen} onOpenChange={setAuthorsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Authors</DialogTitle>
              <DialogDescription>Add, edit, or delete authors</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Author Form */}
              <div className="border border-border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">
                  {editingAuthor ? "Edit Author" : "Add New Author"}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={authorForm.name}
                      onChange={(e) => setAuthorForm({ ...authorForm, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={authorForm.slug}
                      onChange={(e) => setAuthorForm({ ...authorForm, slug: e.target.value })}
                      placeholder="john-doe"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={authorForm.email}
                      onChange={(e) => setAuthorForm({ ...authorForm, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={authorForm.job_title}
                      onChange={(e) => setAuthorForm({ ...authorForm, job_title: e.target.value })}
                      placeholder="Senior Writer"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={authorForm.bio}
                      onChange={(e) => setAuthorForm({ ...authorForm, bio: e.target.value })}
                      placeholder="Author biography..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="avatar">Avatar Image</Label>
                    {authorForm.avatar_url ? (
                      <div className="space-y-2">
                        <div className="relative inline-block">
                          <img 
                            src={authorForm.avatar_url} 
                            alt="Avatar preview" 
                            className="h-24 w-24 rounded-full object-cover border-2 border-border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={handleRemoveAvatar}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          value={authorForm.avatar_url}
                          onChange={(e) => setAuthorForm({ ...authorForm, avatar_url: e.target.value })}
                          placeholder="Or enter URL directly"
                          className="text-sm"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            id="avatar"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            className="flex-1"
                          />
                          {uploadingImage && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                        <Input
                          value={authorForm.avatar_url}
                          onChange={(e) => setAuthorForm({ ...authorForm, avatar_url: e.target.value })}
                          placeholder="Or enter URL directly"
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="twitter_handle">Twitter Handle</Label>
                    <Input
                      id="twitter_handle"
                      value={authorForm.twitter_handle}
                      onChange={(e) => setAuthorForm({ ...authorForm, twitter_handle: e.target.value })}
                      placeholder="@johndoe"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      value={authorForm.linkedin_url}
                      onChange={(e) => setAuthorForm({ ...authorForm, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      value={authorForm.website_url}
                      onChange={(e) => setAuthorForm({ ...authorForm, website_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSaveAuthor}>
                    {editingAuthor ? "Update Author" : "Create Author"}
                  </Button>
                  {editingAuthor && (
                    <Button variant="outline" onClick={resetAuthorForm}>
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Authors List */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Existing Authors</h3>
                <div className="space-y-2">
                  {authors?.map((author: any) => (
                    <div key={author.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold">{author.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {author.job_title || "No job title"} • {author.email || "No email"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditAuthor(author)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Author</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this author? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteAuthor(author.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                      </div>
                    </div>
                  ))}
                  {(!authors || authors.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">
                      No authors yet. Create your first author above.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Admin;
