import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ToolsPromptsManager } from "@/components/newsletter/ToolsPromptsManager";
import { MysteryLinksManager } from "@/components/newsletter/MysteryLinksManager";
import { SponsorsManager } from "@/components/newsletter/SponsorsManager";
import { AutomationStatus } from "@/components/newsletter/AutomationStatus";
import { Calendar, Send, Eye, Loader2, Upload, X, Home } from "lucide-react";
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
    miniCaseStudy: "",
    memeCaption: "",
    commentsOverride: "",
  });
  const [isUploadingMeme, setIsUploadingMeme] = useState(false);
  const [memeImageUrl, setMemeImageUrl] = useState<string | null>(null);

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

  const handleSaveManualContent = () => {
    updateEditionMutation.mutate({
      editor_note: editData.editorNote || null,
      mini_case_study: editData.miniCaseStudy || null,
      meme_caption: editData.memeCaption || null,
      meme_image_url: memeImageUrl || null,
      comments_count_override: editData.commentsOverride ? parseInt(editData.commentsOverride) : null,
    });
  };

  const handleMemeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!latestEdition) {
      toast.error("Please generate a newsletter first");
      return;
    }

    setIsUploadingMeme(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `meme-${latestEdition.id}-${Date.now()}.${fileExt}`;
      const filePath = `newsletter-memes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      setMemeImageUrl(publicUrl);
      toast.success("Meme image uploaded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploadingMeme(false);
    }
  };

  const handleRemoveMeme = () => {
    setMemeImageUrl(null);
  };

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
                    {new Date(latestEdition.edition_date).toLocaleDateString('en-US', {
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
                  <p className="text-sm mt-1">{latestEdition.subject_line}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Subject Line B (A/B Test)</Label>
                  <p className="text-sm mt-1">{latestEdition.subject_line_variant_b}</p>
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
        <Tabs defaultValue="automation" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="automation">Automation</TabsTrigger>
            <TabsTrigger value="manual">Manual Content</TabsTrigger>
            <TabsTrigger value="tools">Tools & Prompts</TabsTrigger>
            <TabsTrigger value="mystery">Mystery Links</TabsTrigger>
            <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
          </TabsList>

          <TabsContent value="automation">
            <Card className="p-6">
              <AutomationStatus />
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Manual Content Sections</h3>
              <p className="text-sm text-muted-foreground mb-6">
                These sections are manually written for each edition
              </p>
              
              <div className="space-y-6">
                <div>
                  <Label htmlFor="editor-note">Editor's Note (80-150 words)</Label>
                  <Textarea
                    id="editor-note"
                    rows={4}
                    placeholder="Write a personal note from the editor..."
                    value={editData.editorNote}
                    onChange={(e) => setEditData({ ...editData, editorNote: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="case-study">Mini Case Study</Label>
                  <Textarea
                    id="case-study"
                    rows={4}
                    placeholder="Share a real-world AI success story or trend..."
                    value={editData.miniCaseStudy}
                    onChange={(e) => setEditData({ ...editData, miniCaseStudy: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="meme-caption">AI Meme Caption</Label>
                  <Input
                    id="meme-caption"
                    placeholder="Caption for the AI meme..."
                    value={editData.memeCaption}
                    onChange={(e) => setEditData({ ...editData, memeCaption: e.target.value })}
                    className="mt-2"
                  />
                  
                  <div className="mt-4">
                    <Label>Meme Image</Label>
                    {memeImageUrl ? (
                      <div className="mt-2 space-y-2">
                        <img 
                          src={memeImageUrl} 
                          alt="Newsletter meme" 
                          className="max-w-xs rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveMeme}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove Image
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <Input
                          id="meme-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleMemeUpload}
                          disabled={isUploadingMeme}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('meme-upload')?.click()}
                          disabled={isUploadingMeme}
                        >
                          {isUploadingMeme ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Meme Image
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="comments-override">Comments Count Override</Label>
                  <Input
                    id="comments-override"
                    type="number"
                    placeholder="Manual comments count (optional)"
                    value={editData.commentsOverride}
                    onChange={(e) => setEditData({ ...editData, commentsOverride: e.target.value })}
                    className="mt-2"
                  />
                </div>

                <Button onClick={handleSaveManualContent}>
                  Save Manual Content
                </Button>
              </div>
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
