import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { EditableNewsletterSection } from "@/components/newsletter/EditableNewsletterSection";
import { Calendar, Send, Eye, Loader2, Sparkles, FileText, ExternalLink, Mail, FlaskConical, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export default function ComposeTab() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isGeneratingEditorNote, setIsGeneratingEditorNote] = useState(false);
  const [isGeneratingSubjectLines, setIsGeneratingSubjectLines] = useState(false);
  const [isGeneratingSection, setIsGeneratingSection] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSendingABTest, setIsSendingABTest] = useState(false);
  const [isSendingWinner, setIsSendingWinner] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [editData, setEditData] = useState({
    editorNote: "",
    worthWatching: null as WorthWatching | null,
    weeklyPromise: "",
    adriansTake: "",
    continuityLine: "",
    collectiveOneLiner: "",
    roadmapBody: "",
    roadmapWorthItIf: "",
    roadmapSkipIf: "",
  });

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

  useEffect(() => {
    if (latestEdition) {
      const worthWatching = (latestEdition as any).worth_watching;
      const ed = latestEdition as any;
      setEditData({
        editorNote: latestEdition.editor_note || "",
        worthWatching: worthWatching && typeof worthWatching === 'object' ? worthWatching : null,
        weeklyPromise: ed.weekly_promise || "",
        adriansTake: ed.adrians_take || "",
        continuityLine: ed.continuity_line || "",
        collectiveOneLiner: ed.collective_one_liner || "",
        roadmapBody: ed.roadmap_body || "",
        roadmapWorthItIf: ed.roadmap_worth_it_if || "",
        roadmapSkipIf: ed.roadmap_skip_if || "",
      });
    }
  }, [latestEdition]);

  const updateEditionMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!latestEdition) return;
      const { error } = await supabase.from("newsletter_editions").update(updates).eq("id", latestEdition.id);
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
      const { error } = await supabase.functions.invoke("generate-weekly-newsletter", {
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
      toast.info("Step 1/2: Ensuring newsletter edition...");
      const { data: existingEdition } = await supabase
        .from("newsletter_editions").select("id").eq("edition_date", editionDate).maybeSingle();

      if (existingEdition?.id) {
        editionId = existingEdition.id;
        toast.info("Edition already exists, regenerating content...");
      } else {
        const { data: editionData, error: editionError } = await supabase.functions.invoke(
          "generate-weekly-newsletter", { body: { edition_date: editionDate } }
        );
        if (editionData?.edition_id) editionId = editionData.edition_id;
        if (!editionId && editionError?.message) {
          const jsonStart = editionError.message.indexOf("{");
          if (jsonStart >= 0) {
            try {
              const parsed = JSON.parse(editionError.message.slice(jsonStart));
              if (parsed?.edition_id) { editionId = parsed.edition_id; toast.info("Edition already exists, regenerating content..."); }
            } catch {}
          }
        }
        if (!editionId && (editionData as any)?.edition_id) editionId = (editionData as any).edition_id;
        if (!editionId && editionError) throw editionError;
      }

      if (!editionId) {
        const { data: byDate } = await supabase.from("newsletter_editions").select("id").eq("edition_date", editionDate).maybeSingle();
        if (byDate?.id) { editionId = byDate.id; toast.info("Using existing edition..."); }
      }
      if (!editionId) {
        const { data: latestEd } = await supabase.from("newsletter_editions").select("id").order("edition_date", { ascending: false }).limit(1).maybeSingle();
        if (latestEd?.id) { editionId = latestEd.id; toast.info("Using existing edition..."); }
      }
      if (!editionId) throw new Error("Failed to get edition ID");

      toast.info("Step 2/2: Generating AI content...");
      const { data: contentData, error: contentError } = await supabase.functions.invoke("generate-newsletter-content", {
        body: { edition_id: editionId },
      });
      if (contentError) throw contentError;

      toast.success("Full newsletter generated successfully!");
      setEditData(prev => ({
        ...prev,
        editorNote: contentData.editor_note || prev.editorNote,
        worthWatching: contentData.worth_watching || prev.worthWatching,
        weeklyPromise: contentData.weekly_promise || prev.weeklyPromise,
        adriansTake: contentData.adrians_take || prev.adriansTake,
        continuityLine: contentData.continuity_line || prev.continuityLine,
        collectiveOneLiner: contentData.collective_one_liner || prev.collectiveOneLiner,
      }));
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
        body: { edition_id: latestEdition.id, test_email: "me@adrianwatkins.com" },
      });
      toast.success("Test email sent to me@adrianwatkins.com");
    } catch (error: any) {
      toast.error(error.message || "Failed to send test");
    }
  };

  const handleSendABTest = async () => {
    if (!latestEdition) return;
    if (!confirm("Send A/B test to 10% + 10% of subscribers?")) return;
    setIsSendingABTest(true);
    try {
      const { data } = await supabase.functions.invoke("send-weekly-newsletter", {
        body: { edition_id: latestEdition.id, mode: 'ab_test' },
      });
      toast.success(`A/B test sent! Variant A: ${data.variant_a_sent}, Variant B: ${data.variant_b_sent}`);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to send A/B test");
    } finally {
      setIsSendingABTest(false);
    }
  };

  const handleSendWinner = async () => {
    if (!latestEdition) return;
    if (!confirm("Send the winning variant to all remaining subscribers?")) return;
    setIsSendingWinner(true);
    try {
      const { data } = await supabase.functions.invoke("send-weekly-newsletter", {
        body: { edition_id: latestEdition.id, mode: 'send_winner' },
      });
      toast.success(`Winner: Variant ${data.winning_variant}! Sent to ${data.sent_to_remaining} subscribers.`);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to send winner");
    } finally {
      setIsSendingWinner(false);
    }
  };

  const handleSend = async () => {
    if (!latestEdition) return;
    if (!confirm("Send newsletter to all subscribers at once?")) return;
    setIsSending(true);
    try {
      await supabase.functions.invoke("send-weekly-newsletter", {
        body: { edition_id: latestEdition.id, mode: 'full' },
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
      weekly_promise: editData.weeklyPromise || null,
      adrians_take: editData.adriansTake || null,
      continuity_line: editData.continuityLine || null,
      collective_one_liner: editData.collectiveOneLiner || null,
      roadmap_body: editData.roadmapBody || null,
      roadmap_worth_it_if: editData.roadmapWorthItIf || null,
      roadmap_skip_if: editData.roadmapSkipIf || null,
    });
  };

  const handleGenerateSection = async (section: string) => {
    if (!latestEdition) return;
    setIsGeneratingSection(section);
    try {
      const { data, error } = await supabase.functions.invoke("generate-newsletter-content", {
        body: { edition_id: latestEdition.id, sections: [section] },
      });
      if (error) throw error;
      toast.success(`${section.replace(/_/g, ' ')} generated!`);
      setEditData(prev => ({
        ...prev,
        ...(data.weekly_promise && { weeklyPromise: data.weekly_promise }),
        ...(data.adrians_take && { adriansTake: data.adrians_take }),
        ...(data.continuity_line && { continuityLine: data.continuity_line }),
        ...(data.collective_one_liner && { collectiveOneLiner: data.collective_one_liner }),
        ...(data.editor_note && { editorNote: data.editor_note }),
      }));
      refetch();
    } catch (error: any) {
      toast.error(error.message || `Failed to generate ${section}`);
    } finally {
      setIsGeneratingSection(null);
    }
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
      setEditData(prev => ({ ...prev, editorNote: data.editor_note || "" }));
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
      setEditData(prev => ({
        ...prev,
        editorNote: data.editor_note || prev.editorNote,
        worthWatching: data.worth_watching || prev.worthWatching,
        weeklyPromise: data.weekly_promise || prev.weeklyPromise,
        adriansTake: data.adrians_take || prev.adriansTake,
        continuityLine: data.continuity_line || prev.continuityLine,
        collectiveOneLiner: data.collective_one_liner || prev.collectiveOneLiner,
      }));
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
      const { error } = await supabase.functions.invoke("generate-newsletter-content", {
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

  return (
    <>
      {/* Current Edition Overview */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Current Edition</h2>
            {latestEdition ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Calendar className="h-4 w-4" />
                  {new Date(latestEdition.edition_date).toLocaleDateString('en-GB', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </div>
                <Badge variant={latestEdition.status === 'sent' ? 'default' : 'secondary'}>
                  {latestEdition.status}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No edition found</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerateFullNewsletter} disabled={isGeneratingFull} size="sm">
              {isGeneratingFull ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {isGeneratingFull ? "Generating..." : "Generate Full Newsletter"}
            </Button>
            {!latestEdition && (
              <Button onClick={handleGenerate} disabled={isGenerating} variant="outline" size="sm">
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isGenerating ? "Generating..." : "Generate Newsletter"}
              </Button>
            )}
          </div>
        </div>

        {latestEdition && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">A/B Subject Lines</Label>
                <Button size="sm" variant="outline" onClick={handleGenerateSubjectLines} disabled={isGeneratingSubjectLines}>
                  {isGeneratingSubjectLines ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3 mr-1" />Generate New</>}
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

            <div className="flex flex-wrap gap-2 mt-6">
              <Button onClick={handleViewPreview} variant="outline" size="sm" disabled={isLoadingPreview}>
                {isLoadingPreview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Preview Email
              </Button>
              <Button onClick={() => window.open(`/newsletter/email-preview/${latestEdition.id}`, '_blank')} variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />Email Full Screen
              </Button>
              <Button onClick={() => window.open(`/newsletter/archive/${latestEdition.edition_date}?preview=true`, '_blank')} variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />Web Archive View
              </Button>
              <Button onClick={handleSendTest} variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />Send Test Email
              </Button>
            </div>

            {/* A/B Test Controls */}
            <div className="mt-6 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <FlaskConical className="h-4 w-4" />A/B Test Send
              </h3>

              {latestEdition.ab_test_phase === 'pending' && latestEdition.status !== 'sent' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Send to 10% each (A + B) to test which subject line performs better.</p>
                  <div className="flex gap-2">
                    <Button onClick={handleSendABTest} disabled={isSendingABTest} variant="outline" size="sm">
                      {isSendingABTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
                      {isSendingABTest ? "Sending..." : "Start A/B Test (20%)"}
                    </Button>
                    <Button onClick={handleSend} disabled={isSending} variant="secondary" size="sm">
                      {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      {isSending ? "Sending..." : "Skip A/B (Send All)"}
                    </Button>
                  </div>
                </div>
              )}

              {latestEdition.ab_test_phase === 'testing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {(['A', 'B'] as const).map(variant => {
                      const sent = variant === 'A' ? latestEdition.variant_a_sent : latestEdition.variant_b_sent;
                      const opened = variant === 'A' ? latestEdition.variant_a_opened : latestEdition.variant_b_opened;
                      const subject = variant === 'A' ? latestEdition.subject_line : latestEdition.subject_line_variant_b;
                      const rate = (sent || 0) > 0 ? (((opened || 0) / (sent || 1)) * 100).toFixed(1) : '0';
                      return (
                        <div key={variant} className="p-3 border rounded-lg bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Variant {variant}</span>
                            <Badge variant="outline">{opened || 0} / {sent || 0} opens</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{subject}</p>
                          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${rate}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{rate}% open rate</p>
                        </div>
                      );
                    })}
                  </div>
                  <Button onClick={handleSendWinner} disabled={isSendingWinner} size="sm">
                    {isSendingWinner ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trophy className="h-4 w-4 mr-2" />}
                    {isSendingWinner ? "Sending Winner..." : "Send Winner to Remaining"}
                  </Button>
                </div>
              )}

              {(latestEdition.ab_test_phase === 'completed' || latestEdition.status === 'sent') && (
                <div className="space-y-3">
                  {latestEdition.winning_variant && (
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Winner: Variant {latestEdition.winning_variant}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Total Sent:</span> <span className="font-semibold">{latestEdition.total_sent}</span></div>
                    <div><span className="text-muted-foreground">Opened:</span> <span className="font-semibold">{latestEdition.total_opened}</span></div>
                    <div><span className="text-muted-foreground">Clicked:</span> <span className="font-semibold">{latestEdition.total_clicked}</span></div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Management Tabs */}
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="content">Editorial</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="mystery">Mystery Links</TabsTrigger>
          <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Editorial Content</h3>
            <p className="text-sm text-muted-foreground mb-6">Write the editorial sections. Keep under 400 words total.</p>
            <div className="space-y-6">
              <EditableNewsletterSection label="Weekly Promise" description="One sentence framing the week. Max 25 words." value={editData.weeklyPromise} onChange={(val) => setEditData(prev => ({ ...prev, weeklyPromise: val }))} onGenerate={() => handleGenerateSection("weekly_promise")} onSave={handleSaveContent} isGenerating={isGeneratingSection === "weekly_promise"} isSaving={updateEditionMutation.isPending} maxWords={25} placeholder="e.g. This week, AI governance moved from abstract debate to operational reality." rows={2} disabled={!latestEdition} />
              <EditableNewsletterSection label="Editor's Note" description="One paragraph setting context. Under 80 words." value={editData.editorNote} onChange={(val) => setEditData(prev => ({ ...prev, editorNote: val }))} onGenerate={handleGenerateEditorNote} onSave={handleSaveContent} isGenerating={isGeneratingEditorNote} isSaving={updateEditionMutation.isPending} maxWords={80} placeholder="Reference themes like regulation, platforms, adoption, or regional signals." rows={4} disabled={!latestEdition} />
              <EditableNewsletterSection label="Adrian's Take" description="2-3 sentence POV. Personal voice." value={editData.adriansTake} onChange={(val) => setEditData(prev => ({ ...prev, adriansTake: val }))} onGenerate={() => handleGenerateSection("adrians_take")} onSave={handleSaveContent} isGenerating={isGeneratingSection === "adrians_take"} isSaving={updateEditionMutation.isPending} maxWords={60} placeholder="Share a personal observation or opinion." rows={3} disabled={!latestEdition} />
              <EditableNewsletterSection label="Continuity Line" description="Links to last week's theme. One sentence." value={editData.continuityLine} onChange={(val) => setEditData(prev => ({ ...prev, continuityLine: val }))} onGenerate={() => handleGenerateSection("continuity")} onSave={handleSaveContent} isGenerating={isGeneratingSection === "continuity"} isSaving={updateEditionMutation.isPending} placeholder="e.g. This builds on last week's signal about enterprise AI." rows={2} disabled={!latestEdition} />
              <EditableNewsletterSection label="WithThePowerOf.AI Explainer" description="One-line. Max 14 words." value={editData.collectiveOneLiner} onChange={(val) => setEditData(prev => ({ ...prev, collectiveOneLiner: val }))} onGenerate={() => handleGenerateSection("collective_one_liner")} onSave={handleSaveContent} isGenerating={isGeneratingSection === "collective_one_liner"} isSaving={updateEditionMutation.isPending} maxWords={14} placeholder="e.g. Independent tools and resources we build alongside our editorial work." rows={2} disabled={!latestEdition} />

              {/* Roadmap Section */}
              <div className="p-4 border rounded-lg border-amber-500/30 bg-amber-500/5">
                <Label className="text-base font-semibold text-amber-700 mb-3 block">📅 Roadmap</Label>
                <p className="text-xs text-muted-foreground mb-4">Featured upcoming event with guidance.</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Event Description</Label>
                    <Textarea rows={2} placeholder="Brief description..." value={editData.roadmapBody} onChange={(e) => setEditData(prev => ({ ...prev, roadmapBody: e.target.value }))} className="mt-1" disabled={!latestEdition} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-green-700">✓ Worth it if...</Label>
                      <Textarea rows={2} value={editData.roadmapWorthItIf} onChange={(e) => setEditData(prev => ({ ...prev, roadmapWorthItIf: e.target.value }))} className="mt-1" disabled={!latestEdition} />
                    </div>
                    <div>
                      <Label className="text-sm text-red-700">✗ Skip if...</Label>
                      <Textarea rows={2} value={editData.roadmapSkipIf} onChange={(e) => setEditData(prev => ({ ...prev, roadmapSkipIf: e.target.value }))} className="mt-1" disabled={!latestEdition} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Worth Watching */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold">Worth Watching Sections</Label>
                {editData.worthWatching ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'trends', icon: '📈', color: 'blue', label: 'Emerging Trends' },
                      { key: 'events', icon: '📅', color: 'amber', label: 'Upcoming Events' },
                      { key: 'spotlight', icon: '🏢', color: 'green', label: 'Company Spotlight' },
                      { key: 'policy', icon: '⚖️', color: 'purple', label: 'Policy Watch' },
                    ].map(({ key, icon, color, label }) => {
                      const section = (editData.worthWatching as any)?.[key];
                      return (
                        <div key={key} className={`p-4 bg-${color}-500/5 border border-${color}-500/20 rounded-lg`}>
                          <h4 className={`font-semibold text-${color}-700 mb-2`}>{icon} {section?.title || label}</h4>
                          <p className="text-sm text-muted-foreground">{section?.content || `No ${label.toLowerCase()} generated yet.`}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 bg-muted/50 rounded-lg text-center">
                    <p className="text-muted-foreground text-sm">Click "Generate with AI" to create Worth Watching sections.</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t flex gap-3">
                <Button onClick={handleGenerateAIContent} variant="outline" disabled={isGeneratingContent || !latestEdition} size="sm">
                  {isGeneratingContent ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {isGeneratingContent ? "Generating..." : "Generate with AI"}
                </Button>
                <Button onClick={handleSaveContent} disabled={updateEditionMutation.isPending} size="sm">
                  {updateEditionMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {updateEditionMutation.isPending ? "Saving..." : "Save Editorial Content"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="automation"><Card className="p-6"><AutomationStatus /></Card></TabsContent>
        <TabsContent value="tools"><Card className="p-6"><ToolsPromptsManager /></Card></TabsContent>
        <TabsContent value="mystery"><Card className="p-6"><MysteryLinksManager /></Card></TabsContent>
        <TabsContent value="sponsors"><Card className="p-6"><SponsorsManager /></Card></TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Newsletter Preview</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <iframe srcDoc={previewHtml} title="Newsletter Preview" className="w-full h-[70vh] border-0" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
