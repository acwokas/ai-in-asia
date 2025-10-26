import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, AlertCircle, CheckCircle2, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const CategoryMapper = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    mapped: number;
    ignored: number;
    unchanged: number;
  } | null>(null);
  const { toast } = useToast();

  // Category mapping rules
  const categoryMap: Record<string, string> = {
    'News': 'News',
    'Life': 'Life',
    'Business': 'Business',
    'Opinion': 'Voices',
    'Tools': 'Create',
    'Prompts': 'Create',
    'AI Academy': 'Learn',
    'AI Glossary': 'Learn',
  };

  const ignoredCategories = ['Shop', 'Account'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setStats(null);
    }
  };

  const mapCategory = (category: string): string | null => {
    const trimmed = category.trim();
    
    // Check if it's an ignored category
    if (ignoredCategories.some(ignored => trimmed.startsWith(ignored))) {
      return null;
    }
    
    // Check if it matches a category to map
    for (const [oldCat, newCat] of Object.entries(categoryMap)) {
      if (trimmed === oldCat || trimmed.startsWith(`${oldCat} >`)) {
        return newCat;
      }
    }
    
    return trimmed; // Return unchanged if no mapping found
  };

  const processCSV = async () => {
    if (!file) return;

    setProcessing(true);
    
    try {
      toast({
        title: "Processing...",
        description: "Sending CSV to backend for category mapping",
      });

      console.log('Starting CSV processing for file:', file.name, 'Size:', file.size);

      // Create FormData with the file
      const formData = new FormData();
      formData.append('file', file);

      console.log('Calling edge function...');

      // Call edge function
      const response = await fetch(
        'https://ppvifagplcdjpdpqknzt.supabase.co/functions/v1/map-csv-categories',
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Result stats:', result.stats);
      
      const { csv: processedCSV, stats, filename } = result;
      
      setStats({
        total: stats.total,
        mapped: stats.mapped,
        unchanged: stats.unchanged,
        ignored: stats.ignored,
      });

      // Create download
      const blob = new Blob([processedCSV], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success!",
        description: `Processed ${stats.total} articles. Download started.`,
      });
    } catch (error) {
      console.error('Error processing CSV:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      toast({
        title: "Error",
        description: errorMessage || "Failed to process CSV. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Breadcrumb className="mb-6">
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
                <BreadcrumbPage>Category Mapper</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <h1 className="text-4xl font-bold mb-4">Category Mapper</h1>
          <p className="text-muted-foreground mb-8">
            Map old WordPress categories to your new site structure before bulk import
          </p>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Mapping Rules</CardTitle>
              <CardDescription>
                These mappings will be applied automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Category Mappings:</h3>
                  <ul className="space-y-1">
                    <li>News &rarr; News</li>
                    <li>Life &rarr; Life</li>
                    <li>Business &rarr; Business</li>
                    <li>Opinion &rarr; Voices</li>
                    <li>Tools &rarr; Create</li>
                    <li>Prompts &rarr; Create</li>
                    <li>AI Academy &rarr; Learn</li>
                    <li>AI Glossary &rarr; Learn</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-destructive">Ignored Categories:</h3>
                  <ul className="space-y-1">
                    <li>Shop (and subcategories)</li>
                    <li>Account (and subcategories)</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    Articles with only ignored categories will be skipped
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>
                Upload your WordPress export CSV to process category mappings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>Choose File</span>
                  </div>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {file && (
                  <span className="text-sm text-muted-foreground">
                    {file.name}
                  </span>
                )}
              </div>

              {file && (
                <Button
                  onClick={processCSV}
                  disabled={processing}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {processing ? "Processing..." : "Process & Download Mapped CSV"}
                </Button>
              )}

              {stats && (
                <Card className="bg-accent/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Processing Complete
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Articles:</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Categories Mapped:</p>
                        <p className="text-2xl font-bold text-blue-500">{stats.mapped}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Unchanged:</p>
                        <p className="text-2xl font-bold text-green-500">{stats.unchanged}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ignored/Skipped:</p>
                        <p className="text-2xl font-bold text-orange-500">{stats.ignored}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-accent/30 p-4 rounded-lg">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Important Notes:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Subcategories (e.g., News &gt; Tech News) will be mapped to parent category</li>
                    <li>Articles with only Shop or Account categories will be excluded</li>
                    <li>The processed CSV will download automatically when ready</li>
                    <li>Use the downloaded CSV for bulk import</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CategoryMapper;
