import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { ArrowLeft, Copy, Check, Tag, User, Globe, Cpu, BookOpen, FileText, Target, Lightbulb, RefreshCw, PenTool, Wrench, Pin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GuideComments from "@/components/GuideComments";
import SeasoningMatrixDownload from "@/components/SeasoningMatrixDownload";

// Sanitize corrupted content from CSV imports
const sanitizeContent = (text: string | null | undefined): string => {
  if (!text) return '';
  
  let sanitized = text;
  
  // Decode URL-encoded strings
  try {
    // Check if text contains URL-encoded characters
    if (sanitized.includes('%20') || sanitized.includes('%3A') || sanitized.includes('%2F')) {
      sanitized = decodeURIComponent(sanitized);
    }
  } catch {
    // If decoding fails, continue with original
  }
  
  // Remove corrupted file paths
  sanitized = sanitized
    .replace(/onlinefile:\/\/[^\s]*/gi, '')
    .replace(/file:\/\/\/[^\s]*/gi, '')
    .replace(/[A-Z]:\\[^\s]*/gi, '')
    .replace(/\/home\/[^\s]*redirect\.html[^\s]*/gi, '');
  
  // Fix broken URLs embedded in text (like "2025https://..." -> proper link handling)
  // Remove URLs that are concatenated directly to text without spaces
  sanitized = sanitized.replace(/(\d{4})(https?:\/\/[^\s]+)/g, '$1');
  
  // Remove orphaned URL fragments
  sanitized = sanitized.replace(/#:~:text=[^\s]*/g, '');
  
  // Clean up any leftover artifacts
  sanitized = sanitized
    .replace(/\s+/g, ' ')
    .trim();
  
  return sanitized;
};

// Check if content references downloads/resources that we now provide
const hasSeasoningMatrixContent = (text: string | null | undefined): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return lowerText.includes('seasoning matrix') || 
         (lowerText.includes('download') && lowerText.includes('matrix'));
};

// Check if content references non-existent downloads/resources (excluding seasoning matrix which we now have)
const hasUnactionableContent = (text: string | null | undefined, slug: string | undefined): boolean => {
  if (!text) return false;
  // Don't filter out seasoning matrix content for the hot honey guide - we have that resource now
  if (slug === 'ai-viral-recipe-hot-honey-cottage-cheese-ext' && hasSeasoningMatrixContent(text)) {
    return false;
  }
  const lowerText = text.toLowerCase();
  return (
    (lowerText.includes('download') && (lowerText.includes('template') || lowerText.includes('matrix') || lowerText.includes('worksheet') || lowerText.includes('pdf'))) ||
    (lowerText.includes('use the provided') && lowerText.includes('template'))
  );
};

// Determine if a section should use numbered steps based on heading AND content
const shouldShowAsSteps = (heading: string, text: string): boolean => {
  const stepHeadings = ['expanded steps', 'step-by-step', 'how to', 'instructions', 'process'];
  const headingLower = heading.toLowerCase();
  
  // Only show as steps if heading explicitly indicates steps
  if (stepHeadings.some(h => headingLower.includes(h))) {
    return true;
  }
  
  // Check for explicit step patterns in content
  const explicitStepPatterns = [
    /^Step\s+\d+:/gm,
    /^Sub-step\s+[A-Z]:/gm,
  ];
  
  return explicitStepPatterns.some(pattern => pattern.test(text));
};

// Format step-based content as a list
const formatStepContent = (text: string): string[] => {
  // Split on explicit step markers
  const items = text
    .split(/(?=Step\s+\d+:|Sub-step\s+[A-Z]:)/gi)
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  if (items.length > 1) {
    return items;
  }
  
  // Fall back to sentence splitting for step content
  const sentences = text.split(/\.\s+/).filter(s => s.trim().length > 0);
  return sentences.map(s => s.trim() + (s.endsWith('.') ? '' : '.'));
};

// Get section icon based on heading - returns Lucide icon component
const getSectionIcon = (heading: string) => {
  const headingLower = heading.toLowerCase();
  if (headingLower.includes('context') || headingLower.includes('background')) return FileText;
  if (headingLower.includes('step') || headingLower.includes('expanded')) return Target;
  if (headingLower.includes('explanation') || headingLower.includes('deeper')) return Lightbulb;
  if (headingLower.includes('variation') || headingLower.includes('alternative')) return RefreshCw;
  if (headingLower.includes('interactive') || headingLower.includes('exercise')) return PenTool;
  if (headingLower.includes('troubleshoot') || headingLower.includes('tip')) return Wrench;
  return Pin;
};

// Format prose content with paragraph breaks for readability
const formatProseContent = (text: string): string[] => {
  // Split on double newlines or periods followed by sentences starting with capital letters
  const paragraphs = text
    .split(/\n\n+/)
    .flatMap(p => {
      // If paragraph is very long (>400 chars), try to split it further
      if (p.length > 400) {
        // Split on sentence boundaries where a new thought begins
        const sentences = p.split(/(?<=[.!?])\s+(?=[A-Z])/);
        const chunks: string[] = [];
        let currentChunk = '';
        
        sentences.forEach(sentence => {
          if (currentChunk.length + sentence.length > 350 && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        });
        
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        
        return chunks.length > 0 ? chunks : [p];
      }
      return [p];
    })
    .filter(p => p.trim().length > 0);
  
  return paragraphs;
};

const GuideDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);

  const { data: guide, isLoading, error } = useQuery({
    queryKey: ["ai-guide", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_guides")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  const copyPrompt = async (promptText: string, promptIndex: number) => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedPrompt(promptIndex);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopiedPrompt(null), 2000);
    } catch (err) {
      toast.error("Failed to copy prompt");
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background py-8">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="animate-pulse space-y-6">
              <div className="h-8 w-1/4 rounded bg-muted" />
              <div className="h-12 w-3/4 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !guide) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background py-16">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <BookOpen className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h1 className="mb-4 text-2xl font-bold">Guide not found</h1>
            <p className="mb-6 text-muted-foreground">
              The guide you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/guides">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Guides
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const isTutorial = guide.guide_category === 'Tutorial';

  // For regular guides - prompts are copyable text blocks
  const regularPrompts = !isTutorial ? [
    { label: sanitizeContent(guide.prompt_1_label), headline: sanitizeContent(guide.prompt_1_headline), text: sanitizeContent(guide.prompt_1_text) },
    { label: sanitizeContent(guide.prompt_2_label), headline: sanitizeContent(guide.prompt_2_headline), text: sanitizeContent(guide.prompt_2_text) },
    { label: sanitizeContent(guide.prompt_3_label), headline: sanitizeContent(guide.prompt_3_headline), text: sanitizeContent(guide.prompt_3_text) },
  ].filter((p) => p.text) : [];

  // Tutorial prompts - simplified structure with headline and text
  const tutorialPrompts = isTutorial ? [
    { headline: sanitizeContent(guide.prompt_1_headline), text: sanitizeContent(guide.prompt_1_text) },
    { headline: sanitizeContent(guide.prompt_2_headline), text: sanitizeContent(guide.prompt_2_text) },
  ].filter((p) => p.text) : [];

  // FAQs - use standard q/a mapping (database has been corrected)
  const faqs = [
    { q: sanitizeContent(guide.faq_q1), a: sanitizeContent(guide.faq_a1) },
    { q: sanitizeContent(guide.faq_q2), a: sanitizeContent(guide.faq_a2) },
    { q: sanitizeContent(guide.faq_q3), a: sanitizeContent(guide.faq_a3) },
  ].filter((f) => f.q && f.a);

  // For regular guides
  const bodySections = [
    { heading: sanitizeContent(guide.body_section_1_heading), text: sanitizeContent(guide.body_section_1_text) },
    { heading: sanitizeContent(guide.body_section_2_heading), text: sanitizeContent(guide.body_section_2_text) },
    { heading: sanitizeContent(guide.body_section_3_heading), text: sanitizeContent(guide.body_section_3_text) },
  ].filter((s) => s.heading && s.text);

  // Tutorial extended content sections
  // Filter out sections that reference non-existent downloads/templates
  const guideData = guide as Record<string, string | null>;
  const extendedSections = isTutorial ? [
    { heading: 'Context and Background', text: sanitizeContent(guideData.context_and_background), raw: guideData.context_and_background },
    { heading: 'Expanded Steps', text: sanitizeContent(guideData.expanded_steps), raw: guideData.expanded_steps },
    { heading: 'Deeper Explanations', text: sanitizeContent(guideData.deeper_explanations), raw: guideData.deeper_explanations },
    { heading: 'Variations and Alternatives', text: sanitizeContent(guideData.variations_and_alternatives), raw: guideData.variations_and_alternatives },
    { heading: 'Interactive Elements', text: sanitizeContent(guideData.interactive_elements), raw: guideData.interactive_elements },
    { heading: 'Troubleshooting and Advanced Tips', text: sanitizeContent(guideData.troubleshooting_and_advanced_tips), raw: guideData.troubleshooting_and_advanced_tips, hasSeasoningMatrix: hasSeasoningMatrixContent(guideData.troubleshooting_and_advanced_tips) },
  ].filter((s) => s.text && !hasUnactionableContent(s.raw, slug)) : [];

  // No longer using these fields for tutorials - prompts now have proper headline/text structure
  const learningOutcomes = null;
  const estimatedTime = null;

  const tldrBullets = [
    guide.tldr_bullet_1,
    guide.tldr_bullet_2,
    guide.tldr_bullet_3,
  ].filter(Boolean).map(sanitizeContent);

  const tags = guide.tags ? guide.tags.split(",") : [];

  // Build structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": isTutorial ? "HowTo" : "Article",
    "headline": guide.title,
    "description": guide.meta_description || guide.excerpt || '',
    "author": {
      "@type": "Organization",
      "name": "AIinASIA",
      "url": "https://aiinasia.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "AIinASIA",
      "url": "https://aiinasia.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://aiinasia.com/logos/aiinasia-logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://aiinasia.com/guides/${guide.slug}`
    },
    "datePublished": guide.created_at,
    "dateModified": guide.updated_at,
    ...(isTutorial && tutorialPrompts.length > 0 && {
      "step": tutorialPrompts.map((prompt, idx) => ({
        "@type": "HowToStep",
        "position": idx + 1,
        "name": prompt.headline || `Step ${idx + 1}`,
        "text": prompt.text
      }))
    }),
    ...(tags.length > 0 && {
      "keywords": tags.join(", ")
    }),
    ...(guide.primary_platform && {
      "about": {
        "@type": "SoftwareApplication",
        "name": guide.primary_platform
      }
    })
  };

  // FAQ structured data if FAQs exist
  const faqStructuredData = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  } : null;

  const pageTitle = guide.seo_title || guide.meta_title || guide.title;
  const pageDescription = guide.meta_description || guide.excerpt || `Learn ${guide.title} with our comprehensive ${guide.guide_category.toLowerCase()} for ${guide.level.toLowerCase()} users.`;
  const canonicalUrl = `https://aiinasia.com/guides/${guide.slug}`;

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{pageTitle} | AIinASIA</title>
        <meta name="title" content={`${pageTitle} | AIinASIA`} />
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Keywords */}
        {guide.focus_keyphrase && (
          <meta name="keywords" content={`${guide.focus_keyphrase}${guide.keyphrase_synonyms ? `, ${guide.keyphrase_synonyms}` : ''}${tags.length > 0 ? `, ${tags.join(', ')}` : ''}`} />
        )}
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:site_name" content="AIinASIA" />
        <meta property="og:locale" content="en_US" />
        <meta property="article:published_time" content={guide.created_at} />
        <meta property="article:modified_time" content={guide.updated_at} />
        <meta property="article:section" content={guide.guide_category} />
        {tags.map((tag, i) => (
          <meta key={i} property="article:tag" content={tag.trim()} />
        ))}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:site" content="@aiaborhood" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="author" content="AIinASIA" />
        <meta name="geo.region" content={guide.geo || 'APAC'} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        {faqStructuredData && (
          <script type="application/ld+json">
            {JSON.stringify(faqStructuredData)}
          </script>
        )}
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        <div className="border-b border-border bg-muted/30">
          <div className="container mx-auto max-w-4xl px-4 py-4">
            <Link
              to="/guides"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Guides
            </Link>
          </div>
        </div>

        <article className="py-8">
          <div className="container mx-auto max-w-4xl px-4">
            <header className="mb-8">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="outline">{guide.guide_category}</Badge>
                <Badge className={getLevelColor(guide.level)}>{guide.level}</Badge>
                <Badge variant="secondary">
                  <Cpu className="mr-1 h-3 w-3" />
                  {guide.primary_platform}
                </Badge>
                {guide.audience_role && (
                  <Badge variant="secondary">
                    <User className="mr-1 h-3 w-3" />
                    {guide.audience_role}
                  </Badge>
                )}
                {guide.geo && (
                  <Badge variant="secondary">
                    <Globe className="mr-1 h-3 w-3" />
                    {guide.geo}
                  </Badge>
                )}
              </div>

              <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
                {guide.title}
              </h1>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center text-sm text-muted-foreground"
                    >
                      <Tag className="mr-1 h-3 w-3" />
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {tldrBullets.length > 0 && (
              <Card className="mb-8 border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">TL;DR</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tldrBullets.map((bullet, i) => (
                      <li key={i} className="flex items-start">
                        <span className="mr-3 mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        <span className="text-foreground">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {guide.perfect_for && (
              <Card className="mb-8 border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Perfect For</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {sanitizeContent(guide.perfect_for)}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="prose prose-slate dark:prose-invert max-w-none">
              {guide.body_intro && (
                <p className="lead mb-8 text-lg text-muted-foreground">
                  {sanitizeContent(guide.body_intro)}
                </p>
              )}

              {isTutorial ? (
                <>
                  {/* Tutorial metadata */}
                  {(estimatedTime || learningOutcomes) && (
                    <div className="mb-8 flex flex-wrap gap-4">
                      {estimatedTime && (
                        <Badge variant="outline" className="text-sm">
                          <Clock className="mr-1 h-3 w-3" />
                          {estimatedTime}
                        </Badge>
                      )}
                      {learningOutcomes && (
                        <p className="text-sm text-muted-foreground">
                          <strong>You'll learn:</strong> {learningOutcomes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tutorial Prompts Section */}
                  {tutorialPrompts.length > 0 && (
                    <section className="mb-8">
                      <h2 className="mb-6 text-2xl font-semibold tracking-tight">
                        Try These Prompts
                      </h2>
                      <div className="space-y-6">
                        {tutorialPrompts.map((prompt, i) => (
                          <Card key={i}>
                            <CardHeader className="pb-2">
                              {prompt.headline && (
                                <CardTitle className="text-lg">{prompt.headline}</CardTitle>
                              )}
                            </CardHeader>
                            <CardContent>
                              <div className="relative">
                                <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                                  <code className="whitespace-pre-wrap break-words text-foreground">
                                    {prompt.text}
                                  </code>
                                </pre>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="absolute right-2 top-2"
                                  onClick={() => copyPrompt(prompt.text!, i)}
                                >
                                  {copiedPrompt === i ? (
                                    <>
                                      <Check className="mr-1 h-3 w-3" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="mr-1 h-3 w-3" />
                                      Copy
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Extended Tutorial Sections - World Class Design */}
                  {extendedSections.length > 0 && (
                    <section className="mb-12 space-y-8">
                  {extendedSections.map((section, i) => {
                        const isStepSection = shouldShowAsSteps(section.heading, section.text);
                        const items = isStepSection ? formatStepContent(section.text) : [];
                        const SectionIcon = getSectionIcon(section.heading);
                        const paragraphs = !isStepSection ? formatProseContent(section.text) : [];
                        
                        return (
                          <div 
                            key={i} 
                            className="relative"
                          >
                            {/* Section Header */}
                            <div className="flex items-center gap-3 mb-6">
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <SectionIcon className="h-5 w-5 text-primary" />
                              </div>
                              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                {section.heading}
                              </h2>
                            </div>
                            
                            {/* Content */}
                            {isStepSection ? (
                              // Numbered steps for step-based content
                              <div className="space-y-4 pl-2">
                                {items.map((item, idx) => (
                                  <div key={idx} className="flex items-start gap-4 group">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                      {idx + 1}
                                    </div>
                                    <p className="text-foreground/90 leading-relaxed pt-1 flex-1">{item}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              // Flowing prose with paragraph breaks for better readability
                              <div className="space-y-4">
                                {paragraphs.map((paragraph, pIdx) => (
                                  <p key={pIdx} className="text-foreground/85 leading-relaxed text-[1.05rem]">
                                    {paragraph}
                                  </p>
                                ))}
                              </div>
                            )}
                            
                            {/* Show seasoning matrix download if this section mentions it */}
                            {(section as { hasSeasoningMatrix?: boolean }).hasSeasoningMatrix && (
                              <div className="mt-6 pt-6 border-t border-border">
                                <SeasoningMatrixDownload />
                              </div>
                            )}
                            
                            {/* Subtle divider between sections */}
                            {i < extendedSections.length - 1 && (
                              <div className="mt-8 border-b border-border/50" />
                            )}
                          </div>
                        );
                      })}
                    </section>
                  )}
                </>
              ) : (
                bodySections.map((section, i) => (
                  <section key={i} className="mb-8">
                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">
                      {section.heading}
                    </h2>
                    <div className="whitespace-pre-line text-foreground">
                      {section.text}
                    </div>
                  </section>
                ))
              )}
            </div>

            {regularPrompts.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-6 text-2xl font-semibold tracking-tight">
                  Prompts
                </h2>
                <div className="space-y-6">
                  {regularPrompts.map((prompt, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        {prompt.label && (
                          <p className="text-sm font-medium text-primary">
                            {prompt.label}
                          </p>
                        )}
                        {prompt.headline && (
                          <CardTitle className="text-lg">{prompt.headline}</CardTitle>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="relative">
                          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                            <code className="whitespace-pre-wrap break-words text-foreground">
                              {prompt.text}
                            </code>
                          </pre>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute right-2 top-2"
                            onClick={() => copyPrompt(prompt.text!, i)}
                          >
                            {copiedPrompt === i ? (
                              <>
                                <Check className="mr-1 h-3 w-3" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="mr-1 h-3 w-3" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {faqs.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-6 text-2xl font-semibold tracking-tight">
                  Frequently Asked Questions
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="whitespace-pre-line text-muted-foreground">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            {/* Custom Closing CTA with prompt if available */}
            {guide.closing_cta && guide.closing_cta.includes('Try This Prompt') ? (
              <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardContent className="py-8">
                  <h2 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">
                    Try This Prompt
                  </h2>
                  {(() => {
                    // Extract the prompt from closing_cta
                    const ctaText = sanitizeContent(guide.closing_cta) || '';
                    const promptMatch = ctaText.match(/"([^"]+)"/);
                    const prompt = promptMatch ? promptMatch[1] : '';
                    const afterPrompt = ctaText.split('"').slice(-1)[0]?.trim() || '';
                    
                    return (
                      <>
                        {prompt && (
                          <div className="relative mb-4">
                            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                              <code className="whitespace-pre-wrap break-words text-foreground">
                                {prompt}
                              </code>
                            </pre>
                            <Button
                              variant="outline"
                              size="sm"
                              className="absolute right-2 top-2"
                              onClick={() => copyPrompt(prompt, 99)}
                            >
                              {copiedPrompt === 99 ? (
                                <>
                                  <Check className="mr-1 h-3 w-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-1 h-3 w-3" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                        {afterPrompt && (
                          <p className="text-foreground/90">{afterPrompt}</p>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : null}

            {/* Closing Section */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
              <CardContent className="py-8">
                <h2 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">
                  Ready to experiment?
                </h2>
                <div className="space-y-4 text-foreground/90">
                  <p>
                    Pick one of these prompts and see where it takes you. The interesting bit is not just getting results - it is discovering what happens when you tweak the parameters or combine different approaches. If you end up with something unexpected (whether that is brilliantly unexpected or amusingly terrible), we would genuinely love to see it.
                  </p>
                  <p>
                    Share your results, your variations, or the weird tangents you went down trying to get things just right. That is often where the best insights come from: the collective trial and error of people actually using these tools in practice.
                  </p>
                  <p>
                    And if you found this useful, we have got plenty more{" "}
                    <Link to="/guides" className="font-medium text-primary hover:underline">
                      practical how-to guides
                    </Link>{" "}
                    covering everything from creating images for your blog to helping you automate boring work tasks. Each one is built the same way: real techniques, actual examples, no fluff.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <GuideComments guideId={guide.id} />
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
};

export default GuideDetail;
