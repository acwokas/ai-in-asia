import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, CheckCircle2, Clock, Globe, Users, ArrowRight, Calendar } from "lucide-react";
import { z } from "zod";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import SEOHead from "@/components/SEOHead";

const newsletterSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  firstName: z.string().trim().min(1, { message: "First name is required" }).max(100),
});

// Generate 15 sample editions spanning last 3 weeks
const generateSampleEditions = () => {
  const headlines = [
    { date: "2026-04-08", topics: ["Singapore launches $500M AI research fund", "Alibaba Cloud opens new data center in Malaysia", "Vietnam proposes national AI governance framework"] },
    { date: "2026-04-07", topics: ["Google DeepMind partners with Japan's RIKEN institute", "India's AI startup funding hits record $2.1B in Q1", "Thailand rolls out AI-powered healthcare diagnostics"] },
    { date: "2026-04-04", topics: ["South Korea unveils AI semiconductor strategy", "Grab integrates generative AI across ride-hailing platform", "Philippines trains 10,000 government workers on AI tools"] },
    { date: "2026-04-03", topics: ["NVIDIA announces new APAC AI research lab in Tokyo", "Indonesia's Bukalapak deploys AI for rural e-commerce", "Taiwan's TSMC reveals next-gen AI chip architecture"] },
    { date: "2026-04-02", topics: ["Hong Kong regulator issues AI trading guidelines", "Baidu launches autonomous driving service in Shenzhen", "Malaysia's MDEC partners with AWS on AI skills program"] },
    { date: "2026-04-01", topics: ["India mandates AI impact assessments for public sector", "SenseTime reports 40% revenue growth in Southeast Asia", "New Zealand publishes responsible AI guidelines"] },
    { date: "2026-03-31", topics: ["Japan's SoftBank invests $1.5B in Asian AI startups", "Singapore pilots AI-driven urban planning system", "Bangladesh launches first national AI strategy"] },
    { date: "2026-03-28", topics: ["Samsung unveils on-device AI processor for mobile", "Vietnam's VinAI publishes breakthrough NLP research", "Australia tightens AI export controls to align with allies"] },
    { date: "2026-03-27", topics: ["China's Zhipu AI raises $400M in Series C funding", "Thai government launches AI chatbot for citizen services", "Hyundai deploys factory AI across Korean plants"] },
    { date: "2026-03-26", topics: ["AWS Summit Singapore draws record 15,000 attendees", "India's Infosys launches AI consulting practice for ASEAN", "Myanmar explores AI for disaster early warning systems"] },
    { date: "2026-03-25", topics: ["Tencent open-sources multilingual LLM for Asian languages", "South Korea AI ethics board publishes annual review", "Cambodia partners with UNICEF on AI education program"] },
    { date: "2026-03-24", topics: ["Japanese robotics firms form AI safety consortium", "Pakistan launches AI innovation hub in Lahore", "Ant Group deploys AI fraud detection across Southeast Asia"] },
    { date: "2026-03-21", topics: ["ASEAN ministers agree on cross-border AI data framework", "Rakuten integrates AI into Japan's largest mobile network", "Sri Lanka trains judiciary on AI evidence standards"] },
    { date: "2026-03-20", topics: ["Xiaomi reveals AI-powered smart manufacturing roadmap", "Singapore's GovTech wins global award for AI public services", "Nepal pilots AI crop monitoring with satellite imagery"] },
    { date: "2026-03-19", topics: ["ByteDance expands AI research team in Singapore to 500", "India's NASSCOM forecasts 30% AI job growth by 2027", "Mongolia deploys AI for nomadic livestock health tracking"] },
  ];
  return headlines;
};

const SAMPLE_EDITIONS = generateSampleEditions();

