import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Download, Trash2, Search, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import Header from "@/components/Header";

interface ImportResult {
  success: boolean;
  title: string;
  slug: string;
  error?: string;
}

interface Guide {
  id: string;
  title: string;
  slug: string;
  guide_category: string;
  primary_platform: string;
  created_at: string;
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
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState<string>("");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch existing guides
  const { data: existingGuides = [], isLoading: isLoadingGuides } = useQuery({
    queryKey: ["ai-guides-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("id, title, slug, guide_category, primary_platform, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Guide[];
    },
  });

  const filteredGuides = existingGuides.filter(
    (guide) =>
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.guide_category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Normalize header: lowercase, replace spaces with underscores, trim, remove BOM and special chars
  const normalizeHeader = (header: string): string => {
    return header
      .trim()
      .replace(/^\uFEFF/, "") // Remove BOM
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w_]/g, ""); // Remove non-word chars except underscore
  };

  // Create a mapping from normalized expected fields to original expected fields
  const normalizedFieldMap: Record<string, string> = {};
  EXPECTED_FIELDS.forEach((field) => {
    normalizedFieldMap[normalizeHeader(field)] = field;
  });

  const parseCSV = (text: string): Record<string, string>[] => {
    // Remove BOM if present at start of file
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/);
    if (lines.length < 2) return [];

    // Auto-detect delimiter from first line
    const delimiter = detectDelimiter(lines[0]);
    console.log("Detected delimiter:", delimiter === "\t" ? "TAB" : delimiter);

    const rawHeaders = parseCSVLine(lines[0], delimiter);
    console.log("Raw headers parsed:", rawHeaders);
    
    // Map CSV headers to expected field names (case-insensitive, space-to-underscore)
    const headerMapping: Record<number, string> = {};
    rawHeaders.forEach((header, idx) => {
      const normalized = normalizeHeader(header);
      if (normalizedFieldMap[normalized]) {
        headerMapping[idx] = normalizedFieldMap[normalized];
      } else {
        // Keep original header if no match found
        headerMapping[idx] = header.trim();
      }
    });

    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line, delimiter);
      const row: Record<string, string> = {};

      Object.entries(headerMapping).forEach(([idxStr, fieldName]) => {
        const idx = parseInt(idxStr, 10);
        row[fieldName] = values[idx]?.trim() || "";
      });

      rows.push(row);
    }

    return rows;
  };

  // Auto-detect CSV delimiter from first line
  const detectDelimiter = (line: string): string => {
    const delimiters = [",", "\t", ";", "|"];
    let maxCount = 0;
    let bestDelimiter = ",";
    
    for (const delimiter of delimiters) {
      const count = (line.match(new RegExp(delimiter === "|" ? "\\|" : delimiter, "g")) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }
    return bestDelimiter;
  };

  const parseCSVLine = (line: string, delimiter: string = ","): string[] => {
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
        } else if (char === delimiter) {
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

  const escapeCSVField = (field: string | null | undefined): string => {
    if (field == null) return "";
    const str = String(field);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadGuidesAsCSV = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.from("ai_guides").select("*");

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("No guides to download");
        return;
      }

      const headers = EXPECTED_FIELDS;
      const csvRows = [headers.join(",")];

      data.forEach((guide) => {
        const row = [
          escapeCSVField(guide.title),
          escapeCSVField(guide.slug),
          escapeCSVField(guide.guide_category),
          escapeCSVField(guide.level),
          escapeCSVField(guide.primary_platform),
          escapeCSVField(guide.audience_role),
          escapeCSVField(guide.geo),
          escapeCSVField(guide.excerpt),
          escapeCSVField(guide.seo_title),
          escapeCSVField(guide.meta_title),
          escapeCSVField(guide.meta_description),
          escapeCSVField(guide.focus_keyphrase),
          escapeCSVField(guide.keyphrase_synonyms),
          escapeCSVField(guide.tags),
          escapeCSVField(guide.tldr_bullet_1),
          escapeCSVField(guide.tldr_bullet_2),
          escapeCSVField(guide.tldr_bullet_3),
          escapeCSVField(guide.perfect_for),
          escapeCSVField(guide.body_intro),
          escapeCSVField(guide.body_section_1_heading),
          escapeCSVField(guide.body_section_1_text),
          escapeCSVField(guide.body_section_2_heading),
          escapeCSVField(guide.body_section_2_text),
          escapeCSVField(guide.body_section_3_heading),
          escapeCSVField(guide.body_section_3_text),
          escapeCSVField(guide.prompt_1_label),
          escapeCSVField(guide.prompt_1_headline),
          escapeCSVField(guide.prompt_1_text),
          escapeCSVField(guide.prompt_2_label),
          escapeCSVField(guide.prompt_2_headline),
          escapeCSVField(guide.prompt_2_text),
          escapeCSVField(guide.prompt_3_label),
          escapeCSVField(guide.prompt_3_headline),
          escapeCSVField(guide.prompt_3_text),
          escapeCSVField(guide.faq_q1),
          escapeCSVField(guide.faq_a1),
          escapeCSVField(guide.faq_q2),
          escapeCSVField(guide.faq_a2),
          escapeCSVField(guide.faq_q3),
          escapeCSVField(guide.faq_a3),
          escapeCSVField(guide.image_prompt),
          escapeCSVField(guide.closing_cta),
        ];
        csvRows.push(row.join(","));
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ai-guides-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${data.length} guide(s)`);
    } catch (error) {
      console.error("Error downloading guides:", error);
      toast.error("Failed to download guides");
    } finally {
      setIsDownloading(false);
    }
  };

  const deleteGuide = async (id: string, title: string) => {
    try {
      const { error } = await supabase.from("ai_guides").delete().eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["ai-guides-admin"] });
      toast.success(`Deleted "${title}"`);
    } catch (error) {
      console.error("Error deleting guide:", error);
      toast.error("Failed to delete guide");
    }
  };

  const deleteAllGuides = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("ai_guides").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["ai-guides-admin"] });
      toast.success("All guides deleted");
    } catch (error) {
      console.error("Error deleting all guides:", error);
      toast.error("Failed to delete guides");
    } finally {
      setIsDeleting(false);
    }
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

      const firstRow = rows[0];
      const detectedFields = Object.keys(firstRow);
      const missingFields = EXPECTED_FIELDS.filter(
        (field) => !(field in firstRow)
      );

      if (missingFields.length > 0) {
        console.log("Expected fields:", EXPECTED_FIELDS);
        console.log("Detected fields:", detectedFields);
        console.log("Missing fields:", missingFields);
        
        toast.error(
          `Missing ${missingFields.length} required fields. Detected: ${detectedFields.slice(0, 3).join(", ")}... Check console for details.`,
          { duration: 8000 }
        );
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
    setCurrentItem("");
    const importResults: ImportResult[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      setCurrentItem(row.Title);

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
    setCurrentItem("");
    queryClient.invalidateQueries({ queryKey: ["ai-guides-admin"] });

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
    setCurrentItem("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background py-8">
        <div className="container mx-auto max-w-4xl px-4">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>

          <h1 className="mb-2 text-3xl font-bold">Manage AI Guides</h1>
          <p className="mb-8 text-muted-foreground">
            Import, export, and manage AI Guides.
          </p>

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Export or delete all guides at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={downloadGuidesAsCSV}
                  disabled={isDownloading || existingGuides.length === 0}
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download All ({existingGuides.length})
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={isDeleting || existingGuides.length === 0}
                    >
                      {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete all guides?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {existingGuides.length} guides. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteAllGuides}>
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* Existing Guides */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Existing Guides ({existingGuides.length})</CardTitle>
              <CardDescription>
                Search and manage individual guides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by title, slug, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {isLoadingGuides ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredGuides.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {searchQuery ? "No guides match your search" : "No guides yet"}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Title</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-left">Platform</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGuides.map((guide) => (
                        <tr key={guide.id} className="border-t">
                          <td className="px-3 py-2">
                            <div>
                              <p className="font-medium">{guide.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {guide.slug}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-2">{guide.guide_category}</td>
                          <td className="px-3 py-2">{guide.primary_platform}</td>
                          <td className="px-3 py-2 text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete guide?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{guide.title}". This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteGuide(guide.id, guide.title)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Progress with real-time status */}
          {isProcessing && (
            <Card className="mb-8 border-primary">
              <CardContent className="py-6">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing guides...
                  </span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="mb-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {results.length} of {parsedRows.length} processed
                  </span>
                  {currentItem && (
                    <span className="truncate max-w-[200px]">
                      Current: {currentItem}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex gap-4 text-xs">
                  <span className="text-green-600">
                    ✓ {results.filter((r) => r.success).length} success
                  </span>
                  <span className="text-red-600">
                    ✗ {results.filter((r) => !r.success).length} failed
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && !isProcessing && (
            <Card className="mb-8">
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
                      {result.success && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/guides/${result.slug}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expected Fields Reference */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Expected CSV Fields ({EXPECTED_FIELDS.length} columns)</CardTitle>
              <CardDescription>
                Your CSV file should include these column headers. Matching is flexible: case-insensitive and spaces are converted to underscores (e.g., "title", "TITLE", "Guide Category" all work).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto rounded border border-border p-3">
                <div className="flex flex-wrap gap-2">
                  {EXPECTED_FIELDS.map((field, index) => (
                    <code
                      key={field}
                      className="rounded bg-muted px-2 py-1 text-xs"
                    >
                      {index + 1}. {field}
                    </code>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};

export default GuidesImport;
