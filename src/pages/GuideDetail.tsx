import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { ArrowLeft, Copy, Check, Tag, User, Globe, Cpu, BookOpen, FileText, Target, Lightbulb, RefreshCw, PenTool, Wrench, Pin } from "lucide-react";
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
import TutorialContentRenderer from "@/components/TutorialContentRenderer";
import InlineNewsletterSignup from "@/components/InlineNewsletterSignup";
import EndOfContentNewsletter from "@/components/EndOfContentNewsletter";
import ReturnTriggerBlock from "@/components/ReturnTriggerBlock";

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
  
  // Remove URLs that are concatenated directly to text without proper spacing
  // This catches cases like "audienceshttps://..." or "2025https://..."
  sanitized = sanitized.replace(/([a-zA-Z0-9])(https?:\/\/[^\s]+)/g, '$1');
  
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

// Get section icon based on heading - returns Lucide icon component
const getSectionIcon = (heading: string) => {
  const headingLower = heading.toLowerCase();
  if (headingLower.includes('context') || headingLower.includes('background')) return FileText;
  if (headingLower.includes('step') || headingLower.includes('expanded')) return Target;
  if (headingLower.includes('explanation') || headingLower.includes('deeper')) return Lightbulb;
  if (headingLower.includes('variation') || headingLower.includes('alternative')) return RefreshCw;
  if (headingLower.includes('exercise')) return PenTool;
  if (headingLower.includes('interactive')) return PenTool;
  if (headingLower.includes('troubleshoot') || headingLower.includes('tip')) return Wrench;
  if (headingLower.includes('final') || headingLower.includes('note')) return FileText;
  if (headingLower.includes('tool')) return Wrench;
  if (headingLower.includes('use case')) return Target;
  return Pin;
};

