import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, AlertCircle, CheckCircle, Link as LinkIcon, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const SEOTools = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string>("");

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
      .eq("role", "admin");

    if (!data || data.length === 0) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
      navigate("/admin");
      return;
    }

    setIsAdmin(true);
  };

  const { data: articles, isLoading } = useQuery({
    queryKey: ["seo-articles"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("id, title, slug, meta_title, meta_description, focus_keyphrase, status")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const analyzeSEO = (article: any) => {
    const issues = [];
    const warnings = [];
    const passed = [];

    // Check meta title
    if (!article.meta_title) {
      issues.push("Missing meta title");
    } else if (article.meta_title.length > 60) {
      warnings.push("Meta title too long (>60 chars)");
    } else {
      passed.push("Meta title present");
    }

    // Check meta description
    if (!article.meta_description) {
      issues.push("Missing meta description");
    } else if (article.meta_description.length > 160) {
      warnings.push("Meta description too long (>160 chars)");
    } else {
      passed.push("Meta description present");
    }

    // Check focus keyphrase
    if (!article.focus_keyphrase) {
      warnings.push("No focus keyphrase");
    } else {
      passed.push("Focus keyphrase set");
    }

    return { issues, warnings, passed };
  };

  const getSEOScore = (article: any) => {
    const { issues, warnings, passed } = analyzeSEO(article);
    const total = issues.length + warnings.length + passed.length;
    const score = Math.round((passed.length / total) * 100);
    return score;
  };

  if (isAdmin === null || isLoading) {
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
        <div className="mb-8">
          <h1 className="headline text-4xl mb-2">SEO Tools</h1>
          <p className="text-muted-foreground">
            Optimize your content for search engines
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">SEO Overview</TabsTrigger>
            <TabsTrigger value="issues">Issues & Warnings</TabsTrigger>
            <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Articles</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{articles?.length || 0}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">SEO Optimized</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    {articles?.filter(a => getSEOScore(a) >= 80).length || 0}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Attention</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-orange-600">
                    {articles?.filter(a => getSEOScore(a) < 80).length || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Article SEO Scores</CardTitle>
                <CardDescription>Review and optimize your content</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>SEO Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles?.map((article) => {
                      const score = getSEOScore(article);
                      return (
                        <TableRow key={article.id}>
                          <TableCell className="font-medium">{article.title}</TableCell>
                          <TableCell>
                            <Badge
                              variant={score >= 80 ? "default" : score >= 50 ? "secondary" : "destructive"}
                            >
                              {score}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {score >= 80 ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/editor/${article.id}`)}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SEO Issues & Recommendations</CardTitle>
                <CardDescription>Articles that need SEO improvements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {articles?.filter(a => getSEOScore(a) < 80).map((article) => {
                    const { issues, warnings } = analyzeSEO(article);
                    return (
                      <Card key={article.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{article.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {issues.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-red-600 mb-1">Critical Issues:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {issues.map((issue, i) => (
                                  <li key={i} className="text-sm text-muted-foreground">{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {warnings.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-orange-600 mb-1">Warnings:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {warnings.map((warning, i) => (
                                  <li key={i} className="text-sm text-muted-foreground">{warning}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/editor/${article.id}`)}
                          >
                            Fix Issues
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sitemap" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sitemap Management</CardTitle>
                <CardDescription>Your sitemap is automatically generated and updated</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <LinkIcon className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Sitemap URL</p>
                    <a 
                      href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap
                    </a>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap`, "_blank")}
                  >
                    View Sitemap
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">RSS Feed</p>
                    <a 
                      href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-rss`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-rss
                    </a>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-rss`, "_blank")}
                  >
                    View RSS
                  </Button>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Note:</strong> Submit your sitemap to search engines:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Google Search Console: Add and verify your sitemap</li>
                    <li>Bing Webmaster Tools: Submit your sitemap URL</li>
                    <li>The sitemap is automatically updated when articles are published</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SEOTools;
