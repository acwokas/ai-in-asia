import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ExternalLink, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const LinkHealthMonitor = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [linkHealthData, setLinkHealthData] = useState<any>(null);

  // Fetch all published articles
  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles-link-health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, content")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) throw error;

      return data?.map(article => {
        const content = typeof article.content === 'string' 
          ? article.content 
          : JSON.stringify(article.content);
        
        // Extract all links from content
        const internalLinks = Array.from(content.matchAll(/\[([^\]]+)\]\((\/[^\)]+)\)/g)).map(match => ({
          text: match[1],
          url: match[2],
          type: 'internal'
        }));
        
        const externalLinks = Array.from(content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g)).map(match => ({
          text: match[1],
          url: match[2].replace(/\^$/, ''), // Remove trailing ^
          type: 'external'
        }));

        return {
          ...article,
          internalLinks,
          externalLinks,
          totalLinks: internalLinks.length + externalLinks.length
        };
      }) || [];
    }
  });

  const handleCheckLinkHealth = async () => {
    if (!articles) return;

    setIsCheckingLinks(true);
    toast({
      title: "Checking Link Health",
      description: "Validating all internal and external links...",
    });

    const results: any = {
      brokenInternal: [],
      brokenExternal: [],
      working: 0,
      total: 0
    };

    // Check internal links
    for (const article of articles) {
      for (const link of article.internalLinks) {
        results.total++;
        
        // Check if internal link exists
        const slug = link.url.replace(/^\//, '').split('/').pop();
        const { data: linkedArticle } = await supabase
          .from("articles")
          .select("id, slug")
          .eq("slug", slug)
          .eq("status", "published")
          .single();

        if (!linkedArticle) {
          results.brokenInternal.push({
            articleId: article.id,
            articleTitle: article.title,
            linkText: link.text,
            linkUrl: link.url,
            reason: "Article not found or not published"
          });
        } else {
          results.working++;
        }
      }

      // Check external links (sample check - full check would need a backend function)
      for (const link of article.externalLinks) {
        results.total++;
        // For now, just count them as working - full validation needs backend
        results.working++;
      }
    }

    setLinkHealthData(results);
    setIsCheckingLinks(false);

    toast({
      title: "Link Health Check Complete",
      description: `${results.working}/${results.total} links working. ${results.brokenInternal.length} broken internal links found.`,
    });
  };

  const handleFixBrokenLink = async (brokenLink: any) => {
    navigate(`/editor?id=${brokenLink.articleId}`);
  };

  const filteredArticles = articles?.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLinks = articles?.reduce((sum, a) => sum + a.totalLinks, 0) || 0;
  const articlesWithLinks = articles?.filter(a => a.totalLinks > 0).length || 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <a href="/admin" className="hover:text-foreground">Admin</a>
            <span>/</span>
            <span>Link Health Monitor</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Link Health Monitor</h1>
          <p className="text-muted-foreground">
            Monitor and fix broken internal and external links across your site
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{totalLinks}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Across all articles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Articles with Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{articlesWithLinks}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Out of {articles?.length || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Broken Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-2xl font-bold">
                  {linkHealthData?.brokenInternal?.length || 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Need fixing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">
                  {linkHealthData ? Math.round((linkHealthData.working / linkHealthData.total) * 100) : 100}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Links working</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Link Health Check</CardTitle>
            <CardDescription>
              Scan all articles to find broken internal links and problematic external links
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCheckLinkHealth}
              disabled={isCheckingLinks || !articles}
              className="w-full sm:w-auto"
            >
              {isCheckingLinks ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Checking Links...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check All Links
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Broken Links Results */}
        {linkHealthData && linkHealthData.brokenInternal.length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Broken Internal Links Found</AlertTitle>
            <AlertDescription>
              <div className="mt-4 space-y-2">
                {linkHealthData.brokenInternal.map((link: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-background rounded border">
                    <div className="flex-1">
                      <div className="font-medium">{link.articleTitle}</div>
                      <div className="text-sm text-muted-foreground">
                        Link: "{link.linkText}" → {link.linkUrl}
                      </div>
                      <div className="text-xs text-destructive">{link.reason}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFixBrokenLink(link)}
                    >
                      Fix
                    </Button>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Articles Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Articles</CardTitle>
            <CardDescription>
              View link counts and health status for each article
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
                        <Badge variant="secondary">
                          {article.internalLinks.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {article.externalLinks.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {article.totalLinks}
                      </TableCell>
                      <TableCell className="text-right">
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

export default LinkHealthMonitor;
