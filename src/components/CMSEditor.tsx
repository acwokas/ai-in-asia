import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Save, Upload, Loader2, Info, Plus, Pencil, CalendarIcon, Clock, ExternalLink, Wand2, Copy, Check, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ScoutWritingAssistant from "@/components/ScoutWritingAssistant";
import RichTextEditor from "@/components/RichTextEditor";
import { PolicyArticleEditor } from "@/components/PolicyArticleEditor";
import { TopListsEditor } from "@/components/TopListsEditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageCompression";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CMSEditorProps {
  initialData?: any;
  onSave?: (data: any) => void;
}

// Helper function to convert JSONB content to markdown
const convertJsonbToMarkdown = (jsonbContent: any): string => {
  if (!jsonbContent) return "";
  if (typeof jsonbContent === "string") return jsonbContent;
  if (!Array.isArray(jsonbContent)) return "";
  
  let listCounter = 0;
  let currentListType = '';
  
  return jsonbContent.map((block: any) => {
    if (!block || !block.type) return "";
    
    // Reset counter when switching list types
    if (block.type !== currentListType) {
      listCounter = 0;
      currentListType = block.type;
    }
    
    switch (block.type) {
      case "paragraph":
        return block.content || "";
      case "heading":
        const level = block.attrs?.level || 2;
        const prefix = "#".repeat(level);
        return `${prefix} ${block.content || ""}`;
      case "bulletList":
      case "listItem":
        // Handle both flat lists and nested content
        if (Array.isArray(block.content)) {
          return block.content.map((item: any) => `- ${item.content || item}`).join("\n");
        }
        return `- ${block.content || ""}`;
      case "orderedList":
        // Handle both flat lists and nested content  
        if (Array.isArray(block.content)) {
          return block.content.map((item: any, idx: number) => `${idx + 1}. ${item.content || item}`).join("\n");
        }
        listCounter++;
        return `${listCounter}. ${block.content || ""}`;
      case "blockquote":
        return `> ${block.content || ""}`;
      default:
        return block.content || "";
    }
  }).join("\n\n");
};

