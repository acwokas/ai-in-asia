import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { Loader2, Search, AlertCircle, CheckCircle, Link as LinkIcon, FileText, Home } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const SEOTools = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"all" | "need-attention" | "optimized">("all");
  const [isFixingBulk, setIsFixingBulk] = useState(false);

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
        .order("published_at", { ascending: false });
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

  const handleBulkFixSEO = async () => {
    setIsFixingBulk(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-generate-seo");
      
      if (error) throw error;
      
      toast({
        title: "Success!",
        description: `Processed ${data.processed} articles. ${data.failed} failed.`,
      });
      
      // Refresh articles
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFixingBulk(false);
    }
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
              <BreadcrumbPage>SEO Tools</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

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
            {articles && articles.filter(a => getSEOScore(a) < 80).length > 0 && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Bulk SEO Fix Available
                  </CardTitle>
                  <CardDescription>
                    {articles.filter(a => getSEOScore(a) < 80).length} articles need SEO improvements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleBulkFixSEO}
                    disabled={isFixingBulk}
                    className="w-full md:w-auto"
                  >
                    {isFixingBulk ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fixing SEO Issues...
                      </>
                    ) : (
                      <>Fix All SEO Issues</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will automatically generate missing meta titles, descriptions, and keyphrases for all articles with SEO issues.
                  </p>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === "all" ? "ring-2 ring-primary" : ""}`}
                onClick={() => setActiveFilter("all")}
              >
                <CardHeader>
                  <CardTitle className="text-lg">Total Articles</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{articles?.length || 0}</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === "optimized" ? "ring-2 ring-primary" : ""}`}
                onClick={() => setActiveFilter("optimized")}
              >
                <CardHeader>
                  <CardTitle className="text-lg">SEO Optimized</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    {articles?.filter(a => getSEOScore(a) >= 80).length || 0}
                  </p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === "need-attention" ? "ring-2 ring-primary" : ""}`}
                onClick={() => setActiveFilter("need-attention")}
              >
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
                <CardDescription>
                  {activeFilter === "all" && "Review and optimize your content"}
                  {activeFilter === "optimized" && "Articles with good SEO (80%+ score)"}
                  {activeFilter === "need-attention" && "Articles needing SEO improvements"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeFilter !== "all" && (
                  <div className="mb-4 flex items-center gap-2">
                    <Badge variant="outline">{
                      activeFilter === "optimized" 
                        ? `${articles?.filter(a => getSEOScore(a) >= 80).length || 0} articles`
                        : `${articles?.filter(a => getSEOScore(a) < 80).length || 0} articles`
                    }</Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveFilter("all")}
                    >
                      Clear filter
                    </Button>
                  </div>
                )}
                <div className="space-y-4">
                  {articles
                    ?.filter(article => {
                      const score = getSEOScore(article);
                      if (activeFilter === "optimized") return score >= 80;
                      if (activeFilter === "need-attention") return score < 80;
                      return true;
                    })
                    .map((article) => {
                      const score = getSEOScore(article);
                      const { issues, warnings } = analyzeSEO(article);
                      return (
                        <Card key={article.id} className="border">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="font-medium mb-2">{article.title}</h3>
                                {(issues.length > 0 || warnings.length > 0) && (
                                  <div className="space-y-2">
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
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge
                                  variant={score >= 80 ? "default" : score >= 50 ? "secondary" : "destructive"}
                                >
                                  {score}%
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/editor/${article.id}`)}
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
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
                            onClick={() => navigate(`/editor/${article.id}`)}
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
