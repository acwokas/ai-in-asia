import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
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
import { CheckCircle2, XCircle, FileText, Mail } from "lucide-react";

const Contribute = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Contribute to AI in ASIA - Guest Contributor Guidelines</title>
        <meta name="description" content="AI in ASIA welcomes guest contributions from people working with artificial intelligence across the region. Learn about our submission guidelines and editorial standards." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://aiinasia.com/contribute" />
        <meta property="og:title" content="Contribute to AI in ASIA" />
        <meta property="og:description" content="AI in ASIA welcomes guest contributions from people working with artificial intelligence across the region." />
        <meta property="og:url" content="https://aiinasia.com/contribute" />
        <meta property="og:type" content="website" />
      </Helmet>

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
                <BreadcrumbPage>Contribute</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <article className="prose prose-lg dark:prose-invert max-w-none">
            <h1 className="headline text-4xl md:text-5xl mb-6">Contribute to AI in ASIA</h1>

            <p className="text-xl text-muted-foreground mb-8">
              AI in ASIA welcomes guest contributions from people working with artificial intelligence across the region.
            </p>

            <p className="mb-6">
              We are interested in informed perspectives that add context, experience, or clarity to how AI is being developed, regulated, and applied in Asian markets.
            </p>

            <p className="mb-8">
              This is an editorial platform. Submissions are selected based on relevance and quality, not promotional value.
            </p>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6">What We Are Looking For</h2>

            <p className="mb-4">We accept contributions that offer:</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <span>Practical experience with AI adoption in business or government</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <span>Insight into regional policy, regulation, or compliance</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <span>Thoughtful analysis of platforms, infrastructure, or ecosystems</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <span>Local perspectives that add nuance to global AI narratives</span>
              </li>
            </ul>

            <p className="mb-8">Clear writing and regional relevance matter more than opinion.</p>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6">What We Do Not Publish</h2>

            <p className="mb-4">To maintain editorial standards, we do not accept:</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
                <span>Marketing content or product promotion</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
                <span>Press releases or announcement rewrites</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
                <span>SEO-driven listicles or generic explainers</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
                <span>Sales-led case studies or vendor comparisons</span>
              </li>
            </ul>

            <p className="mb-8">Submissions that read like advertising will not be reviewed.</p>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6">Submission Guidelines</h2>

            <p className="mb-4">Please note the following before submitting:</p>

            <Card className="mb-8">
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <span>Articles should be 600 to 1,200 words</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <span>Content must be original and unpublished elsewhere</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <span>Claims should be grounded in experience or credible sources</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <span>Writing should be clear, neutral, and factual</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <p className="mb-8">AI-assisted drafting is acceptable, but all submissions must be human-edited.</p>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6">Editorial Review Process</h2>

            <p className="mb-4">All submissions are reviewed by the AI in ASIA editorial team.</p>

            <p className="mb-4">
              We may suggest edits for clarity, length, or regional relevance. Publication is at our discretion, and we cannot guarantee feedback on every submission.
            </p>

            <p className="mb-8">If accepted, your article will be published with attribution.</p>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6">How to Submit</h2>

            <p className="mb-4">To submit an article proposal, please include:</p>

            <ul className="space-y-2 mb-6">
              <li>A short summary of the proposed topic</li>
              <li>Why it matters in an Asian context</li>
              <li>A brief author bio and current role</li>
            </ul>

            <Card className="mb-8 bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium">Submissions can be sent to:</p>
                    <a 
                      href="mailto:editor@aiinasia.com" 
                      className="text-primary hover:underline text-lg"
                    >
                      editor@aiinasia.com
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator className="my-8" />

            <h2 className="headline text-2xl md:text-3xl mb-6">Final Note</h2>

            <p className="mb-4">
              AI in ASIA values informed, grounded contributions that help readers make sense of how artificial intelligence is evolving across the region.
            </p>

            <p className="text-lg">
              If that aligns with how you think and work, we welcome your submission.
            </p>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contribute;
