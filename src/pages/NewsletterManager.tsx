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
import { Calendar, Send, Eye, Loader2, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export default function NewsletterManager() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editData, setEditData] = useState({
    editorNote: "",
    worthWatching: "",
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
  });

  // Load existing content when edition loads
  useEffect(() => {
    if (latestEdition) {
      setEditData({
        editorNote: latestEdition.editor_note || "",
        worthWatching: (latestEdition as any).worth_watching || "",
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
              {!latestEdition && (
                <Button onClick={handleGenerate} disabled={isGenerating}>
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
                <div>
                  <Label className="text-sm font-medium">Subject Line A</Label>
                  <p className="text-sm mt-1 font-mono bg-muted p-2 rounded">{latestEdition.subject_line}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Subject Line B (A/B Test)</Label>
                  <p className="text-sm mt-1 font-mono bg-muted p-2 rounded">{latestEdition.subject_line_variant_b}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
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
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="editor-note">Editor's Note</Label>
                    <span className={`text-xs ${editorNoteWordCount > 80 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {editorNoteWordCount}/80 words
                    </span>
                  </div>
                  <Textarea
                    id="editor-note"
                    rows={4}
                    placeholder="One short paragraph setting context for the week. This can reference themes such as regulation, platforms, adoption, or regional signals. Keep this under 80 words."
                    value={editData.editorNote}
                    onChange={(e) => setEditData({ ...editData, editorNote: e.target.value })}
                    className="font-serif"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Set the context for this week. Reference themes like regulation, platforms, adoption, or regional signals.
                  </p>
                </div>

                <div>
                  <Label htmlFor="worth-watching">Worth Watching</Label>
                  <Textarea
                    id="worth-watching"
                    rows={4}
                    placeholder="One short paragraph highlighting a forward-looking signal. This may reference a policy timeline, platform trend, or regional shift. Avoid predictions framed as certainty."
                    value={editData.worthWatching}
                    onChange={(e) => setEditData({ ...editData, worthWatching: e.target.value })}
                    className="mt-2 font-serif"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Highlight a forward-looking signal. Reference policy timelines, platform trends, or regional shifts.
                  </p>
                </div>

                <div className="pt-4 border-t">
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
    </>
  );
}
