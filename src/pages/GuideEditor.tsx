import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { generateSlug } from "@/lib/markdownConversion";
import GuidePreviewPanel from "@/components/guide-editor/GuidePreviewPanel";
import GuideEditorFeaturedImage from "@/components/guide-editor/GuideEditorFeaturedImage";
import { Image } from "lucide-react";
import {
  Home, Save, Eye, Send, ChevronDown, ChevronUp, Plus, X, GripVertical,
  BookOpen, Terminal, Wrench, Lightbulb, ListOrdered, Sparkles, AlertTriangle,
  HelpCircle, ArrowRight, Clipboard, Loader2, Clock, Copy
} from "lucide-react";

// Types
interface StepItem { step_number: number; title: string; content: string }
interface PromptItem { title: string; prompt_text: string; what_to_expect: string }
interface MistakeItem { title: string; description: string }
interface ToolItem { name: string; description: string; limitation: string }
interface FaqItem { question: string; answer: string }
interface WorkedExample { prompt: string; output: string; editing_notes: string }

interface GuideFormData {
  title: string;
  slug: string;
  pillar: string;
  content_type: string;
  difficulty: string;
  platform_tags: string[];
  topic_tags: string[];
  one_line_description: string;
  read_time_minutes: number;
  featured_image_url: string;
  featured_image_alt: string;
  guide_category: string;
  level: string;
  primary_platform: string;
  status: string;
  snapshot_bullets: string[];
  why_this_matters: string;
  steps: StepItem[];
  worked_example: WorkedExample;
  guide_prompts: PromptItem[];
  common_mistakes: MistakeItem[];
  recommended_tools: ToolItem[];
  faq_items: FaqItem[];
  next_steps: string;
  meta_title: string;
  meta_description: string;
  focus_keyphrase: string;
  author_id: string | null;
  is_editors_pick: boolean;
  preview_code: string;
}

const defaultFormData: GuideFormData = {
  title: "", slug: "", pillar: "learn", content_type: "Quick Guide", difficulty: "intermediate",
  platform_tags: [], topic_tags: [], one_line_description: "", read_time_minutes: 0,
  featured_image_url: "", featured_image_alt: "", guide_category: "Guide", level: "Intermediate",
  primary_platform: "ChatGPT", status: "draft",
  snapshot_bullets: ["", "", ""],
  why_this_matters: "",
  steps: [{ step_number: 1, title: "", content: "" }, { step_number: 2, title: "", content: "" }, { step_number: 3, title: "", content: "" }],
  worked_example: { prompt: "", output: "", editing_notes: "" },
  guide_prompts: [{ title: "", prompt_text: "", what_to_expect: "" }, { title: "", prompt_text: "", what_to_expect: "" }],
  common_mistakes: [{ title: "", description: "" }, { title: "", description: "" }, { title: "", description: "" }],
  recommended_tools: [{ name: "", description: "", limitation: "" }, { name: "", description: "", limitation: "" }, { name: "", description: "", limitation: "" }],
  faq_items: [{ question: "", answer: "" }, { question: "", answer: "" }, { question: "", answer: "" }],
  next_steps: "",
  meta_title: "", meta_description: "", focus_keyphrase: "",
  author_id: null, is_editors_pick: false, preview_code: "",
};

const pillarContentTypes: Record<string, string[]> = {
  learn: ["Quick Guide", "Deep Dive", "Role Guide"],
  prompts: ["Prompt Collection", "Prompt Pack"],
  toolbox: ["Tool Pick"],
};

const platformOptions = ["ChatGPT", "Claude", "Gemini", "Midjourney", "Multi-platform"];
const platformColors: Record<string, string> = {
  ChatGPT: "bg-[hsl(160,82%,35%)]", Claude: "bg-[hsl(36,80%,45%)]",
  Gemini: "bg-[hsl(217,77%,56%)]", Midjourney: "bg-foreground", "Multi-platform": "bg-[hsl(239,84%,67%)]",
};

const GuideEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<GuideFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const debouncedFormData = useDebounce(formData, 300);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      const { data } = await supabase.from("user_roles").select("role")
        .eq("user_id", session.user.id).or("role.eq.admin,role.eq.editor,role.eq.contributor");
      if (!data || data.length === 0) {
        toast({ title: "Access Denied", description: "You don't have permission to edit guides.", variant: "destructive" });
        navigate("/");
      }
    };
    checkAuth();
  }, []);

  // Load existing guide
  const { data: existingGuide, isLoading } = useQuery({
    queryKey: ["guide-edit", id],
    enabled: !!id && !!user,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_guides").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) { toast({ title: "Guide Not Found", variant: "destructive" }); navigate("/admin/guides"); return null; }
      return data;
    },
  });

  // Populate form from existing guide
  useEffect(() => {
    if (!existingGuide) return;
    const g = existingGuide as any;
    setFormData({
      title: g.title || "", slug: g.slug || "",
      pillar: g.pillar || "learn", content_type: g.content_type || g.guide_category || "Guide",
      difficulty: g.difficulty || g.level?.toLowerCase() || "intermediate",
      platform_tags: g.platform_tags || [], topic_tags: g.topic_tags || [],
      one_line_description: g.one_line_description || g.meta_description || "",
      read_time_minutes: g.read_time_minutes || 0,
      featured_image_url: g.featured_image_url || "", featured_image_alt: g.featured_image_alt || "",
      guide_category: g.guide_category || "Guide", level: g.level || "Intermediate",
      primary_platform: g.primary_platform || "ChatGPT", status: g.status || "draft",
      snapshot_bullets: g.snapshot_bullets?.length ? g.snapshot_bullets : (g.tldr_bullet_1 ? [g.tldr_bullet_1, g.tldr_bullet_2, g.tldr_bullet_3].filter(Boolean) : ["", "", ""]),
      why_this_matters: g.why_this_matters || g.context_and_background || "",
      steps: Array.isArray(g.steps) && g.steps.length ? g.steps : [{ step_number: 1, title: "", content: "" }],
      worked_example: g.worked_example && Object.keys(g.worked_example).length ? g.worked_example : { prompt: "", output: "", editing_notes: "" },
      guide_prompts: Array.isArray(g.guide_prompts) && g.guide_prompts.length ? g.guide_prompts : [{ title: "", prompt_text: "", what_to_expect: "" }],
      common_mistakes: Array.isArray(g.common_mistakes) && g.common_mistakes.length ? g.common_mistakes : [{ title: "", description: "" }],
      recommended_tools: Array.isArray(g.recommended_tools) && g.recommended_tools.length ? g.recommended_tools : [{ name: "", description: "", limitation: "" }],
      faq_items: Array.isArray(g.faq_items) && g.faq_items.length ? g.faq_items : (g.faq_q1 ? [{ question: g.faq_q1, answer: g.faq_a1 || "" }, { question: g.faq_q2 || "", answer: g.faq_a2 || "" }, { question: g.faq_q3 || "", answer: g.faq_a3 || "" }].filter(f => f.question) : [{ question: "", answer: "" }]),
      next_steps: g.next_steps || "",
      meta_title: g.meta_title || "", meta_description: g.meta_description || "",
      focus_keyphrase: g.focus_keyphrase || "",
      author_id: g.author_id || null, is_editors_pick: g.is_editors_pick || false,
      preview_code: g.preview_code || "",
    });
  }, [existingGuide]);

  // Auto-save every 60s
  useEffect(() => {
    if (!hasChanges || !user) return;
    autoSaveRef.current = setInterval(() => {
      if (formDataRef.current.title) handleSave("draft", true);
    }, 60000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [hasChanges, user]);

  // Warn on navigation
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (hasChanges) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!id && formData.title && !formData.slug) {
      updateField("slug", generateSlug(formData.title));
    }
  }, [formData.title]);

  // Auto-set content_type when pillar changes
  useEffect(() => {
    const types = pillarContentTypes[formData.pillar] || [];
    if (types.length && !types.includes(formData.content_type)) {
      updateField("content_type", types[0]);
    }
  }, [formData.pillar]);

  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // Calculate read time from content
  const calculateReadTime = useCallback((data: GuideFormData): number => {
    const texts = [data.why_this_matters, data.next_steps, ...data.snapshot_bullets,
      ...data.steps.map(s => s.content + " " + s.title),
      data.worked_example.prompt, data.worked_example.output, data.worked_example.editing_notes,
      ...data.guide_prompts.map(p => p.prompt_text + " " + p.what_to_expect),
      ...data.common_mistakes.map(m => m.title + " " + m.description),
      ...data.faq_items.map(f => f.question + " " + f.answer),
    ];
    const words = texts.filter(Boolean).join(" ").split(/\s+/).length;
    return Math.max(1, Math.round(words / 238));
  }, []);

  const handleSave = async (status?: string, isAutoSave = false) => {
    if (saving) return;
    setSaving(true);
    try {
      const saveStatus = status || formData.status || "draft";
      const readTime = calculateReadTime(formData);
      const saveData: any = {
        title: formData.title, slug: formData.slug,
        pillar: formData.pillar || null, content_type: formData.content_type || null,
        difficulty: formData.difficulty || null,
        platform_tags: formData.platform_tags, topic_tags: formData.topic_tags,
        one_line_description: formData.one_line_description || null,
        read_time_minutes: readTime,
        featured_image_url: formData.featured_image_url || null,
        featured_image_alt: formData.featured_image_alt || null,
        guide_category: (() => {
          const p = formData.pillar;
          const ct = formData.content_type;
          if (p === 'learn' && ct === 'quick_guide') return 'Quick Guide';
          if (p === 'learn' && ct === 'deep_dive') return 'Deep Dive';
          if (p === 'learn' && ct === 'role_guide') return 'Role Guide';
          if (p === 'prompts' && ct === 'prompt_collection') return 'Prompt Collection';
          if (p === 'prompts' && ct === 'prompt_pack') return 'Prompt Pack';
          if (p === 'toolbox' && ct === 'tool_pick') return 'Tool Pick';
          return formData.guide_category || 'Guide';
        })(),
        level: (() => {
          const d = formData.difficulty;
          if (d === 'beginner') return 'Beginner';
          if (d === 'intermediate') return 'Intermediate';
          if (d === 'advanced') return 'Advanced';
          return formData.level || 'Intermediate';
        })(),
        primary_platform: (() => {
          const tag = formData.platform_tags?.[0];
          if (!tag) return formData.primary_platform || 'Generic';
          const map: Record<string, string> = { 'ChatGPT': 'ChatGPT', 'Claude': 'Claude', 'Gemini': 'Gemini', 'Midjourney': 'Midjourney', 'Multi-platform': 'Generic' };
          return map[tag] || 'Generic';
        })(),
        status: saveStatus,
        snapshot_bullets: formData.snapshot_bullets.filter(Boolean),
        why_this_matters: formData.why_this_matters || null,
        steps: formData.steps.filter(s => s.content?.trim()),
        worked_example: (formData.worked_example.prompt || formData.worked_example.output) ? formData.worked_example : {},
        guide_prompts: formData.guide_prompts.filter(p => p.prompt_text?.trim()),
        common_mistakes: formData.common_mistakes.filter(m => m.title?.trim()),
        recommended_tools: formData.recommended_tools.filter(t => t.name?.trim()),
        faq_items: formData.faq_items.filter(f => f.question?.trim()),
        next_steps: formData.next_steps || null,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || formData.one_line_description || null,
        focus_keyphrase: formData.focus_keyphrase || null,
        author_id: formData.author_id || null,
        is_editors_pick: formData.is_editors_pick,
      };

      if (id) {
        const { error } = await supabase.from("ai_guides").update(saveData).eq("id", id);
        if (error) throw error;
      } else {
        const { data: newGuide, error } = await supabase.from("ai_guides").insert(saveData).select().single();
        if (error) throw error;
        navigate(`/guide-editor/${newGuide.id}`, { replace: true });
      }

      setHasChanges(false);
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["guide-edit", id] });

      if (!isAutoSave) {
        toast({
          title: saveStatus === "published" ? "Guide Published!" : "Guide Saved",
          description: saveStatus === "published" ? "Your guide is now live." : "Draft saved successfully.",
        });
      }
    } catch (error: any) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // AI Assist
  const callScoutAssist = async (action: string, content: string, context?: any) => {
    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("scout-assistant", {
        body: { action, content, context },
      });
      if (error) throw error;
      return data?.result;
    } catch (err: any) {
      toast({ title: "AI Assist Failed", description: err.message, variant: "destructive" });
      return null;
    } finally { setAiLoading(null); }
  };

  // Quick Import Parser
  const parseImportText = () => {
    if (!importText.trim()) return;
    const sections: Record<string, string> = {};
    let currentSection = "meta";
    let currentContent: string[] = [];

    importText.split("\n").forEach(line => {
      if (line.startsWith("## ")) {
        if (currentContent.length) sections[currentSection] = currentContent.join("\n").trim();
        currentSection = line.replace("## ", "").trim().toLowerCase();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    });
    if (currentContent.length) sections[currentSection] = currentContent.join("\n").trim();

    const newData = { ...formData };

    // Parse metadata
    const metaText = sections["meta"] || "";
    const difficultyMatch = metaText.match(/difficulty:\s*(beginner|intermediate|advanced)/i);
    if (difficultyMatch) newData.difficulty = difficultyMatch[1].toLowerCase();
    const platformsMatch = metaText.match(/platforms?:\s*(.+)/i);
    if (platformsMatch) newData.platform_tags = platformsMatch[1].split(",").map(p => p.trim()).filter(Boolean);
    const descMatch = metaText.match(/description:\s*(.+)/i);
    if (descMatch) newData.one_line_description = descMatch[1].trim();

    // AI Snapshot
    const snapshotSection = sections["ai snapshot"] || sections["snapshot"] || "";
    if (snapshotSection) {
      newData.snapshot_bullets = snapshotSection.split("\n").filter(l => l.match(/^[-*]\s/)).map(l => l.replace(/^[-*]\s+/, "").trim());
    }

    // Why This Matters
    const whySection = sections["why this matters"] || sections["context and background"] || "";
    if (whySection) newData.why_this_matters = whySection;

    // How to Do It / Steps
    const howSection = sections["how to do it"] || sections["steps"] || "";
    if (howSection) {
      const stepMatches = howSection.split(/(?=\d+\.\s+\*\*|(?:^|\n)Step\s+\d)/);
      const steps: StepItem[] = [];
      stepMatches.forEach((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return;
        const titleMatch = trimmed.match(/^\d+\.\s+\*\*(.+?)\*\*/);
        steps.push({
          step_number: i + 1,
          title: titleMatch ? titleMatch[1].trim() : "",
          content: titleMatch ? trimmed.replace(/^\d+\.\s+\*\*.+?\*\*\s*/, "").trim() : trimmed.replace(/^\d+\.\s*/, "").trim(),
        });
      });
      if (steps.length) newData.steps = steps;
    }

    // Worked Example
    const exampleSection = sections["what this actually looks like"] || sections["worked example"] || "";
    if (exampleSection) {
      const promptMatch = exampleSection.match(/```[\s\S]*?```/);
      const prompt = promptMatch ? promptMatch[0].replace(/```/g, "").trim() : "";
      const parts = exampleSection.split(/###\s*/);
      let output = "", editingNotes = "";
      parts.forEach(part => {
        if (part.toLowerCase().startsWith("what ai gives you")) output = part.replace(/what ai gives you\s*/i, "").trim();
        if (part.toLowerCase().startsWith("how to edit")) editingNotes = part.replace(/how to edit this\s*/i, "").trim();
      });
      newData.worked_example = { prompt, output, editing_notes: editingNotes };
    }

    // Prompts
    const promptsSection = sections["prompts to try"] || sections["prompts"] || "";
    if (promptsSection) {
      const promptBlocks = promptsSection.split(/###\s*/);
      const prompts: PromptItem[] = [];
      promptBlocks.forEach(block => {
        const trimmed = block.trim();
        if (!trimmed) return;
        const lines = trimmed.split("\n");
        const title = lines[0]?.trim() || "";
        const codeMatch = trimmed.match(/```[\s\S]*?```/);
        const expectMatch = trimmed.match(/what to expect:\s*(.+)/i);
        prompts.push({ title, prompt_text: codeMatch ? codeMatch[0].replace(/```/g, "").trim() : "", what_to_expect: expectMatch ? expectMatch[1].trim() : "" });
      });
      if (prompts.length) newData.guide_prompts = prompts;
    }

    // Common Mistakes
    const mistakesSection = sections["common mistakes"] || "";
    if (mistakesSection) {
      const mistakes: MistakeItem[] = [];
      const blocks = mistakesSection.split(/\n\*\*/).filter(Boolean);
      blocks.forEach(block => {
        const match = block.match(/^(.+?)\*\*\.?\s*([\s\S]*)/);
        if (match) mistakes.push({ title: match[1].trim().replace(/^\*\*/, ""), description: match[2].trim() });
      });
      if (mistakes.length) newData.common_mistakes = mistakes;
    }

    // Tools
    const toolsSection = sections["tools that work for this"] || sections["tools"] || "";
    if (toolsSection) {
      const tools: ToolItem[] = [];
      const blocks = toolsSection.split(/\n\*\*/).filter(Boolean);
      blocks.forEach(block => {
        const match = block.match(/^(.+?)\*\*\.?\s*([\s\S]*)/);
        if (match) {
          const name = match[1].trim().replace(/^\*\*/, "");
          const rest = match[2].trim();
          const limMatch = rest.match(/limitation:\s*(.+)/i);
          tools.push({ name, description: limMatch ? rest.replace(limMatch[0], "").trim() : rest, limitation: limMatch ? limMatch[1].trim() : "" });
        }
      });
      if (tools.length) newData.recommended_tools = tools;
    }

    // FAQ
    const faqSection = sections["frequently asked questions"] || sections["faq"] || "";
    if (faqSection) {
      const faqs: FaqItem[] = [];
      const blocks = faqSection.split(/\n\*\*/).filter(Boolean);
      blocks.forEach(block => {
        const match = block.match(/^(.+?)\*\*\s*([\s\S]*)/);
        if (match) faqs.push({ question: match[1].trim().replace(/^\*\*/, "").replace(/\?$/, "?"), answer: match[2].trim() });
      });
      if (faqs.length) newData.faq_items = faqs;
    }

    // Next Steps
    const nextSection = sections["next steps"] || "";
    if (nextSection) newData.next_steps = nextSection;

    // Calculate read time
    newData.read_time_minutes = calculateReadTime(newData);

    setFormData(newData);
    setHasChanges(true);
    setShowImport(false);
    setImportText("");
    toast({ title: "Content Parsed", description: "Fields have been populated from your import." });
  };

  const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // ---- RENDER ----
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  const statusColor = formData.status === "published" ? "bg-green-500" : formData.status === "archived" ? "bg-amber-500" : "bg-muted-foreground/50";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <nav className="hidden md:flex text-sm text-muted-foreground items-center gap-1">
              <Link to="/" className="hover:text-primary"><Home className="h-3 w-3" /></Link>
              <span>›</span>
              <Link to="/admin" className="hover:text-primary">Admin</Link>
              <span>›</span>
              <span className="truncate max-w-[200px]">{id ? "Edit Guide" : "Create Guide"}</span>
            </nav>
            <Badge className={`${statusColor} text-white text-xs`}>{formData.status || "draft"}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                {saving ? "Saving..." : `Saved ${Math.round((Date.now() - lastSaved.getTime()) / 1000)}s ago`}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />Save Draft
            </Button>
            <Button variant="outline" size="sm" className="hidden md:flex" onClick={() => setShowPreview(p => !p)}>
              <Eye className="h-4 w-4 mr-1" />{showPreview ? "Hide" : "Show"} Preview
            </Button>
            {formData.status !== "published" && (
              <Button size="sm" onClick={() => handleSave("published")} disabled={saving || !formData.title}>
                <Send className="h-4 w-4 mr-1" />Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 ${showPreview ? "max-w-[60%]" : ""} transition-all`}>

          {/* Section 1: Metadata */}
          <SectionCard title="Metadata" icon={<BookOpen className="h-5 w-5" />} sectionKey="metadata" collapsed={collapsedSections.metadata} onToggle={toggleSection} number={1}>
            <div className="space-y-4">
              <div>
                <Input className="text-2xl font-bold border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40" placeholder="How to..." value={formData.title} onChange={e => updateField("title", e.target.value)} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>aiinasia.com/guides/</span>
                <Input className="max-w-xs text-sm" value={formData.slug} onChange={e => updateField("slug", e.target.value)} />
              </div>

              {/* Pillar selector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Pillar</label>
                  <div className="flex gap-1">
                    {(["learn", "prompts", "toolbox"] as const).map(p => (
                      <Button key={p} variant={formData.pillar === p ? "default" : "outline"} size="sm" onClick={() => updateField("pillar", p)} className="flex-1 gap-1">
                        {p === "learn" ? <BookOpen className="h-3.5 w-3.5" /> : p === "prompts" ? <Terminal className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />}
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Content Type</label>
                  <Select value={formData.content_type} onValueChange={v => updateField("content_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(pillarContentTypes[formData.pillar] || []).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <div className="flex gap-1">
                    {(["beginner", "intermediate", "advanced"] as const).map(d => (
                      <Button key={d} variant={formData.difficulty === d ? "default" : "outline"} size="sm" onClick={() => updateField("difficulty", d)}
                        className={`flex-1 ${formData.difficulty === d ? (d === "beginner" ? "bg-green-600 hover:bg-green-700" : d === "intermediate" ? "bg-amber-500 hover:bg-amber-600" : "bg-red-500 hover:bg-red-600") : ""}`}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Platform Tags */}
              <div>
                <label className="text-sm font-medium mb-2 block">Platform Tags</label>
                <div className="flex flex-wrap gap-2">
                  {platformOptions.map(p => (
                    <Button key={p} variant={formData.platform_tags.includes(p) ? "default" : "outline"} size="sm"
                      className={formData.platform_tags.includes(p) ? `${platformColors[p]} text-white hover:opacity-90` : ""}
                      onClick={() => {
                        const tags = formData.platform_tags.includes(p) ? formData.platform_tags.filter(t => t !== p) : [...formData.platform_tags, p];
                        updateField("platform_tags", tags);
                      }}>
                      {p}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Topic Tags */}
              <div>
                <label className="text-sm font-medium mb-2 block">Topic Tags (max 5)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.topic_tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => updateField("topic_tags", formData.topic_tags.filter((_, j) => j !== i))} />
                    </Badge>
                  ))}
                </div>
                {formData.topic_tags.length < 5 && (
                  <Input placeholder="Add a tag and press Enter" onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { updateField("topic_tags", [...formData.topic_tags, v]); (e.target as HTMLInputElement).value = ""; } }
                  }} />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium mb-2 block">One-line Description</label>
                <div className="relative">
                  <Input placeholder="What this guide teaches in one sentence..." value={formData.one_line_description} onChange={e => updateField("one_line_description", e.target.value)} maxLength={160} />
                  <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${(formData.one_line_description?.length || 0) > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                    {formData.one_line_description?.length || 0}/160
                  </span>
                </div>
              </div>

              {/* Author */}
              <AuthorSelect value={formData.author_id} onChange={v => updateField("author_id", v)} />
            </div>
          </SectionCard>

          {/* Section 2: Quick Import */}
          <SectionCard title="Quick Import" icon={<Clipboard className="h-5 w-5" />} sectionKey="import" collapsed={!showImport} onToggle={() => setShowImport(!showImport)} number={2} dashed>
            {showImport && (
              <div className="space-y-4">
                <Textarea className="font-mono text-sm bg-muted/50 min-h-[300px]" placeholder={"## AI Snapshot\n- Bullet 1\n- Bullet 2\n\n## Why This Matters\nParagraph text...\n\n## How to Do It\n1. **Step Title.** Step content...\n\n## Prompts to Try\n### Prompt Name\n```\nPrompt text\n```\nWhat to expect: Description..."} value={importText} onChange={e => setImportText(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={parseImportText} disabled={!importText.trim()}>Parse & Fill All Fields</Button>
                  <Button variant="outline" onClick={() => { setImportText(""); }}>Clear</Button>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Section 3: Featured Image */}
          <SectionCard title="Featured Image" icon={<Image className="h-5 w-5" />} sectionKey="image" collapsed={collapsedSections.image} onToggle={toggleSection} number={3}>
            <GuideEditorFeaturedImage
              imageUrl={formData.featured_image_url}
              imageAlt={formData.featured_image_alt}
              title={formData.title}
              pillar={formData.pillar}
              topicTags={formData.topic_tags}
              oneLineDescription={formData.one_line_description}
              steps={formData.steps}
              onUpdateField={updateField}
            />
          </SectionCard>

          {/* Section 4: AI Snapshot */}
          <SectionCard title="AI Snapshot" icon={<Sparkles className="h-5 w-5" />} sectionKey="snapshot" collapsed={collapsedSections.snapshot} onToggle={toggleSection} number={4} accentBorder="border-l-4 border-l-primary">
            <div className="space-y-3">
              {formData.snapshot_bullets.map((bullet, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  <Input value={bullet} onChange={e => { const b = [...formData.snapshot_bullets]; b[i] = e.target.value; updateField("snapshot_bullets", b); }} placeholder={`Bullet point ${i + 1}`} />
                  {formData.snapshot_bullets.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateField("snapshot_bullets", formData.snapshot_bullets.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>}
                </div>
              ))}
              {formData.snapshot_bullets.length < 5 && (
                <Button variant="ghost" size="sm" onClick={() => updateField("snapshot_bullets", [...formData.snapshot_bullets, ""])} className="gap-1"><Plus className="h-3 w-3" />Add bullet</Button>
              )}
            </div>
          </SectionCard>

          {/* Section 5: Why This Matters */}
          <SectionCard title="Why This Matters" icon={<Lightbulb className="h-5 w-5" />} sectionKey="why" collapsed={collapsedSections.why} onToggle={toggleSection} number={5}
            aiButton={aiLoading === "improve-why" ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            onAiClick={async () => { const result = await callScoutAssist("improve", formData.why_this_matters, { section: "why this matters for a guide" }); if (result) updateField("why_this_matters", result); }}>
            <p className="text-xs text-muted-foreground mb-3">2-3 paragraphs. Be specific about the pain point.</p>
            <Textarea className="min-h-[200px]" placeholder="Why does this matter? What problem does it solve?" value={formData.why_this_matters} onChange={e => updateField("why_this_matters", e.target.value)} />
          </SectionCard>

          {/* Section 6: How to Do It */}
          <SectionCard title="How to Do It" icon={<ListOrdered className="h-5 w-5" />} sectionKey="steps" collapsed={collapsedSections.steps} onToggle={toggleSection} number={6}>
            <div className="space-y-4">
              {formData.steps.map((step, i) => (
                <div key={i} className="flex gap-3 relative">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">{i + 1}</div>
                    {i < formData.steps.length - 1 && <div className="w-px flex-1 bg-border border-dashed mt-2" />}
                  </div>
                  <div className="flex-1 space-y-2 pb-4">
                    <Input placeholder="Step title (optional)" className="font-semibold" value={step.title} onChange={e => { const s = [...formData.steps]; s[i] = { ...s[i], title: e.target.value }; updateField("steps", s); }} />
                    <Textarea placeholder="What to do, why it matters, what to watch for..." className="min-h-[100px]" value={step.content} onChange={e => { const s = [...formData.steps]; s[i] = { ...s[i], content: e.target.value }; updateField("steps", s); }} />
                  </div>
                  {formData.steps.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 absolute top-0 right-0" onClick={() => { const s = formData.steps.filter((_, j) => j !== i).map((st, j) => ({ ...st, step_number: j + 1 })); updateField("steps", s); }}><X className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => updateField("steps", [...formData.steps, { step_number: formData.steps.length + 1, title: "", content: "" }])} className="gap-1"><Plus className="h-3 w-3" />Add Step</Button>
            </div>
          </SectionCard>

          {/* Section 7: What This Actually Looks Like */}
          <SectionCard title="What This Actually Looks Like" icon={<Sparkles className="h-5 w-5" />} sectionKey="example" collapsed={collapsedSections.example} onToggle={toggleSection} number={7} gradient>
            <p className="text-xs text-muted-foreground mb-4">This is what differentiates your guide. Show a real example.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">The Prompt</label>
                <Textarea className="font-mono text-sm bg-muted min-h-[120px]" placeholder="Paste the exact prompt you'd use..." value={formData.worked_example.prompt} onChange={e => updateField("worked_example", { ...formData.worked_example, prompt: e.target.value })} />
              </div>
              <div className="border-l-4 border-primary pl-4">
                <label className="text-sm font-medium mb-2 block">What AI Gives You</label>
                <p className="text-xs text-muted-foreground italic mb-2">Example output (results vary based on inputs)</p>
                <Textarea className="min-h-[150px]" placeholder="Write a realistic example of what the AI would return..." value={formData.worked_example.output} onChange={e => updateField("worked_example", { ...formData.worked_example, output: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">How to Edit This</label>
                <Textarea className="min-h-[100px]" placeholder="What would you keep? Change? Push back on?" value={formData.worked_example.editing_notes} onChange={e => updateField("worked_example", { ...formData.worked_example, editing_notes: e.target.value })} />
              </div>
            </div>
          </SectionCard>

          {/* Section 8: Prompts to Try */}
          <SectionCard title="Prompts to Try" icon={<Terminal className="h-5 w-5" />} sectionKey="prompts" collapsed={collapsedSections.prompts} onToggle={toggleSection} number={8}>
            <div className="space-y-4">
              {formData.guide_prompts.map((prompt, i) => (
                <div key={i} className="border border-border rounded-lg p-4 space-y-3 relative">
                  <Input placeholder="Prompt title (e.g. Angle Finder)" className="font-semibold" value={prompt.title} onChange={e => { const p = [...formData.guide_prompts]; p[i] = { ...p[i], title: e.target.value }; updateField("guide_prompts", p); }} />
                  <Textarea className="font-mono text-sm bg-muted min-h-[100px]" placeholder="Prompt text..." value={prompt.prompt_text} onChange={e => { const p = [...formData.guide_prompts]; p[i] = { ...p[i], prompt_text: e.target.value }; updateField("guide_prompts", p); }} />
                  <Input placeholder="What to expect: Brief description..." className="text-sm text-muted-foreground" value={prompt.what_to_expect} onChange={e => { const p = [...formData.guide_prompts]; p[i] = { ...p[i], what_to_expect: e.target.value }; updateField("guide_prompts", p); }} />
                  {formData.guide_prompts.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 absolute top-2 right-2" onClick={() => updateField("guide_prompts", formData.guide_prompts.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>}
                </div>
              ))}
              {formData.guide_prompts.length < 5 && (
                <Button variant="ghost" size="sm" onClick={() => updateField("guide_prompts", [...formData.guide_prompts, { title: "", prompt_text: "", what_to_expect: "" }])} className="gap-1"><Plus className="h-3 w-3" />Add Prompt</Button>
              )}
            </div>
          </SectionCard>

          {/* Section 9: Common Mistakes */}
          <SectionCard title="Common Mistakes" icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} sectionKey="mistakes" collapsed={collapsedSections.mistakes} onToggle={toggleSection} number={9} accentBorder="border-l-4 border-l-amber-500">
            <div className="space-y-3">
              {formData.common_mistakes.map((mistake, i) => (
                <div key={i} className="border-l-2 border-amber-500/30 pl-3 space-y-2 relative">
                  <Input placeholder="Mistake title" className="font-semibold" value={mistake.title} onChange={e => { const m = [...formData.common_mistakes]; m[i] = { ...m[i], title: e.target.value }; updateField("common_mistakes", m); }} />
                  <Textarea placeholder="What goes wrong and why..." className="min-h-[60px]" value={mistake.description} onChange={e => { const m = [...formData.common_mistakes]; m[i] = { ...m[i], description: e.target.value }; updateField("common_mistakes", m); }} />
                  {formData.common_mistakes.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6 absolute top-0 right-0" onClick={() => updateField("common_mistakes", formData.common_mistakes.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>}
                </div>
              ))}
              {formData.common_mistakes.length < 6 && (
                <Button variant="ghost" size="sm" onClick={() => updateField("common_mistakes", [...formData.common_mistakes, { title: "", description: "" }])} className="gap-1"><Plus className="h-3 w-3" />Add Mistake</Button>
              )}
            </div>
          </SectionCard>

          {/* Section 10: Tools */}
          <SectionCard title="Tools That Work for This" icon={<Wrench className="h-5 w-5" />} sectionKey="tools" collapsed={collapsedSections.tools} onToggle={toggleSection} number={10}>
            <div className="space-y-3">
              {formData.recommended_tools.map((tool, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2 relative">
                  <Input placeholder="Tool name" className="font-semibold" value={tool.name} onChange={e => { const t = [...formData.recommended_tools]; t[i] = { ...t[i], name: e.target.value }; updateField("recommended_tools", t); }} />
                  <Input placeholder="Good for..." value={tool.description} onChange={e => { const t = [...formData.recommended_tools]; t[i] = { ...t[i], description: e.target.value }; updateField("recommended_tools", t); }} />
                  <Input placeholder="Honest limitation..." className="text-sm italic text-muted-foreground" value={tool.limitation} onChange={e => { const t = [...formData.recommended_tools]; t[i] = { ...t[i], limitation: e.target.value }; updateField("recommended_tools", t); }} />
                  {formData.recommended_tools.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6 absolute top-2 right-2" onClick={() => updateField("recommended_tools", formData.recommended_tools.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>}
                </div>
              ))}
              {formData.recommended_tools.length < 6 && (
                <Button variant="ghost" size="sm" onClick={() => updateField("recommended_tools", [...formData.recommended_tools, { name: "", description: "", limitation: "" }])} className="gap-1"><Plus className="h-3 w-3" />Add Tool</Button>
              )}
            </div>
          </SectionCard>

          {/* Section 11: FAQ */}
          <SectionCard title="FAQ" icon={<HelpCircle className="h-5 w-5" />} sectionKey="faq" collapsed={collapsedSections.faq} onToggle={toggleSection} number={11}
            onAiClick={async () => {
              const result = await callScoutAssist("expand", `Suggest 3 FAQ questions for this guide: ${formData.title}. Steps: ${formData.steps.map(s => s.title).join(", ")}`, { section: "faq" });
              if (result) toast({ title: "AI Suggestion", description: result });
            }}>
            <p className="text-xs text-muted-foreground mb-3">Genuine questions for FAQ schema markup (free SEO rich snippets).</p>
            <div className="space-y-3">
              {formData.faq_items.map((faq, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2 relative">
                  <Input placeholder="Question" className="font-semibold" value={faq.question} onChange={e => { const f = [...formData.faq_items]; f[i] = { ...f[i], question: e.target.value }; updateField("faq_items", f); }} />
                  <Textarea placeholder="Answer" className="min-h-[60px]" value={faq.answer} onChange={e => { const f = [...formData.faq_items]; f[i] = { ...f[i], answer: e.target.value }; updateField("faq_items", f); }} />
                  {formData.faq_items.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6 absolute top-2 right-2" onClick={() => updateField("faq_items", formData.faq_items.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>}
                </div>
              ))}
              {formData.faq_items.length < 6 && (
                <Button variant="ghost" size="sm" onClick={() => updateField("faq_items", [...formData.faq_items, { question: "", answer: "" }])} className="gap-1"><Plus className="h-3 w-3" />Add Question</Button>
              )}
            </div>
          </SectionCard>

          {/* Section 12: Next Steps */}
          <SectionCard title="Next Steps" icon={<ArrowRight className="h-5 w-5" />} sectionKey="nextsteps" collapsed={collapsedSections.nextsteps} onToggle={toggleSection} number={12}>
            <p className="text-xs text-muted-foreground mb-3">Wrap up in 2-3 sentences. Link to related guides.</p>
            <Textarea className="min-h-[100px]" placeholder="What should the reader do next?" value={formData.next_steps} onChange={e => updateField("next_steps", e.target.value)} />
          </SectionCard>

          <div className="h-20" /> {/* Bottom padding */}
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="hidden xl:block w-[40%] border-l border-border overflow-y-auto bg-background">
            <GuidePreviewPanel formData={debouncedFormData} />
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Helper Components ----

function SectionCard({ title, icon, sectionKey, collapsed, onToggle, number, children, accentBorder, dashed, gradient, aiButton, onAiClick }: {
  title: string; icon: React.ReactNode; sectionKey: string; collapsed?: boolean; onToggle: (key: string) => void;
  number: number; children: React.ReactNode; accentBorder?: string; dashed?: boolean; gradient?: boolean;
  aiButton?: React.ReactNode; onAiClick?: () => void;
}) {
  return (
    <Card className={`${accentBorder || ""} ${dashed ? "border-dashed" : ""} ${gradient ? "bg-gradient-to-br from-primary/5 to-transparent" : ""}`}>
      <Collapsible open={!collapsed} onOpenChange={() => onToggle(sectionKey)}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground w-6">{number}</span>
              {icon}
              <CardTitle className="text-lg">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {onAiClick && (
                <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onAiClick(); }} className="gap-1 text-primary text-xs">
                  {aiButton || <Sparkles className="h-3 w-3" />}
                  AI Assist
                </Button>
              )}
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function AuthorSelect({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { data: authors } = useQuery({
    queryKey: ["authors-list"],
    queryFn: async () => {
      const { data } = await supabase.from("authors").select("id, name").order("name");
      return data || [];
    },
  });

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">Author</label>
      <Select value={value || "none"} onValueChange={v => onChange(v === "none" ? null : v)}>
        <SelectTrigger><SelectValue placeholder="Select author" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No author</SelectItem>
          {authors?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export default GuideEditor;
