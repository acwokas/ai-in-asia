import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Home } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const CleanArticles = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleCleanArticles = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('clean-article-formatting');

      if (error) throw error;

      if (data.success) {
        setResults(data);
        toast({
          title: "Success!",
          description: data.message,
        });
      } else {
        throw new Error(data.error || "Failed to clean articles");
      }
    } catch (error) {
      console.error("Error cleaning articles:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clean articles",
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
              <BreadcrumbPage>Clean Articles</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Clean Article Formatting</CardTitle>
            <CardDescription>
              Remove leftover ** markers from WordPress imports in all published articles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleCleanArticles} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRunning ? "Cleaning Articles..." : "Clean All Articles"}
            </Button>

            {results && (
              <div className="space-y-4 mt-6">
                <div className="p-4 bg-secondary rounded-lg">
                  <h3 className="font-semibold mb-2">Results</h3>
                  <p className="text-sm text-muted-foreground">
                    Total articles processed: {results.totalProcessed}
                  </p>
                  <p className="text-sm text-success">
                    Articles cleaned: {results.results?.filter((r: any) => r.status === 'cleaned').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Already clean: {results.results?.filter((r: any) => r.status === 'already_clean').length || 0}
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
                      {result.status === 'cleaned' && (
                        <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                      )}
                      {result.status === 'already_clean' && (
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

export default CleanArticles;
