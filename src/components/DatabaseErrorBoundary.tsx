import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export const DatabaseErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Listen for failed fetch requests
    const handleFetchError = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes("PGRST002")) {
        setHasError(true);
      }
    };

    window.addEventListener("unhandledrejection", handleFetchError);
    return () => window.removeEventListener("unhandledrejection", handleFetchError);
  }, []);

  const handleRetry = () => {
    setHasError(false);
    setRetryCount(prev => prev + 1);
    window.location.reload();
  };

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Alert variant="destructive" className="max-w-2xl">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold">Database Connection Issue</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p>
              The backend database is currently experiencing connection issues (PGRST002 error). 
              This is a temporary infrastructure issue.
            </p>
            <div className="space-y-2">
              <p className="font-medium">What you can try:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Clear your browser cache and reload</li>
                <li>Try accessing in an incognito/private window</li>
                <li>Wait a few minutes and try again</li>
              </ul>
            </div>
            <Button onClick={handleRetry} variant="outline" className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection {retryCount > 0 && `(Attempt ${retryCount + 1})`}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};
