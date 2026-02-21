import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Upload, Loader2, Wand2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ScoutWritingAssistant from "@/components/ScoutWritingAssistant";
import RichTextEditor from "@/components/RichTextEditor";
import { PolicyArticleEditor } from "@/components/PolicyArticleEditor";
import { TopListsEditor } from "@/components/TopListsEditor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { LinkValidator } from "@/components/LinkValidator";
import { 
  AuthorDialog, 
  HeadlineDialog, 
  ImagePromptsCard, 
  TldrSnapshotCard,
  EditorSEOTab,
  EditorSettingsTab 
} from "@/components/editor";
import { useCMSEditorState } from "@/hooks/useCMSEditorState";
import { useCMSEditorActions } from "@/hooks/useCMSEditorActions";

interface CMSEditorProps {
  initialData?: any;
  onSave?: (data: any) => void;
}

const CMSEditor = ({ initialData, onSave }: CMSEditorProps) => {
  const { toast } = useToast();
  const state = useCMSEditorState({ initialData });

  // Fetch authors
  const { data: authors } = useQuery({
    queryKey: ['authors'],
    staleTime: 5 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch policy regions
  const { data: policyRegions, isLoading: policyRegionsLoading, error: policyRegionsError } = useQuery({
    queryKey: ['policy-regions'],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('slug')
        .in('slug', [
          'north-asia', 'asean', 'oceania', 'greater-china', 'anglosphere',
          'europe', 'mena', 'africa', 'latin-america', 'south-asia',
          'pan-pacific', 'pan-asia', 'global-comparison'
        ])
        .order('display_order');
      if (error) throw error;
      return data?.map(r => r.slug) || [];
    }
  });

  // Fetch policy topic tags
  const { data: policyTopicTags, isLoading: policyTopicTagsLoading, error: policyTopicTagsError } = useQuery({
    queryKey: ['policy-topic-tags'],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('name')
        .in('slug', ['privacy', 'safety', 'accountability', 'fairness', 'transparency', 'risk', 'law', 'ethics', 'regulation'])
        .order('name');
      if (error) throw error;
      return data?.map(t => t.name) || [];
    }
  });

  const actions = useCMSEditorActions({ state, initialData, authors });

  const handleSave = () => {
    const data = actions.buildSaveData();
    onSave?.(data);
  };

  // Handle article type changes with auto-fill for 3-Before-9
  const handleArticleTypeChange = (value: string) => {
    state.setArticleType(value);
    if (value === 'three_before_nine' && !initialData?.id) {
      const today = new Date();
      const dateStr = format(today, 'yyyy-MM-dd');
      const displayDate = format(today, 'MMMM d, yyyy');
      
      state.setTitle(`3 Before 9: ${displayDate}`);
      state.setSlug(`3-before-9-${dateStr}`);
      state.setPrimaryCategoryId('65520fa1-c045-4a40-b7ae-418d22026a0e');
      state.setAuthorId('efae4a91-4c99-4ac3-bfef-21f81d6e7551');
      state.setFeaturedImage('/images/3-before-9-hero.png');
      state.setFeaturedImageAlt('3 Before 9 - Your daily AI intelligence briefing');
      state.setExcerpt('Your essential AI intelligence briefing. Three signals that matter, delivered before your first cup of coffee.');
      state.setSeoTitle(`3 Before 9: AI News for ${displayDate} | AI in Asia`);
      state.setMetaDescription('Three essential AI developments you need to know before 9am. Expert analysis on what matters for business leaders in Asia.');
      state.setFocusKeyphrase('AI news Asia');
      state.setFeaturedOnHomepage(false);
      state.setWhoShouldPayAttention('AI leaders, founders, enterprise decision-makers, and teams deploying AI across Asia.');
      state.setWhatChangesNext('Regulatory expectations tighten, infrastructure buildout accelerates, and enterprise AI governance matures.');
    }
  };

  // Category sorting for dropdown
  const sortedCategories = categories
    ?.filter((category) => category.name.toLowerCase() !== 'uncategorized')
    .sort((a, b) => {
      const priorityOrder = ['News', 'Business', 'Life', 'Learn', 'Create', 'Voices'];
      const policyRegionsList = ['MENA', 'Africa', 'North Asia', 'ASEAN', 'Greater China', 'South Asia', 'Oceania', 'Europe', 'Americas', 'Anglosphere', 'Global Comparison', 'Latin America', 'Pan-Asia', 'Pan-Pacific'];
      
      const aIndex = priorityOrder.indexOf(a.name);
      const bIndex = priorityOrder.indexOf(b.name);
      const aIsPolicy = policyRegionsList.includes(a.name);
      const bIsPolicy = policyRegionsList.includes(b.name);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      if (aIsPolicy && !bIsPolicy) return 1;
      if (!aIsPolicy && bIsPolicy) return -1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="max-w-6xl mx-auto">
      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className={cn("grid w-full", 
          state.articleType === 'policy_article' || state.articleType === 'top_lists' ? "grid-cols-4" : "grid-cols-3"
        )}>
          <TabsTrigger value="content">Content</TabsTrigger>
          {state.articleType === 'policy_article' && (
            <TabsTrigger value="policy">Policy Data</TabsTrigger>
          )}
          {state.articleType === 'top_lists' && (
            <TabsTrigger value="toplists">Top Lists</TabsTrigger>
          )}
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Content</CardTitle>
              <CardDescription>Write and format your article</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="title">Title</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={actions.handleGenerateHeadline}
                    disabled={state.isGeneratingHeadline}
                    className="bg-[#10b981] hover:bg-[#059669] text-white border-0"
                  >
                    {state.isGeneratingHeadline ? (
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
                  value={state.title}
                  onChange={(e) => actions.handleTitleChange(e.target.value)}
                  placeholder="Enter article title..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Copy content and click Scout Headline to generate a catchy title
                </p>
              </div>

              {/* Slug */}
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={state.slug}
                  onChange={(e) => state.setSlug(e.target.value)}
                  placeholder="article-url-slug"
                />
              </div>

              {/* Article Type */}
              <div>
                <Label htmlFor="article-type">Article Type</Label>
                <Select value={state.articleType} onValueChange={handleArticleTypeChange}>
                  <SelectTrigger id="article-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="policy_article">Policy Article</SelectItem>
                    <SelectItem value="top_lists">Top Lists</SelectItem>
                    <SelectItem value="editors_note">Editor's Note</SelectItem>
                    <SelectItem value="three_before_nine">3-Before-9</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Primary Category */}
              <div>
                <Label htmlFor="primary-category">Primary Category</Label>
                <Select value={state.primaryCategoryId} onValueChange={state.setPrimaryCategoryId}>
                  <SelectTrigger id="primary-category">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedCategories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Main category for this article (used for related articles)
                </p>
              </div>

              {/* Excerpt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <ScoutWritingAssistant
                    selectedText={state.selectedText}
                    onReplace={actions.replaceSelectedText}
                    fullFieldContent={state.excerpt}
                    context={{ title: state.title, fullContent: state.content }}
                    canUndo={state.undoStack.length > 0}
                    onUndo={actions.handleUndo}
                  />
                </div>
                <Textarea
                  ref={state.excerptRef}
                  id="excerpt"
                  value={state.excerpt}
                  onChange={(e) => state.setExcerpt(e.target.value)}
                  onSelect={(e) => actions.handleTextSelection(e.currentTarget)}
                  placeholder="Brief summary of the article..."
                  rows={3}
                />
              </div>

              {/* Featured Image */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="featured-image">Featured Image</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Paste URL or upload (auto-optimized to ~1MB)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="featured-image"
                      value={state.featuredImage}
                      onChange={(e) => state.setFeaturedImage(e.target.value)}
                      placeholder="Paste image URL or upload below"
                      className="flex-1"
                    />
                    <input
                      ref={actions.fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={actions.handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => actions.fileInputRef.current?.click()}
                      disabled={state.isUploadingImage}
                    >
                      {state.isUploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    {state.featuredImage && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          state.setFeaturedImage('');
                          state.setFeaturedImageAlt('');
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {state.featuredImage && (
                    <div className="mt-2">
                      <img
                        src={state.featuredImage}
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
                    value={state.featuredImageAlt}
                    onChange={(e) => state.setFeaturedImageAlt(e.target.value)}
                    placeholder="Descriptive alt text for accessibility"
                  />
                </div>
              </div>

              {/* Rich Text Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Article Content (Live Preview)</Label>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={actions.handleScoutRewrite}
                    disabled={state.isRewritingArticle || !state.content}
                    className="bg-[#10b981] hover:bg-[#059669] text-white"
                  >
                    {state.isRewritingArticle ? (
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
                  value={state.content}
                  onChange={state.setContent}
                  onSelect={state.setSelectedText}
                  placeholder="Start writing your article..."
                  keyphraseSynonyms={state.keyphraseSynonyms}
                />
              </div>

              {/* Image Prompts */}
              <ImagePromptsCard
                imagePrompts={state.imagePrompts}
                copiedPrompt={state.copiedPrompt}
                onCopyPrompt={actions.handleCopyPrompt}
                isGenerating={state.isGeneratingImagePrompts}
                onGenerate={actions.handleGenerateImagePrompts}
                disabled={!state.title || !state.content}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policy Tab */}
        <TabsContent value="policy" className="space-y-6">
          {state.articleType === 'policy_article' ? (
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
                </CardContent>
              </Card>
            ) : (
              <PolicyArticleEditor
                region={state.region}
                country={state.country}
                governanceMaturity={state.governanceMaturity}
                policySections={state.policySections}
                comparisonTables={state.comparisonTables}
                localResources={state.localResources}
                sources={state.sources}
                topicTags={state.topicTags}
                policyStatus={state.policyStatus}
                policyEffectiveDate={state.policyEffectiveDate}
                policyAppliesTo={state.policyAppliesTo}
                policyRegulatoryImpact={state.policyRegulatoryImpact}
                lastEditorialReview={state.lastEditorialReview}
                onRegionChange={state.setRegion}
                onCountryChange={state.setCountry}
                onGovernanceMaturityChange={state.setGovernanceMaturity}
                onPolicySectionsChange={state.setPolicySections}
                onComparisonTablesChange={state.setComparisonTables}
                onLocalResourcesChange={state.setLocalResources}
                onSourcesChange={state.setSources}
                onTopicTagsChange={state.setTopicTags}
                onPolicyStatusChange={state.setPolicyStatus}
                onPolicyEffectiveDateChange={state.setPolicyEffectiveDate}
                onPolicyAppliesToChange={state.setPolicyAppliesTo}
                onPolicyRegulatoryImpactChange={state.setPolicyRegulatoryImpact}
                onLastEditorialReviewChange={state.setLastEditorialReview}
                availableRegions={policyRegions || []}
                availableTopicTags={policyTopicTags || []}
              />
            )
          ) : null}
        </TabsContent>

        {/* Top Lists Tab */}
        <TabsContent value="toplists" className="space-y-6">
          {state.articleType === 'top_lists' && (
            <TopListsEditor
              items={state.topListItems}
              onChange={state.setTopListItems}
              intro={state.topListIntro}
              onIntroChange={state.setTopListIntro}
              outro={state.topListOutro}
              onOutroChange={state.setTopListOutro}
              showPromptTools={state.topListShowPromptTools}
              onShowPromptToolsChange={state.setTopListShowPromptTools}
            />
          )}
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <EditorSEOTab
            seoTitle={state.seoTitle}
            metaTitle={state.metaTitle}
            metaDescription={state.metaDescription}
            focusKeyphrase={state.focusKeyphrase}
            keyphraseSynonyms={state.keyphraseSynonyms}
            isGeneratingSEO={state.isGeneratingSEO}
            canGenerateSEO={!!initialData?.id}
            onSeoTitleChange={state.setSeoTitle}
            onMetaTitleChange={state.setMetaTitle}
            onMetaDescriptionChange={state.setMetaDescription}
            onFocusKeyphraseChange={state.setFocusKeyphrase}
            onKeyphraseSynonymsChange={state.setKeyphraseSynonyms}
            onGenerateSEO={actions.handleGenerateSEO}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <EditorSettingsTab
            status={state.status}
            slug={state.slug}
            scheduledFor={state.scheduledFor}
            scheduledTime={state.scheduledTime}
            publishedAt={state.publishedAt}
            publishedTime={state.publishedTime}
            featuredOnHomepage={state.featuredOnHomepage}
            sticky={state.sticky}
            isTrending={state.isTrending}
            homepageTrending={state.homepageTrending}
            authorId={state.authorId}
            authors={authors}
            initialData={initialData}
            onStatusChange={state.setStatus}
            onScheduledForChange={state.setScheduledFor}
            onScheduledTimeChange={state.setScheduledTime}
            onPublishedAtChange={state.setPublishedAt}
            onPublishedTimeChange={state.setPublishedTime}
            onFeaturedOnHomepageChange={state.setFeaturedOnHomepage}
            onStickyChange={state.setSticky}
            onIsTrendingChange={state.setIsTrending}
            onHomepageTrendingChange={state.setHomepageTrending}
            onAuthorIdChange={state.setAuthorId}
            onOpenAuthorDialog={actions.handleOpenAuthorDialog}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AuthorDialog
        open={state.showAuthorDialog}
        onOpenChange={state.setShowAuthorDialog}
        isEditing={state.isEditingAuthor}
        authorForm={state.authorForm}
        onAuthorFormChange={state.setAuthorForm}
        avatarPreview={state.avatarPreview}
        onAvatarChange={actions.handleAvatarChange}
        onSave={actions.handleSaveAuthor}
      />

      <HeadlineDialog
        open={state.showHeadlineDialog}
        onOpenChange={state.setShowHeadlineDialog}
        headlineOptions={state.headlineOptions}
        onSelectHeadline={actions.handleSelectHeadline}
      />

      {/* TL;DR Snapshot */}
      <TldrSnapshotCard
        tldrSnapshot={state.tldrSnapshot}
        whoShouldPayAttention={state.whoShouldPayAttention}
        whatChangesNext={state.whatChangesNext}
        isGenerating={state.isGeneratingTldr}
        disabled={!state.title || !state.content}
        onTldrChange={state.setTldrSnapshot}
        onWhoChange={state.setWhoShouldPayAttention}
        onWhatChange={state.setWhatChangesNext}
        onGenerate={actions.handleGenerateTldr}
        articleType={state.articleType}
        signalImages={state.signalImages}
        onSignalImagesChange={state.setSignalImages}
      />

      {/* Link Validator */}
      <div className="mt-6">
        <LinkValidator 
          content={state.content} 
          onApplyFix={(originalUrl, newUrl, newText) => {
            const escapedOriginal = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const markdownPattern = new RegExp(`\\[([^\\]]+)\\]\\(${escapedOriginal}\\)`, 'g');
            let newContent = state.content.replace(markdownPattern, `[${newText || '$1'}](${newUrl})`);
            if (newContent === state.content) {
              newContent = state.content.replace(new RegExp(escapedOriginal, 'g'), newUrl);
            }
            state.setContent(newContent);
            toast({
              title: "Link updated",
              description: `Replaced ${originalUrl} with ${newUrl}`,
            });
          }}
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-8 pb-8">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Save Article
        </Button>
      </div>
    </div>
  );
};

export default CMSEditor;