const CMSEditor = ({ initialData, onSave }: CMSEditorProps) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [content, setContent] = useState(convertJsonbToMarkdown(initialData?.content) || "");
  const [tldrSnapshot, setTldrSnapshot] = useState<string[]>(
    Array.isArray(initialData?.tldr_snapshot) ? initialData.tldr_snapshot : []
  );
  const [isGeneratingTldr, setIsGeneratingTldr] = useState(false);
  const [articleType, setArticleType] = useState(initialData?.article_type || "article");
  const [status, setStatus] = useState(initialData?.status || "draft");
  const [featuredImage, setFeaturedImage] = useState(initialData?.featured_image_url || "");
  const [featuredImageAlt, setFeaturedImageAlt] = useState(initialData?.featured_image_alt || "");
  const [seoTitle, setSeoTitle] = useState(initialData?.seo_title || "");
  const [metaTitle, setMetaTitle] = useState(initialData?.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(initialData?.meta_description || "");
  const [focusKeyphrase, setFocusKeyphrase] = useState(initialData?.focus_keyphrase || "");
  const [keyphraseSynonyms, setKeyphraseSynonyms] = useState(initialData?.keyphrase_synonyms || "");
  const [featuredOnHomepage, setFeaturedOnHomepage] = useState(
    initialData?.featured_on_homepage ?? true
  );
  const [sticky, setSticky] = useState(initialData?.sticky ?? false);
  const [authorId, setAuthorId] = useState(initialData?.author_id || "");
  const [primaryCategoryId, setPrimaryCategoryId] = useState(initialData?.primary_category_id || "");
  const [scheduledFor, setScheduledFor] = useState<Date | undefined>(
    initialData?.scheduled_for ? new Date(initialData.scheduled_for) : undefined
  );
  const [scheduledTime, setScheduledTime] = useState(
    initialData?.scheduled_for 
      ? format(new Date(initialData.scheduled_for), "HH:mm")
      : "09:00"
  );
  const [publishedAt, setPublishedAt] = useState<Date | undefined>(
    initialData?.published_at ? new Date(initialData.published_at) : undefined
  );
  const [publishedTime, setPublishedTime] = useState(
    initialData?.published_at 
      ? format(new Date(initialData.published_at), "HH:mm")
      : "09:00"
  );
  const [isTrending, setIsTrending] = useState(initialData?.is_trending ?? false);
  const [homepageTrending, setHomepageTrending] = useState(initialData?.homepage_trending ?? false);
  const [selectedText, setSelectedText] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showAuthorDialog, setShowAuthorDialog] = useState(false);
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [authorForm, setAuthorForm] = useState({
    id: "",
    name: "",
    slug: "",
    job_title: "",
    bio: "",
    email: "",
    avatar_url: "",
    twitter_handle: "",
    linkedin_url: "",
    website_url: ""
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [isGeneratingHeadline, setIsGeneratingHeadline] = useState(false);
  const [headlineOptions, setHeadlineOptions] = useState<{ best: string; alternatives: string[] } | null>(null);
  const [showHeadlineDialog, setShowHeadlineDialog] = useState(false);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [isRewritingArticle, setIsRewritingArticle] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);
  const [isGeneratingImagePrompts, setIsGeneratingImagePrompts] = useState(false);
  const [imagePrompts, setImagePrompts] = useState<Array<{ title: string; prompt: string; explanation: string }> | null>(null);
  
  // Undo state for Scout Assist
  const [undoStack, setUndoStack] = useState<Array<{ field: 'content' | 'excerpt'; value: string }>>([]);
  
  // Policy article specific state
  const [region, setRegion] = useState(initialData?.region || "");
  const [country, setCountry] = useState(initialData?.country || "");
  const [governanceMaturity, setGovernanceMaturity] = useState(initialData?.governance_maturity || "");
  const [policySections, setPolicySections] = useState(
    Array.isArray(initialData?.policy_sections) ? initialData.policy_sections : []
  );
  const [comparisonTables, setComparisonTables] = useState(
    Array.isArray(initialData?.comparison_tables) ? initialData.comparison_tables : []
  );
  const [localResources, setLocalResources] = useState(
    Array.isArray(initialData?.local_resources) ? initialData.local_resources : []
  );
  const [topicTags, setTopicTags] = useState<string[]>(
    Array.isArray(initialData?.topic_tags) ? initialData.topic_tags : []
  );
  
  // Top Lists specific state
  const [topListItems, setTopListItems] = useState(
    Array.isArray(initialData?.top_list_items) ? initialData.top_list_items : []
  );
  const [topListIntro, setTopListIntro] = useState(initialData?.top_list_intro || "");
  const [topListOutro, setTopListOutro] = useState(initialData?.top_list_outro || "");
  const [topListShowPromptTools, setTopListShowPromptTools] = useState<boolean>(() => {
    const items = Array.isArray(initialData?.top_list_items) ? initialData.top_list_items : [];
    if (items.length > 0 && typeof items[0]?.showPromptTools === "boolean") {
      return items[0].showPromptTools;
    }
    return true;
  });

  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const excerptRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch authors
  const { data: authors } = useQuery({
    queryKey: ['authors'],
    staleTime: 5 * 60 * 1000, // 5 minutes - authors don't change often
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authors')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    staleTime: 5 * 60 * 1000, // 5 minutes - categories don't change often
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch policy regions (for policy articles)
  const { data: policyRegions, isLoading: policyRegionsLoading, error: policyRegionsError } = useQuery({
    queryKey: ['policy-regions'],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      console.log('Fetching policy regions for editor...');
      const { data, error } = await supabase
        .from('categories')
        .select('slug')
        .in('slug', [
          'north-asia', 'asean', 'oceania', 'greater-china', 'anglosphere',
          'europe', 'mena', 'africa', 'latin-america', 'south-asia',
          'pan-pacific', 'pan-asia', 'global-comparison'
        ])
        .order('display_order');
      
      if (error) {
        console.error('Error fetching policy regions:', error);
        throw error;
      }
      const regions = data?.map(r => r.slug) || [];
      console.log('Policy regions loaded for editor:', regions);
      return regions;
    }
  });

  // Fetch topic tags (for policy articles)
  const { data: policyTopicTags, isLoading: policyTopicTagsLoading, error: policyTopicTagsError } = useQuery({
    queryKey: ['policy-topic-tags'],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('name')
          .in('slug', ['privacy', 'safety', 'accountability', 'fairness', 'transparency', 'risk', 'law', 'ethics', 'regulation'])
          .order('name');
        
        if (error) {
          console.error('Error fetching policy topic tags:', error);
          throw error;
        }
        const tags = data?.map(t => t.name) || [];
        console.log('Policy topic tags loaded:', tags);
        return tags;
      } catch (err) {
        console.error('Failed to load policy topic tags:', err);
        return [];
      }
    }
  });

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .replace(/\/+$/g, ""); // Remove trailing slashes
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!initialData) {
      setSlug(generateSlug(value));
    }
  };

  const handleTextSelection = (textarea: HTMLTextAreaElement) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    setSelectedText(selected);
  };

  const replaceSelectedText = (newText: string) => {
    const textarea = contentRef.current || excerptRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // If no text is selected (start === end), replace the entire field content
    // This is particularly useful for Scout operations on the excerpt field
    const shouldReplaceAll = (start === end) && textarea === excerptRef.current;
    
    // Save current state for undo
    if (textarea === contentRef.current) {
      setUndoStack(prev => [...prev, { field: 'content', value: content }]);
    } else {
      setUndoStack(prev => [...prev, { field: 'excerpt', value: excerpt }]);
    }
    
    if (shouldReplaceAll) {
      setExcerpt(newText);
    } else {
      const currentValue = textarea.value;
      const newValue = currentValue.substring(0, start) + newText + currentValue.substring(end);
      
      if (textarea === contentRef.current) {
        setContent(newValue);
      } else {
        setExcerpt(newValue);
      }
    }
    
    setSelectedText("");
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const lastState = undoStack[undoStack.length - 1];
    
    if (lastState.field === 'content') {
      setContent(lastState.value);
    } else {
      setExcerpt(lastState.value);
    }
    
    setUndoStack(prev => prev.slice(0, -1));
    
    toast({
      title: "Undone",
      description: "Scout changes have been reverted",
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);

    try {
      // Compress image before upload
      toast({
        title: "Optimizing image...",
        description: "Compressing image for best performance",
      });

      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        maxSizeMB: 1,
      });

      const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(2);
      
      console.log(`Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB`);

      const fileExt = 'jpg'; // Always use jpg after compression
      
      // Generate SEO-friendly filename from alt text, title, or timestamp
      let baseFileName: string;
      if (featuredImageAlt && featuredImageAlt.trim()) {
        baseFileName = generateSlug(featuredImageAlt);
      } else if (title && title.trim()) {
        baseFileName = generateSlug(title);
      } else {
        baseFileName = `image-${Date.now()}`;
      }
      
      // Ensure filename is valid and not empty after sanitization
      if (!baseFileName || baseFileName.length === 0) {
        baseFileName = `image-${Date.now()}`;
      }
      
      // Limit filename length to 100 characters for safety
      if (baseFileName.length > 100) {
        baseFileName = baseFileName.substring(0, 100);
      }
      
      const fileName = `${baseFileName}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath);

      setFeaturedImage(publicUrl);
      
      toast({
        title: "Image uploaded",
        description: `Optimized and uploaded (${originalSizeMB}MB → ${compressedSizeMB}MB)`,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenAuthorDialog = (author?: any) => {
    console.log('Opening author dialog with:', author);
    if (author) {
      setIsEditingAuthor(true);
      const formData = {
        id: author.id,
        name: author.name,
        slug: author.slug,
        job_title: author.job_title || "",
        bio: author.bio || "",
        email: author.email || "",
        avatar_url: author.avatar_url || "",
        twitter_handle: author.twitter_handle || "",
        linkedin_url: author.linkedin_url || "",
        website_url: author.website_url || ""
      };
      console.log('Author form data:', formData);
      setAuthorForm(formData);
      setAvatarPreview(author.avatar_url || "");
    } else {
      setIsEditingAuthor(false);
      setAuthorForm({
        id: "",
        name: "",
        slug: "",
        job_title: "",
        bio: "",
        email: "",
        avatar_url: "",
        twitter_handle: "",
        linkedin_url: "",
        website_url: ""
      });
      setAvatarPreview("");
    }
    setAvatarFile(null);
    setShowAuthorDialog(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAuthor = async () => {
    try {
      let avatarUrl = authorForm.avatar_url;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('article-images')
          .upload(filePath, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('article-images')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      const authorData = {
        name: authorForm.name,
        slug: authorForm.slug || generateSlug(authorForm.name),
        job_title: authorForm.job_title || null,
        bio: authorForm.bio || null,
        email: authorForm.email || null,
        avatar_url: avatarUrl || null,
        twitter_handle: authorForm.twitter_handle || null,
        linkedin_url: authorForm.linkedin_url || null,
        website_url: authorForm.website_url || null
      };

      if (isEditingAuthor && authorForm.id) {
        const { error } = await supabase
          .from('authors')
          .update(authorData)
          .eq('id', authorForm.id);
        
        if (error) throw error;
        
        toast({
          title: "Author updated",
          description: "Author information has been updated successfully"
        });
      } else {
        const { data, error } = await supabase
          .from('authors')
          .insert(authorData)
          .select()
          .single();
        
        if (error) throw error;
        
        setAuthorId(data.id);
        toast({
          title: "Author created",
          description: "New author has been created successfully"
        });
      }

      queryClient.invalidateQueries({ queryKey: ['authors'] });
      setShowAuthorDialog(false);
      setAvatarFile(null);
      setAvatarPreview("");
    } catch (error) {
      console.error('Error saving author:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save author",
        variant: "destructive"
      });
    }
  };

  const handleGenerateTldr = async () => {
    if (!title || !content) {
      toast({
        title: "Missing Content",
        description: "Please add a title and content first",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingTldr(true);
    try {
      const requestBody: any = {
        content: content,
        title: title,
      };
      
      // Only include articleId if it exists (not for new articles)
      if (initialData?.id) {
        requestBody.articleId = initialData.id;
      }
      
      const { data, error } = await supabase.functions.invoke("generate-tldr-snapshot", {
        body: requestBody,
      });

      if (error) throw error;

      if (data?.tldr_snapshot) {
        setTldrSnapshot(data.tldr_snapshot);
        if (data.content) {
          setContent(data.content);
        }
        toast({
          title: "Success!",
          description: "TL;DR Snapshot generated and existing TL;DR removed from content",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingTldr(false);
    }
  };

  const handleGenerateHeadline = async () => {
    setIsGeneratingHeadline(true);
    try {
      // Try to read from clipboard
      let clipboardText = "";
      try {
        clipboardText = await navigator.clipboard.readText();
      } catch (err) {
        toast({
          title: "Clipboard Access",
          description: "Please paste your content into the browser prompt",
          variant: "default"
        });
        clipboardText = prompt("Paste your content here:") || "";
      }

      if (!clipboardText || clipboardText.trim().length === 0) {
        toast({
          title: "No Content",
          description: "Please copy some text to generate a headline from",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("scout-assistant", {
        body: {
          action: "catchy-headline",
          content: clipboardText,
        },
      });

      if (error) throw error;

      if (data?.result) {
        // Parse the response format: BEST: ..., ALT1: ..., ALT2: ..., ALT3: ...
        const result = data.result as string;
        const lines = result.split('\n').filter((l: string) => l.trim());
        
        let best = "";
        const alternatives: string[] = [];
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('BEST:')) {
            best = trimmed.replace('BEST:', '').trim();
          } else if (trimmed.startsWith('ALT1:')) {
            alternatives.push(trimmed.replace('ALT1:', '').trim());
          } else if (trimmed.startsWith('ALT2:')) {
            alternatives.push(trimmed.replace('ALT2:', '').trim());
          } else if (trimmed.startsWith('ALT3:')) {
            alternatives.push(trimmed.replace('ALT3:', '').trim());
          }
        }
        
        // Fallback if parsing fails
        if (!best && lines.length > 0) {
          best = lines[0].replace(/^(BEST:|ALT\d:)\s*/i, '').trim();
        }
        
        setHeadlineOptions({ best, alternatives });
        setShowHeadlineDialog(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate headline",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingHeadline(false);
    }
  };

  const handleSelectHeadline = (headline: string) => {
    setTitle(headline);
    if (!initialData) {
      setSlug(generateSlug(headline));
    }
    setShowHeadlineDialog(false);
    setHeadlineOptions(null);
    toast({
      title: "Headline Selected",
      description: "Title and slug have been updated",
    });
  };

  const handleGenerateSEO = async () => {
    if (!initialData?.id) {
      toast({
        title: "Save Required",
        description: "Please save the article first before generating SEO",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingSEO(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-article-seo", {
        body: {
          articleId: initialData.id,
          title,
          content,
          excerpt,
        },
      });

      if (error) throw error;

      if (data?.data) {
        setMetaTitle(data.data.meta_title);
        setSeoTitle(data.data.seo_title);
        setFocusKeyphrase(data.data.focus_keyphrase);
        setKeyphraseSynonyms(data.data.keyphrase_synonyms);
        setMetaDescription(data.data.meta_description);
        
        // Auto-fill featured image alt text with focus keyphrase
        if (data.data.focus_keyphrase && !featuredImageAlt) {
          setFeaturedImageAlt(data.data.focus_keyphrase);
        }
        
        toast({
          title: "SEO Generated!",
          description: "All SEO fields have been populated with AI-optimized content",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate SEO metadata",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  const handleScoutRewrite = async () => {
    if (!content || content.trim().length === 0) {
      toast({
        title: "No Content",
        description: "Please add content to the article before rewriting",
        variant: "destructive",
      });
      return;
    }

    setIsRewritingArticle(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("scout-rewrite-article", {
        body: { 
          content, 
          title,
          currentArticleId: initialData?.id 
        },
      });

      if (error) throw error;

      if (data?.rewrittenContent) {
        setContent(data.rewrittenContent);
        if (data?.excerpt) {
          setExcerpt(data.excerpt);
        }
        toast({
          title: "Article Rewritten with Links",
          description: "Content rewritten with internal and external links automatically added",
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to rewrite article";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRewritingArticle(false);
    }
  };

  const handleGenerateImagePrompts = async () => {
    if (!title || !content) {
      toast({
        title: "Missing content",
        description: "Please add a title and content to generate image prompts",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingImagePrompts(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-image-prompts", {
        body: { title, content },
      });

      if (error) throw error;

      if (data?.ideogram) {
        // Parse the prompts from the response
        const parsePrompts = (text: string) => {
          const prompts = [];
          // Split by numbered sections like "1.", "2.", etc. or "###"
          const sections = text.split(/(?=\d+\.\s+[A-Z])/);
          
          for (const section of sections) {
            if (!section.trim()) continue;
            
            // Extract title (first line)
            const lines = section.split('\n').filter(l => l.trim());
            if (lines.length === 0) continue;
            
            const titleMatch = lines[0].match(/\d+\.\s+(.+)/);
            const title = titleMatch ? titleMatch[1] : lines[0];
            
            // Extract prompt (text before "Why it works:")
            const whyIndex = section.indexOf('Why it works:');
            let prompt = '';
            let explanation = '';
            
            if (whyIndex > -1) {
              prompt = section.substring(0, whyIndex).replace(/\d+\.\s+.+\n/, '').trim();
              explanation = section.substring(whyIndex + 14).trim();
            } else {
              prompt = section.replace(/\d+\.\s+.+\n/, '').trim();
            }
            
            if (prompt) {
              prompts.push({ title, prompt, explanation });
            }
          }
          
          return prompts;
        };
        
        const parsedPrompts = parsePrompts(data.ideogram);
        setImagePrompts(parsedPrompts);
        toast({
          title: "Prompts Generated!",
          description: `Scout has created ${parsedPrompts.length} custom image prompts`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate image prompts",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingImagePrompts(false);
    }
  };

  const handleSave = () => {
    let scheduledDateTime = null;
    let finalStatus = status;
    
    if (scheduledFor && scheduledTime) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const dateTime = new Date(scheduledFor);
      dateTime.setHours(hours, minutes, 0, 0);
      scheduledDateTime = dateTime.toISOString();
      
      // Auto-set status to scheduled when scheduled_for is set
      if (finalStatus === 'draft') {
        finalStatus = 'scheduled';
      }
    }

    // Handle custom published date
    let publishedDateTime = null;
    if (publishedAt && publishedTime) {
      const [hours, minutes] = publishedTime.split(':').map(Number);
      const dateTime = new Date(publishedAt);
      dateTime.setHours(hours, minutes, 0, 0);
      publishedDateTime = dateTime.toISOString();
    }

    // Generate preview code if article is not published and doesn't have one
    let previewCode = initialData?.preview_code;
    if (finalStatus !== 'published' && !previewCode) {
      previewCode = crypto.randomUUID().substring(0, 8);
    } else if (finalStatus === 'published') {
      // Clear preview code when publishing
      previewCode = null;
    }

    // Auto-generate slug from title if empty
    let finalSlug = slug.replace(/\//g, '');
    if (!finalSlug.trim() && title) {
      finalSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }

    // Auto-select Intelligence Desk if no author selected
    let finalAuthorId = authorId;
    if (!finalAuthorId) {
      const intelligenceDeskAuthor = authors?.find(a => a.name === "Intelligence Desk");
      if (intelligenceDeskAuthor) {
        finalAuthorId = intelligenceDeskAuthor.id;
      }
    }

    const data = {
      title,
      slug: finalSlug,
      excerpt,
      content,
      tldr_snapshot: tldrSnapshot,
      article_type: articleType,
      status: finalStatus,
      featured_image_url: featuredImage,
      featured_image_alt: featuredImageAlt,
      seo_title: seoTitle,
      meta_title: metaTitle,
      meta_description: metaDescription,
      focus_keyphrase: focusKeyphrase,
      keyphrase_synonyms: keyphraseSynonyms,
      featured_on_homepage: featuredOnHomepage,
      sticky,
      is_trending: isTrending,
      homepage_trending: homepageTrending,
      author_id: finalAuthorId || null,
      primary_category_id: primaryCategoryId || null,
      scheduled_for: scheduledDateTime,
      published_at: publishedDateTime,
      preview_code: previewCode,
      // Policy article fields
      ...(articleType === 'policy_article' && {
        region: region || null,
        country: country || null,
        governance_maturity: governanceMaturity || null,
        policy_sections: policySections,
        comparison_tables: comparisonTables,
        local_resources: localResources,
        topic_tags: topicTags,
      }),
      // Top Lists fields
      ...(articleType === 'top_lists' && {
        top_list_items: topListItems.map((item, index) =>
          index === 0 ? { ...item, showPromptTools: topListShowPromptTools } : item
        ),
        top_list_intro: topListIntro,
        top_list_outro: topListOutro,
      }),

    };
    onSave?.(data);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className={cn("grid w-full", 
          articleType === 'policy_article' || articleType === 'top_lists' ? "grid-cols-4" : "grid-cols-3"
        )}>
          <TabsTrigger value="content">Content</TabsTrigger>
          {articleType === 'policy_article' && (
            <TabsTrigger value="policy">Policy Data</TabsTrigger>
          )}
          {articleType === 'top_lists' && (
            <TabsTrigger value="toplists">Top Lists</TabsTrigger>
          )}
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Content</CardTitle>
              <CardDescription>Write and format your article</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="title">Title</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateHeadline}
                    disabled={isGeneratingHeadline}
                    className="bg-[#10b981] hover:bg-[#059669] text-white border-0"
                    title="Generate catchy headline from clipboard"
                  >
                    {isGeneratingHeadline ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Scout Assist: Headline
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter article title..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Copy content and click Scout Headline to generate a catchy title
                </p>
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="article-url-slug"
                />
              </div>

              <div>
                <Label htmlFor="article-type">Article Type</Label>
                <Select value={articleType} onValueChange={setArticleType}>
                  <SelectTrigger id="article-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="policy_article">Policy Article</SelectItem>
                    <SelectItem value="top_lists">Top Lists</SelectItem>
                  </SelectContent>
        </Select>
              </div>

              <div>
                <Label htmlFor="primary-category">Primary Category</Label>
                <Select value={primaryCategoryId} onValueChange={setPrimaryCategoryId}>
                  <SelectTrigger id="primary-category">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      ?.filter((category) => category.name.toLowerCase() !== 'uncategorized')
                      .sort((a, b) => {
                        // Priority order for main categories
                        const priorityOrder = ['News', 'Business', 'Life', 'Learn', 'Create', 'Voices'];
                        const policyRegions = ['MENA', 'Africa', 'North Asia', 'ASEAN', 'Greater China', 'South Asia', 'Oceania', 'Europe', 'Americas', 'Anglosphere', 'Global Comparison', 'Latin America', 'Pan-Asia', 'Pan-Pacific'];
                        
                        const aIndex = priorityOrder.indexOf(a.name);
                        const bIndex = priorityOrder.indexOf(b.name);
                        const aIsPolicy = policyRegions.includes(a.name);
                        const bIsPolicy = policyRegions.includes(b.name);
                        
                        // If both are in priority list, sort by priority order
                        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                        
                        // Priority categories come first
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        
                        // Policy regions come last
                        if (aIsPolicy && !bIsPolicy) return 1;
                        if (!aIsPolicy && bIsPolicy) return -1;
                        
                        // Everything else alphabetical
                        return a.name.localeCompare(b.name);
                      })
                      .reduce((acc, category, index, arr) => {
                        // Add separator before policy regions
                        const policyRegions = ['MENA', 'Africa', 'North Asia', 'ASEAN', 'Greater China', 'South Asia', 'Oceania', 'Europe', 'Americas', 'Anglosphere', 'Global Comparison', 'Latin America', 'Pan-Asia', 'Pan-Pacific'];
                        const isFirstPolicy = policyRegions.includes(category.name) && 
                          (index === 0 || !policyRegions.includes(arr[index - 1].name));
                        
                        if (isFirstPolicy) {
                          acc.push(
                            <SelectItem key="separator" value="separator" disabled>
                              ──────────
                            </SelectItem>
                          );
                        }
                        
                        acc.push(
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        );
                        return acc;
                      }, [] as JSX.Element[])}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Main category for this article (used for related articles)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <ScoutWritingAssistant
                    selectedText={selectedText}
                    onReplace={replaceSelectedText}
                    fullFieldContent={excerpt}
                    context={{ title, fullContent: content }}
                    canUndo={undoStack.length > 0}
                    onUndo={handleUndo}
                  />
                </div>
                <Textarea
                  ref={excerptRef}
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  onSelect={(e) => handleTextSelection(e.currentTarget)}
                  placeholder="Brief summary of the article..."
                  rows={3}
                />
              </div>


              <div className="space-y-4">
                <div>
                  <Label htmlFor="featured-image">Featured Image</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Paste URL or upload (auto-optimized to ~1MB)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="featured-image"
                      value={featuredImage}
                      onChange={(e) => setFeaturedImage(e.target.value)}
                      placeholder="Paste image URL or upload below"
                      className="flex-1"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      title="Upload & optimize image"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    {featuredImage && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFeaturedImage('');
                          setFeaturedImageAlt('');
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        title="Remove featured image"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {featuredImage && (
                    <div className="mt-2">
                      <img
                        src={featuredImage}
                        alt="Preview"
                        className="w-full max-w-md h-48 object-cover rounded-lg border border-border"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="featured-image-alt">Featured Image Alt Text</Label>
                  <Input
                    id="featured-image-alt"
                    value={featuredImageAlt}
                    onChange={(e) => setFeaturedImageAlt(e.target.value)}
                    placeholder="Descriptive alt text for accessibility"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Article Content (Live Preview)</Label>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleScoutRewrite}
                    disabled={isRewritingArticle || !content}
                    className="bg-[#10b981] hover:bg-[#059669] text-white"
                    title="Rewrite entire article and generate excerpt"
                  >
                    {isRewritingArticle ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Rewriting...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Scout Assist: Rewrite
                      </>
                    )}
                  </Button>
                </div>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  onSelect={setSelectedText}
                  placeholder="Start writing your article..."
                />
              </div>

              <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      Image Generation Prompts
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Generate AI prompts for featured images based on your article content
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateImagePrompts}
                    disabled={isGeneratingImagePrompts || !title || !content}
                    className="bg-[#10b981] hover:bg-[#059669] text-white border-0"
                  >
                    {isGeneratingImagePrompts ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Scout Assist: Image Prompt
                      </>
                    )}
                  </Button>
                </div>

                {imagePrompts && imagePrompts.length > 0 && (
                  <div className="space-y-4 mt-4">
                    {imagePrompts.map((prompt, index) => (
                      <Card key={index} className="bg-cyan-500/10 border-cyan-500/20">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-cyan-500" />
                              {index + 1}. {prompt.title}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                await navigator.clipboard.writeText(prompt.prompt);
                                setCopiedPrompt(index);
                                setTimeout(() => setCopiedPrompt(null), 2000);
                                toast({
                                  title: "Copied!",
                                  description: "Prompt copied to clipboard",
                                });
                              }}
                            >
                              {copiedPrompt === index ? (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-cyan-600 font-medium mb-2 block">Prompt</Label>
                            <div className="text-sm p-3 bg-background border border-border rounded-md">
                              {prompt.prompt}
                            </div>
                          </div>
                          {prompt.explanation && (
                            <div>
                              <Label className="text-cyan-600 font-medium mb-2 block">Why it works</Label>
                              <div className="text-sm p-3 bg-background border border-border rounded-md text-muted-foreground">
                                {prompt.explanation}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policy Article Tab */}
        <TabsContent value="policy" className="space-y-6">
          {articleType === 'policy_article' ? (
            policyRegionsLoading || policyTopicTagsLoading ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading policy data...</p>
                </CardContent>
              </Card>
            ) : policyRegionsError || policyTopicTagsError ? (
              <Card>
                <CardContent className="p-6 text-center text-destructive">
                  <p>Failed to load policy data. Please refresh the page.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {policyRegionsError?.message || policyTopicTagsError?.message}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <PolicyArticleEditor
                region={region}
                country={country}
                governanceMaturity={governanceMaturity}
                policySections={policySections}
                comparisonTables={comparisonTables}
                localResources={localResources}
                topicTags={topicTags}
                onRegionChange={setRegion}
                onCountryChange={setCountry}
                onGovernanceMaturityChange={setGovernanceMaturity}
                onPolicySectionsChange={setPolicySections}
                onComparisonTablesChange={setComparisonTables}
                onLocalResourcesChange={setLocalResources}
                onTopicTagsChange={setTopicTags}
                availableRegions={policyRegions || []}
                availableTopicTags={policyTopicTags || []}
              />
            )
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Policy Data tab is only available for Policy Articles
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Top Lists Tab */}
        <TabsContent value="toplists" className="space-y-6">
          {articleType === 'top_lists' ? (
            <Card>
              <CardHeader>
                <CardTitle>Top Lists Items</CardTitle>
                <CardDescription>
                  Create a numbered list with copyable prompts and optional images
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TopListsEditor 
                  items={topListItems} 
                  onChange={setTopListItems}
                  intro={topListIntro}
                  onIntroChange={setTopListIntro}
                  outro={topListOutro}
                  onOutroChange={setTopListOutro}
                  showPromptTools={topListShowPromptTools}
                  onShowPromptToolsChange={setTopListShowPromptTools}
                />

              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Top Lists tab is only available for Top Lists articles
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>SEO Settings</CardTitle>
                  <CardDescription>Optimise your article for search engines</CardDescription>
                </div>
                <Button
                  onClick={handleGenerateSEO}
                  disabled={isGeneratingSEO || !title || !content}
                  variant="outline"
                  size="sm"
                >
                  {isGeneratingSEO ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Scout Assist: SEO
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seo-title">SEO Title</Label>
                <Input
                  id="seo-title"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="SEO title (max 60 characters)"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {seoTitle.length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="meta-title">Meta Title</Label>
                <Input
                  id="meta-title"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="SEO title (max 60 characters)"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {metaTitle.length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="meta-description">Meta Description</Label>
                <Textarea
                  id="meta-description"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="SEO description (max 160 characters)"
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {metaDescription.length}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="focus-keyphrase">Focus Keyphrase</Label>
                <Input
                  id="focus-keyphrase"
                  value={focusKeyphrase}
                  onChange={(e) => setFocusKeyphrase(e.target.value)}
                  placeholder="Primary keyword for this article"
                />
              </div>

              <div>
                <Label htmlFor="keyphrase-synonyms">Keyphrase Synonyms</Label>
                <Input
                  id="keyphrase-synonyms"
                  value={keyphraseSynonyms}
                  onChange={(e) => setKeyphraseSynonyms(e.target.value)}
                  placeholder="Comma separated list of synonyms"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  e.g., artificial intelligence, machine learning, AI technology
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Settings</CardTitle>
              <CardDescription>Configure article type and visibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="status">Status</Label>
                  {slug && (
                    <div className="flex gap-2">
                      {status === 'published' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={`/article/${slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            View on site
                          </a>
                        </Button>
                      ) : initialData?.preview_code ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={`/article/${slug}?preview=${initialData.preview_code}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            Preview draft
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          title="Save article first to generate preview link"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Preview draft
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                {status !== 'published' && !initialData?.preview_code && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                    💡 Save this article first to generate a preview link
                  </p>
                )}
                {status !== 'published' && initialData?.preview_code && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Preview code: {initialData.preview_code}
                  </p>
                )}
              </div>

              {status === 'scheduled' && (
                <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/50">
                  <div>
                    <Label>Schedule for Publishing</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Set a date and time to automatically publish this article
                  </p>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !scheduledFor && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduledFor ? format(scheduledFor, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledFor}
                          onSelect={setScheduledFor}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="w-32">
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        disabled={!scheduledFor}
                      />
                    </div>
                    {scheduledFor && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setScheduledFor(undefined);
                          setScheduledTime("09:00");
                        }}
                      >
                        Clear
                      </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="featured">Feature on Homepage</Label>
                  <p className="text-xs text-muted-foreground">
                    Display this article prominently on the homepage
                  </p>
                </div>
                <Switch
                  id="featured"
                  checked={featuredOnHomepage}
                  onCheckedChange={setFeaturedOnHomepage}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sticky">Make Sticky</Label>
                  <p className="text-xs text-muted-foreground">
                    Pin this article in the top 3 positions of homepage featured section
                  </p>
                </div>
                <Switch
                  id="sticky"
                  checked={sticky}
                  onCheckedChange={setSticky}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="trending">Add to Trending</Label>
                  <p className="text-xs text-muted-foreground">
                    Show this article in the trending section on its category pages
                  </p>
                </div>
                <Switch
                  id="trending"
                  checked={isTrending}
                  onCheckedChange={setIsTrending}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="global-trending">Add to Global Trending</Label>
                  <p className="text-xs text-muted-foreground">
                    Show this article in the global trending list (top left of homepage)
                  </p>
                </div>
                <Switch
                  id="global-trending"
                  checked={homepageTrending}
                  onCheckedChange={setHomepageTrending}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Custom Published Date</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Set a custom past date for when this article was published
                  </p>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !publishedAt && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {publishedAt ? format(publishedAt, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={publishedAt}
                          onSelect={setPublishedAt}
                          initialFocus
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="w-32">
                      <Input
                        type="time"
                        value={publishedTime}
                        onChange={(e) => setPublishedTime(e.target.value)}
                        disabled={!publishedAt}
                      />
                    </div>
                    {publishedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPublishedAt(undefined);
                          setPublishedTime("09:00");
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="author">Author</Label>
                <div className="flex gap-2">
                  <Select value={authorId} onValueChange={setAuthorId}>
                    <SelectTrigger id="author" className="flex-1">
                      <SelectValue placeholder="Select author..." />
                    </SelectTrigger>
                    <SelectContent>
                      {authors?.map((author) => (
                        <SelectItem key={author.id} value={author.id}>
                          {author.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleOpenAuthorDialog()}
                    title="Create new author"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  {authorId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const author = authors?.find(a => a.id === authorId);
                        if (author) handleOpenAuthorDialog(author);
                      }}
                      title="Edit selected author"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Author Dialog */}
      <Dialog open={showAuthorDialog} onOpenChange={setShowAuthorDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditingAuthor ? 'Edit Author' : 'Create New Author'}</DialogTitle>
            <DialogDescription>
              {isEditingAuthor ? 'Update author information' : 'Add a new author to the system'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="author-name">Name *</Label>
              <Input
                id="author-name"
                value={authorForm.name}
                onChange={(e) => setAuthorForm({ ...authorForm, name: e.target.value })}
                placeholder="Author name"
              />
            </div>
            <div>
              <Label htmlFor="author-slug">Slug</Label>
              <Input
                id="author-slug"
                value={authorForm.slug}
                onChange={(e) => setAuthorForm({ ...authorForm, slug: e.target.value })}
                placeholder="author-slug (auto-generated if empty)"
              />
            </div>
            <div>
              <Label htmlFor="author-job-title">Job Title</Label>
              <Input
                id="author-job-title"
                value={authorForm.job_title}
                onChange={(e) => setAuthorForm({ ...authorForm, job_title: e.target.value })}
                placeholder="Chief Editor, Senior Writer, etc."
              />
            </div>
            <div>
              <Label htmlFor="author-email">Email</Label>
              <Input
                id="author-email"
                type="email"
                value={authorForm.email}
                onChange={(e) => setAuthorForm({ ...authorForm, email: e.target.value })}
                placeholder="author@example.com"
              />
            </div>
            <div>
              <Label htmlFor="author-bio">Bio</Label>
              <Textarea
                id="author-bio"
                value={authorForm.bio}
                onChange={(e) => setAuthorForm({ ...authorForm, bio: e.target.value })}
                placeholder="Brief biography..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="author-avatar">Avatar Image</Label>
              <Input
                id="author-avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="cursor-pointer"
              />
              {(avatarPreview || authorForm.avatar_url) && (
                <div className="mt-2">
                  <img
                    src={avatarPreview || authorForm.avatar_url}
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-full object-cover border border-border"
                  />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="author-twitter">Twitter Handle</Label>
              <Input
                id="author-twitter"
                value={authorForm.twitter_handle}
                onChange={(e) => setAuthorForm({ ...authorForm, twitter_handle: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div>
              <Label htmlFor="author-linkedin">LinkedIn URL</Label>
              <Input
                id="author-linkedin"
                value={authorForm.linkedin_url}
                onChange={(e) => setAuthorForm({ ...authorForm, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div>
              <Label htmlFor="author-website">Website URL</Label>
              <Input
                id="author-website"
                value={authorForm.website_url}
                onChange={(e) => setAuthorForm({ ...authorForm, website_url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuthorDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAuthor} disabled={!authorForm.name.trim()}>
              {isEditingAuthor ? 'Update Author' : 'Create Author'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Headline Selection Dialog */}
      <Dialog open={showHeadlineDialog} onOpenChange={setShowHeadlineDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Your Headline</DialogTitle>
            <DialogDescription>
              Choose the headline that works best. Your selection will update the title and slug.
            </DialogDescription>
          </DialogHeader>
          {headlineOptions && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Recommended</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-primary/10 hover:border-primary"
                  onClick={() => handleSelectHeadline(headlineOptions.best)}
                >
                  <span className="text-base">{headlineOptions.best}</span>
                </Button>
              </div>
              
              {headlineOptions.alternatives.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Alternatives</Label>
                  {headlineOptions.alternatives.map((alt, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-muted"
                      onClick={() => handleSelectHeadline(alt)}
                    >
                      <span className="text-base">{alt}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHeadlineDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>TL;DR Snapshot</CardTitle>
          <CardDescription>Generate 3 concise bullet points summarizing the article</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Appears below the featured image. Automatically removes existing TL;DR from content.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateTldr}
              disabled={isGeneratingTldr || !title || !content}
              className="bg-[#10b981] hover:bg-[#059669] text-white border-0"
            >
              {isGeneratingTldr ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Scout Assist: TL;DR
                </>
              )}
            </Button>
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-shrink-0 mt-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <Input
                  value={tldrSnapshot[index] || ""}
                  onChange={(e) => {
                    const newTldr = [...tldrSnapshot];
                    newTldr[index] = e.target.value;
                    setTldrSnapshot(newTldr);
                  }}
                  placeholder={`Bullet point ${index + 1}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-6">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Article
        </Button>
      </div>
    </div>
  );
};

export default CMSEditor;
