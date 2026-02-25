import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { compressImage } from "@/lib/imageCompression";
import { generateSlug } from "@/lib/markdownConversion";
import type { CMSEditorState } from "./useCMSEditorState";

interface UseCMSEditorActionsProps {
  state: CMSEditorState;
  initialData?: any;
  authors?: any[];
}

export const useCMSEditorActions = ({ state, initialData, authors }: UseCMSEditorActionsProps) => {
  
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTitleChange = (value: string) => {
    state.setTitle(value);
    if (!initialData) {
      state.setSlug(generateSlug(value));
    }
  };

  const handleTextSelection = (textarea: HTMLTextAreaElement) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    state.setSelectedText(selected);
  };

  const replaceSelectedText = (newText: string) => {
    const textarea = state.contentRef.current || state.excerptRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const shouldReplaceAll = (start === end) && textarea === state.excerptRef.current;
    
    if (textarea === state.contentRef.current) {
      state.setUndoStack(prev => [...prev, { field: 'content', value: state.content }]);
    } else {
      state.setUndoStack(prev => [...prev, { field: 'excerpt', value: state.excerpt }]);
    }
    
    if (shouldReplaceAll) {
      state.setExcerpt(newText);
    } else {
      const currentValue = textarea.value;
      const newValue = currentValue.substring(0, start) + newText + currentValue.substring(end);
      
      if (textarea === state.contentRef.current) {
        state.setContent(newValue);
      } else {
        state.setExcerpt(newValue);
      }
    }
    
    state.setSelectedText("");
  };

  const handleUndo = () => {
    if (state.undoStack.length === 0) return;
    
    const lastState = state.undoStack[state.undoStack.length - 1];
    
    if (lastState.field === 'content') {
      state.setContent(lastState.value);
    } else {
      state.setExcerpt(lastState.value);
    }
    
    state.setUndoStack(prev => prev.slice(0, -1));
    
    toast("Undone", {
      description: "Scout changes have been reverted",
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Invalid file type", {
        description: "Please upload an image file",
      });
      return;
    }

    state.setIsUploadingImage(true);

    try {
      toast("Optimizing image...", {
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

      const fileExt = 'jpg';
      let baseFileName: string;
      if (state.featuredImageAlt && state.featuredImageAlt.trim()) {
        baseFileName = generateSlug(state.featuredImageAlt);
      } else if (state.title && state.title.trim()) {
        baseFileName = generateSlug(state.title);
      } else {
        baseFileName = `image-${Date.now()}`;
      }
      
      if (!baseFileName || baseFileName.length === 0) {
        baseFileName = `image-${Date.now()}`;
      }
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

      state.setFeaturedImage(publicUrl);
      
      toast.success("Image uploaded", {
        description: `Optimized and uploaded (${originalSizeMB}MB → ${compressedSizeMB}MB)`,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "Failed to upload image",
      });
    } finally {
      state.setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenAuthorDialog = (author?: any) => {
    if (author) {
      state.setIsEditingAuthor(true);
      state.setAuthorForm({
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
      });
      state.setAvatarPreview(author.avatar_url || "");
    } else {
      state.setIsEditingAuthor(false);
      state.setAuthorForm({
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
      state.setAvatarPreview("");
    }
    state.setAvatarFile(null);
    state.setShowAuthorDialog(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      state.setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        state.setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAuthor = async () => {
    try {
      let avatarUrl = state.authorForm.avatar_url;

      if (state.avatarFile) {
        const fileExt = state.avatarFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('article-images')
          .upload(filePath, state.avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('article-images')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      const authorData = {
        name: state.authorForm.name,
        slug: state.authorForm.slug || generateSlug(state.authorForm.name),
        job_title: state.authorForm.job_title || null,
        bio: state.authorForm.bio || null,
        email: state.authorForm.email || null,
        avatar_url: avatarUrl || null,
        twitter_handle: state.authorForm.twitter_handle || null,
        linkedin_url: state.authorForm.linkedin_url || null,
        website_url: state.authorForm.website_url || null
      };

      if (state.isEditingAuthor && state.authorForm.id) {
        const { error } = await supabase
          .from('authors')
          .update(authorData)
          .eq('id', state.authorForm.id);
        
        if (error) throw error;
        
        toast.success("Author updated", {
          description: "Author information has been updated successfully"
        });
      } else {
        const { data, error } = await supabase
          .from('authors')
          .insert(authorData)
          .select()
          .single();
        
        if (error) throw error;
        
        state.setAuthorId(data.id);
        toast.success("Author created", {
          description: "New author has been created successfully"
        });
      }

      queryClient.invalidateQueries({ queryKey: ['authors'] });
      state.setShowAuthorDialog(false);
      state.setAvatarFile(null);
      state.setAvatarPreview("");
    } catch (error) {
      console.error('Error saving author:', error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to save author",
      });
    }
  };

  const handleGenerateTldr = async () => {
    if (!state.title || !state.content) {
      toast.error("Missing Content", {
        description: "Please add a title and content first",
      });
      return;
    }

    state.setIsGeneratingTldr(true);
    try {
      const requestBody: any = {
        content: state.content,
        title: state.title,
      };
      
      if (initialData?.id) {
        requestBody.articleId = initialData.id;
      }
      
      const { data, error } = await supabase.functions.invoke("generate-tldr-snapshot", {
        body: requestBody,
      });

      if (error) throw error;

      if (data?.tldr_snapshot) {
        const snapshot = data.tldr_snapshot;
        if (snapshot.bullets) {
          state.setTldrSnapshot(snapshot.bullets);
          state.setWhoShouldPayAttention(snapshot.whoShouldPayAttention || "");
          state.setWhatChangesNext(snapshot.whatChangesNext || "");
          if (snapshot.signalImages) state.setSignalImages(snapshot.signalImages);
        } else if (Array.isArray(snapshot)) {
          state.setTldrSnapshot(snapshot);
        }
        if (data.content) {
          state.setContent(data.content);
        }
        toast.success("Success!", {
          description: "AI Snapshot generated with editorial context",
        });
      }
    } catch (error: any) {
      toast.error("Error", {
        description: error.message,
      });
    } finally {
      state.setIsGeneratingTldr(false);
    }
  };

  const handleGenerateHeadline = async () => {
    state.setIsGeneratingHeadline(true);
    try {
      let clipboardText = "";
      try {
        clipboardText = await navigator.clipboard.readText();
      } catch (err) {
        toast("Clipboard Access", {
          description: "Please paste your content into the browser prompt",
        });
        clipboardText = prompt("Paste your content here:") || "";
      }

      if (!clipboardText || clipboardText.trim().length === 0) {
        toast.error("No Content", {
          description: "Please copy some text to generate a headline from",
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
        const result = data.result as string;
        
        let best = "";
        const alternatives: string[] = [];
        
        const bestMatch = result.match(/BEST:\s*([^A][^L][^T].*?)(?=ALT1:|$)/i) || 
                          result.match(/BEST:\s*(.+?)(?=ALT1:|ALT2:|ALT3:|$)/i);
        if (bestMatch) {
          best = bestMatch[1].trim();
        }
        
        const alt1Match = result.match(/ALT1:\s*(.+?)(?=ALT2:|ALT3:|$)/i);
        const alt2Match = result.match(/ALT2:\s*(.+?)(?=ALT3:|$)/i);
        const alt3Match = result.match(/ALT3:\s*(.+?)$/i);
        
        if (alt1Match) alternatives.push(alt1Match[1].trim());
        if (alt2Match) alternatives.push(alt2Match[1].trim());
        if (alt3Match) alternatives.push(alt3Match[1].trim());
        
        if (!best) {
          best = result.replace(/^(BEST:|ALT\d:)\s*/gi, '').split(/ALT\d:/i)[0].trim();
        }
        
        state.setHeadlineOptions({ best, alternatives });
        state.setShowHeadlineDialog(true);
      }
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to generate headline",
      });
    } finally {
      state.setIsGeneratingHeadline(false);
    }
  };

  const handleSelectHeadline = (headline: string) => {
    state.setTitle(headline);
    if (!initialData) {
      state.setSlug(generateSlug(headline));
    }
    state.setShowHeadlineDialog(false);
    state.setHeadlineOptions(null);
    toast.success("Headline Selected", {
      description: "Title and slug have been updated",
    });
  };

  const handleGenerateSEO = async () => {
    if (!initialData?.id) {
      toast.error("Save Required", {
        description: "Please save the article first before generating SEO",
      });
      return;
    }

    state.setIsGeneratingSEO(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-article-seo", {
        body: {
          articleId: initialData.id,
          title: state.title,
          content: state.content,
          excerpt: state.excerpt,
        },
      });

      if (error) throw error;

      if (data?.data) {
        state.setMetaTitle(data.data.meta_title);
        state.setSeoTitle(data.data.seo_title);
        state.setFocusKeyphrase(data.data.focus_keyphrase);
        state.setKeyphraseSynonyms(data.data.keyphrase_synonyms);
        state.setMetaDescription(data.data.meta_description);
        
        if (data.data.focus_keyphrase && !state.featuredImageAlt) {
          state.setFeaturedImageAlt(data.data.focus_keyphrase);
        }
        
        toast.success("SEO Generated!", {
          description: "All SEO fields have been populated with AI-optimized content",
        });
      }
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "Failed to generate SEO metadata",
      });
    } finally {
      state.setIsGeneratingSEO(false);
    }
  };

  const handleScoutRewrite = async () => {
    if (!state.content || state.content.trim().length === 0) {
      toast.error("No Content", {
        description: "Please add content to the article before rewriting",
      });
      return;
    }

    state.setIsRewritingArticle(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("scout-assistant", {
        body: { 
          action: 'rewrite-with-images',
          content: state.content, 
          context: {
            title: state.title,
            focusKeyphrase: state.focusKeyphrase,
            currentArticleId: initialData?.id,
          },
        },
      });

      if (error) throw error;

      if (data?.result) {
        state.setContent(data.result);
        
        // Featured image
        if (data.featuredImage) {
          state.setFeaturedImage(data.featuredImage);
          state.setFeaturedImageAlt(data.featuredImageAlt || '');
        }
        
        // Headline
        if (data.headline) state.setTitle(data.headline);
        
        // Excerpt
        if (data.excerpt) state.setExcerpt(data.excerpt);
        
        // TL;DR
        if (data.tldr && Array.isArray(data.tldr)) {
          state.setTldrSnapshot(data.tldr);
        }
        if (data.whoShouldPayAttention) state.setWhoShouldPayAttention(data.whoShouldPayAttention);
        if (data.whatChangesNext) state.setWhatChangesNext(data.whatChangesNext);

        // Category
        if (data.categoryId) {
          state.setPrimaryCategoryId(data.categoryId);
        }

        // SEO fields
        if (data.metaTitle) state.setMetaTitle(data.metaTitle);
        if (data.seoTitle) state.setSeoTitle(data.seoTitle);
        if (data.focusKeyphrase) {
          state.setFocusKeyphrase(data.focusKeyphrase);
          if (data.featuredImage && !data.featuredImageAlt) {
            state.setFeaturedImageAlt(data.focusKeyphrase);
          }
        }
        if (data.keyphraseSynonyms) state.setKeyphraseSynonyms(data.keyphraseSynonyms);
        if (data.metaDescription) state.setMetaDescription(data.metaDescription);

        // Success toast
        const parts: string[] = [];
        if (data.headline) parts.push('headline');
        if (data.categoryName) parts.push(`category: ${data.categoryName}`);
        if (data.excerpt) parts.push('excerpt');
        if (data.tldr) parts.push('TL;DR');
        if (data.imagesGenerated > 0) parts.push(`${data.imagesGenerated} image${data.imagesGenerated > 1 ? 's' : ''}`);
        if (data.focusKeyphrase) parts.push('SEO');
        toast.success("Article Rewritten", {
          description: parts.length > 0
            ? `Generated: ${parts.join(', ')}`
            : "Content rewritten successfully",
        });
      }

      // Auto-trigger link validation on the new content
      try {
        const newContent = data?.result || state.content;
        const { data: linkData } = await supabase.functions.invoke("scout-assistant", {
          body: { action: 'validate-links', content: newContent },
        });
        if (linkData?.results) {
          const broken = linkData.results.filter((l: any) => !l.ok);
          if (broken.length > 0) {
            toast.warning(`Found ${broken.length} broken link${broken.length > 1 ? 's' : ''}`, {
              description: "Check Link Validator for details",
            });
          }
        }
      } catch {
        // Link validation is non-critical
      }
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to rewrite article" });
    } finally {
      state.setIsRewritingArticle(false);
    }
  };

  const handleGenerateImagePrompts = async () => {
    if (!state.title || !state.content) {
      toast.error("Missing content", { description: "Please add a title and content to generate image prompts" });
      return;
    }

    state.setIsGeneratingImagePrompts(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-image-prompts", {
        body: { title: state.title, content: state.content },
      });

      if (error) throw error;

      if (Array.isArray(data?.prompts) && data.prompts.length > 0) {
        const normalized = data.prompts.map((p: any) => ({
          title: p.title,
          prompt: p.prompt,
          explanation: p.explanation ?? "",
        }));
        state.setImagePrompts(normalized);
        toast.success("Prompts Generated!", { description: `Scout has created ${normalized.length} custom image prompts` });
        return;
      }

      if (typeof data?.ideogram === "string" && data.ideogram.trim()) {
        const parsePrompts = (text: string) => {
          const prompts: Array<{ title: string; prompt: string; explanation: string }> = [];
          const sections = text.split(/(?=\d+\.\s+[A-Z])/);

          for (const section of sections) {
            if (!section.trim()) continue;
            const lines = section.split("\n").filter((l) => l.trim());
            if (lines.length === 0) continue;
            const titleMatch = lines[0].match(/\d+\.\s+(.+)/);
            const t = titleMatch ? titleMatch[1] : lines[0];
            const whyIndex = section.indexOf("Why it works:");
            let prompt = "";
            let explanation = "";
            if (whyIndex > -1) {
              prompt = section.substring(0, whyIndex).replace(/\d+\.\s+.+\n/, "").trim();
              explanation = section.substring(whyIndex + 14).trim();
            } else {
              prompt = section.replace(/\d+\.\s+.+\n/, "").trim();
            }
            if (prompt) {
              prompts.push({ title: t, prompt, explanation: explanation || "" });
            }
          }
          return prompts;
        };

        const parsedPrompts = parsePrompts(data.ideogram);
        state.setImagePrompts(parsedPrompts);
        toast.success("Prompts Generated!", { description: `Scout has created ${parsedPrompts.length} custom image prompts` });
        return;
      }

      toast.error("Error", { description: "No prompts returned from the generator" });
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to generate image prompts" });
    } finally {
      state.setIsGeneratingImagePrompts(false);
    }
  };

  const handleCopyPrompt = async (prompt: string, index: number) => {
    await navigator.clipboard.writeText(prompt);
    state.setCopiedPrompt(index);
    setTimeout(() => state.setCopiedPrompt(null), 2000);
    toast("Copied!", { description: "Prompt copied to clipboard" });
  };

  const buildSaveData = () => {
    let scheduledDateTime = null;
    let finalStatus = state.status;
    
    if (state.scheduledFor && state.scheduledTime) {
      const [hours, minutes] = state.scheduledTime.split(':').map(Number);
      const dateTime = new Date(state.scheduledFor);
      dateTime.setHours(hours, minutes, 0, 0);
      scheduledDateTime = dateTime.toISOString();
      
      if (finalStatus === 'draft') {
        finalStatus = 'scheduled';
      }
    }

    let publishedDateTime = null;
    if (state.publishedAt && state.publishedTime) {
      const [hours, minutes] = state.publishedTime.split(':').map(Number);
      const dateTime = new Date(state.publishedAt);
      dateTime.setHours(hours, minutes, 0, 0);
      publishedDateTime = dateTime.toISOString();
    }

    let previewCode = initialData?.preview_code;
    if (finalStatus !== 'published' && !previewCode) {
      previewCode = crypto.randomUUID().substring(0, 8);
    } else if (finalStatus === 'published') {
      previewCode = null;
    }

    let finalSlug = state.slug.replace(/\//g, '');
    if (!finalSlug.trim() && state.title) {
      finalSlug = state.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }

    let finalAuthorId = state.authorId;
    if (!finalAuthorId) {
      const intelligenceDeskAuthor = authors?.find(a => a.name === "Intelligence Desk");
      if (intelligenceDeskAuthor) {
        finalAuthorId = intelligenceDeskAuthor.id;
      }
    }

    return {
      title: state.title,
      slug: finalSlug,
      excerpt: state.excerpt,
      content: state.content,
      tldr_snapshot: {
        bullets: state.tldrSnapshot,
        whoShouldPayAttention: state.whoShouldPayAttention,
        whatChangesNext: state.whatChangesNext,
        signalImages: state.signalImages
      },
      article_type: state.articleType,
      status: finalStatus,
      featured_image_url: state.featuredImage,
      featured_image_alt: state.featuredImageAlt,
      seo_title: state.seoTitle,
      meta_title: state.metaTitle,
      meta_description: state.metaDescription,
      focus_keyphrase: state.focusKeyphrase,
      keyphrase_synonyms: state.keyphraseSynonyms,
      featured_on_homepage: state.featuredOnHomepage,
      sticky: state.sticky,
      is_trending: state.isTrending,
      homepage_trending: state.homepageTrending,
      author_id: finalAuthorId || null,
      primary_category_id: state.primaryCategoryId || null,
      scheduled_for: scheduledDateTime,
      published_at: publishedDateTime,
      preview_code: previewCode,
      ...(state.articleType === 'policy_article' && {
        region: state.region || null,
        country: state.country || null,
        governance_maturity: state.governanceMaturity || null,
        policy_sections: state.policySections,
        comparison_tables: state.comparisonTables,
        local_resources: state.localResources,
        sources: state.sources,
        topic_tags: state.topicTags,
        policy_status: state.policyStatus || null,
        policy_effective_date: state.policyEffectiveDate || null,
        policy_applies_to: state.policyAppliesTo || null,
        policy_regulatory_impact: state.policyRegulatoryImpact || null,
        last_editorial_review: state.lastEditorialReview || null,
      }),
      ...(state.articleType === 'top_lists' && {
        top_list_items: state.topListItems.map((item: any, index: number) =>
          index === 0 ? { ...item, showPromptTools: state.topListShowPromptTools } : item
        ),
        top_list_intro: state.topListIntro,
        top_list_outro: state.topListOutro,
      }),
    };
  };

  return {
    fileInputRef,
    handleTitleChange,
    handleTextSelection,
    replaceSelectedText,
    handleUndo,
    handleImageUpload,
    handleOpenAuthorDialog,
    handleAvatarChange,
    handleSaveAuthor,
    handleGenerateTldr,
    handleGenerateHeadline,
    handleSelectHeadline,
    handleGenerateSEO,
    handleScoutRewrite,
    handleGenerateImagePrompts,
    handleCopyPrompt,
    buildSaveData,
  };
};
