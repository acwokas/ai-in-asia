import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Download, AlertCircle, CheckCircle2, Image as ImageIcon, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface MigrationResult {
  oldUrl: string;
  newUrl?: string;
  status: 'success' | 'failed';
  error?: string;
}

export default function ImageMigration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState("");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<MigrationResult[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [totalImages, setTotalImages] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    setLoading(false);
  };

  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1);
    } catch {
      return `image-${Date.now()}.jpg`;
    }
  };

  const migrateImage = async (url: string): Promise<MigrationResult> => {
    try {
      const fileName = getFileNameFromUrl(url);

      // Use edge function to download and upload the image (bypasses CORS)
      const { data, error } = await supabase.functions.invoke('download-and-upload-image', {
        body: { imageUrl: url, fileName }
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }

      return {
        oldUrl: url,
        newUrl: data.publicUrl,
        status: 'success',
      };
    } catch (error: any) {
      return {
        oldUrl: url,
        status: 'failed',
        error: error.message,
      };
    }
  };

  const handleMigration = async () => {
    const urls = imageUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      toast({
        title: "No URLs",
        description: "Please enter at least one image URL.",
        variant: "destructive",
      });
      return;
    }

    setMigrating(true);
    setResults([]);
    setProgress(0);
    setTotalImages(urls.length);
    setSuccessCount(0);

    const migrationResults: MigrationResult[] = [];
    const batchId = crypto.randomUUID();

    // Create initial log entry
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("migration_logs").insert({
      batch_id: batchId,
      operation_type: "image_migration",
      status: "in_progress",
      total_records: urls.length,
      created_by: user?.id,
    });

    // Process images in batches of 10
    const batchSize = 10;
    let successful = 0;

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(url => migrateImage(url)));
      
      migrationResults.push(...batchResults);
      successful += batchResults.filter(r => r.status === 'success').length;
      
      setProgress(Math.round(((i + batch.length) / urls.length) * 100));
      setSuccessCount(successful);
      setResults([...migrationResults]);
    }

    // Update log entry
    await supabase
      .from("migration_logs")
      .update({
        status: successful === urls.length ? "completed" : "completed_with_errors",
        successful_records: successful,
        failed_records: urls.length - successful,
        error_details: JSON.parse(JSON.stringify(migrationResults.filter(r => r.status === 'failed'))),
      })
      .eq("batch_id", batchId);

    setMigrating(false);

    toast({
      title: "Migration Complete",
      description: `Successfully migrated ${successful} of ${urls.length} images.`,
    });
  };

  const downloadResults = () => {
    const csv = [
      'Old URL,New URL,Status,Error',
      ...results.map(r => 
        `"${r.oldUrl}","${r.newUrl || ''}","${r.status}","${r.error || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `image-migration-results-${Date.now()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6 max-w-4xl mx-auto">
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
              <BreadcrumbPage>Image Migration</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Image Migration Tool</h1>
            <p className="text-muted-foreground">
              Download images from old URLs and upload to Supabase storage
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Enter Image URLs</CardTitle>
              <CardDescription>
                Paste image URLs (one per line) to migrate to the new system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;https://example.com/image3.jpg"
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                rows={10}
                disabled={migrating}
              />

              <Button
                onClick={handleMigration}
                disabled={!imageUrls.trim() || migrating}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Start Migration
              </Button>

              {migrating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Migrating images...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground">
                    Migrated {successCount} of {totalImages} images
                  </p>
                </div>
              )}

              {!migrating && results.length > 0 && (
                <>
                  {successCount > 0 && (
                    <Alert className="border-green-500">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription>
                        Successfully migrated {successCount} of {totalImages} images
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={downloadResults} variant="default" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Download Results CSV
                    </Button>
                  </div>
                </>
              )}

              {results.some(r => r.status === 'failed') && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">
                      {results.filter(r => r.status === 'failed').length} images failed to migrate:
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {results
                        .filter(r => r.status === 'failed')
                        .slice(0, 5)
                        .map((result, idx) => (
                          <p key={idx} className="text-xs">
                            {result.oldUrl}: {result.error}
                          </p>
                        ))}
                      {results.filter(r => r.status === 'failed').length > 5 && (
                        <p className="text-xs">
                          ...and {results.filter(r => r.status === 'failed').length - 5} more errors
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}