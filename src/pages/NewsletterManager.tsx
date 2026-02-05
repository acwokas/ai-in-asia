import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ToolsPromptsManager } from "@/components/newsletter/ToolsPromptsManager";
import { MysteryLinksManager } from "@/components/newsletter/MysteryLinksManager";
import { SponsorsManager } from "@/components/newsletter/SponsorsManager";
import { AutomationStatus } from "@/components/newsletter/AutomationStatus";
import { Calendar, Send, Eye, Loader2, Home, Sparkles, Pencil, Check, X, FileText } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function NewsletterManager() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
 const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isGeneratingEditorNote, setIsGeneratingEditorNote] = useState(false);
  const [isGeneratingSubjectLines, setIsGeneratingSubjectLines] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEditingEditorNote, setIsEditingEditorNote] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [editData, setEditData] = useState({
    editorNote: "",
    worthWatching: null as WorthWatching | null,
  });

interface WorthWatchingSection {
  title: string;
  content: string;
}

interface WorthWatching {
  trends: WorthWatchingSection | null;
  events: WorthWatchingSection | null;
  spotlight: WorthWatchingSection | null;
  policy: WorthWatchingSection | null;
}

  const { data: latestEdition, refetch } = useQuery({
    queryKey: ["newsletter-latest-edition"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_editions")
        .select("*")
        .order("edition_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Load existing content when edition loads
  useEffect(() => {
    if (latestEdition) {
      const worthWatching = (latestEdition as any).worth_watching;
      setEditData({
        editorNote: latestEdition.editor_note || "",
        worthWatching: worthWatching && typeof worthWatching === 'object' ? worthWatching : null,
      });
    }
  }, [latestEdition]);

  const updateEditionMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!latestEdition) return;
      
      const { error } = await supabase
        .from("newsletter_editions")
        .update(updates)
        .eq("id", latestEdition.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newsletter-latest-edition"] });
      toast.success("Edition updated successfully");
    },
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-weekly-newsletter", {
        body: { edition_date: new Date().toISOString().split("T")[0] },
      });

      if (error) throw error;

      toast.success("Newsletter generated successfully!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate newsletter");
    } finally {
      setIsGenerating(false);
    }
  };

 const handleGenerateFullNewsletter = async () => {
   setIsGeneratingFull(true);
    let editionId: string | null = null;
    const editionDate = new Date().toISOString().split("T")[0];
    
   try {
     // Step 1: Generate the newsletter edition
      toast.info("Step 1/2: Ensuring newsletter edition...");

      // Avoid calling the backend function if today's edition already exists.
      // This prevents a 400 response from being treated as an app error.
      const { data: existingEdition } = await supabase
        .from("newsletter_editions")
        .select("id")
        .eq("edition_date", editionDate)
        .maybeSingle();

      if (existingEdition?.id) {
        editionId = existingEdition.id;
        toast.info("Edition already exists, regenerating content...");
      } else {
        const { data: editionData, error: editionError } = await supabase.functions.invoke(
          "generate-weekly-newsletter",
          { body: { edition_date: editionDate } }
        );

        // Happy path: newly created edition
        if (editionData?.edition_id) {
          editionId = editionData.edition_id;
        }

        // If creation failed but error message contains JSON with edition_id, recover and continue
        if (!editionId && editionError?.message) {
          const jsonStart = editionError.message.indexOf("{");
          if (jsonStart >= 0) {
            try {
              const parsed = JSON.parse(editionError.message.slice(jsonStart));
              if (parsed?.edition_id) {
                editionId = parsed.edition_id;
                toast.info("Edition already exists, regenerating content...");
              }
            } catch {
              // ignore parse failures
            }
          }
        }

        // Some runtimes may still include the body in `data` even when `error` is present
        if (!editionId && (editionData as any)?.edition_id) {
          editionId = (editionData as any).edition_id;
        }

        // If we still don't have an editionId, the error is real
        if (!editionId && editionError) throw editionError;
      }

      if (!editionId) {
        // Fallback: fetch by date (avoids picking the wrong edition)
        const { data: byDate } = await supabase
          .from("newsletter_editions")
          .select("id")
          .eq("edition_date", editionDate)
          .maybeSingle();

        if (byDate?.id) {
          editionId = byDate.id;
          toast.info("Using existing edition...");
        }
      }

      if (!editionId) {
        // Last resort: use the latest edition from the database
        const { data: latestEd } = await supabase
          .from("newsletter_editions")
          .select("id")
          .order("edition_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestEd?.id) {
          editionId = latestEd.id;
          toast.info("Using existing edition...");
        }
      }

      if (!editionId) throw new Error("Failed to get edition ID");

     // Step 2: Generate all AI content
     toast.info("Step 2/2: Generating AI content...");
     const { data: contentData, error: contentError } = await supabase.functions.invoke("generate-newsletter-content", {
       body: { edition_id: editionId },
     });

     if (contentError) throw contentError;

     toast.success("Full newsletter generated successfully!");
     setEditData({
       editorNote: contentData.editor_note || "",
       worthWatching: contentData.worth_watching || null,
     });
     refetch();
   } catch (error: any) {
      console.error("Newsletter generation error:", error);
      toast.error(error.message || "Failed to generate newsletter");
   } finally {
     setIsGeneratingFull(false);
   }
 };

  const handleSendTest = async () => {
    if (!latestEdition) return;

    try {
      await supabase.functions.invoke("send-weekly-newsletter", {
        body: {
          edition_id: latestEdition.id,
          test_email: "contact@aiinasia.com",
        },
      });

      toast.success("Test email sent to contact@aiinasia.com");
    } catch (error: any) {
      toast.error(error.message || "Failed to send test");
    }
  };

  const handleSend = async () => {
    if (!latestEdition) return;
    
    if (!confirm("Are you sure you want to send this newsletter to all subscribers?")) {
      return;
    }

    setIsSending(true);
    try {
      await supabase.functions.invoke("send-weekly-newsletter", {
        body: { edition_id: latestEdition.id },
      });

      toast.success("Newsletter sending started!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to send newsletter");
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveContent = () => {
    updateEditionMutation.mutate({
      editor_note: editData.editorNote || null,
      worth_watching: editData.worthWatching || null,
    });
  };

  const handleGenerateEditorNote = async () => {
    if (!latestEdition) return;
    
    setIsGeneratingEditorNote(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-newsletter-content", {
        body: { edition_id: latestEdition.id, sections: ["editor_note"] },
      });

      if (error) throw error;

      toast.success("Editor's Note generated!");
      setEditData(prev => ({
        ...prev,
        editorNote: data.editor_note || "",
      }));
      setIsEditingEditorNote(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate Editor's Note");
    } finally {
      setIsGeneratingEditorNote(false);
    }
  };

  const handleGenerateAIContent = async () => {
    if (!latestEdition) return;
    
    setIsGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-newsletter-content", {
        body: { edition_id: latestEdition.id },
      });

      if (error) throw error;

      toast.success("AI content generated successfully!");
      setEditData({
        editorNote: data.editor_note || "",
        worthWatching: data.worth_watching || null,
      });
      setIsEditingEditorNote(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate AI content");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleGenerateSubjectLines = async () => {
    if (!latestEdition) return;
    
    setIsGeneratingSubjectLines(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-newsletter-content", {
        body: { edition_id: latestEdition.id, sections: ["subject_lines"] },
      });

      if (error) throw error;

      toast.success("Subject lines generated!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate subject lines");
    } finally {
      setIsGeneratingSubjectLines(false);
    }
  };

  const handleViewPreview = async () => {
    if (!latestEdition) return;
    
    setIsLoadingPreview(true);
    setIsPreviewOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("preview-newsletter", {
        body: { edition_id: latestEdition.id },
      });

      if (error) throw error;

      setPreviewHtml(data.html);
    } catch (error: any) {
      toast.error(error.message || "Failed to load preview");
      setIsPreviewOpen(false);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const editorNoteWordCount = editData.editorNote.trim().split(/\s+/).filter(Boolean).length;

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 min-h-screen">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
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
              <BreadcrumbPage>Newsletter Manager</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Newsletter Manager</h1>
          <p className="text-muted-foreground">AI in ASIA Weekly Brief</p>
          <p className="text-sm text-muted-foreground mt-1 italic">What matters in artificial intelligence across Asia.</p>
        </div>

        {/* Current Edition Overview */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Current Edition</h2>
              {latestEdition ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(latestEdition.edition_date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <Badge variant={latestEdition.status === 'sent' ? 'default' : 'secondary'}>
                    {latestEdition.status}
                  </Badge>
                </div>
              ) : (
                <p className="text-muted-foreground">No edition found</p>
              )}
            </div>
            <div className="flex gap-2">
             <Button 
               onClick={handleGenerateFullNewsletter} 
               disabled={isGeneratingFull}
               className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
             >
               {isGeneratingFull ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Generating...
                 </>
               ) : (
                 <>
                   <Sparkles className="h-4 w-4 mr-2" />
                   Generate Full Newsletter
                 </>
               )}
             </Button>
             {!latestEdition && (
               <Button onClick={handleGenerate} disabled={isGenerating} variant="outline">
                 {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Newsletter"
                  )}
                </Button>
              )}
            </div>
          </div>

          {latestEdition && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">A/B Subject Lines</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateSubjectLines}
                    disabled={isGeneratingSubjectLines}
                    className="bg-purple-500/10 border-purple-500/50 text-purple-700 hover:bg-purple-500/20"
                  >
                    {isGeneratingSubjectLines ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1" />
                        Generate New
                      </>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <Label className="text-xs text-muted-foreground">Variant A</Label>
                    <p className="text-sm mt-1 font-medium">{latestEdition.subject_line}</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <Label className="text-xs text-muted-foreground">Variant B</Label>
                    <p className="text-sm mt-1 font-medium">{latestEdition.subject_line_variant_b}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button onClick={handleViewPreview} variant="outline" disabled={isLoadingPreview}>
                  {isLoadingPreview ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  View Newsletter
                </Button>
                <Button onClick={handleSendTest} variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Send Test Email
                </Button>
                <Button 
                  onClick={handleSend} 
                  disabled={isSending || latestEdition.status === "sent"}
                  variant={latestEdition.status === "sent" ? "secondary" : "default"}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {latestEdition.status === "sent" ? "Already Sent" : "Send to All Subscribers"}
                    </>
                  )}
                </Button>
              </div>

              {latestEdition.total_sent > 0 && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Send Statistics</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Sent:</span>{" "}
                      <span className="font-semibold">{latestEdition.total_sent}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Opened:</span>{" "}
                      <span className="font-semibold">{latestEdition.total_opened}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Clicked:</span>{" "}
                      <span className="font-semibold">{latestEdition.total_clicked}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Management Tabs */}
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="content">Editorial Content</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="tools">Tools & Prompts</TabsTrigger>
            <TabsTrigger value="mystery">Mystery Links</TabsTrigger>
            <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-2">Editorial Content</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Write the editorial sections for this week's newsletter. Keep it under 400 words total.
              </p>
              
              <div className="space-y-6">
                {/* Editor's Note Section */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-semibold">Editor's Note</Label>
                      <span className={`text-xs ${editorNoteWordCount > 80 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        ({editorNoteWordCount}/80 words)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateEditorNote}
                        disabled={isGeneratingEditorNote || !latestEdition}
                        className="bg-purple-500/10 border-purple-500/50 text-purple-700 hover:bg-purple-500/20"
                      >
                        {isGeneratingEditorNote ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            Generate
                          </>
                        )}
                      </Button>
                      {!isEditingEditorNote && editData.editorNote && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsEditingEditorNote(true)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditingEditorNote || !editData.editorNote ? (
                    <div className="space-y-2">
                      <Textarea
                        id="editor-note"
                        rows={4}
                        placeholder="One short paragraph setting context for the week. This can reference themes such as regulation, platforms, adoption, or regional signals. Keep this under 80 words."
                        value={editData.editorNote}
                        onChange={(e) => setEditData({ ...editData, editorNote: e.target.value })}
                        className="font-serif"
                      />
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          Reference themes like regulation, platforms, adoption, or regional signals.
                        </p>
                        {isEditingEditorNote && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditData(prev => ({
                                  ...prev,
                                  editorNote: latestEdition?.editor_note || "",
                                }));
                                setIsEditingEditorNote(false);
                              }}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                handleSaveContent();
                                setIsEditingEditorNote(false);
                              }}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/50 rounded-md font-serif text-sm leading-relaxed">
                      {editData.editorNote}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Worth Watching Sections</Label>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Four AI-generated sections covering trends, events, company spotlight, and policy updates.
                  </p>
                  
                  {editData.worthWatching ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Emerging Trends */}
                      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                          📈 {editData.worthWatching.trends?.title || 'Emerging Trends'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {editData.worthWatching.trends?.content || 'No trends generated yet.'}
                        </p>
                      </div>

                      {/* Upcoming Events */}
                      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                          📅 {editData.worthWatching.events?.title || 'Upcoming Events'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {editData.worthWatching.events?.content || 'No events generated yet.'}
                        </p>
                      </div>

                      {/* Company Spotlight */}
                      <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                        <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                          🏢 {editData.worthWatching.spotlight?.title || 'Company Spotlight'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {editData.worthWatching.spotlight?.content || 'No spotlight generated yet.'}
                        </p>
                      </div>

                      {/* Policy Watch */}
                      <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                        <h4 className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
                          ⚖️ {editData.worthWatching.policy?.title || 'Policy Watch'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {editData.worthWatching.policy?.content || 'No policy updates generated yet.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-muted/50 rounded-lg text-center">
                      <p className="text-muted-foreground">
                        Click "Generate with AI" to create all four Worth Watching sections.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t flex gap-3">
                  <Button 
                    onClick={handleGenerateAIContent} 
                    variant="outline"
                    disabled={isGeneratingContent || !latestEdition}
                    className="bg-purple-500/10 border-purple-500 text-purple-700 hover:bg-purple-500/20"
                  >
                    {isGeneratingContent ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                  <Button onClick={handleSaveContent} disabled={updateEditionMutation.isPending}>
                    {updateEditionMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Editorial Content"
                    )}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Newsletter Structure Preview */}
            <Card className="p-6 bg-muted/50">
              <h4 className="font-semibold mb-4">Newsletter Structure</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li><strong>Editor's Note</strong> - Your weekly context (above)</li>
                <li><strong>This Week's Signals</strong> - Top 3-4 articles with one-sentence explanations (auto-selected)</li>
                <li><strong>Worth Watching</strong> - Forward-looking signal (above)</li>
                <li><strong>From the AI Policy Atlas</strong> - Link to relevant policy page (auto-selected)</li>
                <li><strong>Before You Go</strong> - Standard closing copy (fixed)</li>
              </ol>
            </Card>
          </TabsContent>

          <TabsContent value="automation">
            <Card className="p-6">
              <AutomationStatus />
            </Card>
          </TabsContent>

          <TabsContent value="tools">
            <Card className="p-6">
              <ToolsPromptsManager />
            </Card>
          </TabsContent>

          <TabsContent value="mystery">
            <Card className="p-6">
              <MysteryLinksManager />
            </Card>
          </TabsContent>

          <TabsContent value="sponsors">
            <Card className="p-6">
              <SponsorsManager />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />

      {/* Newsletter Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Newsletter Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <iframe
                srcDoc={previewHtml}
                title="Newsletter Preview"
                className="w-full h-[70vh] border-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
