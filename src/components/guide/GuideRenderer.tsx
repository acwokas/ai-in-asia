import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChevronDown, Copy, Check } from "lucide-react";

/** Render simple markdown (bold, italic, inline code, links, line breaks) to HTML */
const renderMarkdown = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, "<br />");
};

const MarkdownText = ({ text, className = "" }: { text: string; className?: string }) => {
  const html = useMemo(() => renderMarkdown(text), [text]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

interface GuideRendererProps {
  formData: any;
  /** Full page mode adds larger text, copy buttons on prompts, etc. */
  fullPage?: boolean;
}

const GuideRenderer = ({ formData, fullPage = false }: GuideRendererProps) => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const hasContent = (val: any) => {
    if (!val) return false;
    if (typeof val === "string") return val.trim().length > 0;
    if (Array.isArray(val)) return val.some(v => typeof v === "string" ? v.trim() : v && Object.values(v).some((x: any) => typeof x === "string" && x.trim()));
    if (typeof val === "object") return Object.values(val).some((x: any) => typeof x === "string" && x.trim());
    return false;
  };

  const pillarColors: Record<string, string> = { learn: "bg-blue-500", prompts: "bg-purple-500", toolbox: "bg-orange-500" };
  const diffColors: Record<string, string> = { beginner: "bg-green-500", intermediate: "bg-amber-500", advanced: "bg-red-500" };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const titleSize = fullPage ? "text-3xl md:text-4xl lg:text-5xl" : "text-3xl";
  const sectionSpacing = fullPage ? "mb-12" : "mb-8";

  return (
    <article className={`${fullPage ? "max-w-4xl" : "max-w-2xl"} mx-auto space-y-8`}>
      {/* Hero */}
      <header className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {formData.pillar && <Badge className={`${pillarColors[formData.pillar] || "bg-primary"} text-white`}>{formData.pillar}</Badge>}
          {formData.difficulty && <Badge className={`${diffColors[formData.difficulty] || ""} text-white`}>{formData.difficulty}</Badge>}
          {formData.platform_tags?.map((p: string) => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
        </div>
        <h1 className={`${titleSize} font-bold leading-tight`}>{formData.title || "Untitled Guide"}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {formData.read_time_minutes > 0 && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formData.read_time_minutes} min read</span>}
          {formData.one_line_description && !fullPage && <span>{formData.one_line_description}</span>}
          {fullPage && formData.topic_tags?.map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
          {fullPage && formData.published_at && <span>{new Date(formData.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>}
        </div>
        {formData.featured_image_url && <img src={formData.featured_image_url} alt={formData.featured_image_alt} className={`w-full aspect-video object-cover rounded-xl ${fullPage ? "shadow-lg" : ""}`} />}
      </header>

      {/* AI Snapshot */}
      {hasContent(formData.snapshot_bullets) && (
        <section className={`border-l-4 border-primary bg-card p-${fullPage ? "6" : "5"} rounded-r-lg space-y-${fullPage ? "3" : "2"}`}>
          {formData.snapshot_bullets.filter(Boolean).map((b: string, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p className="text-sm">{b}</p>
            </div>
          ))}
        </section>
      )}

      {/* Why This Matters */}
      {hasContent(formData.why_this_matters) && (
        <section className={sectionSpacing}>
          <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-border">Why This Matters</h2>
          <MarkdownText text={formData.why_this_matters} className="prose prose-sm dark:prose-invert max-w-none leading-relaxed" />
        </section>
      )}

      {/* How to Do It */}
      {hasContent(formData.steps) && (
        <section className={sectionSpacing}>
          <h2 className="text-2xl font-bold mb-6">How to Do It</h2>
          <div className="space-y-6">
            {formData.steps.filter((s: any) => s.content?.trim()).map((step: any, i: number) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">{i + 1}</div>
                  {i < formData.steps.length - 1 && <div className="w-px flex-1 border-l border-dashed border-border mt-2" />}
                </div>
                <div className="pb-4 flex-1">
                  {step.title && <h3 className="font-semibold mb-1">{step.title}</h3>}
                  <MarkdownText text={step.content} className="text-sm text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Worked Example */}
      {hasContent(formData.worked_example) && (
        <section className={`bg-muted/30 rounded-xl p-6 space-y-4 ${sectionSpacing}`}>
          <h2 className="text-2xl font-bold">What This Actually Looks Like</h2>
          {formData.worked_example.prompt && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">The Prompt</p>
              <div className="relative">
                <pre className="bg-[hsl(220,15%,13%)] text-[hsl(0,0%,90%)] p-4 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto">{formData.worked_example.prompt}</pre>
                {fullPage && (
                  <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(formData.worked_example.prompt, -1)}>
                    {copiedIndex === -1 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          )}
          {formData.worked_example.output && (
            <div className="border-l-4 border-primary pl-4">
              <p className="text-xs italic text-muted-foreground mb-2">Example output - your results will vary based on your inputs</p>
              <MarkdownText text={formData.worked_example.output} className="text-sm" />
            </div>
          )}
          {formData.worked_example.editing_notes && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">How to Edit This</p>
              <MarkdownText text={formData.worked_example.editing_notes} className="text-sm" />
            </div>
          )}
        </section>
      )}

      {/* Prompts to Try */}
      {hasContent(formData.guide_prompts) && (
        <section className={sectionSpacing}>
          <h2 className="text-2xl font-bold mb-4">Prompts to Try</h2>
          <div className="space-y-4">
            {formData.guide_prompts.filter((p: any) => p.prompt_text?.trim()).map((prompt: any, i: number) => (
              <div key={i} className="space-y-2">
                {prompt.title && <h3 className="font-semibold">{prompt.title}</h3>}
                <div className="relative">
                  <pre className="bg-[hsl(220,15%,13%)] text-[hsl(0,0%,90%)] p-4 rounded-lg text-sm font-mono whitespace-pre-wrap">{prompt.prompt_text}</pre>
                  {fullPage && (
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(prompt.prompt_text, i)}>
                      {copiedIndex === i ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                {prompt.what_to_expect && <p className="text-xs italic text-muted-foreground">What to expect: {prompt.what_to_expect}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Common Mistakes */}
      {hasContent(formData.common_mistakes) && (
        <section className={sectionSpacing}>
          <h2 className="text-2xl font-bold mb-4">Common Mistakes</h2>
          <div className="space-y-3">
            {formData.common_mistakes.filter((m: any) => m.title?.trim()).map((mistake: any, i: number) => (
              <div key={i} className="border-l-3 border-amber-500 bg-amber-500/5 p-4 rounded-r-lg" style={{ borderLeftWidth: "3px" }}>
                <h3 className="font-semibold mb-1">{mistake.title}</h3>
                <MarkdownText text={mistake.description} className="text-sm text-muted-foreground" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tools */}
      {hasContent(formData.recommended_tools) && (
        <section className={sectionSpacing}>
          <h2 className="text-2xl font-bold mb-4">Tools That Work for This</h2>
          <div className="space-y-3">
            {formData.recommended_tools.filter((t: any) => t.name?.trim()).map((tool: any, i: number) => (
              <div key={i}>
                <span className="font-semibold">{tool.name}</span>
                {tool.description && <MarkdownText text={tool.description} className="text-sm text-muted-foreground inline ml-2" />}
                {tool.limitation && <p className="text-xs italic text-muted-foreground mt-0.5">Heads up: {tool.limitation}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {hasContent(formData.faq_items) && (
        <section className={sectionSpacing}>
          <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="divide-y divide-border rounded-lg border border-border">
            {formData.faq_items.filter((f: any) => f.question?.trim()).map((faq: any, i: number) => (
              <div key={i} className="p-4">
                <button className="w-full flex justify-between items-center text-left" onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}>
                  <span className="font-medium">{faq.question}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedFaq === i ? "rotate-180" : ""}`} />
                </button>
                {expandedFaq === i && <MarkdownText text={faq.answer} className="text-sm text-muted-foreground mt-2" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Next Steps */}
      {hasContent(formData.next_steps) && (
        <div className={`bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 ${sectionSpacing}`}>
          <h2 className="text-xl font-bold mb-3">Next Steps</h2>
          <MarkdownText text={formData.next_steps} className="text-sm" />
        </div>
      )}
    </article>
  );
};

export default GuideRenderer;
export { MarkdownText, renderMarkdown };
