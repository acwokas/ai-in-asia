import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";

const CsvUrlReplacer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replacedCount, setReplacedCount] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const OLD_URL = "https://aiinasia.com/wp-content/uploads/";
  const NEW_URL = "https://jcz.vcj.mybluehost.me/.website_ac81a9d6/wp-content/uploads/";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setDownloadUrl(null);
      setReplacedCount(0);
      setProgress(0);
    }
  };

  const processFile = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setReplacedCount(0);

    try {
      // Read file as text
      const text = await file.text();
      
      setProgress(30);

      // Count replacements
      const matches = text.match(new RegExp(OLD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
      const count = matches ? matches.length : 0;
      
      setProgress(50);

      // Perform replacement
      const updatedText = text.replace(
        new RegExp(OLD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        NEW_URL
      );

      setProgress(70);

      // Create blob and download URL
      const blob = new Blob([updatedText], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setReplacedCount(count);
      setProgress(100);

      toast.success(`Successfully updated ${count} image URLs!`);
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process file");
    } finally {
      setProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!downloadUrl || !file) return;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.name.replace('.csv', '-updated.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("File downloaded successfully!");
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>CSV URL Replacer</CardTitle>
            <CardDescription>
              Update image URLs from old domain to new Bluehost domain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csv-file">Upload CSV File</Label>
              <div className="flex gap-2">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={processing}
                />
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* URL Info */}
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">Old URL:</p>
                <p className="text-xs text-muted-foreground break-all font-mono">
                  {OLD_URL}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">New URL:</p>
                <p className="text-xs text-muted-foreground break-all font-mono">
                  {NEW_URL}
                </p>
              </div>
            </div>

            {/* Process Button */}
            <Button
              onClick={processFile}
              disabled={!file || processing}
              className="w-full"
            >
              {processing ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Update URLs
                </>
              )}
            </Button>

            {/* Progress */}
            {processing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  Processing file... {progress}%
                </p>
              </div>
            )}

            {/* Results */}
            {downloadUrl && (
              <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-primary">
                    ✓ Processing Complete!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Updated {replacedCount} image URLs in your CSV file.
                  </p>
                </div>
                
                <Button onClick={downloadFile} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Updated CSV
                </Button>
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Upload your CSV export file</li>
                <li>Click "Update URLs" to process the file</li>
                <li>Download the updated CSV with new image URLs</li>
                <li>Use this file for your new project import</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CsvUrlReplacer;
