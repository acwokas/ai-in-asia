import { useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GuideComments from "@/components/GuideComments";
import EndOfContentNewsletter from "@/components/EndOfContentNewsletter";
import GuideRenderer from "@/components/guide/GuideRenderer";
import GuideDetailSidebar from "@/components/guide/GuideDetailSidebar";
import GuideMobileToc from "@/components/guide/GuideMobileToc";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

const GuideDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewCode = searchParams.get("preview");

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
    if (g.status === "published") return;
    if (previewCode && g.preview_code === previewCode) return;
    navigate("/guides", { replace: true });
  }, [guide, isLoading, previewCode]);

  // Build sections list for TOC
  const tocSections = useMemo(() => {
    if (!guide) return [];
    const g = guide as any;
    const hasContent = (val: any) => {
      if (!val) return false;
      if (typeof val === "string") return val.trim().length > 0;
      if (Array.isArray(val)) return val.length > 0 && val.some((v: any) => typeof v === "string" ? v.trim() : v && Object.values(v).some((x: any) => typeof x === "string" && (x as string).trim()));
      if (typeof val === "object") return Object.values(val).some((x: any) => typeof x === "string" && (x as string).trim());
      return false;
    };
    const bullets = g.snapshot_bullets?.length ? g.snapshot_bullets : [g.tldr_bullet_1, g.tldr_bullet_2, g.tldr_bullet_3].filter(Boolean);
    const steps = Array.isArray(g.steps) && g.steps.length ? g.steps : [];
    const workedExample = g.worked_example && Object.keys(g.worked_example).length && (g.worked_example.prompt || g.worked_example.output) ? g.worked_example : null;
    const guidePrompts = Array.isArray(g.guide_prompts) && g.guide_prompts.length ? g.guide_prompts : [];
    const commonMistakes = Array.isArray(g.common_mistakes) && g.common_mistakes.length ? g.common_mistakes : [];
    const tools = Array.isArray(g.recommended_tools) && g.recommended_tools.length ? g.recommended_tools : [];
    const faqItems = Array.isArray(g.faq_items) && g.faq_items.length ? g.faq_items : [
      g.faq_q1 ? { question: g.faq_q1, answer: g.faq_a1 } : null,
      g.faq_q2 ? { question: g.faq_q2, answer: g.faq_a2 } : null,
      g.faq_q3 ? { question: g.faq_q3, answer: g.faq_a3 } : null,
    ].filter(Boolean);

    const sections: { id: string; label: string }[] = [];
    if (hasContent(bullets)) sections.push({ id: "ai-snapshot", label: "AI Snapshot" });
    if (hasContent(g.why_this_matters || g.context_and_background)) sections.push({ id: "why-this-matters", label: "Why This Matters" });
    if (hasContent(steps)) sections.push({ id: "how-to-do-it", label: "How to Do It" });
    if (hasContent(workedExample)) sections.push({ id: "what-this-actually-looks-like", label: "What This Looks Like" });
    if (hasContent(guidePrompts)) sections.push({ id: "prompts-to-try", label: "Prompts to Try" });
    if (hasContent(commonMistakes)) sections.push({ id: "common-mistakes", label: "Common Mistakes" });
    if (hasContent(tools)) sections.push({ id: "tools-that-work", label: "Tools That Work" });
    if (hasContent(faqItems)) sections.push({ id: "faq", label: "FAQ" });
    if (hasContent(g.next_steps)) sections.push({ id: "next-steps", label: "Next Steps" });
    return sections;
  }, [guide]);

  if (isLoading) return <GuideLoadingSkeleton />;
  if (!guide) return null;

  const g = guide as any;
  const isPreview = g.status !== "published" && previewCode === g.preview_code;

  // Build formData shape that GuideRenderer expects
  const formData = {
    title: g.title,
    pillar: g.pillar || "",
    difficulty: g.difficulty || g.level?.toLowerCase() || "",
    platform_tags: g.platform_tags?.length ? g.platform_tags : [g.primary_platform].filter(Boolean),
    topic_tags: g.topic_tags?.length ? g.topic_tags : (g.tags ? g.tags.split(",").map((t: string) => t.trim()) : []),
    read_time_minutes: g.read_time_minutes || 0,
    one_line_description: g.one_line_description || "",
    published_at: g.published_at,
    featured_image_url: g.featured_image_url,
    featured_image_alt: g.featured_image_alt || g.title,
    snapshot_bullets: g.snapshot_bullets?.length ? g.snapshot_bullets : [g.tldr_bullet_1, g.tldr_bullet_2, g.tldr_bullet_3].filter(Boolean),
    why_this_matters: g.why_this_matters || g.context_and_background || "",
    steps: Array.isArray(g.steps) && g.steps.length ? g.steps : [],
    worked_example: g.worked_example && Object.keys(g.worked_example).length && (g.worked_example.prompt || g.worked_example.output) ? g.worked_example : null,
    guide_prompts: Array.isArray(g.guide_prompts) && g.guide_prompts.length ? g.guide_prompts : [],
    common_mistakes: Array.isArray(g.common_mistakes) && g.common_mistakes.length ? g.common_mistakes : [],
    recommended_tools: Array.isArray(g.recommended_tools) && g.recommended_tools.length ? g.recommended_tools : [],
    faq_items: Array.isArray(g.faq_items) && g.faq_items.length ? g.faq_items : [
      g.faq_q1 ? { question: g.faq_q1, answer: g.faq_a1 } : null,
      g.faq_q2 ? { question: g.faq_q2, answer: g.faq_a2 } : null,
      g.faq_q3 ? { question: g.faq_q3, answer: g.faq_a3 } : null,
    ].filter(Boolean),
    next_steps: g.next_steps || "",
  };

  // JSON-LD schemas
  const faqSchema = formData.faq_items.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: formData.faq_items.map((f: any) => ({
      "@type": "Question", name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  } : null;

  const howToSchema = formData.steps.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: g.title,
    description: g.one_line_description || g.meta_description || g.excerpt || "",
    step: formData.steps.map((s: any, i: number) => ({
      "@type": "HowToStep", position: i + 1,
      name: s.title || `Step ${i + 1}`, text: s.content,
    })),
  } : null;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.one_line_description || g.meta_description || g.excerpt || "",
    image: g.featured_image_url || "https://aiinasia.com/icons/aiinasia-512.png?v=3",
    datePublished: g.published_at || g.created_at,
    dateModified: g.updated_at,
    author: { "@type": "Organization", name: "AI in Asia" },
    publisher: { "@type": "Organization", name: "AI in Asia", logo: { "@type": "ImageObject", url: "https://aiinasia.com/logo.png" } },
  };

  return (
    <>
      <SEOHead
        title={`${g.meta_title || g.title} | AI in Asia`}
        description={g.one_line_description || g.meta_description || g.excerpt || ""}
        canonical={`https://aiinasia.com/guides/${g.slug}`}
        ogType="article"
        ogImage={g.featured_image_url || "https://aiinasia.com/icons/aiinasia-512.png?v=3"}
        ogImageAlt={g.featured_image_alt || g.title}
        noIndex={isPreview}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
        {howToSchema && <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>}
      </Helmet>

      <Header />

      {isPreview && (
        <div className="bg-amber-500 text-black text-center py-2 text-sm font-medium">
          PREVIEW MODE - This guide is not published yet
        </div>
      )}

      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <Link to="/guides" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Guides
          </Link>

          <div className="flex gap-8 lg:gap-12">
            {/* Main content */}
            <div className="flex-1 min-w-0 max-w-3xl">
              <GuideRenderer formData={formData} fullPage />

              {/* Default Next Steps fallback if none provided */}
              {!formData.next_steps && (
                <div className="mb-12">
                  <div className="bg-gradient-to-br from-teal-500/10 to-blue-500/10 rounded-xl p-6 md:p-8">
                    <h2 className="text-xl font-bold mb-3">Next Steps</h2>
                    <p className="text-foreground/80">
                      Found this useful? We have plenty more practical guides covering everything from prompt engineering to automating your workflow.{" "}
                      <Link to="/guides" className="text-teal-400 hover:text-teal-300 underline">Browse all guides</Link> or search for your next topic.
                    </p>
                  </div>
                </div>
              )}

              {/* Newsletter & Comments */}
              <EndOfContentNewsletter />
              <GuideComments guideId={g.id} />
            </div>

            {/* Sidebar */}
            <GuideDetailSidebar sections={tocSections} />
          </div>
        </div>
      </main>

      {/* Mobile floating TOC */}
      <GuideMobileToc sections={tocSections} />

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
