import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import { ArrowLeft, Copy, Check, Tag, User, Globe, Cpu, BookOpen, Lightbulb, Wrench, AlertTriangle, ArrowRight, Clock } from "lucide-react";
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
import EndOfContentNewsletter from "@/components/EndOfContentNewsletter";
import ReturnTriggerBlock from "@/components/ReturnTriggerBlock";

// Sanitize corrupted content from CSV imports
const sanitizeContent = (text: string | null | undefined): string => {
  if (!text) return '';
  
  let sanitized = text;
  
  try {
    if (sanitized.includes('%20') || sanitized.includes('%3A') || sanitized.includes('%2F')) {
      sanitized = decodeURIComponent(sanitized);
    }
  } catch {
    // If decoding fails, continue with original
  }
  
  sanitized = sanitized
    .replace(/onlinefile:\/\/[^\s]*/gi, '')
    .replace(/file:\/\/\/[^\s]*/gi, '')
    .replace(/[A-Z]:\\[^\s]*/gi, '')
    .replace(/\/home\/[^\s]*redirect\.html[^\s]*/gi, '');
  
  sanitized = sanitized.replace(/([a-zA-Z0-9])(https?:\/\/[^\s]+)/g, '$1');
  sanitized = sanitized.replace(/#:~:text=[^\s]*/g, '');
  
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

// Check if content references non-existent downloads/resources
const hasUnactionableContent = (text: string | null | undefined, slug: string | undefined): boolean => {
  if (!text) return false;
  if (slug === 'ai-viral-recipe-hot-honey-cottage-cheese-ext' && hasSeasoningMatrixContent(text)) {
    return false;
  }
  const lowerText = text.toLowerCase();
  return (
    (lowerText.includes('download') && (lowerText.includes('template') || lowerText.includes('matrix') || lowerText.includes('worksheet') || lowerText.includes('pdf'))) ||
    (lowerText.includes('use the provided') && lowerText.includes('template'))
  );
};

// Helper to render text with clickable URLs
const TextWithLinks = ({ text }: { text: string }) => {
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
  const parts = text.split(urlPattern);
  
  return (
    <>
      {parts.map((part, i) => {
        if (/(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/.test(part)) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

// Estimate reading time from all text content
const estimateReadingTime = (guide: Record<string, unknown>): number => {
  const textFields = [
    'body_intro', 'context_and_background', 'deeper_explanations', 'expanded_steps',
    'applied_examples', 'variations_and_alternatives', 'interactive_exercises',
    'recommended_tools_for_this_role', 'closing_encouragement', 'closing_cta',
    'body_section_1_text', 'body_section_2_text', 'body_section_3_text',
    'prompt_1_text', 'prompt_2_text', 'prompt_3_text',
    'faq_a1', 'faq_a2', 'faq_a3',
    'tldr_bullet_1', 'tldr_bullet_2', 'tldr_bullet_3',
  ];
  const totalWords = textFields.reduce((sum, field) => {
    const val = guide[field];
    if (typeof val === 'string' && val) {
      return sum + val.split(/\s+/).length;
    }
    return sum;
  }, 0);
  return Math.max(1, Math.round(totalWords / 200));
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
    staleTime: 0,
    refetchOnMount: true,
  });

  const copyPrompt = async (promptText: string, promptIndex: number) => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedPrompt(promptIndex);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopiedPrompt(null), 2000);
    } catch {
      toast.error("Failed to copy prompt");
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Intermediate": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Advanced": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-muted text-muted-foreground";
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
            <p className="mb-6 text-muted-foreground">The guide you're looking for doesn't exist or has been removed.</p>
            <Link to="/guides"><Button><ArrowLeft className="mr-2 h-4 w-4" />Back to Guides</Button></Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const guideData = guide as Record<string, string | null>;
  const isTutorial = guide.guide_category === 'Tutorial';
  const isPromptCollection = guide.guide_category === "Prompt List" || guide.guide_category === "Prompt Pack";
  const readingTime = estimateReadingTime(guide as unknown as Record<string, unknown>);

  // Smart field detection helpers
  const smartSwap = (a: string | null, b: string | null): [string, string] => {
    const aText = sanitizeContent(a) || '';
    const bText = sanitizeContent(b) || '';
    if (!aText || !bText) return [aText, bText];
    if (aText.length > bText.length * 1.5 && bText.length < 100) return [bText, aText];
    return [aText, bText];
  };

  const smartSwapQA = (q: string | null, a: string | null): [string, string] => {
    const qText = sanitizeContent(q) || '';
    const aText = sanitizeContent(a) || '';
    if (!qText || !aText) return [qText, aText];
    const qEndsWithQuestion = qText.trim().endsWith('?');
    const aEndsWithQuestion = aText.trim().endsWith('?');
    if (!qEndsWithQuestion && aEndsWithQuestion) return [aText, qText];
    if (qText.length > aText.length * 2 && !qEndsWithQuestion) return [aText, qText];
    return [qText, aText];
  };

  const smartSwapPrompt = (label: string | null, headline: string | null, text: string | null): { label: string; headline: string; text: string } => {
    const labelText = sanitizeContent(label) || '';
    const headlineText = sanitizeContent(headline) || '';
    const textText = sanitizeContent(text) || '';
    if (textText.length < 50 && labelText.length > 100) {
      return { label: '', headline: textText, text: labelText };
    }
    return { label: labelText, headline: headlineText, text: textText };
  };

  // --- DATA EXTRACTION with backwards compatibility ---

  // SECTION 1: AI Snapshot (tldr bullets)
  const tldrBullets = [guide.tldr_bullet_1, guide.tldr_bullet_2, guide.tldr_bullet_3]
    .filter(Boolean).map(sanitizeContent);

  // SECTION 2: Why This Matters (new field: why_this_matters, fallback: context_and_background)
  const whyThisMatters = sanitizeContent(guideData.why_this_matters || guideData.context_and_background);
  const showWhyThisMatters = whyThisMatters && !hasUnactionableContent(guideData.why_this_matters || guideData.context_and_background, slug);

  // SECTION 3: How to Do It (new: steps, fallback: expanded_steps + deeper_explanations as intro)
  const expandedSteps = sanitizeContent(guideData.expanded_steps);
  const deeperExplanations = sanitizeContent(guideData.deeper_explanations);
  const hasStepsData = expandedSteps && !hasUnactionableContent(guideData.expanded_steps, slug);
  const hasDeeperData = deeperExplanations && !hasUnactionableContent(guideData.deeper_explanations, slug);
  // If deeper explanation exists but no steps, show deeper as standalone content under How to Do It
  const showHowToDoIt = hasStepsData || hasDeeperData;

  // SECTION 4: What This Actually Looks Like (new field only - no fallback)
  // Fields: worked_example_prompt, worked_example_output, worked_example_editing_notes
  const workedExamplePrompt = sanitizeContent(guideData.worked_example_prompt);
  const workedExampleOutput = sanitizeContent(guideData.worked_example_output);
  const workedExampleNotes = sanitizeContent(guideData.worked_example_editing_notes);
  const showWorkedExample = workedExamplePrompt || workedExampleOutput;

  // SECTION 5: Prompts to Try
  const tutorialPrompts = isTutorial ? [
    (() => { const [h, t] = smartSwap(guide.prompt_1_headline, guide.prompt_1_text); return { headline: h, text: t }; })(),
    (() => { const [h, t] = smartSwap(guide.prompt_2_headline, guide.prompt_2_text); return { headline: h, text: t }; })(),
  ].filter((p) => p.text) : [];

  const regularPrompts = !isTutorial ? [
    smartSwapPrompt(guide.prompt_1_label, guide.prompt_1_headline, guide.prompt_1_text),
    smartSwapPrompt(guide.prompt_2_label, guide.prompt_2_headline, guide.prompt_2_text),
    smartSwapPrompt(guide.prompt_3_label, guide.prompt_3_headline, guide.prompt_3_text),
  ].filter((p) => p.text) : [];

  const allPrompts = isTutorial 
    ? tutorialPrompts.map(p => ({ label: '', headline: p.headline, text: p.text }))
    : regularPrompts;

  // SECTION 6: Common Mistakes (new field only)
  // Field: common_mistakes (could be JSON string or plain text)
  // No fallback for old content
  const commonMistakesRaw = guideData.common_mistakes;
  let commonMistakes: { title: string; description: string }[] = [];
  if (commonMistakesRaw) {
    try {
      commonMistakes = JSON.parse(commonMistakesRaw);
    } catch {
      // If not JSON, skip
    }
  }

  // SECTION 7: Tools That Work for This (new: recommended_tools, fallback: recommended_tools_for_this_role as text)
  const toolsText = sanitizeContent(guideData.recommended_tools_for_this_role);
  const showTools = toolsText && !hasUnactionableContent(guideData.recommended_tools_for_this_role, slug);

  // SECTION 8: FAQ
  const faqs = [
    (() => { const [q, a] = smartSwapQA(guide.faq_q1, guide.faq_a1); return { q, a }; })(),
    (() => { const [q, a] = smartSwapQA(guide.faq_q2, guide.faq_a2); return { q, a }; })(),
    (() => { const [q, a] = smartSwapQA(guide.faq_q3, guide.faq_a3); return { q, a }; })(),
  ].filter((f) => f.q && f.a);

  // SECTION 9: Next Steps (new: next_steps, fallback: default message)
  const nextStepsContent = sanitizeContent(guideData.next_steps);

  // Body intro
  const bodyIntro = sanitizeContent(guide.body_intro);

  // For non-tutorial guides, body sections still used
  const bodySections = [
    (() => { const [h, t] = smartSwap(guide.body_section_1_heading, guide.body_section_1_text); return { heading: h, text: t }; })(),
    (() => { const [h, t] = smartSwap(guide.body_section_2_heading, guide.body_section_2_text); return { heading: h, text: t }; })(),
    (() => { const [h, t] = smartSwap(guide.body_section_3_heading, guide.body_section_3_text); return { heading: h, text: t }; })(),
  ].filter((s) => s.heading && s.text);

  const tags = guide.tags ? guide.tags.split(",") : [];

  // --- STRUCTURED DATA ---
  const articleSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": guide.title,
    "description": guide.meta_description || guide.excerpt || '',
    "author": { "@type": "Person", "name": "Adrian Watkins" },
    "publisher": {
      "@type": "Organization",
      "name": "AI in Asia",
      "url": "https://aiinasia.com",
      "logo": { "@type": "ImageObject", "url": "https://aiinasia.com/logos/aiinasia-logo.png" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": `https://aiinasia.com/guides/${guide.slug}` },
    "datePublished": guide.created_at,
    "dateModified": guide.updated_at,
    ...(tags.length > 0 && { "keywords": tags.join(", ") }),
  };

  const howToSteps = isTutorial
    ? tutorialPrompts.filter(p => p.text).map((p, i) => ({ "@type": "HowToStep", "position": i + 1, "name": p.headline || `Step ${i + 1}`, "text": p.text }))
    : bodySections.filter(s => s.heading && s.text).map((s, i) => ({ "@type": "HowToStep", "position": i + 1, "name": s.heading, "text": s.text }));

  const howToSchema = (!isPromptCollection && howToSteps.length > 0) ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": guide.title,
    "description": guide.meta_description || guide.excerpt || '',
    "step": howToSteps,
  } : null;

  const promptCount = allPrompts.length;
  const promptListSchema = isPromptCollection ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": guide.title,
    "description": guide.meta_description || guide.excerpt || '',
    "numberOfItems": promptCount > 0 ? promptCount : undefined,
  } : null;

  const allSchemas: Record<string, unknown>[] = [articleSchema];
  if (howToSchema) allSchemas.push(howToSchema);
  if (promptListSchema) allSchemas.push(promptListSchema);

  const faqStructuredData = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": { "@type": "Answer", "text": faq.a }
    }))
  } : null;

  const pageTitle = guide.seo_title || guide.meta_title || guide.title;
  const pageDescription = guide.meta_description || guide.excerpt || `Learn ${guide.title} with our comprehensive ${guide.guide_category.toLowerCase()} for ${guide.level.toLowerCase()} users.`;
  const canonicalUrl = `https://aiinasia.com/guides/${guide.slug}`;

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonical={canonicalUrl}
        ogType="article"
        ogImage="https://aiinasia.com/icons/aiinasia-512.png?v=3"
        ogImageAlt={pageTitle}
        articleMeta={{
          publishedTime: guide.created_at,
          modifiedTime: guide.updated_at,
          author: "AI in ASIA",
          section: guide.guide_category,
          tags: tags.map(t => t.trim()),
        }}
        schemaJson={faqStructuredData ? [...allSchemas, faqStructuredData] : allSchemas}
      />

      <Header />

      <main className="min-h-screen bg-background">
        {/* Back link */}
        <div className="border-b border-border bg-muted/30">
          <div className="container mx-auto max-w-4xl px-4 py-4">
            <Link to="/guides" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Guides
            </Link>
          </div>
        </div>

        <article className="py-8">
          <div className="container mx-auto max-w-4xl px-4">
            {/* HEADER */}
            <header className="mb-8">
              <div className="mb-4 flex flex-wrap items-center gap-2">
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
                <span className="inline-flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  {readingTime} min read
                </span>
              </div>

              <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
                {guide.title}
              </h1>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string, i: number) => (
                    <span key={i} className="inline-flex items-center text-sm text-muted-foreground">
                      <Tag className="mr-1 h-3 w-3" />
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Body intro */}
            {bodyIntro && (
              <p className="lead mb-8 text-lg text-muted-foreground">
                <TextWithLinks text={bodyIntro} />
              </p>
            )}

            {/* SECTION 1: AI Snapshot */}
            {tldrBullets.length > 0 && (
              <Card className="mb-10 border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">AI Snapshot</CardTitle>
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

            <div className="prose prose-slate dark:prose-invert max-w-none">
              {/* SECTION 2: Why This Matters */}
              {showWhyThisMatters && (
                <section className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Lightbulb className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      Why This Matters
                    </h2>
                  </div>
                  <TutorialContentRenderer content={whyThisMatters!} />
                </section>
              )}

              {/* For non-tutorial guides, show body sections here */}
              {!isTutorial && bodySections.map((section, i) => (
                <section key={i} className="mb-8">
                  <h2 className="mb-4 text-2xl font-semibold tracking-tight">{section.heading}</h2>
                  <div className="whitespace-pre-line text-foreground">
                    <TextWithLinks text={section.text} />
                  </div>
                </section>
              ))}

              {/* SECTION 3: How to Do It */}
              {showHowToDoIt && (
                <section className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      How to Do It
                    </h2>
                  </div>

                  {/* Deeper explanation as intro context (if steps also exist) */}
                  {hasDeeperData && hasStepsData && (
                    <div className="mb-6">
                      <TutorialContentRenderer content={deeperExplanations!} sectionHeading="Deeper Explanation" />
                    </div>
                  )}

                  {/* Deeper explanation as main content (if no steps) */}
                  {hasDeeperData && !hasStepsData && (
                    <TutorialContentRenderer content={deeperExplanations!} sectionHeading="Deeper Explanation" />
                  )}

                  {/* Steps */}
                  {hasStepsData && (
                    <TutorialContentRenderer content={expandedSteps!} sectionHeading="Expanded Steps" />
                  )}
                </section>
              )}

              {/* SECTION 4: What This Actually Looks Like (new content only) */}
              {showWorkedExample && (
                <section className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      What This Actually Looks Like
                    </h2>
                  </div>

                  {/* Block A: The Prompt */}
                  {workedExamplePrompt && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-foreground">The Prompt</h3>
                      <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm mb-2">
                        <code className="whitespace-pre-wrap break-words text-foreground">{workedExamplePrompt}</code>
                      </pre>
                      <Button variant="outline" size="sm" onClick={() => copyPrompt(workedExamplePrompt, 100)} className="w-full sm:w-auto">
                        {copiedPrompt === 100 ? <><Check className="mr-1 h-3 w-3" />Copied</> : <><Copy className="mr-1 h-3 w-3" />Copy</>}
                      </Button>
                    </div>
                  )}

                  {/* Block B: What AI Gives You */}
                  {workedExampleOutput && (
                    <div className="mb-6 border-l-4 border-primary/40 pl-5">
                      <h3 className="text-lg font-semibold mb-1 text-foreground">What AI Gives You</h3>
                      <p className="text-xs italic text-muted-foreground mb-3">Example output (your results will vary based on your inputs)</p>
                      <div className="text-foreground/90 whitespace-pre-line">
                        <TextWithLinks text={workedExampleOutput} />
                      </div>
                    </div>
                  )}

                  {/* Block C: How to Edit This */}
                  {workedExampleNotes && (
                    <div className="mb-2">
                      <h3 className="text-lg font-semibold mb-3 text-foreground">How to Edit This</h3>
                      <TutorialContentRenderer content={workedExampleNotes} />
                    </div>
                  )}
                </section>
              )}

              {/* SECTION 5: Prompts to Try */}
              {allPrompts.length > 0 && (
                <section className="mb-10">
                  <h2 className="mb-6 text-2xl font-semibold tracking-tight">
                    Prompts to Try
                  </h2>
                  <div className="space-y-6">
                    {allPrompts.map((prompt, i) => (
                      <Card key={i}>
                        <CardHeader className="pb-2">
                          {prompt.label && <p className="text-sm font-medium text-primary">{prompt.label}</p>}
                          {prompt.headline && <CardTitle className="text-lg">{prompt.headline}</CardTitle>}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                            <code className="whitespace-pre-wrap break-words text-foreground">{prompt.text}</code>
                          </pre>
                          <Button variant="outline" size="sm" onClick={() => copyPrompt(prompt.text!, i)} className="w-full sm:w-auto">
                            {copiedPrompt === i ? <><Check className="mr-1 h-3 w-3" />Copied</> : <><Copy className="mr-1 h-3 w-3" />Copy</>}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* SECTION 6: Common Mistakes (new content only) */}
              {commonMistakes.length > 0 && (
                <section className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      Common Mistakes
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {commonMistakes.map((mistake, i) => (
                      <div key={i} className="border-l-4 border-amber-500/40 pl-5 py-1">
                        <p className="font-semibold text-foreground mb-1">{mistake.title}</p>
                        <p className="text-foreground/80">{mistake.description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* SECTION 7: Tools That Work for This */}
              {showTools && (
                <section className="mb-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      Tools That Work for This
                    </h2>
                  </div>
                  <TutorialContentRenderer content={toolsText!} sectionHeading="Tools" />
                </section>
              )}
            </div>

            {/* SECTION 8: FAQ */}
            {faqs.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-6 text-2xl font-semibold tracking-tight">
                  Frequently Asked Questions
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} itemScope itemType="https://schema.org/Question">
                      <AccordionTrigger className="text-left" itemProp="name">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="whitespace-pre-line text-muted-foreground" itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                        <span itemProp="text">{faq.a}</span>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            )}

            {/* SECTION 9: Next Steps */}
            <Card className="mb-8 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10">
              <CardContent className="py-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Next Steps
                  </h2>
                </div>
                {nextStepsContent ? (
                  <TutorialContentRenderer content={nextStepsContent} />
                ) : (
                  <div className="space-y-4 text-foreground/90">
                    <p>
                      Found this useful? We have plenty more{" "}
                      <Link to="/guides" className="font-medium text-primary hover:underline">practical guides</Link>{" "}
                      covering everything from prompt engineering to automating your workflow. Each one is built the same way: real techniques, actual examples, no fluff.
                    </p>
                    <p>
                      <Link to="/guides" className="font-medium text-primary hover:underline">Browse all guides</Link> or search for your next topic.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Return Trigger Block */}
            <ReturnTriggerBlock />

            {/* Newsletter CTA (single instance) */}
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
