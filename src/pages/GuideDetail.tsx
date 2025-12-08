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

  const prompts = [
    { label: guide.prompt_1_label, headline: guide.prompt_1_headline, text: guide.prompt_1_text },
    { label: guide.prompt_2_label, headline: guide.prompt_2_headline, text: guide.prompt_2_text },
    { label: guide.prompt_3_label, headline: guide.prompt_3_headline, text: guide.prompt_3_text },
  ].filter((p) => p.text);

  const faqs = [
    { q: guide.faq_q1, a: guide.faq_a1 },
    { q: guide.faq_q2, a: guide.faq_a2 },
    { q: guide.faq_q3, a: guide.faq_a3 },
  ].filter((f) => f.q && f.a);

  // For regular guides
  const bodySections = [
    { heading: guide.body_section_1_heading, text: guide.body_section_1_text },
    { heading: guide.body_section_2_heading, text: guide.body_section_2_text },
    { heading: guide.body_section_3_heading, text: guide.body_section_3_text },
  ].filter((s) => s.heading && s.text);

  // For tutorials - use step fields with proper type casting
  const guideData = guide as Record<string, string | null>;
  const tutorialSteps = [
    { heading: guideData.body_section_1_heading, text: guideData.body_section_1_text },
    { heading: guideData.body_section_2_heading, text: guideData.body_section_2_text },
    { heading: guideData.body_section_3_heading, text: guideData.body_section_3_text },
    { heading: guideData.context_and_background ? 'Context and Background' : null, text: guideData.context_and_background },
  ].filter((s) => s.heading && s.text);

  // Tutorial activities
  const activities = [
    { heading: guideData.expanded_steps ? 'Expanded Steps' : null, text: guideData.expanded_steps },
    { heading: guideData.deeper_explanations ? 'Deeper Explanations' : null, text: guideData.deeper_explanations },
    { heading: guideData.variations_and_alternatives ? 'Variations and Alternatives' : null, text: guideData.variations_and_alternatives },
    { heading: guideData.interactive_elements ? 'Interactive Elements' : null, text: guideData.interactive_elements },
    { heading: guideData.troubleshooting_and_advanced_tips ? 'Troubleshooting and Advanced Tips' : null, text: guideData.troubleshooting_and_advanced_tips },
  ].filter((a) => a.heading && a.text);

  const tldrBullets = [
    guide.tldr_bullet_1,
    guide.tldr_bullet_2,
    guide.tldr_bullet_3,
  ].filter(Boolean);

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
                    {guide.perfect_for}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="prose prose-slate dark:prose-invert max-w-none">
              {guide.body_intro && (
                <p className="lead mb-8 text-lg text-muted-foreground">
                  {guide.body_intro}
                </p>
              )}

              {isTutorial ? (
                <>
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

                  {activities.length > 0 && (
                    <section className="mb-8">
                      <h2 className="mb-6 text-2xl font-semibold tracking-tight">
                        Additional Content
                      </h2>
                      <div className="space-y-6">
                        {activities.map((activity, i) => (
                          <Card key={i}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">{activity.heading}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="whitespace-pre-line text-foreground">
                                {activity.text}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
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

            {prompts.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-6 text-2xl font-semibold tracking-tight">
                  Prompts
                </h2>
                <div className="space-y-6">
                  {prompts.map((prompt, i) => (
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
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
};

export default GuideDetail;
