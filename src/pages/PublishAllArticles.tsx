import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Home } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const PublishAllArticles = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentArticle, setCurrentArticle] = useState("");
  const [totalArticles, setTotalArticles] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handlePublishAll = async () => {
    setIsRunning(true);
    setResults(null);
    setProgress(0);
    setProcessedCount(0);
    setCurrentArticle("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-all-articles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to start publishing");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "total") {
                setTotalArticles(data.count);
              } else if (data.type === "progress") {
                setCurrentArticle(data.article);
                setProcessedCount(data.count);
                setProgress(data.progress);
              } else if (data.type === "error") {
                setCurrentArticle(data.article);
                setProgress(data.progress);
              } else if (data.type === "complete") {
                setResults(data);
                toast({
                  title: "Success!",
                  description: data.message,
                });
              }
            } catch (e) {
              console.error("Error parsing SSE:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error publishing articles:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to publish articles",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="inline-flex items-center gap-1">
                  <Home className="h-3 w-3" />
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
              <BreadcrumbPage>Publish All Articles</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Publish All Draft Articles</CardTitle>
            <CardDescription>
              This will change the status of all draft articles to "published". Articles will NOT be automatically featured on the homepage - homepage featuring follows the standard logic based on most recent published articles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isRunning && (
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Publishing articles...</span>
                  <span>{processedCount} / {totalArticles}</span>
                </div>
                <Progress value={progress} className="h-2" />
                {currentArticle && (
                  <p className="text-xs text-muted-foreground">
                    Current: {currentArticle}
                  </p>
                )}
              </div>
            )}

            <Button 
              onClick={handlePublishAll} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRunning ? "Publishing Draft Articles..." : "Publish All Draft Articles"}
            </Button>

            {results && (
              <div className="space-y-4 mt-6">
                <div className="p-4 bg-secondary rounded-lg">
                  <h3 className="font-semibold mb-2">Results</h3>
                  <p className="text-sm text-muted-foreground">
                    Total articles processed: {results.totalProcessed}
                  </p>
                  <p className="text-sm text-success">
                    Articles published: {results.results?.filter((r: any) => r.status === 'updated').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Already published: {results.results?.filter((r: any) => r.status === 'already_published').length || 0}
                  </p>
                  {results.results?.filter((r: any) => r.status === 'error').length > 0 && (
                    <p className="text-sm text-destructive">
                      Errors: {results.results?.filter((r: any) => r.status === 'error').length}
                    </p>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {results.results?.map((result: any) => (
                    <div 
                      key={result.id} 
                      className="flex items-center gap-2 p-2 text-sm border rounded"
                    >
                      {result.status === 'updated' && (
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      )}
                      {result.status === 'already_published' && (
                        <CheckCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      {result.status === 'error' && (
                        <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate">{result.slug}</span>
                      <span className="text-xs text-muted-foreground">{result.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default PublishAllArticles;
