import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Zap, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Guides = () => {
  return (
    <>
      <SEOHead
        title="AI Guides, Prompts & Tools | AI in Asia"
        description="Practical AI guides, ready-to-use prompt collections, and curated tool recommendations. Real techniques for practitioners across Asia. No theory, no filler."
        canonical="https://aiinasia.com/guides"
        ogType="website"
        ogImage="https://aiinasia.com/icons/aiinasia-512.png?v=3"
        ogImageAlt="AI Guides, Prompts & Tools - AI in Asia"
      />
      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
          <div className="absolute top-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="container relative mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-4 w-4" />
                <span>New guides launching soon</span>
              </div>

              <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
                Master AI with
                <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  Practical Guides
                </span>
              </h1>

              <p className="text-xl text-muted-foreground md:text-2xl leading-relaxed max-w-2xl">
                Real techniques, tested prompts, and honest tool recommendations. No theory, no filler.
              </p>

              <p className="mt-3 text-sm text-muted-foreground/70 tracking-wide uppercase">
                Built for practitioners across Asia
              </p>
            </div>
          </div>
        </section>

        {/* Rebuilding message */}
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-8">
                <BookOpen className="h-10 w-10 text-primary" />
              </div>

              <h2 className="text-3xl font-bold text-foreground mb-4">
                We're rebuilding this section from scratch
              </h2>

              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                The guides section is getting a complete overhaul. New, genuinely useful guides written by real practitioners - not AI-generated filler. First batch drops soon.
              </p>

              <p className="text-muted-foreground mb-8">
                In the meantime, explore our articles across News, Business, Life, Learn, Create, Voices, and Policy.
              </p>

              <Link to="/category/news">
                <Button size="lg" className="gap-2">
                  Browse Articles <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Guides;
