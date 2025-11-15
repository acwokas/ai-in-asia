import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, Eye, MessageSquare, ThumbsUp, Calendar, Users, FileText, Star, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const ContentAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .or("role.eq.admin,role.eq.editor");

    if (!data || data.length === 0) {
      toast({
        title: "Access Denied",
        description: "You need admin or editor privileges.",
        variant: "destructive",
      });
      navigate("/admin");
      return;
    }

    setIsAdmin(true);
  };

  const { data: overallStats } = useQuery({
    queryKey: ["overall-stats"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data: articles, error } = await supabase
        .from("articles")
        .select("status, view_count, like_count, comment_count")
        .eq("status", "published");

      if (error) throw error;

      const totalViews = articles.reduce((sum, a) => sum + (a.view_count || 0), 0);
      const totalLikes = articles.reduce((sum, a) => sum + (a.like_count || 0), 0);
      const totalComments = articles.reduce((sum, a) => sum + (a.comment_count || 0), 0);

      return {
        totalArticles: articles.length,
        totalViews,
        totalLikes,
        totalComments,
        avgViews: Math.round(totalViews / articles.length) || 0,
      };
    },
  });

  const { data: topPerformers } = useQuery({
    queryKey: ["top-performers"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          view_count,
          like_count,
          comment_count,
          published_at,
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const { data: recentArticles } = useQuery({
    queryKey: ["recent-performance"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          view_count,
          like_count,
          comment_count,
          published_at,
          categories:primary_category_id (name, slug)
        `)
        .eq("status", "published")
        .gte("published_at", thirtyDaysAgo.toISOString())
        .order("published_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const { data: categoryStats } = useQuery({
    queryKey: ["category-stats"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name");

      if (!categories) return [];

      const stats = await Promise.all(
        categories.map(async (cat) => {
          const { data: articles } = await supabase
            .from("articles")
            .select("view_count, like_count, comment_count")
            .eq("status", "published")
            .eq("primary_category_id", cat.id);

          const count = articles?.length || 0;
          const totalViews = articles?.reduce((sum, a) => sum + (a.view_count || 0), 0) || 0;

          return {
            ...cat,
            articleCount: count,
            totalViews,
            avgViews: count > 0 ? Math.round(totalViews / count) : 0,
          };
        })
      );

      return stats.sort((a, b) => b.totalViews - a.totalViews);
    },
  });

  const { data: authorStats } = useQuery({
    queryKey: ["author-stats"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data: authors } = await supabase
        .from("authors")
        .select("id, name, article_count");

      if (!authors) return [];

      const stats = await Promise.all(
        authors.map(async (author) => {
          const { data: articles } = await supabase
            .from("articles")
            .select("view_count, like_count, comment_count")
            .eq("status", "published")
            .eq("author_id", author.id);

          const totalViews = articles?.reduce((sum, a) => sum + (a.view_count || 0), 0) || 0;
          const totalEngagement = articles?.reduce(
            (sum, a) => sum + (a.like_count || 0) + (a.comment_count || 0), 
            0
          ) || 0;

          return {
            ...author,
            totalViews,
            totalEngagement,
            avgViews: author.article_count > 0 ? Math.round(totalViews / author.article_count) : 0,
          };
        })
      );

      return stats.sort((a, b) => b.totalViews - a.totalViews).slice(0, 10);
    },
  });

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin">Admin</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Content Analytics</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <h1 className="headline text-4xl mb-2">Content Analytics</h1>
          <p className="text-muted-foreground">
            Track performance and insights across your content
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-3xl font-bold">{overallStats?.totalArticles || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-3xl font-bold">{overallStats?.totalViews?.toLocaleString() || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: {overallStats?.avgViews || 0} per article
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-primary" />
                <span className="text-3xl font-bold">{overallStats?.totalLikes || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Likes across all content
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-3xl font-bold">{overallStats?.totalComments || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active discussions
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="top-performers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
            <TabsTrigger value="recent">Recent Performance</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
            <TabsTrigger value="authors">By Author</TabsTrigger>
          </TabsList>

          <TabsContent value="top-performers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Top 10 Articles
                </CardTitle>
                <CardDescription>Most viewed articles of all time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers?.map((article, index) => (
                    <div key={article.id} className="flex items-start gap-4 p-4 rounded-lg border">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/${article.categories?.slug || 'news'}/${article.slug}`}
                          className="font-medium mb-1 hover:text-primary transition-colors block"
                        >
                          {article.title}
                        </Link>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.view_count?.toLocaleString() || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {article.like_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {article.comment_count || 0}
                          </span>
                          {article.categories && (
                            <Badge variant="outline" className="text-xs">
                              {article.categories.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Last 30 Days
                </CardTitle>
                <CardDescription>Recent article performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentArticles?.map((article) => (
                    <div key={article.id} className="flex items-start gap-4 p-4 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/${article.categories?.slug || 'news'}/${article.slug}`}
                          className="font-medium mb-1 hover:text-primary transition-colors block"
                        >
                          {article.title}
                        </Link>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {article.view_count?.toLocaleString() || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {article.like_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {article.comment_count || 0}
                          </span>
                          <span className="text-xs">
                            {new Date(article.published_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Category Performance
                </CardTitle>
                <CardDescription>Content performance by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryStats?.map((cat) => (
                    <div key={cat.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{cat.name}</h3>
                        <Badge variant="secondary">{cat.articleCount} articles</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {cat.totalViews.toLocaleString()} total views
                        </span>
                        <span>Avg: {cat.avgViews} views per article</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authors">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Top Authors
                </CardTitle>
                <CardDescription>Most impactful content creators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {authorStats?.map((author, index) => (
                    <div key={author.id} className="flex items-start gap-4 p-4 rounded-lg border">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{author.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{author.article_count} articles</span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {author.totalViews.toLocaleString()} views
                          </span>
                          <span>Avg: {author.avgViews} per article</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ContentAnalytics;
