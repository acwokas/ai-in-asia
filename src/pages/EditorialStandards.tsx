import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CollectiveFooter } from "@/components/CollectiveFooter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const EditorialStandards = () => {
  return (
    <>
      <SEOHead
        title="How AI in ASIA Works | Editorial Standards"
        description="AI in ASIA is an Asia-first editorial platform covering artificial intelligence as it is built, regulated, and used across the region. Learn about our editorial standards and approach."
        canonical="https://aiinasia.com/editorial-standards"
      />

      <Header />

      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Breadcrumb className="mb-8">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Editorial Standards</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="text-4xl font-bold mb-8 text-foreground">
            How AI in ASIA Works
          </h1>

          <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
            <p className="text-lg text-muted-foreground leading-relaxed">
              AI in ASIA is an Asia-first editorial platform covering artificial intelligence as it is built, regulated, and used across the region.
            </p>

            <p className="text-muted-foreground leading-relaxed">
              Our focus is on clarity, context, and real-world relevance. We aim to help readers understand what is happening, why it matters locally, and what may change next.
            </p>

            <p className="text-muted-foreground leading-relaxed">
              This platform is designed for people who want informed perspective rather than hype.
            </p>

            <section className="pt-6">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">What We Cover</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We focus on artificial intelligence developments that have practical or strategic relevance in Asia, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>AI policy, regulation, and governance across Asian markets</li>
                <li>AI platforms, tools, and infrastructure used in enterprise and industry</li>
                <li>Real-world AI adoption by businesses, governments, and institutions</li>
                <li>Regional differences in regulation, culture, and market readiness</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Our coverage prioritises local context and regional nuance rather than global generalisations.
              </p>
            </section>

            <section className="pt-6">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">What We Do Not Cover</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To maintain editorial integrity, we do not publish:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Paid PR or undisclosed sponsored content</li>
                <li>Sensationalist or fear-based AI narratives</li>
                <li>Vendor marketing presented as independent analysis</li>
                <li>Speculative hype without practical or regional relevance</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Any commercial or partner content, if published, is clearly labelled.
              </p>
            </section>

            <section className="pt-6">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">How Our Content Is Created</h2>
              <p className="text-muted-foreground leading-relaxed">
                AI in ASIA uses a combination of human editorial judgement and AI-assisted tools.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                AI may be used to support research, summarisation, drafting, or structuring of content. All articles are reviewed, edited, and curated by a human editor before publication.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Our priority is accuracy, readability, and relevance to Asia rather than speed or volume.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Where appropriate, sources are referenced and contextualised for regional audiences.
              </p>
            </section>

            <section className="pt-6">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Editorial Independence</h2>
              <p className="text-muted-foreground leading-relaxed">
                Editorial decisions at AI in ASIA are made independently.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Guest contributors are selected based on expertise and relevance, not promotional intent. Opinions expressed by contributors are their own and do not necessarily reflect the views of AI in ASIA.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Sponsored or partner content is clearly identified as such.
              </p>
            </section>

            <section className="pt-6">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Who AI in ASIA Is For</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                AI in ASIA is written for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Founders and operators building or scaling businesses in Asia</li>
                <li>Business and technology leaders navigating AI adoption</li>
                <li>Policy-aware professionals, investors, and advisors</li>
                <li>Curious readers seeking informed, Asia-specific context</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Our content assumes interest and intelligence, not prior expertise.
              </p>
            </section>

            <section className="pt-6">
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Our Editorial Intent</h2>
              <p className="text-muted-foreground leading-relaxed">
                Asia is not a single market, and artificial intelligence does not develop in a vacuum.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                AI in ASIA exists to provide grounded, regionally informed coverage that helps readers make sense of how AI is shaping economies, organisations, and regulation across the continent.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                The platform will evolve over time, but our editorial intent remains consistent: clarity over noise, context over hype.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
      <CollectiveFooter />
    </>
  );
};

export default EditorialStandards;
