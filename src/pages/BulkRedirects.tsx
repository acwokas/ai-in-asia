import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, CheckCircle2, AlertCircle, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface RedirectRow {
  from_path: string;
  to_path: string;
  status_code: number;
}

export default function BulkRedirects() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setErrors([]);
      setSuccessCount(0);
      setErrorCount(0);
      setTotalRows(0);
      setProgress(0);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
    }
  };

  const parseCSV = (text: string): RedirectRow[] => {
    const lines = text.split('\n');
    const redirects: RedirectRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (values.length >= 2) {
        const parsedStatusCode = values[2] ? parseInt(values[2]) : NaN;
        redirects.push({
          from_path: values[0],
          to_path: values[1],
          status_code: !isNaN(parsedStatusCode) ? parsedStatusCode : 301,
        });
      }
    }
    
    return redirects;
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setErrors([]);
    setSuccessCount(0);
    setErrorCount(0);
    setProgress(0);

    try {
      const text = await file.text();
      const redirects = parseCSV(text);
      setTotalRows(redirects.length);

      const { data: { user } } = await supabase.auth.getUser();
      const batchId = crypto.randomUUID();
      const errorList: string[] = [];
      let successful = 0;

      // Create log entry
      await supabase.from("migration_logs").insert({
        batch_id: batchId,
        operation_type: "bulk_redirects",
        status: "in_progress",
        total_records: redirects.length,
        created_by: user?.id,
      });

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < redirects.length; i += batchSize) {
        const batch = redirects.slice(i, i + batchSize);
        
        const redirectsToInsert = batch.map(r => ({
          from_path: r.from_path,
          to_path: r.to_path,
          status_code: r.status_code,
          created_by: user?.id,
        }));

        const { error } = await supabase
          .from("redirects")
          .insert(redirectsToInsert);

        if (error) {
          errorList.push(`Batch ${i / batchSize + 1}: ${error.message}`);
        } else {
          successful += batch.length;
        }

        setProgress(Math.round(((i + batch.length) / redirects.length) * 100));
        setSuccessCount(successful);
        setErrorCount(redirects.length - successful);
      }

      // Update URL mappings to mark redirects as created
      await supabase
        .from("url_mappings")
        .update({ redirect_created: true })
        .in('new_url', redirects.map(r => r.to_path));

      // Update log
      await supabase
        .from("migration_logs")
        .update({
          status: errorList.length === 0 ? "completed" : "completed_with_errors",
          successful_records: successful,
          failed_records: redirects.length - successful,
          error_details: errorList.length > 0 ? JSON.parse(JSON.stringify(errorList)) : null,
        })
        .eq("batch_id", batchId);

      setErrors(errorList);

      toast({
        title: "Import Complete",
        description: `Created ${successful} of ${redirects.length} redirects.`,
      });

    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `from_path,to_path,status_code
/old-article-slug,/article/new-article-slug,301
/old-category/tech,/category/technology,301
/old-page,/new-page,302`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'redirect-template.csv';
    a.click();
  };

  const generateFromMappings = async () => {
    const { data: mappings } = await supabase
      .from("url_mappings")
      .select("*")
      .eq("redirect_created", false);

    if (!mappings || mappings.length === 0) {
      toast({
        title: "No Mappings Found",
        description: "All URL mappings already have redirects or no mappings exist.",
      });
      return;
    }

    const csv = [
      'from_path,to_path,status_code',
      ...mappings.map(m => `${m.old_url},${m.new_url},301`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redirects-from-mappings-${Date.now()}.csv`;
    a.click();

    toast({
      title: "CSV Generated",
      description: `Generated ${mappings.length} redirects from URL mappings.`,
    });
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
              <BreadcrumbPage>Bulk Redirects</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Bulk Redirect Import</h1>
            <p className="text-muted-foreground">Create 301 redirects in bulk for SEO preservation</p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              <Button onClick={generateFromMappings} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Generate From URL Mappings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload Redirects CSV</CardTitle>
              <CardDescription>
                Upload a CSV file with columns: from_path, to_path, status_code (301 or 302)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={importing}
                />
                <Button onClick={handleImport} disabled={!file || importing}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </div>

              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground">
                    Created {successCount} of {totalRows} redirects
                  </p>
                </div>
              )}

              {!importing && successCount > 0 && (
                <Alert className="border-green-500">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Successfully created {successCount} redirects
                    {errorCount > 0 && ` (${errorCount} failed)`}
                  </AlertDescription>
                </Alert>
              )}

              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">{errors.length} errors occurred:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {errors.map((error, idx) => (
                        <p key={idx} className="text-xs">{error}</p>
                      ))}
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