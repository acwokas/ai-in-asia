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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Clock, ExternalLink, RefreshCw, TrendingUp, Mail, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInMonths, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type FreshnessLevel = "fresh" | "needs-review" | "stale" | "critical";

interface ArticleWithFreshness {
  id: string;
  title: string;
  slug: string;
  published_at: string;
  updated_at: string;
  content: any;
  externalLinks: string[];
  articleAge: number; // in days
  freshnessScore: number;
  freshnessLevel: FreshnessLevel;
  suggestions: string[];
}

const ContentFreshness = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState<"all" | FreshnessLevel>("all");
  const [isSendingAlert, setIsSendingAlert] = useState(false);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles-freshness"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, updated_at, content")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) throw error;

      return data?.map(article => {
        const content = typeof article.content === 'string' 
          ? article.content 
          : JSON.stringify(article.content);
        
        // Extract external links
        const externalLinks = Array.from(
          content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g)
        ).map(match => match[2].replace(/\^$/, ''));

        // Calculate article age
        const publishedDate = new Date(article.published_at);
        const articleAge = differenceInDays(new Date(), publishedDate);
        const monthsOld = differenceInMonths(new Date(), publishedDate);
        
        // Calculate freshness score (0-100, higher is better)
        let freshnessScore = 100;
        
        // Deduct points for article age
        if (monthsOld > 18) freshnessScore -= 40;
        else if (monthsOld > 12) freshnessScore -= 30;
        else if (monthsOld > 6) freshnessScore -= 20;
        else if (monthsOld > 3) freshnessScore -= 10;
        
        // Deduct points for lack of external links
        if (externalLinks.length === 0) freshnessScore -= 20;
        else if (externalLinks.length < 2) freshnessScore -= 10;
        
        // Bonus points for recent updates
        const lastUpdated = new Date(article.updated_at);
        const daysSinceUpdate = differenceInDays(new Date(), lastUpdated);
        if (daysSinceUpdate < 30) freshnessScore += 10;
        
        // Determine freshness level
        let freshnessLevel: FreshnessLevel;
        if (freshnessScore >= 80) freshnessLevel = "fresh";
        else if (freshnessScore >= 60) freshnessLevel = "needs-review";
        else if (freshnessScore >= 40) freshnessLevel = "stale";
        else freshnessLevel = "critical";

        // Generate suggestions
        const suggestions: string[] = [];
        if (monthsOld > 12) {
          suggestions.push(`Article is ${monthsOld} months old - consider updating statistics and examples`);
        }
        if (externalLinks.length === 0) {
          suggestions.push("No external links found - add authoritative sources to improve credibility");
        } else if (externalLinks.length < 2) {
          suggestions.push("Limited external references - consider adding more supporting links");
        }
        if (monthsOld > 6 && daysSinceUpdate > 180) {
          suggestions.push("Content hasn't been updated in over 6 months - review for accuracy");
        }
        if (monthsOld > 18) {
          suggestions.push("Critical: Article over 18 months old - high priority for refresh");
        }

        return {
          ...article,
          externalLinks,
          articleAge,
          freshnessScore,
          freshnessLevel,
          suggestions
        } as ArticleWithFreshness;
      }) || [];
    }
  });

  const filteredArticles = articles?.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = selectedTab === "all" || article.freshnessLevel === selectedTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    fresh: articles?.filter(a => a.freshnessLevel === "fresh").length || 0,
    needsReview: articles?.filter(a => a.freshnessLevel === "needs-review").length || 0,
    stale: articles?.filter(a => a.freshnessLevel === "stale").length || 0,
    critical: articles?.filter(a => a.freshnessLevel === "critical").length || 0,
    avgScore: articles?.length ? Math.round(articles.reduce((sum, a) => sum + a.freshnessScore, 0) / articles.length) : 0
  };

  const getFreshnessColor = (level: FreshnessLevel) => {
    switch (level) {
      case "fresh": return "text-green-600";
      case "needs-review": return "text-yellow-600";
      case "stale": return "text-orange-600";
      case "critical": return "text-red-600";
    }
  };

  const getFreshnessBadgeVariant = (level: FreshnessLevel): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case "fresh": return "default";
      case "needs-review": return "secondary";
      case "stale": return "outline";
      case "critical": return "destructive";
    }
  };

  const handleSendAlertNow = async () => {
    setIsSendingAlert(true);
    try {
      toast({
        title: "Sending Alert",
        description: "Checking content freshness and sending alerts to admins...",
      });

      const { data, error } = await supabase.functions.invoke('check-content-freshness', {
        body: { time: new Date().toISOString() }
      });

      if (error) throw error;

      toast({
        title: "Alert Sent",
        description: `Successfully sent freshness alerts to admins. ${data?.stats?.total || 0} articles flagged.`,
      });
    } catch (error: any) {
      console.error('Error sending alert:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send freshness alert",
        variant: "destructive",
      });
    } finally {
      setIsSendingAlert(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <a href="/admin" className="hover:text-foreground">Admin</a>
            <span>/</span>
            <span>Content Freshness Tracker</span>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Content Freshness Tracker</h1>
          <p className="text-muted-foreground">
            Monitor content age and identify articles that need updating
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Fresh Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold">{stats.fresh}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Score 80+</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-2xl font-bold">{stats.needsReview}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Score 60-79</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Stale Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-2xl font-bold">{stats.stale}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Score 40-59</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-2xl font-bold">{stats.critical}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Score &lt;40</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{stats.avgScore}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Out of 100</p>
            </CardContent>
          </Card>
        </div>

        {/* Alert Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Automated Freshness Alerts
                </CardTitle>
                <CardDescription className="mt-2">
                  Daily automated alerts are scheduled for 9 AM UTC. Admins receive emails when articles fall below freshness threshold (score &lt; 60).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleSendAlertNow}
                disabled={isSendingAlert}
                variant="outline"
              >
                {isSendingAlert ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending Alert...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Alert Now
                  </>
                )}
              </Button>
              <div className="text-sm text-muted-foreground">
                Manually trigger freshness check and email alert to all admins
              </div>
            </div>
            
            {(stats.critical > 0 || stats.stale > 0) && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  {stats.critical > 0 && (
                    <p className="font-medium text-red-600">
                      {stats.critical} critical article{stats.critical > 1 ? 's' : ''} need immediate attention
                    </p>
                  )}
                  {stats.stale > 0 && (
                    <p className="text-orange-600">
                      {stats.stale} stale article{stats.stale > 1 ? 's' : ''} should be updated soon
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Article Freshness Analysis</CardTitle>
            <CardDescription>
              Review and update articles to maintain content quality
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
            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All ({articles?.length || 0})</TabsTrigger>
                <TabsTrigger value="critical">Critical ({stats.critical})</TabsTrigger>
                <TabsTrigger value="stale">Stale ({stats.stale})</TabsTrigger>
                <TabsTrigger value="needs-review">Needs Review ({stats.needsReview})</TabsTrigger>
                <TabsTrigger value="fresh">Fresh ({stats.fresh})</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead className="text-center">Age</TableHead>
                        <TableHead className="text-center">Links</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredArticles?.map((article) => (
                        <TableRow key={article.id}>
                          <TableCell>
                            <div>
                              <a 
                                href={`/article/${article.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium hover:text-primary flex items-center gap-2"
                              >
                                {article.title}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {article.suggestions.length > 0 && (
                                <Alert className="mt-2 py-2">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertTitle className="text-sm">Suggestions</AlertTitle>
                                  <AlertDescription className="text-xs">
                                    <ul className="list-disc pl-4 space-y-1 mt-1">
                                      {article.suggestions.map((suggestion, idx) => (
                                        <li key={idx}>{suggestion}</li>
                                      ))}
                                    </ul>
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-medium">{Math.floor(article.articleAge / 30)} months</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(article.published_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {article.externalLinks.length}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${getFreshnessColor(article.freshnessLevel)}`}>
                              {article.freshnessScore}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={getFreshnessBadgeVariant(article.freshnessLevel)}>
                              {article.freshnessLevel.replace('-', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/editor?id=${article.id}`)}
                            >
                              Update
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ContentFreshness;
