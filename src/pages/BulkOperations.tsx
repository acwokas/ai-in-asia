import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Search, CheckSquare, Tag, Globe, Archive, Calendar, TrendingUp, Sparkles, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

const BulkOperations = () => {
  const navigate = useNavigate();
  
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [targetValue, setTargetValue] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

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
      toast.error("Access Denied", { description: "You need admin privileges to access this page." });
      navigate("/admin");
      return;
    }

    setIsAdmin(true);
  };

  const { data: articles, isLoading } = useQuery({
    queryKey: ["bulk-articles", searchQuery],
    enabled: isAdmin === true,
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select(`
          id,
          title,
          slug,
          status,
          published_at,
          featured_on_homepage,
          homepage_trending,
          is_trending,
          sticky,
          series_id,
          primary_category_id,
          categories:primary_category_id (name, slug),
          authors (name)
        `)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data } = await supabase
        .from("tags")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  const handleSelectAll = () => {
    if (selectedArticles.length === articles?.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(articles?.map(a => a.id) || []);
    }
  };

  const handleSelectArticle = (id: string) => {
    setSelectedArticles(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkOperation = async () => {
    if (selectedArticles.length === 0) {
      toast.error("No articles selected", { description: "Please select at least one article" });
      return;
    }

    if (!bulkAction) {
      toast.error("No action selected", { description: "Please select a bulk action" });
      return;
    }

    setIsProcessing(true);

    try {
      switch (bulkAction) {
        case "publish":
          await supabase
            .from("articles")
            .update({ 
              status: "published",
              published_at: new Date().toISOString()
            })
            .in("id", selectedArticles);
          break;

        case "draft":
          await supabase
            .from("articles")
            .update({ status: "draft" })
            .in("id", selectedArticles);
          break;

        case "archive":
          await supabase
            .from("articles")
            .update({ status: "archived" })
            .in("id", selectedArticles);
          break;

        case "feature":
          await supabase
            .from("articles")
            .update({ featured_on_homepage: true })
            .in("id", selectedArticles);
          break;

        case "unfeature":
          await supabase
            .from("articles")
            .update({ featured_on_homepage: false })
            .in("id", selectedArticles);
          break;

        case "trending":
          await supabase
            .from("articles")
            .update({ homepage_trending: true })
            .in("id", selectedArticles);
          break;

        case "untrending":
          await supabase
            .from("articles")
            .update({ homepage_trending: false })
            .in("id", selectedArticles);
          break;

        case "category-trending":
          await supabase
            .from("articles")
            .update({ is_trending: true })
            .in("id", selectedArticles);
          break;

        case "category-untrending":
          await supabase
            .from("articles")
            .update({ is_trending: false })
            .in("id", selectedArticles);
          break;

        case "sticky":
          await supabase
            .from("articles")
            .update({ sticky: true })
            .in("id", selectedArticles);
          break;

        case "unsticky":
          await supabase
            .from("articles")
            .update({ sticky: false })
            .in("id", selectedArticles);
          break;

        case "category":
          if (!targetValue) {
            toast.error("No category selected", { description: "Please select a category" });
            setIsProcessing(false);
            return;
          }
          await supabase
            .from("articles")
            .update({ primary_category_id: targetValue })
            .in("id", selectedArticles);
          break;

        case "add-tag":
          if (!targetValue) {
            toast.error("No tag selected", { description: "Please select a tag" });
            setIsProcessing(false);
            return;
          }
          // Add tag to all selected articles
          const tagInserts = selectedArticles.map(articleId => ({
            article_id: articleId,
            tag_id: targetValue
          }));
          await supabase
            .from("article_tags")
            .upsert(tagInserts, { onConflict: "article_id,tag_id" });
          break;

        case "auto-tag":
          // Call edge function for each article
          for (const articleId of selectedArticles) {
            await supabase.functions.invoke("assign-smart-tags", {
              body: { articleId }
            });
          }
          break;

        case "schedule":
          if (!targetValue) {
            toast.error("No date selected", { description: "Please select a date" });
            setIsProcessing(false);
            return;
          }
          await supabase
            .from("articles")
            .update({ 
              status: "draft" as any,
              scheduled_for: targetValue 
            })
            .in("id", selectedArticles);
          break;

        default:
          throw new Error("Unknown action");
      }

      toast("Success", { description: `Bulk operation completed for ${selectedArticles.length} articles` });

      setSelectedArticles([]);
      setBulkAction("");
      setTargetValue("");
      queryClient.invalidateQueries({ queryKey: ["bulk-articles"] });
    } catch (error) {
      console.error("Bulk operation error:", error);
      toast.error("Error", { description: "Failed to complete bulk operation" });
    } finally {
      setIsProcessing(false);
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
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="headline text-4xl mb-2">Bulk Operations</h1>
          <p className="text-muted-foreground">
            Manage multiple articles at once
          </p>
        </div>

        <Tabs defaultValue="operations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="operations">Bulk Operations</TabsTrigger>
            <TabsTrigger value="smart">Smart Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-6">
            {/* Action Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Select Action</CardTitle>
                <CardDescription>
                  Choose an action to apply to selected articles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bulk action..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publish">Publish Articles</SelectItem>
                      <SelectItem value="draft">Set to Draft</SelectItem>
                      <SelectItem value="archive">Archive Articles</SelectItem>
                      <SelectItem value="feature">Feature on Homepage</SelectItem>
                      <SelectItem value="unfeature">Remove from Homepage</SelectItem>
                      <SelectItem value="trending">Mark as Homepage Trending</SelectItem>
                      <SelectItem value="untrending">Remove Homepage Trending</SelectItem>
                      <SelectItem value="category-trending">Mark as Category Trending</SelectItem>
                      <SelectItem value="category-untrending">Remove Category Trending</SelectItem>
                      <SelectItem value="sticky">Make Sticky</SelectItem>
                      <SelectItem value="unsticky">Remove Sticky</SelectItem>
                      <SelectItem value="category">Assign Category</SelectItem>
                      <SelectItem value="add-tag">Add Tag</SelectItem>
                      <SelectItem value="schedule">Schedule Publication</SelectItem>
                    </SelectContent>
                  </Select>

                  {bulkAction === "category" && (
                    <Select value={targetValue} onValueChange={setTargetValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {bulkAction === "add-tag" && (
                    <Select value={targetValue} onValueChange={setTargetValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tag..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tags?.map((tag) => (
                          <SelectItem key={tag.id} value={tag.id}>
                            {tag.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {bulkAction === "schedule" && (
                    <Input
                      type="datetime-local"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                    />
                  )}

                  <Button
                    onClick={handleBulkOperation}
                    disabled={isProcessing || selectedArticles.length === 0}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Apply to ${selectedArticles.length} articles`
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Article Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Select Articles</span>
                  <Badge variant="secondary">
                    {selectedArticles.length} selected
                  </Badge>
                </CardTitle>
                <div className="flex gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button variant="outline" onClick={handleSelectAll}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {selectedArticles.length === articles?.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {articles?.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleSelectArticle(article.id)}
                    >
                      <Checkbox
                        checked={selectedArticles.includes(article.id)}
                        onCheckedChange={() => handleSelectArticle(article.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{article.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {article.status}
                          </Badge>
                          {article.categories?.name && (
                            <span className="text-xs">{article.categories.name}</span>
                          )}
                          {article.featured_on_homepage && (
                            <Badge variant="secondary" className="text-xs">Featured</Badge>
                          )}
                          {article.homepage_trending && (
                            <Badge variant="secondary" className="text-xs">Homepage Trending</Badge>
                          )}
                          {article.is_trending && (
                            <Badge variant="secondary" className="text-xs">Category Trending</Badge>
                          )}
                          {article.sticky && (
                            <Badge variant="secondary" className="text-xs">Sticky</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="smart" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Powered Smart Actions
                </CardTitle>
                <CardDescription>
                  Use AI to automatically optimize and manage your content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-start p-4 gap-2"
                    onClick={() => {
                      setBulkAction("auto-tag");
                      handleBulkOperation();
                    }}
                    disabled={selectedArticles.length === 0}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Tag className="h-4 w-4" />
                      <span className="font-semibold">Smart Auto-Tagging</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-left">
                      Automatically assign relevant tags using AI analysis
                    </p>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-start p-4 gap-2"
                    onClick={() => navigate("/admin/generate-tldr-bulk")}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Sparkles className="h-4 w-4" />
                      <span className="font-semibold">Generate TL;DR</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-left">
                      Create AI-powered article summaries in bulk
                    </p>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-start p-4 gap-2"
                    onClick={() => navigate("/admin/assign-categories")}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Globe className="h-4 w-4" />
                      <span className="font-semibold">Smart Categorization</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-left">
                      AI-powered category assignment based on content
                    </p>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-start p-4 gap-2"
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        await supabase.rpc("update_trending_articles");
                        toast("Success", { description: "Trending articles updated" });
                        queryClient.invalidateQueries({ queryKey: ["bulk-articles"] });
                      } catch (error) {
                        toast.error("Error", { description: "Failed to update trending articles" });
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-semibold">Update Trending</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-left">
                      Recalculate trending articles based on engagement
                    </p>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      
    </div>
  );
};

export default BulkOperations;