// Helper to render text with clickable URLs
const TextWithLinks = ({ text }: { text: string }) => {
  // URL regex pattern
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
  
  const parts = text.split(urlPattern);
  
  return (
    <>
      {parts.map((part, i) => {
        if (/(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
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

  // Smart field detection - some CSVs have columns inverted
  // Headings should be short (< 80 chars), body text should be longer
  // Questions should end with ? or be shorter than answers
  const smartSwap = (a: string | null, b: string | null): [string, string] => {
    const aText = sanitizeContent(a) || '';
    const bText = sanitizeContent(b) || '';
    // If both empty or only one exists, return as-is
    if (!aText || !bText) return [aText, bText];
    // If 'a' (heading) is longer than 'b' (text), they're probably swapped
    if (aText.length > bText.length * 1.5 && bText.length < 100) {
      return [bText, aText]; // Swap them
    }
    return [aText, bText];
  };

  const smartSwapQA = (q: string | null, a: string | null): [string, string] => {
    const qText = sanitizeContent(q) || '';
    const aText = sanitizeContent(a) || '';
    if (!qText || !aText) return [qText, aText];
    // Questions usually end with ? or are shorter than answers
    // If 'q' doesn't end with ? but 'a' does, they're swapped
    // Or if 'q' is much longer than 'a', they're probably swapped
    const qEndsWithQuestion = qText.trim().endsWith('?');
    const aEndsWithQuestion = aText.trim().endsWith('?');
    if (!qEndsWithQuestion && aEndsWithQuestion) {
      return [aText, qText]; // Swap
    }
    if (qText.length > aText.length * 2 && !qEndsWithQuestion) {
      return [aText, qText]; // Swap - q is too long to be a question
    }
    return [qText, aText];
  };

  const smartSwapPrompt = (label: string | null, headline: string | null, text: string | null): { label: string; headline: string; text: string } => {
    const labelText = sanitizeContent(label) || '';
    const headlineText = sanitizeContent(headline) || '';
    const textText = sanitizeContent(text) || '';
    
    // The prompt text should be the longest, headline should be short
    // If label is the longest, it's probably the prompt text
    // If text is very short, it might be the headline
    const lengths = [
      { field: 'label', value: labelText, len: labelText.length },
      { field: 'headline', value: headlineText, len: headlineText.length },
      { field: 'text', value: textText, len: textText.length },
    ].filter(f => f.len > 0);
    
    if (lengths.length < 2) {
      return { label: labelText, headline: headlineText, text: textText };
    }
    
    // Sort by length - shortest should be headline, longest should be text
    lengths.sort((a, b) => a.len - b.len);
    
    // If text is shorter than label, they're likely swapped
    if (textText.length < 50 && labelText.length > 100) {
      // label has the prompt, text has the headline
      return { label: '', headline: textText, text: labelText };
    }
    
    return { label: labelText, headline: headlineText, text: textText };
  };

  // For regular guides - prompts are copyable text blocks with smart detection
  const regularPrompts = !isTutorial ? [
    smartSwapPrompt(guide.prompt_1_label, guide.prompt_1_headline, guide.prompt_1_text),
    smartSwapPrompt(guide.prompt_2_label, guide.prompt_2_headline, guide.prompt_2_text),
    smartSwapPrompt(guide.prompt_3_label, guide.prompt_3_headline, guide.prompt_3_text),
  ].filter((p) => p.text) : [];

  // Tutorial prompts - simplified structure with headline and text
  const tutorialPrompts = isTutorial ? [
    (() => { const [h, t] = smartSwap(guide.prompt_1_headline, guide.prompt_1_text); return { headline: h, text: t }; })(),
    (() => { const [h, t] = smartSwap(guide.prompt_2_headline, guide.prompt_2_text); return { headline: h, text: t }; })(),
  ].filter((p) => p.text) : [];

  // FAQs - with smart Q/A detection
  const faqs = [
    (() => { const [q, a] = smartSwapQA(guide.faq_q1, guide.faq_a1); return { q, a }; })(),
    (() => { const [q, a] = smartSwapQA(guide.faq_q2, guide.faq_a2); return { q, a }; })(),
    (() => { const [q, a] = smartSwapQA(guide.faq_q3, guide.faq_a3); return { q, a }; })(),
  ].filter((f) => f.q && f.a);

  // For regular guides - with smart heading/text detection
  const bodySections = [
    (() => { const [h, t] = smartSwap(guide.body_section_1_heading, guide.body_section_1_text); return { heading: h, text: t }; })(),
    (() => { const [h, t] = smartSwap(guide.body_section_2_heading, guide.body_section_2_text); return { heading: h, text: t }; })(),
    (() => { const [h, t] = smartSwap(guide.body_section_3_heading, guide.body_section_3_text); return { heading: h, text: t }; })(),
  ].filter((s) => s.heading && s.text);

  // Tutorial extended content sections - BEFORE prompts (per memory requirement)
  // Order: Context & Background, Use Cases, Deeper Explanation, Expanded Steps
  const guideData = guide as Record<string, string | null>;
  const tutorialPrePromptSections = isTutorial ? [
    { heading: 'Context and Background', text: sanitizeContent(guideData.context_and_background), raw: guideData.context_and_background },
    { heading: 'Use Cases', text: sanitizeContent(guideData.applied_examples), raw: guideData.applied_examples },
    { heading: 'Deeper Explanation', text: sanitizeContent(guideData.deeper_explanations), raw: guideData.deeper_explanations },
    { heading: 'Expanded Steps', text: sanitizeContent(guideData.expanded_steps), raw: guideData.expanded_steps },
  ].filter((s) => s.text && !hasUnactionableContent(s.raw, slug)) : [];

  // Tutorial sections AFTER prompts
  // Order: Variations and Alternatives, Try this exercise, Tools used
  const tutorialPostPromptSections = isTutorial ? [
    { heading: 'Variations and Alternatives', text: sanitizeContent(guideData.variations_and_alternatives), raw: guideData.variations_and_alternatives },
    { heading: 'Try this exercise', text: sanitizeContent(guideData.interactive_exercises), raw: guideData.interactive_exercises },
    { heading: 'Tools used', text: sanitizeContent(guideData.recommended_tools_for_this_role), raw: guideData.recommended_tools_for_this_role },
  ].filter((s) => s.text && !hasUnactionableContent(s.raw, slug)) : [];

  // Final Notes for tutorials (closing_encouragement field)
  const tutorialFinalNotes = isTutorial ? sanitizeContent(guideData.closing_encouragement) : null;

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
                        <span className="text-foreground"><TextWithLinks text={bullet} /></span>
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
                    <TextWithLinks text={sanitizeContent(guide.perfect_for) || ''} />
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="prose prose-slate dark:prose-invert max-w-none">
              {guide.body_intro && (
                <p className="lead mb-8 text-lg text-muted-foreground">
                  <TextWithLinks text={sanitizeContent(guide.body_intro) || ''} />
                </p>
              )}

              {isTutorial ? (
                <>
                  {/* Pre-prompt Tutorial Sections: Context, Use Cases, Deeper Explanation, Expanded Steps */}
                  {tutorialPrePromptSections.length > 0 && (
                    <section className="mb-12 space-y-8">
                      {tutorialPrePromptSections.map((section, i) => {
                        const SectionIcon = getSectionIcon(section.heading);
                        
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
                            
                            {/* Content - Uses TutorialContentRenderer for inline structured elements */}
                            <TutorialContentRenderer content={section.text} sectionHeading={section.heading} />
                            
                            {/* Subtle divider between sections */}
                            {i < tutorialPrePromptSections.length - 1 && (
                              <div className="mt-8 border-b border-border/50" />
                            )}
                          </div>
                        );
                      })}
                    </section>
                  )}

                  {/* Tutorial Prompts Section - comes AFTER pre-prompt sections */}
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
                          <CardContent className="space-y-3">
                            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                              <code className="whitespace-pre-wrap break-words text-foreground">
                                {prompt.text}
                              </code>
                            </pre>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyPrompt(prompt.text!, i)}
                              className="w-full sm:w-auto"
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
                          </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Mid-content Newsletter Signup for Tutorials */}
                  <InlineNewsletterSignup variant="compact" />

                  {/* Post-prompt Tutorial Sections: Variations, Exercise, Tools */}
                  {tutorialPostPromptSections.length > 0 && (
                    <section className="mb-12 space-y-8">
                      {tutorialPostPromptSections.map((section, i) => {
                        const SectionIcon = getSectionIcon(section.heading);
                        
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
                            
                            {/* Content - Uses TutorialContentRenderer for inline structured elements */}
                            <TutorialContentRenderer content={section.text} sectionHeading={section.heading} />
                            
                            {/* Subtle divider between sections */}
                            {i < tutorialPostPromptSections.length - 1 && (
                              <div className="mt-8 border-b border-border/50" />
                            )}
                          </div>
                        );
                      })}
                    </section>
                  )}

                  {/* Final Notes Section */}
                  {tutorialFinalNotes && (
                    <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                      <CardContent className="py-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <h2 className="text-2xl font-bold tracking-tight text-foreground">
                            Final Notes
                          </h2>
                        </div>
                        <TutorialContentRenderer content={tutorialFinalNotes} sectionHeading="Final Notes" />
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                bodySections.map((section, i) => (
                  <section key={i} className="mb-8">
                    <h2 className="mb-4 text-2xl font-semibold tracking-tight">
                      {section.heading}
                    </h2>
                    <div className="whitespace-pre-line text-foreground">
                      <TextWithLinks text={section.text} />
                    </div>
                  </section>
                ))
              )}
            </div>

            {/* Mid-content Newsletter Signup for non-Tutorial guides */}
            {!isTutorial && <InlineNewsletterSignup />}

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
                      <CardContent className="space-y-3">
                        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                          <code className="whitespace-pre-wrap break-words text-foreground">
                            {prompt.text}
                          </code>
                        </pre>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPrompt(prompt.text!, i)}
                          className="w-full sm:w-auto"
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
                          <>
                            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm mb-3">
                              <code className="whitespace-pre-wrap break-words text-foreground">
                                {prompt}
                              </code>
                            </pre>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyPrompt(prompt, 99)}
                              className="w-full sm:w-auto"
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
                          </>
                        )}
                        {afterPrompt && (
                          <p className="text-foreground/90 mt-4">{afterPrompt}</p>
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

            {/* Return Trigger Block */}
            <ReturnTriggerBlock />

            {/* End of Content Newsletter CTA */}
            <EndOfContentNewsletter />

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
