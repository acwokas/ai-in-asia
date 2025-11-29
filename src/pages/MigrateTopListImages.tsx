import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const MigrateTopListImages = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleMigration = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log("Starting image migration...");
      
      const { data, error } = await supabase.functions.invoke('migrate-article-images', {
        body: {
          sourceArticleId: '4946d01c-5e78-4189-8d4f-e022151e62d5', // Original article
          targetArticleId: 'affed528-9552-48f8-ae50-c687fe87a6ca'  // Top Lists article
        }
      });

      if (error) {
        console.error("Migration error:", error);
        toast({
          title: "Migration Failed",
          description: error.message,
          variant: "destructive"
        });
        setResult({ success: false, error: error.message });
        return;
      }

      console.log("Migration result:", data);
      setResult(data);
      
      if (data.success) {
        toast({
          title: "Migration Successful",
          description: `Successfully migrated ${data.imagesUploaded} images`,
        });
      } else {
        toast({
          title: "Migration Failed",
          description: data.error || "Unknown error",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Migration Failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      setResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Migrate Top List Images</h1>
        
        <p className="text-muted-foreground mb-6">
          This will extract the 10 example images from the original article and upload them 
          to the Top Lists version of the article.
        </p>

        <Button 
          onClick={handleMigration} 
          disabled={loading}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Migrating Images..." : "Start Migration"}
        </Button>

        {result && (
          <div className="mt-6 p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold text-green-700">Success!</h3>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold text-red-700">Failed</h3>
                </>
              )}
            </div>
            
            {result.success ? (
              <div className="space-y-2">
                <p className="text-sm">Images uploaded: {result.imagesUploaded}</p>
                {result.imageUrls && result.imageUrls.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2">Uploaded URLs:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {result.imageUrls.map((url: string, idx: number) => (
                        <div key={idx} className="text-xs font-mono bg-muted p-2 rounded break-all">
                          <span className="mr-1">{idx + 1}.</span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-primary hover:text-primary/80 break-all"
                          >
                            {url}
                          </a>
                        </div>
                      ))}

                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-red-600">{result.error}</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default MigrateTopListImages;
