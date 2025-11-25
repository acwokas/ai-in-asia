import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const FixExternalLinks = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleFixLinks = async (limit: number, dryRun: boolean = true) => {
    setIsRunning(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("fix-external-link-format", {
        body: { limit, dryRun }
      });

      if (error) throw error;

      setResults(data);
      toast({
        title: dryRun ? "Preview Complete" : "Links Fixed!",
        description: `${data.summary.updated} articles would be ${dryRun ? 'updated' : 'were updated'}, ${data.summary.skipped} skipped`,
      });
    } catch (error: any) {
      console.error("Error fixing external links:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fix external links",
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
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Fix External Link Format</h1>
            <p className="text-muted-foreground">
              Convert external links from full URL display to anchor text with ^ indicator
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Process External Links</CardTitle>
              <CardDescription>
                This tool will find external links like [text](https://example.com) and convert them to 
                [text](https://example.com)^ so they display as clickable anchor text with an external link icon 
                instead of showing the full URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Important:</strong> Start with the preview (10 articles) to verify the changes 
                  before processing all articles.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button
                  onClick={() => handleFixLinks(10, true)}
                  disabled={isRunning}
                  variant="outline"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Preview (10 Recent Articles)"
                  )}
                </Button>

                <Button
                  onClick={() => handleFixLinks(10, false)}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Fix 10 Recent Articles"
                  )}
                </Button>

                <Button
                  onClick={() => handleFixLinks(1000, false)}
                  disabled={isRunning}
                  variant="destructive"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Fix All Articles (1000)"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {results && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  {results.dryRun ? "Preview Mode - No changes were made" : "Changes have been applied"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{results.summary.total}</div>
                      <div className="text-sm text-muted-foreground">Total Processed</div>
                    </div>
                    <div className="p-4 bg-green-500/10 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {results.summary.updated}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {results.dryRun ? "Would Update" : "Updated"}
                      </div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{results.summary.skipped}</div>
                      <div className="text-sm text-muted-foreground">Skipped</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Article Details:</h3>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {results.results.map((result: any, index: number) => (
                        <div
                          key={index}
                          className={`p-3 rounded border ${
                            result.status === "updated" || result.status === "preview"
                              ? "bg-green-500/5 border-green-500/20"
                              : result.status === "failed"
                              ? "bg-red-500/5 border-red-500/20"
                              : "bg-muted border-muted"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium">{result.title}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              result.status === "updated" || result.status === "preview"
                                ? "bg-green-500/20 text-green-700 dark:text-green-300"
                                : result.status === "failed"
                                ? "bg-red-500/20 text-red-700 dark:text-red-300"
                                : "bg-muted"
                            }`}>
                              {result.status}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Slug: {result.slug}
                          </div>
                          {result.linksFixed && (
                            <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                              Fixed {result.linksFixed} external link{result.linksFixed !== 1 ? 's' : ''}
                            </div>
                          )}
                          {result.reason && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {result.reason}
                            </div>
                          )}
                          {result.error && (
                            <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                              Error: {result.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FixExternalLinks;
