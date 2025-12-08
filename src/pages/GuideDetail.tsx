import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { ArrowLeft, Copy, Check, Tag, User, Globe, Cpu, BookOpen } from "lucide-react";
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

// Format step-based content as a list (e.g., "Sub-step A: ... Sub-step B: ...")
const formatStepContent = (text: string): { isSteps: boolean; items: string[] } => {
  // Check for patterns like "Sub-step A:", "Step 1:", "1.", "•", etc.
  const stepPatterns = [
    /Sub-step\s+[A-Z]:/gi,
    /Step\s+\d+:/gi,
    /^\d+\.\s/gm,
  ];
  
  const hasStepPattern = stepPatterns.some(pattern => pattern.test(text));
  
  if (hasStepPattern) {
    // Split on step markers
    const items = text
      .split(/(?=Sub-step\s+[A-Z]:|Step\s+\d+:)/gi)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    return { isSteps: true, items };
  }
  
  // Also check for sentence-separated steps (sentences starting with action verbs)
  const sentences = text.split(/\.\s+/).filter(s => s.trim().length > 0);
  if (sentences.length >= 3) {
    return { isSteps: true, items: sentences.map(s => s.trim() + (s.endsWith('.') ? '' : '.')) };
  }
  
  return { isSteps: false, items: [text] };
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

  // For tutorials, FAQ fields are swapped in the database (like body sections)
  const faqs = isTutorial ? [
    { q: sanitizeContent(guide.faq_a1), a: sanitizeContent(guide.faq_q1) },
    { q: sanitizeContent(guide.faq_a2), a: sanitizeContent(guide.faq_q2) },
    { q: sanitizeContent(guide.faq_a3), a: sanitizeContent(guide.faq_q3) },
  ].filter((f) => f.q && f.a) : [
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

  // For tutorials - NOTE: in tutorials, heading contains text and text contains heading name (swapped in import)
  // So we swap them back for proper display
  const tutorialSteps = isTutorial ? [
    { heading: sanitizeContent(guide.body_section_1_text), text: sanitizeContent(guide.body_section_1_heading) },
    { heading: sanitizeContent(guide.body_section_2_text), text: sanitizeContent(guide.body_section_2_heading) },
    { heading: sanitizeContent(guide.body_section_3_text), text: sanitizeContent(guide.body_section_3_heading) },
    // Step 4: prompt_1_text has heading, prompt_1_label has text
    { heading: sanitizeContent(guide.prompt_1_text), text: sanitizeContent(guide.prompt_1_label) },
  ].filter((s) => s.heading && s.text) : [];

  // Tutorial Tips section (stored in prompt_2) - swapped: text field has heading, label has content
  const tutorialTips = isTutorial && guide.prompt_2_label ? {
    heading: sanitizeContent(guide.prompt_2_text) || 'Tips',
    text: sanitizeContent(guide.prompt_2_label),
  } : null;

  // Tutorial Activities (stored in prompt_3) - swapped: text field has heading, label/headline have content
  const tutorialActivities = isTutorial && (guide.prompt_3_label || guide.prompt_3_headline) ? {
    heading: sanitizeContent(guide.prompt_3_text) || 'Activities',
    text1: sanitizeContent(guide.prompt_3_label),
    text2: sanitizeContent(guide.prompt_3_headline),
  } : null;

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

  // Tutorial learning outcomes and estimated time (stored in prompt_2_headline and prompt_1_headline)
  const learningOutcomes = isTutorial ? sanitizeContent(guide.prompt_2_headline) : null;
  const estimatedTime = isTutorial ? guide.prompt_1_headline : null;

  const tldrBullets = [
    guide.tldr_bullet_1,
    guide.tldr_bullet_2,
    guide.tldr_bullet_3,
  ].filter(Boolean).map(sanitizeContent);

  const tags = guide.tags ? guide.tags.split(",") : [];

  return (
    <>
      <Helmet>
        <title>{guide.seo_title || guide.title} | AIinASIA</title>
        {guide.meta_description && (
          <meta name="description" content={guide.meta_description} />
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
                          ⏱️ {estimatedTime}
                        </Badge>
                      )}
                      {learningOutcomes && (
                        <p className="text-sm text-muted-foreground">
                          <strong>You'll learn:</strong> {learningOutcomes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tutorial Steps */}
                  {tutorialSteps.map((section, i) => (
                    <section key={i} className="mb-8">
                      <h2 className="mb-4 text-2xl font-semibold tracking-tight">
                        {section.heading}
                      </h2>
                      <div className="whitespace-pre-line text-foreground">
                        {section.text}
                      </div>
                    </section>
                  ))}

                  {/* Tutorial Tips */}
                  {tutorialTips && (
                    <Card className="mb-8 border-l-4 border-l-amber-500">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{tutorialTips.heading}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="whitespace-pre-line text-foreground">
                          {tutorialTips.text}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tutorial Activities */}
                  {tutorialActivities && (
                    <section className="mb-8">
                      <h2 className="mb-4 text-2xl font-semibold tracking-tight">{tutorialActivities.heading}</h2>
                      {tutorialActivities.text1 && (
                        <p className="mb-4 whitespace-pre-line text-foreground">{tutorialActivities.text1}</p>
                      )}
                      {tutorialActivities.text2 && (
                        <p className="whitespace-pre-line text-foreground">{tutorialActivities.text2}</p>
                      )}
                    </section>
                  )}

                  {/* Extended Tutorial Sections */}
                  {extendedSections.length > 0 && (
                    <section className="mb-8">
                      <div className="space-y-6">
                        {extendedSections.map((section, i) => {
                          const formattedContent = formatStepContent(section.text);
                          
                          return (
                            <Card key={i}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{section.heading}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {formattedContent.isSteps ? (
                                  <ul className="space-y-3">
                                    {formattedContent.items.map((item, idx) => (
                                      <li key={idx} className="flex items-start gap-3">
                                        <span className="flex-shrink-0 mt-1 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                                          {idx + 1}
                                        </span>
                                        <span className="text-foreground">{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="whitespace-pre-line text-foreground">
                                    {section.text}
                                  </div>
                                )}
                                {/* Show seasoning matrix download if this section mentions it */}
                                {(section as { hasSeasoningMatrix?: boolean }).hasSeasoningMatrix && (
                                  <div className="mt-4 pt-4 border-t border-border">
                                    <SeasoningMatrixDownload />
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
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
