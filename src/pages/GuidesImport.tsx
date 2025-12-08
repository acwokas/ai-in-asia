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

// Tutorial CSV schema - different structure from Guides
const TUTORIAL_FIELDS = [
  "Title",
  "Slug",
  "Tutorial_Category",
  "Skill_Level",
  "Primary_Platform",
  "Audience_Role",
  "Geo",
  "Excerpt",
  "SEO_Title",
  "Meta_Title",
  "Meta_Description",
  "Focus_Keyword",
  "Keyword_Synonyms",
  "Tags",
  "TLDR_Bullet_1",
  "TLDR_Bullet_2",
  "TLDR_Bullet_3",
  "Perfect_For",
  "Estimated_Time_to_Complete",
  "Learning_Outcomes",
  "Introduction",
  "Step_1_Heading",
  "Step_1_Text",
  "Step_2_Heading",
  "Step_2_Text",
  "Step_3_Heading",
  "Step_3_Text",
  "Step_4_Heading",
  "Step_4_Text",
  "Tips_Heading",
  "Tips_Text",
  "Activities_Heading_1",
  "Activities_Text_1",
  "Activities_Heading_2",
  "Activities_Text_2",
  "FAQ_Q1",
  "FAQ_A1",
  "FAQ_Q2",
  "FAQ_A2",
  "FAQ_Q3",
  "FAQ_A3",
  "Visual_Prompt",
  "Conclusion_CTA",
  "Extra_Resources",
];

// Helper function to normalize headers - defined outside component
const normalizeHeader = (header: string): string => {
  return header
    .trim()
    .replace(/^\uFEFF/, "") // Remove BOM
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, ""); // Remove non-word chars except underscore
};

// Create mapping outside component for efficiency
const NORMALIZED_FIELD_MAP: Record<string, string> = {};
EXPECTED_FIELDS.forEach((field) => {
  NORMALIZED_FIELD_MAP[normalizeHeader(field)] = field;
});

// Create mapping for tutorial fields
const NORMALIZED_TUTORIAL_FIELD_MAP: Record<string, string> = {};
TUTORIAL_FIELDS.forEach((field) => {
  NORMALIZED_TUTORIAL_FIELD_MAP[normalizeHeader(field)] = field;
});

// Sanitize text content to remove corrupted file paths and invalid URLs
const sanitizeContent = (text: string | null | undefined): string | null => {
  if (!text) return null;
  
  // Remove corrupted local file paths (like onlinefile:///home/... or file:///)
  let cleaned = text
    .replace(/\s*onlinefile:\/\/[^\s]*/gi, '')
    .replace(/\s*file:\/\/\/[^\s]*/gi, '')
    .replace(/\s*C:\\[^\s]*/g, '')
    .replace(/\s*\/home\/[^\s]*redirect\.html[^\s]*/gi, '');
  
  return cleaned.trim();
};

