import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronDown, AlertTriangle } from "lucide-react";
import CopyableCodeBlock from "@/components/guide/CopyableCodeBlock";

/** Render simple markdown (bold, italic, inline code, links, line breaks) to HTML */
const renderMarkdown = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-teal-400 hover:text-teal-300 underline" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, "<br />");
};

/** Strip markdown markers for plain text contexts */
const stripMd = (text: string): string => {
  if (!text) return "";
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1");
};

const MarkdownText = ({ text, className = "" }: { text: string; className?: string }) => {
  const html = useMemo(() => renderMarkdown(text), [text]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

interface GuideRendererProps {
  formData: any;
  fullPage?: boolean;
}

const GuideRenderer = ({ formData, fullPage = false }: GuideRendererProps) => {
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set());

  const hasContent = (val: any) => {
    if (!val) return false;
    if (typeof val === "string") return val.trim().length > 0;
    if (Array.isArray(val)) return val.some(v => typeof v === "string" ? v.trim() : v && Object.values(v).some((x: any) => typeof x === "string" && x.trim()));
    if (typeof val === "object") return Object.values(val).some((x: any) => typeof x === "string" && x.trim());
    return false;
  };

  const pillarColors: Record<string, string> = { learn: "bg-blue-500", prompts: "bg-purple-500", toolbox: "bg-teal-500" };
  const diffColors: Record<string, string> = { beginner: "bg-green-500", intermediate: "bg-amber-500", advanced: "bg-red-500" };

  const toggleFaq = (i: number) => {
    setOpenFaqs(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <article>
      {/* Hero */}
      <header className="mb-12">
        <div className="flex flex-wrap gap-2 mb-4">
          {formData.pillar && <Badge className={`${pillarColors[formData.pillar] || "bg-primary"} text-white border-0`}>{formData.pillar}</Badge>}
          {formData.difficulty && <Badge className={`${diffColors[formData.difficulty] || ""} text-white border-0`}>{formData.difficulty}</Badge>}
          {formData.platform_tags?.map((p: string) => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
        </div>

        <h1 className={`${fullPage ? "text-3xl md:text-4xl lg:text-5xl" : "text-3xl"} font-bold tracking-tight mb-4 text-foreground`}>
          {formData.title || "Untitled Guide"}
        </h1>

        {formData.one_line_description && (
          <p className="text-lg text-foreground/80 mb-4">{formData.one_line_description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
          {formData.read_time_minutes > 0 && (
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formData.read_time_minutes} min read</span>
          )}
          {fullPage && formData.published_at && (
            <span>{new Date(formData.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
          )}
          {fullPage && formData.topic_tags?.map((t: string) => (
            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
          ))}
        </div>

        {formData.featured_image_url && (
          <img
            src={formData.featured_image_url}
            alt={formData.featured_image_alt || formData.title}
            className={`w-full aspect-video object-cover rounded-xl ${fullPage ? "shadow-lg" : ""}`}
          />
        )}
      </header>

      {/* AI Snapshot */}
      {hasContent(formData.snapshot_bullets) && (
        <section id="ai-snapshot" className="border-l-4 border-teal-500 bg-card rounded-r-lg p-6 mb-12">
          <div className="space-y-3">
            {formData.snapshot_bullets.filter(Boolean).map((b: string, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-teal-500 mt-2.5 flex-shrink-0" />
                <p className="text-base md:text-lg leading-relaxed text-foreground/90">{b}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Why This Matters */}
      {hasContent(formData.why_this_matters) && (
        <section id="why-this-matters" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 pb-2 border-b border-border text-foreground">Why This Matters</h2>
          <MarkdownText text={formData.why_this_matters} className="text-lg leading-relaxed text-foreground/90 space-y-4" />
        </section>
      )}

      {/* How to Do It - Visual Timeline */}
      {hasContent(formData.steps) && (
        <section id="how-to-do-it" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 pb-2 border-b border-border text-foreground">How to Do It</h2>
          <div>
            {formData.steps.filter((s: any) => s.content?.trim()).map((step: any, i: number, arr: any[]) => (
              <div key={i} className="flex gap-4 mb-8 last:mb-0">
                <div className="w-12 flex-shrink-0 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px flex-1 border-l-2 border-dashed border-teal-600/30 mt-2" />
                  )}
                </div>
                <div className="flex-1 pt-1.5">
                  {step.title && <h3 className="text-xl font-semibold mb-1 text-foreground">{step.title}</h3>}
                  <MarkdownText text={step.content} className="text-lg leading-relaxed text-foreground/90" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* What This Actually Looks Like */}
      {hasContent(formData.worked_example) && (
        <section id="what-this-actually-looks-like" className="bg-card/50 rounded-xl p-6 md:p-8 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 pb-2 border-b border-border text-foreground">What This Actually Looks Like</h2>

          {formData.worked_example.prompt && (
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">The Prompt</p>
              <CopyableCodeBlock content={formData.worked_example.prompt} />
            </div>
          )}

          {formData.worked_example.output && (
            <div className="mb-6">
              <p className="text-sm italic text-muted-foreground mb-3">Example output — your results will vary based on your inputs</p>
              <div className="border-l-4 border-teal-500 bg-teal-500/5 rounded-r-lg p-4">
                <MarkdownText text={formData.worked_example.output} className="text-base leading-relaxed text-foreground/90" />
              </div>
            </div>
          )}

          {formData.worked_example.editing_notes && (
            <div>
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">How to Edit This</p>
              <MarkdownText text={formData.worked_example.editing_notes} className="text-base leading-relaxed text-foreground/90" />
            </div>
          )}
        </section>
      )}

      {/* Prompts to Try */}
      {hasContent(formData.guide_prompts) && (
        <section id="prompts-to-try" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 pb-2 border-b border-border text-foreground">Prompts to Try</h2>
          <div className="space-y-8">
            {formData.guide_prompts.filter((p: any) => p.prompt_text?.trim()).map((prompt: any, i: number) => (
              <div key={i}>
                {prompt.title && <h3 className="text-xl font-semibold mb-3 text-foreground">{prompt.title}</h3>}
                <CopyableCodeBlock content={prompt.prompt_text} />
                {prompt.what_to_expect && (
                  <p className="text-sm text-muted-foreground italic mt-2">What to expect: {prompt.what_to_expect}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Common Mistakes */}
      {hasContent(formData.common_mistakes) && (
        <section id="common-mistakes" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 pb-2 border-b border-border text-foreground">Common Mistakes</h2>
          <div className="space-y-4">
            {formData.common_mistakes.filter((m: any) => m.title?.trim()).map((mistake: any, i: number) => (
              <div key={i} className="border-l-4 border-amber-500 bg-amber-500/5 rounded-r-lg p-4">
                <h3 className="font-semibold mb-1 text-foreground">{stripMd(mistake.title)}</h3>
                <MarkdownText text={mistake.description} className="text-base text-foreground/80 leading-relaxed" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tools That Work for This */}
      {hasContent(formData.recommended_tools) && (
        <section id="tools-that-work" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 pb-2 border-b border-border text-foreground">Tools That Work for This</h2>
          <div className="divide-y divide-border">
            {formData.recommended_tools.filter((t: any) => t.name?.trim()).map((tool: any, i: number) => (
              <div key={i} className="py-3">
                <span className="font-semibold text-foreground">{stripMd(tool.name)}</span>
                {tool.description && (
                  <span className="text-foreground/80 ml-2">{stripMd(tool.description)}</span>
                )}
                {tool.limitation && (
                  <p className="text-sm italic text-muted-foreground mt-0.5"><AlertTriangle className="h-3.5 w-3.5 inline text-amber-500 mr-1" />{stripMd(tool.limitation)}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ - Accordions */}
      {hasContent(formData.faq_items) && (
        <section id="faq" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 pb-2 border-b border-border text-foreground">Frequently Asked Questions</h2>
          <div className="divide-y divide-border">
            {formData.faq_items.filter((f: any) => f.question?.trim()).map((faq: any, i: number) => (
              <div key={i}>
                <button
                  className="w-full flex justify-between items-center cursor-pointer py-4 text-left"
                  onClick={() => toggleFaq(i)}
                >
                  <span className="font-medium text-lg text-foreground pr-4">{faq.question}</span>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${openFaqs.has(i) ? "rotate-180" : ""}`} />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${openFaqs.has(i) ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}
                >
                  <div className="pt-0 pb-4">
                    <MarkdownText text={faq.answer} className="text-base text-foreground/85 leading-relaxed" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Next Steps */}
      {hasContent(formData.next_steps) && (
        <div id="next-steps" className="bg-gradient-to-br from-teal-500/10 to-blue-500/10 rounded-xl p-6 md:p-8 mb-12">
          <h2 className="text-xl font-bold mb-3 text-foreground">Next Steps</h2>
          <MarkdownText text={formData.next_steps} className="text-lg leading-relaxed text-foreground/90" />
        </div>
      )}
    </article>
  );
};

export default GuideRenderer;
export { MarkdownText, renderMarkdown };
