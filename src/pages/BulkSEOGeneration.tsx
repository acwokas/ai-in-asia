import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
import Header from "@/components/Header";

const BulkSEOGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);
  

  const handleBulkGenerate = async () => {
    setIsGenerating(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke("bulk-generate-seo");

      if (error) throw error;

      setResults(data);
      
      toast("Bulk SEO Generation Complete!", { description: `Successfully processed ${data.processed} articles. ${data.failed} failed.` });
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to generate SEO metadata" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              Bulk SEO Generation
            </CardTitle>
            <CardDescription>
              Generate SEO metadata for all published articles with missing or incomplete SEO data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What this does:</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Scans all published articles for missing SEO data</li>
                <li>Generates Meta Title (HTML title tag)</li>
                <li>Generates SEO Title (optimized for search engines)</li>
                <li>Creates Focus Keyphrase (main target keyword)</li>
                <li>Adds Keyphrase Synonyms (related keywords)</li>
                <li>Optimizes Meta Description (if missing)</li>
              </ul>
            </div>

            <Button
              onClick={handleBulkGenerate}
              disabled={isGenerating}
              size="lg"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Generating SEO for articles...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate SEO for All Articles
                </>
              )}
            </Button>

            {results && (
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <h3 className="font-semibold mb-2">Results:</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{results.total}</div>
                    <div className="text-xs text-muted-foreground">Total Found</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{results.processed}</div>
                    <div className="text-xs text-muted-foreground">Processed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-3 rounded">
              ⚠️ Note: This process may take several minutes for large numbers of articles. 
              The system processes articles with a delay to avoid rate limits.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BulkSEOGeneration;