const GuidesImport = () => {
  const { user } = useAuth();
  const { isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tutorialFileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState<string>("");
  const [results, setResults] = useState<ImportResult[]>([]);
  
  // Tutorial import state
  const [isTutorialProcessing, setIsTutorialProcessing] = useState(false);
  const [tutorialProgress, setTutorialProgress] = useState(0);
  const [tutorialCurrentItem, setTutorialCurrentItem] = useState<string>("");
  const [tutorialResults, setTutorialResults] = useState<ImportResult[]>([]);
  const [parsedTutorialRows, setParsedTutorialRows] = useState<Record<string, string>[]>([]);
  const [showTutorialPreview, setShowTutorialPreview] = useState(false);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingTutorials, setIsDeletingTutorials] = useState(false);
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

  // Use the external NORMALIZED_FIELD_MAP for header mapping

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

  const parseCSV = (text: string): Record<string, string>[] => {
    // Remove BOM if present at start of file
    const cleanText = text.replace(/^\uFEFF/, "");
    
    // Split into lines and filter out empty lines at the start
    const allLines = cleanText.split(/\r?\n/);
    const lines = allLines.filter((line, idx) => {
      // Keep all non-empty lines, but for leading empty lines, skip them
      if (idx === 0 && line.trim() === "") return false;
      return true;
    });
    
    // Also filter any remaining leading empty lines
    while (lines.length > 0 && lines[0].trim() === "") {
      lines.shift();
    }
    
    if (lines.length < 2) return [];

    console.log("=== DETAILED LINE DEBUG ===");
    console.log("Original lines.length:", allLines.length);
    console.log("Cleaned lines.length:", lines.length);
    console.log("lines[0] length:", lines[0].length);
    console.log("lines[0] first 100 chars:", JSON.stringify(lines[0].substring(0, 100)));
    console.log("lines[0] char codes (first 20):", Array.from(lines[0].substring(0, 20)).map(c => c.charCodeAt(0)));
    
    // Try direct comma split first
    const directSplit = lines[0].split(",");
    console.log("Direct comma split result length:", directSplit.length);
    console.log("Direct comma split first 3:", directSplit.slice(0, 3));

    // Auto-detect delimiter from first non-empty line
    const delimiter = detectDelimiter(lines[0]);
    console.log("Detected delimiter:", delimiter === "\t" ? "TAB" : JSON.stringify(delimiter));
    console.log("Delimiter char code:", delimiter.charCodeAt(0));

    // ALWAYS use simple split for headers - headers should never have quotes
    const rawHeaders = lines[0].split(delimiter).map(h => h.trim().replace(/^\uFEFF/, "").replace(/^"|"$/g, ""));
    
    console.log("Raw headers parsed:", rawHeaders);
    console.log("Number of headers:", rawHeaders.length);
    console.log("First 5 headers:", rawHeaders.slice(0, 5));
    
    // Map CSV headers to expected field names (case-insensitive, space-to-underscore)
    const headerMapping: Record<number, string> = {};
    rawHeaders.forEach((header, idx) => {
      const normalized = normalizeHeader(header);
      console.log(`Header ${idx}: "${header}" -> normalized: "${normalized}" -> maps to: "${NORMALIZED_FIELD_MAP[normalized] || 'NOT FOUND'}"`);
      if (NORMALIZED_FIELD_MAP[normalized]) {
        headerMapping[idx] = NORMALIZED_FIELD_MAP[normalized];
      } else {
        // Keep original header if no match found
        headerMapping[idx] = header.trim();
      }
    });

    console.log("Header mapping result:", headerMapping);

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

    console.log("First row keys:", rows.length > 0 ? Object.keys(rows[0]) : []);
    return rows;
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

  const deleteAllTutorials = async () => {
    setIsDeletingTutorials(true);
    try {
      const { error } = await supabase
        .from("ai_guides")
        .delete()
        .eq("guide_category", "Tutorial");

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["ai-guides-admin"] });
      toast.success("All tutorials deleted");
    } catch (error) {
      console.error("Error deleting tutorials:", error);
      toast.error("Failed to delete tutorials");
    } finally {
      setIsDeletingTutorials(false);
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
      console.log("=== CSV IMPORT DEBUG ===");
      console.log("File text length:", text.length);
      console.log("First 500 chars:", text.substring(0, 500));
      
      const rows = parseCSV(text);
      console.log("Parsed rows count:", rows.length);

      if (rows.length === 0) {
        toast.error("No data found in CSV file");
        return;
      }

      const firstRow = rows[0];
      const detectedFields = Object.keys(firstRow);
      console.log("First row keys:", detectedFields);
      console.log("First row sample values:", Object.entries(firstRow).slice(0, 5));
      
      // Create a normalized lookup for detected fields
      const normalizedDetected: Record<string, string> = {};
      detectedFields.forEach(f => {
        normalizedDetected[normalizeHeader(f)] = f;
      });
      console.log("Normalized detected fields:", Object.keys(normalizedDetected));
      
      // Check for missing fields using normalized comparison
      const missingFields = EXPECTED_FIELDS.filter((field) => {
        const normalizedExpected = normalizeHeader(field);
        const found = normalizedExpected in normalizedDetected || field in firstRow;
        if (!found) {
          console.log(`Missing field: "${field}" (normalized: "${normalizedExpected}")`);
        }
        return !found;
      });

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
        // Map CSV categories to valid database values
        const validCategories = ['Prompt List', 'Tutorial', 'Framework', 'Use Case', 'Platform Guide', 'Role Guide', 'Prompt Pack'];
        const categoryMapping: Record<string, string> = {
          'content marketing': 'Use Case',
          'content strategy': 'Framework',
          'marketing': 'Use Case',
          'strategy': 'Framework',
          'writing': 'Use Case',
          'copywriting': 'Use Case',
          'seo': 'Use Case',
          'social media': 'Use Case',
          'email': 'Use Case',
          'research': 'Use Case',
          'analysis': 'Framework',
          'productivity': 'Use Case',
          'coding': 'Use Case',
          'development': 'Platform Guide',
        };
        
        let mappedCategory = row.Guide_Category;
        const lowerCategory = (row.Guide_Category || '').toLowerCase().trim();
        
        // Check if it's already a valid category
        if (!validCategories.includes(mappedCategory)) {
          // Try to map it
          mappedCategory = categoryMapping[lowerCategory] || 'Use Case'; // Default to 'Use Case'
          console.log(`Mapped category "${row.Guide_Category}" -> "${mappedCategory}"`);
        }

        // Map CSV platforms to valid database values
        const validPlatforms = ['ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'Runway', 'ElevenLabs', 'TikTok', 'Other', 'Generic'];
        const platformMapping: Record<string, string> = {
          'google': 'Gemini',
          'gpt': 'ChatGPT',
          'openai': 'ChatGPT',
          'gpt-4': 'ChatGPT',
          'gpt4': 'ChatGPT',
          'anthropic': 'Claude',
          'dall-e': 'Other',
          'dalle': 'Other',
          'stable diffusion': 'Other',
          'stablediffusion': 'Other',
          'leonardo': 'Other',
          'canva': 'Other',
        };
        
        let mappedPlatform = row.Primary_Platform;
        const lowerPlatform = (row.Primary_Platform || '').toLowerCase().trim();
        
        // Check if it's already a valid platform
        if (!validPlatforms.includes(mappedPlatform)) {
          // Try to map it
          mappedPlatform = platformMapping[lowerPlatform] || 'Generic'; // Default to 'Generic'
          console.log(`Mapped platform "${row.Primary_Platform}" -> "${mappedPlatform}"`);
        }

        const guideData = {
          title: row.Title,
          slug: row.Slug,
          guide_category: mappedCategory,
          level: row.Level,
          primary_platform: mappedPlatform,
          audience_role: sanitizeContent(row.Audience_Role),
          geo: sanitizeContent(row.Geo),
          excerpt: sanitizeContent(row.Excerpt),
          seo_title: sanitizeContent(row.SEO_Title),
          meta_title: sanitizeContent(row.Meta_Title),
          meta_description: sanitizeContent(row.Meta_Description),
          focus_keyphrase: sanitizeContent(row.Focus_Keyphrase),
          keyphrase_synonyms: sanitizeContent(row.Keyphrase_Synonyms),
          tags: sanitizeContent(row.Tags),
          tldr_bullet_1: sanitizeContent(row.TLDR_Bullet_1),
          tldr_bullet_2: sanitizeContent(row.TLDR_Bullet_2),
          tldr_bullet_3: sanitizeContent(row.TLDR_Bullet_3),
          perfect_for: sanitizeContent(row.Perfect_For),
          body_intro: sanitizeContent(row.Body_Intro),
          body_section_1_heading: sanitizeContent(row.Body_Section_1_Heading),
          body_section_1_text: sanitizeContent(row.Body_Section_1_Text),
          body_section_2_heading: sanitizeContent(row.Body_Section_2_Heading),
          body_section_2_text: sanitizeContent(row.Body_Section_2_Text),
          body_section_3_heading: sanitizeContent(row.Body_Section_3_Heading),
          body_section_3_text: sanitizeContent(row.Body_Section_3_Text),
          prompt_1_label: sanitizeContent(row.Prompt_1_Label),
          prompt_1_headline: sanitizeContent(row.Prompt_1_Headline),
          prompt_1_text: sanitizeContent(row.Prompt_1_Text),
          prompt_2_label: sanitizeContent(row.Prompt_2_Label),
          prompt_2_headline: sanitizeContent(row.Prompt_2_Headline),
          prompt_2_text: sanitizeContent(row.Prompt_2_Text),
          prompt_3_label: sanitizeContent(row.Prompt_3_Label),
          prompt_3_headline: sanitizeContent(row.Prompt_3_Headline),
          prompt_3_text: sanitizeContent(row.Prompt_3_Text),
          faq_q1: sanitizeContent(row.FAQ_Q1),
          faq_a1: sanitizeContent(row.FAQ_A1),
          faq_q2: sanitizeContent(row.FAQ_Q2),
          faq_a2: sanitizeContent(row.FAQ_A2),
          faq_q3: sanitizeContent(row.FAQ_Q3),
          faq_a3: sanitizeContent(row.FAQ_A3),
          image_prompt: sanitizeContent(row.Image_Prompt),
          closing_cta: sanitizeContent(row.Closing_CTA),
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

  // Tutorial CSV parsing with flexible header matching
  const parseTutorialCSV = (text: string): Record<string, string>[] => {
    const cleanText = text.replace(/^\uFEFF/, "");
    const allLines = cleanText.split(/\r?\n/);
    const lines = allLines.filter((line, idx) => {
      if (idx === 0 && line.trim() === "") return false;
      return true;
    });
    
    while (lines.length > 0 && lines[0].trim() === "") {
      lines.shift();
    }
    
    if (lines.length < 2) return [];

    const delimiter = detectDelimiter(lines[0]);
    const rawHeaders = lines[0].split(delimiter).map(h => h.trim().replace(/^\uFEFF/, "").replace(/^"|"$/g, ""));
    
    // Map CSV headers to expected tutorial field names
    const headerMapping: Record<number, string> = {};
    rawHeaders.forEach((header, idx) => {
      const normalized = normalizeHeader(header);
      if (NORMALIZED_TUTORIAL_FIELD_MAP[normalized]) {
        headerMapping[idx] = NORMALIZED_TUTORIAL_FIELD_MAP[normalized];
      } else {
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

  const handleTutorialFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    try {
      const text = await file.text();
      const rows = parseTutorialCSV(text);

      if (rows.length === 0) {
        toast.error("No data found in CSV file");
        return;
      }

      const firstRow = rows[0];
      const detectedFields = Object.keys(firstRow);
      
      // Create a normalized lookup for detected fields
      const normalizedDetected: Record<string, string> = {};
      detectedFields.forEach(f => {
        normalizedDetected[normalizeHeader(f)] = f;
      });
      
      // Check for missing fields using normalized comparison
      const missingFields = TUTORIAL_FIELDS.filter((field) => {
        const normalizedExpected = normalizeHeader(field);
        const found = normalizedExpected in normalizedDetected || field in firstRow;
        return !found;
      });

      if (missingFields.length > 0) {
        console.log("Expected tutorial fields:", TUTORIAL_FIELDS);
        console.log("Detected fields:", detectedFields);
        console.log("Missing fields:", missingFields);
        
        toast.error(
          `Missing ${missingFields.length} required fields: ${missingFields.slice(0, 3).join(", ")}${missingFields.length > 3 ? '...' : ''}`,
          { duration: 8000 }
        );
        return;
      }

      setParsedTutorialRows(rows);
      setShowTutorialPreview(true);
      setTutorialResults([]);
      toast.success(`Parsed ${rows.length} tutorial(s) from CSV`);
    } catch (error) {
      console.error("Error parsing tutorial CSV:", error);
      toast.error("Failed to parse CSV file");
    }
  };

  const importTutorials = async () => {
    if (parsedTutorialRows.length === 0) return;

    setIsTutorialProcessing(true);
    setTutorialProgress(0);
    setTutorialCurrentItem("");
    const importResults: ImportResult[] = [];

    // Valid platforms for tutorials
    const validPlatforms = ['ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'Runway', 'ElevenLabs', 'TikTok', 'Other', 'Generic'];
    const platformMapping: Record<string, string> = {
      'google': 'Gemini',
      'gpt': 'ChatGPT',
      'openai': 'ChatGPT',
      'anthropic': 'Claude',
    };

    for (let i = 0; i < parsedTutorialRows.length; i++) {
      const row = parsedTutorialRows[i];
      setTutorialCurrentItem(row.Title);

      try {
        // Map platform
        let mappedPlatform = row.Primary_Platform;
        const lowerPlatform = (row.Primary_Platform || '').toLowerCase().trim();
        
        if (!validPlatforms.includes(mappedPlatform)) {
          mappedPlatform = platformMapping[lowerPlatform] || 'Generic';
        }

        // Build tutorial data - map to ai_guides table structure
        // Tutorial content maps to body sections
        const tutorialData = {
          title: row.Title,
          slug: row.Slug,
          guide_category: 'Tutorial', // Always Tutorial for this import
          level: row.Skill_Level || 'Beginner',
          primary_platform: mappedPlatform,
          audience_role: sanitizeContent(row.Audience_Role),
          geo: sanitizeContent(row.Geo),
          excerpt: sanitizeContent(row.Excerpt),
          seo_title: sanitizeContent(row.SEO_Title),
          meta_title: sanitizeContent(row.Meta_Title),
          meta_description: sanitizeContent(row.Meta_Description),
          focus_keyphrase: sanitizeContent(row.Focus_Keyword),
          keyphrase_synonyms: sanitizeContent(row.Keyword_Synonyms),
          tags: sanitizeContent(row.Tags),
          tldr_bullet_1: sanitizeContent(row.TLDR_Bullet_1),
          tldr_bullet_2: sanitizeContent(row.TLDR_Bullet_2),
          tldr_bullet_3: sanitizeContent(row.TLDR_Bullet_3),
          perfect_for: sanitizeContent(row.Perfect_For),
          // Map tutorial structure to guide structure
          body_intro: sanitizeContent(row.Introduction),
          body_section_1_heading: sanitizeContent(row.Step_1_Heading),
          body_section_1_text: sanitizeContent(row.Step_1_Text),
          body_section_2_heading: sanitizeContent(row.Step_2_Heading),
          body_section_2_text: sanitizeContent(row.Step_2_Text),
          body_section_3_heading: sanitizeContent(row.Step_3_Heading),
          body_section_3_text: sanitizeContent(row.Step_3_Text),
          // Map remaining steps and tips to prompt fields for storage
          prompt_1_label: sanitizeContent(row.Step_4_Heading),
          prompt_1_headline: sanitizeContent(row.Estimated_Time_to_Complete),
          prompt_1_text: sanitizeContent(row.Step_4_Text),
          prompt_2_label: sanitizeContent(row.Tips_Heading),
          prompt_2_headline: sanitizeContent(row.Learning_Outcomes),
          prompt_2_text: sanitizeContent(row.Tips_Text),
          prompt_3_label: sanitizeContent(row.Activities_Heading_1),
          prompt_3_headline: sanitizeContent(row.Activities_Heading_2),
          prompt_3_text: sanitizeContent(`${row.Activities_Text_1 || ''}\n\n${row.Activities_Text_2 || ''}`.trim()),
          faq_q1: sanitizeContent(row.FAQ_Q1),
          faq_a1: sanitizeContent(row.FAQ_A1),
          faq_q2: sanitizeContent(row.FAQ_Q2),
          faq_a2: sanitizeContent(row.FAQ_A2),
          faq_q3: sanitizeContent(row.FAQ_Q3),
          faq_a3: sanitizeContent(row.FAQ_A3),
          image_prompt: sanitizeContent(row.Visual_Prompt),
          closing_cta: sanitizeContent(`${row.Conclusion_CTA || ''}\n\n${row.Extra_Resources || ''}`.trim()),
          created_by: user.id,
        };

        const { error } = await supabase.from("ai_guides").upsert(tutorialData, {
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

      setTutorialProgress(((i + 1) / parsedTutorialRows.length) * 100);
      setTutorialResults([...importResults]);
    }

    setIsTutorialProcessing(false);
    setTutorialCurrentItem("");
    queryClient.invalidateQueries({ queryKey: ["ai-guides-admin"] });

    const successCount = importResults.filter((r) => r.success).length;
    const failCount = importResults.filter((r) => !r.success).length;

    if (failCount === 0) {
      toast.success(`Successfully imported ${successCount} tutorial(s)`);
    } else {
      toast.warning(`Imported ${successCount}, failed ${failCount}`);
    }
  };

  const resetTutorialImport = () => {
    setParsedTutorialRows([]);
    setShowTutorialPreview(false);
    setTutorialResults([]);
    setTutorialProgress(0);
    setTutorialCurrentItem("");
    if (tutorialFileInputRef.current) {
      tutorialFileInputRef.current.value = "";
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

          {/* ========== TUTORIAL IMPORT SECTION ========== */}
          <div className="mt-12 border-t-4 border-primary/30 pt-8">
            <h2 className="mb-2 text-2xl font-bold text-primary">Import Tutorials CSV</h2>
            <p className="mb-6 text-muted-foreground">
              Upload a tutorial CSV file generated by ChatGPT. Tutorials will appear under the "Tutorial" filter on the /guides page.
            </p>

            {/* Tutorial Upload Card */}
            <Card className="mb-8 border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Tutorials CSV
                </CardTitle>
                <CardDescription>
                  Select a CSV file with tutorial data. The CSV should be generated by ChatGPT using the tutorial schema. Existing tutorials with matching slugs will be updated.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <input
                    ref={tutorialFileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleTutorialFileSelect}
                    className="hidden"
                  />
                  <Button
                    onClick={() => tutorialFileInputRef.current?.click()}
                    disabled={isTutorialProcessing}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Select Tutorials CSV
                  </Button>
                  {parsedTutorialRows.length > 0 && (
                    <Button variant="outline" onClick={resetTutorialImport}>
                      Clear
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={isDeletingTutorials}
                      >
                        {isDeletingTutorials ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete All Tutorials
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete all tutorials?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all guides with category "Tutorial". Other guides will not be affected. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteAllTutorials}>
                          Delete All Tutorials
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            {/* Tutorial Preview */}
            {showTutorialPreview && parsedTutorialRows.length > 0 && (
              <Card className="mb-8 border-primary/50">
                <CardHeader>
                  <CardTitle>Preview ({parsedTutorialRows.length} tutorials)</CardTitle>
                  <CardDescription>
                    Review the tutorials before importing
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
                          <th className="px-3 py-2 text-left">Skill Level</th>
                          <th className="px-3 py-2 text-left">Platform</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedTutorialRows.map((row, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">{i + 1}</td>
                            <td className="px-3 py-2 font-medium">{row.Title}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {row.Slug}
                            </td>
                            <td className="px-3 py-2">{row.Skill_Level}</td>
                            <td className="px-3 py-2">{row.Primary_Platform}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Button
                    onClick={importTutorials}
                    disabled={isTutorialProcessing}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Import {parsedTutorialRows.length} Tutorial(s)
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Tutorial Progress */}
            {isTutorialProcessing && (
              <Card className="mb-8 border-primary">
                <CardContent className="py-6">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing tutorials...
                    </span>
                    <span className="font-medium">{Math.round(tutorialProgress)}%</span>
                  </div>
                  <Progress value={tutorialProgress} className="mb-3" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {tutorialResults.length} of {parsedTutorialRows.length} processed
                    </span>
                    {tutorialCurrentItem && (
                      <span className="truncate max-w-[200px]">
                        Current: {tutorialCurrentItem}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-4 text-xs">
                    <span className="text-green-600">
                      ✓ {tutorialResults.filter((r) => r.success).length} success
                    </span>
                    <span className="text-red-600">
                      ✗ {tutorialResults.filter((r) => !r.success).length} failed
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tutorial Results */}
            {tutorialResults.length > 0 && !isTutorialProcessing && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Tutorial Import Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {tutorialResults.map((result, i) => (
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

            {/* Tutorial Expected Fields Reference */}
            <Card className="mt-8 border-primary/30">
              <CardHeader>
                <CardTitle>Tutorial CSV Fields ({TUTORIAL_FIELDS.length} columns)</CardTitle>
                <CardDescription>
                  Your tutorial CSV file should include these column headers. Matching is flexible: case-insensitive and spaces are converted to underscores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto rounded border border-primary/30 p-3">
                  <div className="flex flex-wrap gap-2">
                    {TUTORIAL_FIELDS.map((field, index) => (
                      <code
                        key={field}
                        className="rounded bg-primary/10 px-2 py-1 text-xs text-primary"
                      >
                        {index + 1}. {field}
                      </code>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expected Fields Reference for Guides */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Guide CSV Fields ({EXPECTED_FIELDS.length} columns)</CardTitle>
              <CardDescription>
                Your guide CSV file should include these column headers. Matching is flexible: case-insensitive and spaces are converted to underscores (e.g., "title", "TITLE", "Guide Category" all work).
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
