import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GuideComments from "@/components/GuideComments";
import EndOfContentNewsletter from "@/components/EndOfContentNewsletter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, ChevronDown, Copy, Check } from "lucide-react";
import { Helmet } from "react-helmet-async";

const GuideDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewCode = searchParams.get("preview");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const { data: guide, isLoading, error } = useQuery({
    queryKey: ["guide-detail", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_guides").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;
    if (!guide) { navigate("/guides", { replace: true }); return; }
    const g = guide as any;
    if (g.status === "published") return; // render normally
    if (previewCode && g.preview_code === previewCode) return; // preview mode
    navigate("/guides", { replace: true }); // not published, no valid preview
  }, [guide, isLoading, previewCode]);

  if (isLoading) return <GuideLoadingSkeleton />;
  if (!guide) return null;

  const g = guide as any;
  const isPreview = g.status !== "published" && previewCode === g.preview_code;

  // Data fallback helpers
  const snapshotBullets: string[] = g.snapshot_bullets?.length ? g.snapshot_bullets : [g.tldr_bullet_1, g.tldr_bullet_2, g.tldr_bullet_3].filter(Boolean);
  const whyThisMatters: string = g.why_this_matters || g.context_and_background || "";
  const steps: any[] = Array.isArray(g.steps) && g.steps.length ? g.steps : [];
  const workedExample = g.worked_example && Object.keys(g.worked_example).length && (g.worked_example.prompt || g.worked_example.output) ? g.worked_example : null;
  const guidePrompts: any[] = Array.isArray(g.guide_prompts) && g.guide_prompts.length ? g.guide_prompts : [];
  const commonMistakes: any[] = Array.isArray(g.common_mistakes) && g.common_mistakes.length ? g.common_mistakes : [];
  const recommendedTools: any[] = Array.isArray(g.recommended_tools) && g.recommended_tools.length ? g.recommended_tools : [];
  const faqItems: any[] = Array.isArray(g.faq_items) && g.faq_items.length ? g.faq_items : [
    g.faq_q1 ? { question: g.faq_q1, answer: g.faq_a1 } : null,
    g.faq_q2 ? { question: g.faq_q2, answer: g.faq_a2 } : null,
    g.faq_q3 ? { question: g.faq_q3, answer: g.faq_a3 } : null,
  ].filter(Boolean);
  const nextSteps: string = g.next_steps || "";
  const readTime = g.read_time_minutes || 0;
  const pillar = g.pillar || "";
  const difficulty = g.difficulty || g.level?.toLowerCase() || "";
  const platformTags: string[] = g.platform_tags?.length ? g.platform_tags : [g.primary_platform].filter(Boolean);
  const topicTags: string[] = g.topic_tags?.length ? g.topic_tags : (g.tags ? g.tags.split(",").map((t: string) => t.trim()) : []);

  const pillarColors: Record<string, string> = { learn: "bg-blue-500", prompts: "bg-purple-500", toolbox: "bg-orange-500" };
  const diffColors: Record<string, string> = { beginner: "bg-green-500", intermediate: "bg-amber-500", advanced: "bg-red-500" };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // JSON-LD schemas
  const faqSchema = faqItems.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(f => ({
      "@type": "Question", name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  } : null;

  const howToSchema = steps.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: g.title,
    description: g.one_line_description || g.meta_description || g.excerpt || "",
    step: steps.map((s, i) => ({
      "@type": "HowToStep", position: i + 1,
      name: s.title || `Step ${i + 1}`, text: s.content,
    })),
  } : null;

  return (
    <>
      <SEOHead
        title={`${g.meta_title || g.title} | AI in Asia`}
        description={g.one_line_description || g.meta_description || g.excerpt || ""}
        canonical={`https://aiinasia.com/guides/${g.slug}`}
        ogType="article"
        ogImage={g.featured_image_url || "https://aiinasia.com/icons/aiinasia-512.png?v=3"}
        ogImageAlt={g.featured_image_alt || g.title}
      />
      {faqSchema && <Helmet><script type="application/ld+json">{JSON.stringify(faqSchema)}</script></Helmet>}
      {howToSchema && <Helmet><script type="application/ld+json">{JSON.stringify(howToSchema)}</script></Helmet>}

      <Header />

      {isPreview && (
        <div className="bg-amber-500 text-black text-center py-2 text-sm font-medium">
          PREVIEW MODE - This guide is not published yet
        </div>
      )}

      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Back link */}
          <Link to="/guides" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Guides
          </Link>

          {/* Hero */}
          <header className="mb-12 space-y-4">
            <div className="flex flex-wrap gap-2">
              {pillar && <Badge className={`${pillarColors[pillar] || "bg-primary"} text-white`}>{pillar}</Badge>}
              {difficulty && <Badge className={`${diffColors[difficulty] || ""} text-white`}>{difficulty}</Badge>}
              {platformTags.map(p => <Badge key={p} variant="outline">{p}</Badge>)}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">{g.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {readTime > 0 && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{readTime} min read</span>}
              {topicTags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              {g.published_at && <span>{new Date(g.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>}
            </div>
            {g.featured_image_url && (
              <img src={g.featured_image_url} alt={g.featured_image_alt || g.title} className="w-full aspect-video object-cover rounded-xl shadow-lg" />
            )}
          </header>

          {/* AI Snapshot */}
          {snapshotBullets.length > 0 && (
            <section className="mb-12 border-l-4 border-primary bg-card p-6 rounded-r-lg space-y-3">
              {snapshotBullets.map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p>{b}</p>
                </div>
              ))}
            </section>
          )}

          {/* Why This Matters */}
          {whyThisMatters && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Why This Matters</h2>
              <div className="prose dark:prose-invert max-w-none leading-[1.8] first:prose-p:text-lg whitespace-pre-wrap">{whyThisMatters}</div>
            </section>
          )}

          {/* How to Do It */}
          {steps.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-8">How to Do It</h2>
              <div className="space-y-8">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div>
                      {i < steps.length - 1 && <div className="w-px flex-1 border-l border-dashed border-border mt-2" />}
                    </div>
                    <div className="pb-4 flex-1">
                      {step.title && <h3 className="font-bold text-lg mb-2">{step.title}</h3>}
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{step.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Worked Example */}
          {workedExample && (
            <section className="mb-12 bg-muted/30 rounded-xl p-6 md:p-8 space-y-6">
              <h2 className="text-2xl font-bold">What This Actually Looks Like</h2>
              {workedExample.prompt && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">The Prompt</p>
                  <div className="relative">
                    <pre className="bg-[hsl(220,15%,13%)] text-[hsl(0,0%,90%)] p-5 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto">{workedExample.prompt}</pre>
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(workedExample.prompt, -1)}>
                      {copiedIndex === -1 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              {workedExample.output && (
                <div className="border-l-4 border-primary pl-5">
                  <p className="text-xs italic text-muted-foreground mb-3">Example output - your results will vary based on your inputs</p>
                  <div className="whitespace-pre-wrap leading-relaxed">{workedExample.output}</div>
                </div>
              )}
              {workedExample.editing_notes && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">How to Edit This</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{workedExample.editing_notes}</p>
                </div>
              )}
            </section>
          )}

          {/* Prompts to Try */}
          {guidePrompts.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Prompts to Try</h2>
              <div className="space-y-6">
                {guidePrompts.map((prompt, i) => (
                  <div key={i} className="space-y-2">
                    {prompt.title && <h3 className="text-lg font-semibold">{prompt.title}</h3>}
                    <div className="relative">
                      <pre className="bg-[hsl(220,15%,13%)] text-[hsl(0,0%,90%)] p-5 rounded-lg text-sm font-mono whitespace-pre-wrap">{prompt.prompt_text}</pre>
                      <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(prompt.prompt_text, i)}>
                        {copiedIndex === i ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    {prompt.what_to_expect && <p className="text-sm italic text-muted-foreground">What to expect: {prompt.what_to_expect}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Common Mistakes */}
          {commonMistakes.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Common Mistakes</h2>
              <div className="space-y-4">
                {commonMistakes.map((m, i) => (
                  <div key={i} className="bg-amber-500/5 rounded-r-lg p-5" style={{ borderLeft: "3px solid hsl(36, 92%, 50%)" }}>
                    <h3 className="font-bold mb-1">{m.title}</h3>
                    <p className="text-sm text-muted-foreground">{m.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tools */}
          {recommendedTools.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Tools That Work for This</h2>
              <div className="space-y-4">
                {recommendedTools.map((tool, i) => (
                  <div key={i}>
                    <span className="font-bold">{tool.name}</span>
                    {tool.description && <span className="text-muted-foreground ml-2">{tool.description}</span>}
                    {tool.limitation && <p className="text-sm italic text-muted-foreground mt-0.5">Heads up: {tool.limitation}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* FAQ */}
          {faqItems.length > 0 && (
            <section className="mb-12" itemScope itemType="https://schema.org/FAQPage">
              <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
              <div className="divide-y divide-border rounded-lg border border-border">
                {faqItems.map((faq, i) => (
                  <div key={i} itemScope itemProp="mainEntity" itemType="https://schema.org/Question" className="p-4">
                    <button className="w-full flex justify-between items-center text-left group" onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
                      <span className="font-medium" itemProp="name">{faq.question}</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedFaq === i ? "rotate-180" : ""}`} />
                    </button>
                    {expandedFaq === i && (
                      <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer" className="mt-3">
                        <p className="text-muted-foreground" itemProp="text">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Next Steps */}
          {nextSteps ? (
            <section className="mb-12">
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 md:p-8">
                <h2 className="text-xl font-bold mb-3">Next Steps</h2>
                <div className="prose dark:prose-invert max-w-none prose-a:text-primary whitespace-pre-wrap">{nextSteps}</div>
              </div>
            </section>
          ) : (
            <section className="mb-12">
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 md:p-8">
                <h2 className="text-xl font-bold mb-3">Next Steps</h2>
                <p className="text-muted-foreground">
                  Found this useful? We have plenty more practical guides covering everything from prompt engineering to automating your workflow. Each one is built the same way: real techniques, actual examples, no fluff.{" "}
                  <Link to="/guides" className="text-primary hover:underline">Browse all guides</Link> or search for your next topic.
                </p>
              </div>
            </section>
          )}

          {/* Newsletter */}
          <EndOfContentNewsletter />

          {/* Comments */}
          <GuideComments guideId={g.id} />
        </div>
      </main>

      <Footer />
    </>
  );
};

function GuideLoadingSkeleton() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2"><Skeleton className="h-6 w-16" /><Skeleton className="h-6 w-20" /></div>
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full" />
        </div>
      </main>
    </>
  );
}

export default GuideDetail;
