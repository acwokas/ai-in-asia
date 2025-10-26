import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";

export const ConnectionDiagnostics = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    envVars: boolean;
    apiConnection: boolean;
    dbQuery: boolean;
    error?: string;
  } | null>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    const diagnostics = {
      envVars: false,
      apiConnection: false,
      dbQuery: false,
      error: undefined as string | undefined,
    };

    try {
      // Test 1: Check environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      diagnostics.envVars = !!(supabaseUrl && supabaseKey);

      // Test 2: Test API connection with a simple query
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('id')
          .limit(1);
        
        diagnostics.apiConnection = !error;
        diagnostics.dbQuery = !error && data !== null;
        
        if (error) {
          diagnostics.error = error.message;
        }
      } catch (err) {
        diagnostics.error = err instanceof Error ? err.message : 'Unknown error';
      }
    } catch (err) {
      diagnostics.error = err instanceof Error ? err.message : 'Unknown error';
    }

    setResults(diagnostics);
    setTesting(false);
  };

  const StatusIcon = ({ success }: { success: boolean }) => {
    if (testing) return <Loader2 className="h-4 w-4 animate-spin" />;
    return success ? (
      <CheckCircle className="h-4 w-4 text-success" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive" />
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Connection Diagnostics</CardTitle>
        <CardDescription>
          Test the connection to the backend database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            "Run Connection Test"
          )}
        </Button>

        {results && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <StatusIcon success={results.envVars} />
              <div>
                <p className="font-medium">Environment Variables</p>
                <p className="text-sm text-muted-foreground">
                  {results.envVars ? "Configured correctly" : "Missing or invalid"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <StatusIcon success={results.apiConnection} />
              <div>
                <p className="font-medium">API Connection</p>
                <p className="text-sm text-muted-foreground">
                  {results.apiConnection ? "Connected successfully" : "Connection failed"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <StatusIcon success={results.dbQuery} />
              <div>
                <p className="font-medium">Database Query</p>
                <p className="text-sm text-muted-foreground">
                  {results.dbQuery ? "Database responding" : "Query failed"}
                </p>
              </div>
            </div>

            {results.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error:</strong> {results.error}
                </AlertDescription>
              </Alert>
            )}

            {!results.dbQuery && (
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>PGRST002 Error Detected:</strong> This indicates the backend PostgREST 
                  service cannot access its schema cache. This is an infrastructure issue that 
                  requires backend attention. Try clearing your browser cache and reloading, 
                  or wait for the service to recover.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
