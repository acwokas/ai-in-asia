import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface SubscriberRow {
  name: string;
  email: string;
  role: string;
}

const ImportNewsletterSubscribers = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    total: number;
    success: number;
    duplicates: number;
    errors: string[];
  } | null>(null);

  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  const parseCSV = (text: string): SubscriberRow[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
    const nameIdx = headers.findIndex(h => h.includes("name") && !h.includes("email"));
    const emailIdx = headers.findIndex(h => h.includes("email"));
    const roleIdx = headers.findIndex(h => h.includes("role"));

    if (emailIdx === -1) {
      toast.error("CSV must have an 'email' column");
      return [];
    }

    const rows: SubscriberRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleanValues = values.map(v => v.replace(/^"|"$/g, "").trim());
      
      const email = cleanValues[emailIdx]?.toLowerCase();
      if (!email || !email.includes("@")) continue;

      rows.push({
        name: nameIdx >= 0 ? cleanValues[nameIdx] || "" : "",
        email,
        role: roleIdx >= 0 ? cleanValues[roleIdx]?.toLowerCase() || "subscriber" : "subscriber",
      });
    }
    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setResults(null);
    } else if (selectedFile) {
      toast.error("Please select a CSV file");
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setResults(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error("No valid rows found in CSV");
        setIsProcessing(false);
        return;
      }

      const results = {
        total: rows.length,
        success: 0,
        duplicates: 0,
        errors: [] as string[],
      };

      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        const insertData = batch.map(row => ({
          email: row.email,
          first_name: row.name || null,
          confirmed: true,
          signup_source: "csv_import",
          preferences: { role: row.role },
        }));

        const { error, data } = await supabase
          .from("newsletter_subscribers")
          .upsert(insertData, { 
            onConflict: "email",
            ignoreDuplicates: false 
          })
          .select();

        if (error) {
          results.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          results.success += data?.length || batch.length;
        }

        setProgress(Math.round(((i + batch.length) / rows.length) * 100));
      }

      setResults(results);
      if (results.success > 0) {
        toast.success(`Successfully imported ${results.success} subscribers`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import CSV");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Newsletter Subscribers
            </CardTitle>
            <CardDescription>
              Upload a CSV file with columns: name, email, role (subscriber/admin)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Expected CSV format: <code className="bg-muted px-1 rounded">name,email,role</code>
                <br />
                Example: <code className="bg-muted px-1 rounded">John Doe,john@example.com,subscriber</code>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isProcessing}
              />

              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}

              <Button
                onClick={handleImport}
                disabled={!file || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Subscribers
                  </>
                )}
              </Button>

              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-center text-muted-foreground">{progress}%</p>
                </div>
              )}
            </div>

            {results && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Imported: {results.success} subscribers</span>
                  </div>
                  {results.errors.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>Errors: {results.errors.length}</span>
                      </div>
                      <ul className="text-xs text-muted-foreground pl-6 list-disc">
                        {results.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ImportNewsletterSubscribers;
