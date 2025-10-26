import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const RemoveTweetLinks = () => {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleRemoveTweetLinks = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in");
        navigate("/auth");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-tweet-links`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove tweet links");
      }

      const data = await response.json();
      setResults(data.results);
      toast.success("Tweet link removal completed");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to remove tweet links");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Remove Legacy Tweet Links</CardTitle>
            <CardDescription>
              This tool removes legacy "Tweet" links from migrated WordPress articles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Removes HTML tweet links: {"<a>Tweet</a>"}</li>
                  <li>Removes markdown tweet links: [Tweet](...)</li>
                  <li>Cleans up formatting after removal</li>
                  <li>Processes all articles in batches</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleRemoveTweetLinks}
              disabled={isRunning}
              className="w-full"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing Tweet Links...
                </>
              ) : (
                "Remove Tweet Links"
              )}
            </Button>

            {results && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p><strong>Total Articles:</strong> {results.total}</p>
                      <p><strong>Processed:</strong> {results.processed}</p>
                      <p><strong>Cleaned:</strong> {results.cleaned}</p>
                      {results.errors?.length > 0 && (
                        <p className="text-destructive">
                          <strong>Errors:</strong> {results.errors.length}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>

                {results.errors && results.errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-semibold mb-2">Errors encountered:</p>
                      <ul className="list-disc ml-6 space-y-1">
                        {results.errors.slice(0, 5).map((err: any, i: number) => (
                          <li key={i}>
                            {err.slug}: {err.error}
                          </li>
                        ))}
                        {results.errors.length > 5 && (
                          <li>... and {results.errors.length - 5} more</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default RemoveTweetLinks;
