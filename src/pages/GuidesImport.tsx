import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Header from "@/components/Header";

interface ImportResult {
  success: boolean;
  title: string;
  slug: string;
  error?: string;
}

const EXPECTED_FIELDS = [
  "Title",
  "Slug",
  "Guide_Category",
  "Level",
  "Primary_Platform",
  "Audience_Role",
  "Geo",
  "Excerpt",
  "SEO_Title",
  "Meta_Title",
  "Meta_Description",
  "Focus_Keyphrase",
  "Keyphrase_Synonyms",
  "Tags",
  "TLDR_Bullet_1",
  "TLDR_Bullet_2",
  "TLDR_Bullet_3",
  "Perfect_For",
  "Body_Intro",
  "Body_Section_1_Heading",
  "Body_Section_1_Text",
  "Body_Section_2_Heading",
  "Body_Section_2_Text",
  "Body_Section_3_Heading",
  "Body_Section_3_Text",
  "Prompt_1_Label",
  "Prompt_1_Headline",
  "Prompt_1_Text",
  "Prompt_2_Label",
  "Prompt_2_Headline",
  "Prompt_2_Text",
  "Prompt_3_Label",
  "Prompt_3_Headline",
  "Prompt_3_Text",
  "FAQ_Q1",
  "FAQ_A1",
  "FAQ_Q2",
  "FAQ_A2",
  "FAQ_Q3",
  "FAQ_A3",
  "Image_Prompt",
  "Closing_CTA",
];

