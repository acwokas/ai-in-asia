import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, Sparkles, Building2, ShoppingCart, Zap, Code, Brain } from "lucide-react";

const Tools = () => {
  const tools = [
    {
      name: "Prompt with the power of AI.",
      description: "Advanced prompt engineering platform to supercharge your AI interactions. Create, test, and optimize prompts for any AI model.",
      url: "https://www.promptandgo.ai",
      category: "Productivity",
      icon: Sparkles,
      features: ["Template Library", "Prompt Testing", "Version Control"]
    },
    {
      name: "Startup with the power of AI.",
      description: "AI prompts and templates to supercharge your business. From marketing copy to business plans, accelerate every aspect of your startup.",
      url: "https://www.businessinabyte.com",
      category: "Business",
      icon: Building2,
      features: ["Business Templates", "Marketing Automation", "Strategy Tools"]
    },
    {
      name: "Shop with the power of AI.",
      description: "AI-curated deals from around the web. Discover personalized product recommendations and exclusive offers powered by machine learning.",
      url: "https://www.myofferclub.com",
      category: "Retail",
      icon: ShoppingCart,
      features: ["Smart Recommendations", "Price Tracking", "Deal Alerts"]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>AI Tools Directory - AI in ASIA</title>
        <meta name="description" content="Discover the best AI tools and platforms curated by AI in ASIA. From productivity to business automation, explore cutting-edge AI solutions." />
        <link rel="canonical" href="https://aiinasia.com/tools" />
        <meta property="og:title" content="AI Tools Directory - AI in ASIA" />
        <meta property="og:description" content="Discover the best AI tools and platforms curated by AI in ASIA." />
        <meta property="og:url" content="https://aiinasia.com/tools" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-foreground/10 rounded-full text-sm font-medium mb-6">
                <Zap className="h-4 w-4" />
                Curated AI Tools
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                AI Tools Directory
              </h1>
              <p className="text-lg opacity-90">
                Discover powerful AI tools and platforms that are transforming how we work, create, and innovate across Asia and beyond.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Tools Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-3">Featured Tools</h2>
            <p className="text-muted-foreground text-lg">
              Handpicked AI solutions from the you.withthepowerof.ai collective
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {tools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <Card key={index} className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <Badge className="bg-accent text-accent-foreground">
                        {tool.category}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-bold text-2xl mb-3">
                        {tool.name}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {tool.description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Key Features
                      </p>
                      <ul className="space-y-2">
                        {tool.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button className="w-full gap-2" size="lg" asChild>
                      <a href={tool.url} target="_blank" rel="noopener noreferrer">
                        Visit Tool
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Coming Soon Section */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-4">More Tools Coming Soon</h2>
              <p className="text-muted-foreground text-lg mb-8">
                We're constantly discovering and curating the best AI tools from across the Asia-Pacific region and beyond. Stay tuned for more additions to our directory.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Badge variant="outline" className="text-sm px-4 py-2">AI Code Assistants</Badge>
                <Badge variant="outline" className="text-sm px-4 py-2">Content Generation</Badge>
                <Badge variant="outline" className="text-sm px-4 py-2">Data Analytics</Badge>
                <Badge variant="outline" className="text-sm px-4 py-2">Image Generation</Badge>
                <Badge variant="outline" className="text-sm px-4 py-2">Voice AI</Badge>
                <Badge variant="outline" className="text-sm px-4 py-2">AI Automation</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <Card className="p-8 md:p-12 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">
                Have an AI Tool to Recommend?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Know of an amazing AI tool that should be featured? We'd love to hear about it and potentially add it to our directory.
              </p>
              <Button size="lg" asChild>
                <a href="/contact">
                  Submit a Tool
                </a>
              </Button>
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Tools;
