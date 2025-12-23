import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CsvRow {
  first_name: string;
  email: string;
  confirmed: string;
  signup_source: string;
}

interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: string[];
}

const ImportNewsletterSubscribers = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CsvRow[]>([]);
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const [duplicateEmails, setDuplicateEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseCSV = (text: string): CsvRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row as unknown as CsvRow;
    }).filter(row => row.email && row.email.includes('@'));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);
    setResult(null);

    try {
      // Parse CSV
      const text = await selectedFile.text();
      const data = parseCSV(text);
      setParsedData(data);

      // Fetch existing emails to detect duplicates
      const { data: existing, error } = await supabase
        .from('newsletter_subscribers')
        .select('email');

      if (error) throw error;

      const existingSet = new Set((existing || []).map(s => s.email.toLowerCase()));
      setExistingEmails(existingSet);

      // Find duplicates
      const csvEmails = data.map(r => r.email.toLowerCase());
      const dupes = csvEmails.filter(email => existingSet.has(email));
      setDuplicateEmails(dupes);

      toast.success(`Parsed ${data.length} subscribers from CSV`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Failed to parse CSV file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('No data to import');
      return;
    }

    setIsImporting(true);
    setProgress(0);

    const errors: string[] = [];
    let imported = 0;
    let duplicates = 0;

    // Filter out duplicates - only import new subscribers
    const newSubscribers = parsedData.filter(
      row => !existingEmails.has(row.email.toLowerCase())
    );

    duplicates = parsedData.length - newSubscribers.length;

    // Batch import in chunks of 50
    const batchSize = 50;
    for (let i = 0; i < newSubscribers.length; i += batchSize) {
      const batch = newSubscribers.slice(i, i + batchSize);
      
      const subscribersToInsert = batch.map(row => ({
        email: row.email.trim().toLowerCase(),
        first_name: row.first_name?.trim() || null,
        confirmed: row.confirmed?.toLowerCase() === 'true' || row.confirmed === '1',
        signup_source: row.signup_source?.trim() || 'old site',
        subscribed_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert(subscribersToInsert);

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        imported += batch.length;
      }

      setProgress(Math.round(((i + batch.length) / newSubscribers.length) * 100));
    }

    setResult({
      total: parsedData.length,
      imported,
      duplicates,
      errors,
    });

    setIsImporting(false);

    if (errors.length === 0) {
      toast.success(`Successfully imported ${imported} subscribers!`);
    } else {
      toast.warning(`Imported ${imported} subscribers with ${errors.length} errors`);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            Import Newsletter Subscribers
          </CardTitle>
          <CardDescription>
            Upload a CSV with columns: first_name, email, confirmed, signup_source
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
              disabled={isLoading || isImporting}
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {file ? file.name : 'Click to upload CSV'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Expected columns: first_name, email, confirmed, signup_source
              </p>
            </label>
          </div>

          {/* Preview Stats */}
          {parsedData.length > 0 && !result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">{parsedData.length}</p>
                        <p className="text-sm text-muted-foreground">Total in CSV</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{parsedData.length - duplicateEmails.length}</p>
                        <p className="text-sm text-muted-foreground">New to import</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-2xl font-bold">{duplicateEmails.length}</p>
                        <p className="text-sm text-muted-foreground">Duplicates (skipped)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Show duplicate emails */}
              {duplicateEmails.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                    {duplicateEmails.length} emails already exist and will be skipped:
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {duplicateEmails.map(email => (
                      <Badge key={email} variant="outline" className="text-amber-700">
                        {email}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Preview */}
              <div>
                <p className="font-medium mb-2">Preview (first 5 rows):</p>
                <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <table className="text-sm w-full">
                    <thead>
                      <tr className="text-left">
                        <th className="pr-4">Name</th>
                        <th className="pr-4">Email</th>
                        <th className="pr-4">Confirmed</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="pr-4 py-1">{row.first_name || '-'}</td>
                          <td className="pr-4 py-1">{row.email}</td>
                          <td className="pr-4 py-1">{row.confirmed}</td>
                          <td className="py-1">{row.signup_source || 'old site'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Button 
                onClick={handleImport} 
                disabled={isImporting || parsedData.length - duplicateEmails.length === 0}
                className="w-full"
              >
                {isImporting ? 'Importing...' : `Import ${parsedData.length - duplicateEmails.length} New Subscribers`}
              </Button>
            </div>
          )}

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">{progress}% complete</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Import Complete!</h3>
                <ul className="text-sm space-y-1 text-green-700 dark:text-green-300">
                  <li>✓ {result.imported} new subscribers imported</li>
                  <li>⚠ {result.duplicates} duplicates skipped</li>
                  {result.errors.length > 0 && (
                    <li className="text-red-600">✗ {result.errors.length} errors</li>
                  )}
                </ul>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
                  <p className="font-medium text-red-800 dark:text-red-200">Errors:</p>
                  <ul className="text-sm text-red-600 dark:text-red-400">
                    {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportNewsletterSubscribers;
