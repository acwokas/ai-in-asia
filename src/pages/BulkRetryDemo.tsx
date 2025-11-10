import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, RotateCcw, ListChecks } from "lucide-react";

const BulkRetryDemo = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Bulk Operation Retry System</h1>
          <p className="text-muted-foreground">
            Automatic retry mechanism for failed articles in bulk operations
          </p>
        </div>

        <div className="grid gap-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Queue Bulk Operation</h3>
                  <p className="text-sm text-muted-foreground">
                    Select articles and queue them for processing. The system processes them in the background.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Automatic Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Jobs run every 2 minutes automatically. You'll receive real-time updates as articles are processed.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Track Failures</h3>
                  <p className="text-sm text-muted-foreground">
                    If any articles fail, they're logged with detailed error messages. You can expand the job to see exactly which articles failed and why.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold mb-1">One-Click Retry</h3>
                  <p className="text-sm text-muted-foreground">
                    Click the "Retry Failed" button to automatically queue only the failed articles for reprocessing. No need to manually select them again.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Save Time</AlertTitle>
                <AlertDescription>
                  No need to manually identify and reselect failed articles. The system tracks them automatically.
                </AlertDescription>
              </Alert>

              <Alert>
                <RotateCcw className="h-4 w-4 text-blue-600" />
                <AlertTitle>Smart Retries</AlertTitle>
                <AlertDescription>
                  Only failed articles are reprocessed, saving resources and avoiding redundant work on successful articles.
                </AlertDescription>
              </Alert>

              <Alert>
                <XCircle className="h-4 w-4 text-orange-600" />
                <AlertTitle>Detailed Error Tracking</AlertTitle>
                <AlertDescription>
                  See exactly why each article failed with specific error messages, making it easier to fix underlying issues.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Use Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Network Timeouts:</strong> Retry articles that failed due to temporary network issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Rate Limiting:</strong> Reprocess articles that were skipped due to API rate limits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Content Issues:</strong> Fix problematic articles and retry after corrections</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Partial Failures:</strong> Complete bulk operations that partially succeeded</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BulkRetryDemo;
