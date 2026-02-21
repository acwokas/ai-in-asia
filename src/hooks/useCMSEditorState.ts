import { useState, useRef } from "react";
import { format } from "date-fns";
import { convertJsonbToMarkdown } from "@/lib/markdownConversion";

export interface CMSEditorStateOptions {
  initialData?: any;
}

export const useCMSEditorState = ({ initialData }: CMSEditorStateOptions) => {
  // Core article fields
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [content, setContent] = useState(convertJsonbToMarkdown(initialData?.content) || "");
  
  // TL;DR Snapshot
  const [tldrSnapshot, setTldrSnapshot] = useState<string[]>(() => {
    const snapshot = initialData?.tldr_snapshot;
    if (Array.isArray(snapshot)) return snapshot;
    if (snapshot?.bullets && Array.isArray(snapshot.bullets)) return snapshot.bullets;
    return [];
  });
  const [whoShouldPayAttention, setWhoShouldPayAttention] = useState<string>(() => {
    const snapshot = initialData?.tldr_snapshot;
    if (!Array.isArray(snapshot) && snapshot?.whoShouldPayAttention) return snapshot.whoShouldPayAttention;
    return "";
  });
  const [whatChangesNext, setWhatChangesNext] = useState<string>(() => {
    const snapshot = initialData?.tldr_snapshot;
    if (!Array.isArray(snapshot) && snapshot?.whatChangesNext) return snapshot.whatChangesNext;
    return "";
  });
  const [signalImages, setSignalImages] = useState<string[]>(() => {
    const snapshot = initialData?.tldr_snapshot;
    if (!Array.isArray(snapshot) && snapshot?.signalImages) return snapshot.signalImages;
    return ["", "", ""];
  });
  const [isGeneratingTldr, setIsGeneratingTldr] = useState(false);

  // Article settings
  const [articleType, setArticleType] = useState(initialData?.article_type || "article");
  const [status, setStatus] = useState(initialData?.status || "draft");
  const [featuredImage, setFeaturedImage] = useState(initialData?.featured_image_url || "");
  const [featuredImageAlt, setFeaturedImageAlt] = useState(initialData?.featured_image_alt || "");
  
  // SEO fields
  const [seoTitle, setSeoTitle] = useState(initialData?.seo_title || "");
  const [metaTitle, setMetaTitle] = useState(initialData?.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(initialData?.meta_description || "");
  const [focusKeyphrase, setFocusKeyphrase] = useState(initialData?.focus_keyphrase || "");
  const [keyphraseSynonyms, setKeyphraseSynonyms] = useState(initialData?.keyphrase_synonyms || "");
  
  // Display settings
  const [featuredOnHomepage, setFeaturedOnHomepage] = useState(initialData?.featured_on_homepage ?? true);
  const [sticky, setSticky] = useState(initialData?.sticky ?? false);
  const [isTrending, setIsTrending] = useState(initialData?.is_trending ?? false);
  const [homepageTrending, setHomepageTrending] = useState(initialData?.homepage_trending ?? false);
  
  // Author & Category
  const [authorId, setAuthorId] = useState(initialData?.author_id || "");
  const [primaryCategoryId, setPrimaryCategoryId] = useState(initialData?.primary_category_id || "");
  
  // Scheduling
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
  
  // UI state
  const [selectedText, setSelectedText] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Author dialog state
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
  
  // Scout assist state
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
  const [policyStatus, setPolicyStatus] = useState(initialData?.policy_status || "");
  const [policyEffectiveDate, setPolicyEffectiveDate] = useState(initialData?.policy_effective_date || "");
  const [policyAppliesTo, setPolicyAppliesTo] = useState(initialData?.policy_applies_to || "");
  const [policyRegulatoryImpact, setPolicyRegulatoryImpact] = useState(initialData?.policy_regulatory_impact || "");
  const [lastEditorialReview, setLastEditorialReview] = useState(initialData?.last_editorial_review || "");
  
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

  // Refs
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const excerptRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return {
    // Core fields
    title, setTitle,
    slug, setSlug,
    excerpt, setExcerpt,
    content, setContent,
    
    // TL;DR
    tldrSnapshot, setTldrSnapshot,
    whoShouldPayAttention, setWhoShouldPayAttention,
    whatChangesNext, setWhatChangesNext,
    signalImages, setSignalImages,
    isGeneratingTldr, setIsGeneratingTldr,
    
    // Settings
    articleType, setArticleType,
    status, setStatus,
    featuredImage, setFeaturedImage,
    featuredImageAlt, setFeaturedImageAlt,
    
    // SEO
    seoTitle, setSeoTitle,
    metaTitle, setMetaTitle,
    metaDescription, setMetaDescription,
    focusKeyphrase, setFocusKeyphrase,
    keyphraseSynonyms, setKeyphraseSynonyms,
    
    // Display
    featuredOnHomepage, setFeaturedOnHomepage,
    sticky, setSticky,
    isTrending, setIsTrending,
    homepageTrending, setHomepageTrending,
    
    // Author & Category
    authorId, setAuthorId,
    primaryCategoryId, setPrimaryCategoryId,
    
    // Scheduling
    scheduledFor, setScheduledFor,
    scheduledTime, setScheduledTime,
    publishedAt, setPublishedAt,
    publishedTime, setPublishedTime,
    
    // UI
    selectedText, setSelectedText,
    isUploadingImage, setIsUploadingImage,
    
    // Author dialog
    showAuthorDialog, setShowAuthorDialog,
    isEditingAuthor, setIsEditingAuthor,
    authorForm, setAuthorForm,
    avatarFile, setAvatarFile,
    avatarPreview, setAvatarPreview,
    
    // Scout assist
    isGeneratingHeadline, setIsGeneratingHeadline,
    headlineOptions, setHeadlineOptions,
    showHeadlineDialog, setShowHeadlineDialog,
    isGeneratingSEO, setIsGeneratingSEO,
    isRewritingArticle, setIsRewritingArticle,
    copiedPrompt, setCopiedPrompt,
    isGeneratingImagePrompts, setIsGeneratingImagePrompts,
    imagePrompts, setImagePrompts,
    
    // Undo
    undoStack, setUndoStack,
    
    // Policy
    region, setRegion,
    country, setCountry,
    governanceMaturity, setGovernanceMaturity,
    policySections, setPolicySections,
    comparisonTables, setComparisonTables,
    localResources, setLocalResources,
    topicTags, setTopicTags,
    policyStatus, setPolicyStatus,
    policyEffectiveDate, setPolicyEffectiveDate,
    policyAppliesTo, setPolicyAppliesTo,
    policyRegulatoryImpact, setPolicyRegulatoryImpact,
    lastEditorialReview, setLastEditorialReview,
    
    // Top Lists
    topListItems, setTopListItems,
    topListIntro, setTopListIntro,
    topListOutro, setTopListOutro,
    topListShowPromptTools, setTopListShowPromptTools,
    
    // Refs
    contentRef,
    excerptRef,
    fileInputRef,
  };
};

export type CMSEditorState = ReturnType<typeof useCMSEditorState>;