const GuidesImport = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  if (isAdminLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background py-8">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="animate-pulse space-y-4">
              <div className="h-8 w-1/3 rounded bg-muted" />
              <div className="h-64 rounded bg-muted" />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background py-16">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-destructive" />
            <h1 className="mb-4 text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">
              You need admin privileges to access this page.
            </p>
          </div>
        </main>
      </>
    );
  }

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    // Parse header
    const headers = parseCSVLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header.trim()] = values[idx]?.trim() || "";
      });

      rows.push(row);
    }

    return rows;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ",") {
          result.push(current);
          current = "";
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error("No data found in CSV file");
        return;
      }

      // Validate headers
      const firstRow = rows[0];
      const missingFields = EXPECTED_FIELDS.filter(
        (field) => !(field in firstRow)
      );

      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.slice(0, 5).join(", ")}${missingFields.length > 5 ? "..." : ""}`);
        return;
      }

      setParsedRows(rows);
      setShowPreview(true);
      setResults([]);
      toast.success(`Parsed ${rows.length} guide(s) from CSV`);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast.error("Failed to parse CSV file");
    }
  };

  const importGuides = async () => {
    if (parsedRows.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    const importResults: ImportResult[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];

      try {
        const guideData = {
          title: row.Title,
          slug: row.Slug,
          guide_category: row.Guide_Category,
          level: row.Level,
          primary_platform: row.Primary_Platform,
          audience_role: row.Audience_Role || null,
          geo: row.Geo || null,
          excerpt: row.Excerpt || null,
          seo_title: row.SEO_Title || null,
          meta_title: row.Meta_Title || null,
          meta_description: row.Meta_Description || null,
          focus_keyphrase: row.Focus_Keyphrase || null,
          keyphrase_synonyms: row.Keyphrase_Synonyms || null,
          tags: row.Tags || null,
          tldr_bullet_1: row.TLDR_Bullet_1 || null,
          tldr_bullet_2: row.TLDR_Bullet_2 || null,
          tldr_bullet_3: row.TLDR_Bullet_3 || null,
          perfect_for: row.Perfect_For || null,
          body_intro: row.Body_Intro || null,
          body_section_1_heading: row.Body_Section_1_Heading || null,
          body_section_1_text: row.Body_Section_1_Text || null,
          body_section_2_heading: row.Body_Section_2_Heading || null,
          body_section_2_text: row.Body_Section_2_Text || null,
          body_section_3_heading: row.Body_Section_3_Heading || null,
          body_section_3_text: row.Body_Section_3_Text || null,
          prompt_1_label: row.Prompt_1_Label || null,
          prompt_1_headline: row.Prompt_1_Headline || null,
          prompt_1_text: row.Prompt_1_Text || null,
          prompt_2_label: row.Prompt_2_Label || null,
          prompt_2_headline: row.Prompt_2_Headline || null,
          prompt_2_text: row.Prompt_2_Text || null,
          prompt_3_label: row.Prompt_3_Label || null,
          prompt_3_headline: row.Prompt_3_Headline || null,
          prompt_3_text: row.Prompt_3_Text || null,
          faq_q1: row.FAQ_Q1 || null,
          faq_a1: row.FAQ_A1 || null,
          faq_q2: row.FAQ_Q2 || null,
          faq_a2: row.FAQ_A2 || null,
          faq_q3: row.FAQ_Q3 || null,
          faq_a3: row.FAQ_A3 || null,
          image_prompt: row.Image_Prompt || null,
          closing_cta: row.Closing_CTA || null,
          created_by: user.id,
        };

        const { error } = await supabase.from("ai_guides").upsert(guideData, {
          onConflict: "slug",
        });

        if (error) throw error;

        importResults.push({
          success: true,
          title: row.Title,
          slug: row.Slug,
        });
      } catch (error: any) {
        importResults.push({
          success: false,
          title: row.Title,
          slug: row.Slug,
          error: error.message || "Unknown error",
        });
      }

      setProgress(((i + 1) / parsedRows.length) * 100);
      setResults([...importResults]);
    }

    setIsProcessing(false);

    const successCount = importResults.filter((r) => r.success).length;
    const failCount = importResults.filter((r) => !r.success).length;

    if (failCount === 0) {
      toast.success(`Successfully imported ${successCount} guide(s)`);
    } else {
      toast.warning(`Imported ${successCount}, failed ${failCount}`);
    }
  };

  const resetImport = () => {
    setParsedRows([]);
    setShowPreview(false);
    setResults([]);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background py-8">
        <div className="container mx-auto max-w-4xl px-4">
          {/* Back link */}
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>

          <h1 className="mb-2 text-3xl font-bold">Import AI Guides</h1>
          <p className="mb-8 text-muted-foreground">
            Upload a CSV file to import AI Guides. The CSV headers must match the
            expected field names exactly.
          </p>

          {/* Upload Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a CSV file with guide data. Existing guides with matching
                slugs will be updated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select CSV File
                </Button>
                {parsedRows.length > 0 && (
                  <Button variant="outline" onClick={resetImport}>
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {showPreview && parsedRows.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Preview ({parsedRows.length} guides)</CardTitle>
                <CardDescription>
                  Review the guides before importing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 max-h-64 overflow-y-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Title</th>
                        <th className="px-3 py-2 text-left">Slug</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-left">Platform</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{row.Title}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.Slug}
                          </td>
                          <td className="px-3 py-2">{row.Guide_Category}</td>
                          <td className="px-3 py-2">{row.Primary_Platform}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  onClick={importGuides}
                  disabled={isProcessing}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Import {parsedRows.length} Guide(s)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {isProcessing && (
            <Card className="mb-8">
              <CardContent className="py-6">
                <div className="mb-2 flex justify-between text-sm">
                  <span>Importing guides...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {results.map((result, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded p-2 ${
                        result.success ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{result.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {result.slug}
                        </p>
                        {result.error && (
                          <p className="text-sm text-red-600">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expected Fields Reference */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Expected CSV Fields</CardTitle>
              <CardDescription>
                Your CSV file must include these column headers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {EXPECTED_FIELDS.map((field) => (
                  <code
                    key={field}
                    className="rounded bg-muted px-2 py-1 text-xs"
                  >
                    {field}
                  </code>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default GuidesImport;