const Newsletter = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  // Live subscriber count
  const { data: subscriberCount } = useQuery({
    queryKey: ["newsletter-subscriber-count"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("newsletter_subscribers")
        .select("id", { count: "exact", head: true })
        .is("unsubscribed_at", null);
      return count || 0;
    },
  });

  // Live briefing subscriber count
  const { data: briefingCount } = useQuery({
    queryKey: ["briefing-subscriber-count"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("briefing_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      return count || 0;
    },
  });

  const totalReaders = (subscriberCount || 0) + (briefingCount || 0);
  const displayReaders = totalReaders > 100 ? `${Math.floor(totalReaders / 100) * 100}+` : `${totalReaders}+`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedData = newsletterSchema.parse({ email, firstName });

      const { data: existing, error: checkError } = await supabase
        .from("newsletter_subscribers")
        .select("id, unsubscribed_at")
        .eq("email", validatedData.email)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        if (existing.unsubscribed_at === null) {
          toast.info("Already subscribed", { description: "This email is already on our list." });
        } else {
          const { error: updateError } = await supabase
            .from("newsletter_subscribers")
            .update({ unsubscribed_at: null })
            .eq("id", existing.id);
          if (updateError) throw updateError;
          setIsSubscribed(true);
          toast.success("Welcome back!", { description: "You have been re-subscribed." });
        }
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({
          email: validatedData.email,
          first_name: validatedData.firstName,
          signup_source: "newsletter_page",
        });

      if (error) throw error;

      setIsSubscribed(true);
      localStorage.setItem("newsletter-subscribed", "true");
      toast.success("Successfully subscribed!", { description: "Welcome aboard. Check your inbox soon." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Validation Error", { description: error.errors[0].message });
      } else {
        console.error("Error subscribing:", error);
        toast.error("Error", { description: "Failed to subscribe. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <>
      <SEOHead
        title="3 Before 9: Asia's Daily AI Briefing"
        description="The three AI stories you need to know before 9am, delivered to your inbox every weekday. Stay ahead of Asia-Pacific's AI revolution."
        canonical="https://aiinasia.com/newsletter"
        schemaJson={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "3 Before 9: Asia's Daily AI Briefing",
          description: "The three AI stories you need to know before 9am, delivered every weekday.",
          url: "https://aiinasia.com/newsletter",
          inLanguage: "en-GB",
          publisher: {
            "@type": "Organization",
            name: "AI in Asia",
            url: "https://aiinasia.com",
          },
        }}
      />

      <div className="min-h-screen flex flex-col">
        <Header />

        <main id="main-content" className="flex-1">
          {/* Hero */}
          <section
            className="relative overflow-hidden"
            style={{ background: "linear-gradient(180deg, hsl(220 20% 6%) 0%, hsl(35 80% 12%) 50%, hsl(220 20% 8%) 100%)" }}
          >
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
            <div className="container mx-auto px-4 pt-14 pb-12 md:pt-20 md:pb-16 relative z-10 text-center">
              <Breadcrumb className="mb-8 justify-center">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Newsletter</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <Badge className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: "#E5A54B", color: "#000" }}>
                Daily Briefing
              </Badge>

              <h1
                className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[56px] font-extrabold leading-[1.1] tracking-tight mb-4"
                style={{
                  background: "linear-gradient(135deg, #FFFFFF 20%, #E5A54B 80%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                3 Before 9: Asia's Daily AI Briefing
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                The three stories you need to know before 9am, delivered to your inbox every weekday.
              </p>

              {/* Signup form in hero */}
              {!isSubscribed ? (
                <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-6">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      name="firstName" type="text" required maxLength={100}
                      placeholder="First name" value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isSubmitting}
                      className="bg-background/60 border-border/50 backdrop-blur-sm"
                    />
                    <Input
                      name="email" type="email" required maxLength={255}
                      placeholder="your@email.com" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="bg-background/60 border-border/50 backdrop-blur-sm"
                    />
                    <Button
                      type="submit" disabled={isSubmitting}
                      className="font-bold px-6 whitespace-nowrap"
                      style={{ backgroundColor: "#E5A54B", color: "#000" }}
                    >
                      {isSubmitting ? "Subscribing..." : "Subscribe"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-2">Free. No spam. Unsubscribe anytime.</p>
                </form>
              ) : (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 max-w-md mx-auto mb-6">
                  <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-foreground font-semibold">You're subscribed. Welcome aboard.</p>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-center gap-6 md:gap-10 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#E5A54B]" />
                  <span className="font-semibold text-foreground">{displayReaders}</span>
                  <span>daily readers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#E5A54B]" />
                  <span className="font-semibold text-foreground">12+</span>
                  <span>countries</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#E5A54B]" />
                  <span className="font-semibold text-foreground">Weekdays</span>
                  <span>before 9am</span>
                </div>
              </div>
            </div>
          </section>

          {/* Past Editions */}
          <section className="container mx-auto px-4 py-12 md:py-16">
            <div className="flex items-center gap-3 mb-8">
              <Calendar className="w-5 h-5 text-[#E5A54B]" />
              <h2 className="font-display text-2xl md:text-3xl font-bold">Past Editions</h2>
              <div className="flex-1 h-px bg-border/40" />
              <Link to="/newsletter/archive" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                Full archive <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SAMPLE_EDITIONS.map((edition) => (
                <Link
                  key={edition.date}
                  to={`/news/3-before-9`}
                  className="group border border-border/50 rounded-lg p-5 hover:border-[#E5A54B]/40 hover:bg-card/50 transition-all duration-200"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-[#E5A54B]/30 text-[#E5A54B]">
                      3B9
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(edition.date)}</span>
                  </div>

                  <ol className="space-y-2">
                    {edition.topics.map((topic, idx) => (
                      <li key={idx} className="flex gap-2 text-sm leading-snug">
                        <span className="font-bold text-[#E5A54B] shrink-0">{idx + 1}.</span>
                        <span className="text-foreground/90 group-hover:text-foreground transition-colors line-clamp-2">{topic}</span>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">2 min read</span>
                    <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Read <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="py-12 md:py-16" style={{ background: "linear-gradient(135deg, hsl(35 60% 10%), hsl(220 30% 10%))" }}>
            <div className="container mx-auto px-4 text-center max-w-2xl">
              <Mail className="w-10 h-10 text-[#E5A54B] mx-auto mb-4" />
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
                Subscribe to 3 Before 9
              </h2>
              <p className="text-muted-foreground mb-6">
                Join professionals across Asia-Pacific who start their day with our curated AI briefing. Three essential stories, every weekday, before 9am.
              </p>
              {!isSubscribed ? (
                <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      name="firstName2" type="text" required maxLength={100}
                      placeholder="First name" value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isSubmitting}
                      className="bg-background/60 border-border/50"
                    />
                    <Input
                      name="email2" type="email" required maxLength={255}
                      placeholder="your@email.com" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="bg-background/60 border-border/50"
                    />
                    <Button
                      type="submit" disabled={isSubmitting}
                      className="font-bold px-6 whitespace-nowrap"
                      style={{ backgroundColor: "#E5A54B", color: "#000" }}
                    >
                      {isSubmitting ? "..." : "Subscribe"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-2">Free. No spam. Unsubscribe anytime.</p>
                </form>
              ) : (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-foreground font-semibold">You're subscribed. ✓</p>
                </div>
              )}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Newsletter;
