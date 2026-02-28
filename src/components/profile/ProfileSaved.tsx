import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Copy, BookOpen, Sparkles, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

const ProfileSaved = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState("articles");

  // Saved Articles
  const { data: savedArticles = [] } = useQuery({
    queryKey: ["saved-articles-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("id, created_at, articles(id, title, slug, featured_image_url, published_at, primary_category_id, categories:primary_category_id(slug))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Saved Prompts
  const { data: savedPrompts = [] } = useQuery({
    queryKey: ["saved-prompts-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_bookmarks")
        .select("id, created_at, prompt_item_id, ai_guide_prompts:prompt_item_id(id, prompt_title, prompt_text, platforms)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Saved Guides
  const { data: savedGuides = [] } = useQuery({
    queryKey: ["saved-guides", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_bookmarks")
        .select("id, created_at, ai_guides:guide_id(id, title, one_line_description, topic_category, slug)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Remove mutations
  const removeArticle = useMutation({
    mutationFn: async (bookmarkId: string) => {
      const { error } = await supabase.from("bookmarks").delete().eq("id", bookmarkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-articles-profile"] });
      toast("Article removed from saved");
    },
  });

  const removePrompt = useMutation({
    mutationFn: async (bookmarkId: string) => {
      const { error } = await supabase.from("prompt_bookmarks").delete().eq("id", bookmarkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-prompts-profile"] });
      toast("Prompt removed from saved");
    },
  });

  const removeGuide = useMutation({
    mutationFn: async (bookmarkId: string) => {
      const { error } = await supabase.from("guide_bookmarks").delete().eq("id", bookmarkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-guides"] });
      toast("Guide removed from saved");
    },
  });

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Prompt copied to clipboard!");
  };

  const platformColors: Record<string, string> = {
    ChatGPT: "bg-emerald-500/20 text-emerald-400",
    Claude: "bg-amber-500/20 text-amber-400",
    Gemini: "bg-blue-500/20 text-blue-400",
    Midjourney: "bg-purple-500/20 text-purple-400",
    ElevenLabs: "bg-sky-500/20 text-sky-400",
    NotebookLM: "bg-lime-500/20 text-lime-400",
    Generic: "bg-zinc-500/20 text-zinc-400",
  };

  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="articles" className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Articles
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{savedArticles.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="prompts" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Prompts
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{savedPrompts.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="guides" className="gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          Guides
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{savedGuides.length}</Badge>
        </TabsTrigger>
      </TabsList>

      {/* Articles */}
      <TabsContent value="articles">
        {savedArticles.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-2">No saved articles yet.</p>
            <Link to="/articles" className="text-primary hover:underline text-sm">Browse articles →</Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedArticles.map((b: any) => {
              const article = b.articles;
              if (!article) return null;
              const catSlug = (article.categories as any)?.slug || "uncategorized";
              return (
                <Card key={b.id} className="overflow-hidden hover:shadow-lg transition-shadow group relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-10 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
                    onClick={() => removeArticle.mutate(b.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Link to={`/${catSlug}/${article.slug}`}>
                    {article.featured_image_url && (
                      <img src={article.featured_image_url} alt={article.title} className="w-full h-40 object-cover" loading="lazy" />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold line-clamp-2 mb-1">{article.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Saved {format(new Date(b.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* Prompts */}
      <TabsContent value="prompts">
        {savedPrompts.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-2">No saved prompts yet.</p>
            <Link to="/prompts" className="text-primary hover:underline text-sm">Browse prompts →</Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {savedPrompts.map((b: any) => {
              const prompt = b.ai_guide_prompts;
              if (!prompt) return null;
              return (
                <div
                  key={b.id}
                  className="rounded-lg border border-border bg-zinc-900 p-4 relative group border-l-4 border-l-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1">{prompt.prompt_title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{prompt.prompt_text}</p>
                      <div className="flex flex-wrap gap-1">
                        {prompt.platforms?.map((p: string) => (
                          <Badge key={p} className={`text-[10px] ${platformColors[p] || "bg-muted text-muted-foreground"}`}>{p}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyPrompt(prompt.prompt_text)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePrompt.mutate(b.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* Guides */}
      <TabsContent value="guides">
        {savedGuides.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-2">No saved guides yet.</p>
            <Link to="/guides" className="text-primary hover:underline text-sm">Browse guides →</Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedGuides.map((b: any) => {
              const guide = b.ai_guides;
              if (!guide) return null;
              const cat = (guide.topic_category || "general").toLowerCase().replace(/\s+/g, "-");
              return (
                <Card key={b.id} className="overflow-hidden hover:shadow-lg transition-shadow group relative p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-10 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
                    onClick={() => removeGuide.mutate(b.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Link to={`/guides/${cat}/${guide.slug}`}>
                    <div className="flex items-start gap-2 mb-2">
                      {guide.topic_category && (
                        <Badge variant="secondary" className="text-[10px]">{guide.topic_category}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold line-clamp-2 mb-1">{guide.title}</h3>
                    {guide.one_line_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{guide.one_line_description}</p>
                    )}
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default ProfileSaved;
