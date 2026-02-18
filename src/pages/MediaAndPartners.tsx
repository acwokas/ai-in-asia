import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Mail, Newspaper, Mic, Users, FileText } from "lucide-react";

const MediaAndPartners = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Media and Partners"
        description="AI in ASIA is an independent editorial platform focused on artificial intelligence across Asian markets. Information for media, partners, and organisations."
        canonical="https://aiinasia.com/media-and-partners"
      />

      <Header />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Media and Partners</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h1 className="headline text-4xl md:text-5xl mb-6">Media and Partners</h1>

            <p className="text-xl text-muted-foreground mb-6">
              AI in ASIA is an independent editorial platform focused on artificial intelligence across Asian markets.
            </p>

            <p className="mb-6">
              Our coverage spans policy, platforms, enterprise adoption, and regional ecosystem developments, with an emphasis on context, regulation, and real-world impact.
            </p>

            <p className="mb-8">
              This page provides background information for media, partners, and organisations engaging with AI in ASIA.
            </p>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6">Editorial Positioning</h2>

            <p className="mb-4 font-medium">AI in ASIA is an Asia-first publication.</p>

            <p className="mb-4">
              We focus on how artificial intelligence is built, governed, and applied across diverse markets in the region. Our coverage prioritises local context, regulatory awareness, and practical relevance over global generalisations or hype-driven narratives.
            </p>

            <p className="mb-8">
              AI in ASIA operates independently and maintains clear separation between editorial content and any commercial activity.
            </p>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6 flex items-center gap-3">
              <Newspaper className="h-7 w-7 text-primary" />
              For Media and Journalists
            </h2>

            <p className="mb-4">
              AI in ASIA may be referenced or cited as a source of regional AI context, policy coverage, or ecosystem analysis.
            </p>

            <p className="mb-4">Journalists may contact us for:</p>

            <ul className="space-y-2 mb-6">
              <li>Background or context on AI developments in Asia</li>
              <li>Regional policy and regulatory perspectives</li>
              <li>Commentary on enterprise and platform-level AI adoption</li>
            </ul>

            <p className="mb-8">Where appropriate, we are happy to provide attribution or clarification.</p>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6 flex items-center gap-3">
              <Mic className="h-7 w-7 text-primary" />
              For Events and Speaking Engagements
            </h2>

            <p className="mb-4">
              AI in ASIA participates selectively in conferences, panels, and industry discussions where regional AI context and practical insight are valued.
            </p>

            <p className="mb-4">Topics typically include:</p>

            <ul className="space-y-2 mb-6">
              <li>AI policy and regulation in Asia</li>
              <li>Enterprise AI adoption and risk</li>
              <li>Platform ecosystems and infrastructure</li>
              <li>Governance, trust, and compliance considerations</li>
            </ul>

            <p className="mb-8">Participation is subject to availability and alignment.</p>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6 flex items-center gap-3">
              <Users className="h-7 w-7 text-primary" />
              For Research and Industry Partners
            </h2>

            <p className="mb-4">
              AI in ASIA engages with organisations and institutions on a limited basis for research, editorial collaboration, or clearly labelled partner content.
            </p>

            <p className="mb-8">
              All collaborations must respect editorial independence. Any partner or sponsored content is transparently identified.
            </p>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6 flex items-center gap-3">
              <FileText className="h-7 w-7 text-primary" />
              Attribution and Usage
            </h2>

            <p className="mb-4">AI in ASIA content may be shared or referenced with clear attribution.</p>

            <p className="mb-8">
              Please link back to the original article or section when citing material. Republishing full articles without permission is not permitted.
            </p>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6">Contact</h2>

            <p className="mb-4">For media, partnership, or general enquiries, please contact:</p>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-primary flex-shrink-0" />
                  <a 
                    href="mailto:editor@aiinasia.com" 
                    className="text-primary hover:underline text-lg"
                  >
                    editor@aiinasia.com
                  </a>
                </div>
              </CardContent>
            </Card>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MediaAndPartners;
