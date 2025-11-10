import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, AlertTriangle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const InternalLinksManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isGeneratingLinks, setIsGeneratingLinks] = useState<string | null>(null);

  // Fetch all published articles with their internal link count
  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles-internal-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, content")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) throw error;

      // Count internal links in each article
      const articlesWithLinkCount = data?.map(article => {
        const content = typeof article.content === 'string' 
          ? article.content 
          : JSON.stringify(article.content);
        
        // Count internal links (markdown format: [text](/slug))
        const internalLinkMatches = content.match(/\[([^\]]+)\]\((\/[^\)]+)\)/g) || [];
        const internalLinkCount = internalLinkMatches.length;

        // Count external links (markdown format: [text](http...))
        const externalLinkMatches = content.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g) || [];
        const externalLinkCount = externalLinkMatches.length;

        return {
          ...article,
          internalLinkCount,
          externalLinkCount,
          totalLinks: internalLinkCount + externalLinkCount
        };
      }) || [];

      return articlesWithLinkCount;
    }
  });

  const handleSuggestLinks = async (articleId: string, title: string, content: any) => {
    setIsGeneratingLinks(articleId);
    try {
      const contentString = typeof content === 'string' 
        ? content 
        : JSON.stringify(content);

      const { data, error } = await supabase.functions.invoke("suggest-internal-links", {
        body: { 
          content: contentString, 
          title,
          currentArticleId: articleId
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        // Show suggestions in a dialog or navigate to editor with suggestions
        toast({
          title: "Link Suggestions Generated",
          description: `Found ${data.suggestions.internalLinks?.length || 0} internal and ${data.suggestions.externalLinks?.length || 0} external link suggestions`,
        });
        
        // You could store these suggestions and pass them to the editor
        console.log("Link suggestions:", data.suggestions);
        
        // Navigate to editor with the article
        navigate(`/editor?id=${articleId}`);
      }
    } catch (error: any) {
      console.error("Error generating link suggestions:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate link suggestions",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingLinks(null);
    }
  };

  const filteredArticles = articles?.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const orphanedArticles = articles?.filter(a => a.internalLinkCount === 0).length || 0;
  const articlesWithNoExternalLinks = articles?.filter(a => a.externalLinkCount === 0).length || 0;
  const avgInternalLinks = articles?.reduce((sum, a) => sum + a.internalLinkCount, 0) / (articles?.length || 1);
  const avgExternalLinks = articles?.reduce((sum, a) => sum + a.externalLinkCount, 0) / (articles?.length || 1);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <a href="/admin" className="hover:text-foreground">Admin</a>
            <span>/</span>
            <span>Internal Links Manager</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Internal Links Manager</h1>
          <p className="text-muted-foreground">
            Monitor and improve your internal linking strategy for better SEO
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Orphaned Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-2xl font-bold">{orphanedArticles}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">No internal links</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">No External Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-warning" />
                <span className="text-2xl font-bold">{articlesWithNoExternalLinks}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Missing authority links</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Internal Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{avgInternalLinks.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per article</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg External Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{avgExternalLinks.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per article</p>
            </CardContent>
          </Card>
        </div>

        {/* Articles Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Articles</CardTitle>
            <CardDescription>
              View internal and external link counts for each article
            </CardDescription>
            <div className="mt-4">
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article Title</TableHead>
                    <TableHead className="text-center">Internal Links</TableHead>
                    <TableHead className="text-center">External Links</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles?.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">
                        <a 
                          href={`/article/${article.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary flex items-center gap-2"
                        >
                          {article.title}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={article.internalLinkCount === 0 ? "destructive" : "secondary"}>
                          {article.internalLinkCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={article.externalLinkCount === 0 ? "outline" : "secondary"}>
                          {article.externalLinkCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {article.totalLinks}
                      </TableCell>
                      <TableCell className="text-center">
                        {article.internalLinkCount === 0 && article.externalLinkCount === 0 && (
                          <Badge variant="destructive">Critical</Badge>
                        )}
                        {article.internalLinkCount === 0 && article.externalLinkCount > 0 && (
                          <Badge variant="destructive">Orphaned</Badge>
                        )}
                        {article.internalLinkCount > 0 && article.externalLinkCount === 0 && (
                          <Badge variant="outline">No External</Badge>
                        )}
                        {article.internalLinkCount > 0 && article.externalLinkCount > 0 && (
                          <Badge variant="default">Good</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSuggestLinks(article.id, article.title, article.content)}
                          disabled={isGeneratingLinks === article.id}
                          className="mr-2"
                        >
                          {isGeneratingLinks === article.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Generating...
                            </>
                          ) : (
                            "Suggest Links"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/editor?id=${article.id}`)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default InternalLinksManager;
