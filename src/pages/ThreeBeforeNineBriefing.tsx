import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { z } from "zod";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Mail,
  Clock,
  Check,
  Loader2,
  ChevronRight,
  Calendar,
  Globe,
  Users,
  Zap,
  Coffee,
} from "lucide-react";

const AMBER = "hsl(37, 78%, 60%)";
const AMBER_BG = "hsla(37, 78%, 60%, 0.1)";
const AMBER_BORDER = "hsla(37, 78%, 60%, 0.2)";
const AMBER_BG_STRONG = "hsla(37, 78%, 60%, 0.15)";

const emailSchema = z.string().trim().email("Please enter a valid email address").max(255);

const APAC_TIMEZONES = [
  { value: "Asia/Tokyo", label: "Tokyo (JST, UTC+9)" },
  { value: "Asia/Seoul", label: "Seoul (KST, UTC+9)" },
  { value: "Asia/Shanghai", label: "Beijing / Shanghai (CST, UTC+8)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT, UTC+8)" },
  { value: "Asia/Taipei", label: "Taipei (CST, UTC+8)" },
  { value: "Asia/Singapore", label: "Singapore (SGT, UTC+8)" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (MYT, UTC+8)" },
  { value: "Asia/Manila", label: "Manila (PHT, UTC+8)" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT, UTC+7)" },
  { value: "Asia/Jakarta", label: "Jakarta (WIB, UTC+7)" },
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh (ICT, UTC+7)" },
  { value: "Asia/Kolkata", label: "Mumbai / Delhi (IST, UTC+5:30)" },
  { value: "Asia/Dubai", label: "Dubai (GST, UTC+4)" },
  { value: "Australia/Sydney", label: "Sydney (AEST, UTC+10)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST, UTC+10)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST, UTC+12)" },
];

function detectTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const match = APAC_TIMEZONES.find((t) => t.value === tz);
    return match ? tz : "Asia/Hong_Kong";
  } catch {
    return "Asia/Hong_Kong";
  }
}

function SignupForm({ variant = "hero" }: { variant?: "hero" | "bottom" }) {
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState(detectTimezone);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();

      const { data: existing } = await supabase
        .from("briefing_subscriptions")
        .select("id, is_active")
        .eq("email", normalizedEmail)
        .eq("briefing_type", "three_before_nine")
        .maybeSingle();

      if (existing?.is_active) {
        toast.info("You're already subscribed to 3 Before 9!");
        setIsSubscribed(true);
        return;
      }

      if (existing && !existing.is_active) {
        await supabase
          .from("briefing_subscriptions")
          .update({ is_active: true, unsubscribed_at: null, preferred_timezone: timezone } as any)
          .eq("id", existing.id);
      } else {
        const { error } = await supabase
          .from("briefing_subscriptions")
          .insert({
            email: normalizedEmail,
            briefing_type: "three_before_nine",
            is_active: true,
            preferred_timezone: timezone,
          } as any);
        if (error) throw error;
      }

      setIsSubscribed(true);
      toast.success("Welcome to 3 Before 9!", {
        description: "Check your inbox every weekday morning.",
      });
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <div
        className="rounded-xl p-8 text-center border"
        style={{ backgroundColor: AMBER_BG, borderColor: AMBER_BORDER }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: AMBER_BG_STRONG }}
        >
          <Check className="h-7 w-7" style={{ color: AMBER }} />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">You're in!</h3>
        <p className="text-muted-foreground">
          3 Before 9 will land in your inbox every weekday morning.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={isLoading}
          required
        />
        <Button
          type="submit"
          disabled={isLoading}
          className="px-6 text-white hover:opacity-90 shrink-0"
          style={{ backgroundColor: AMBER }}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe Free"}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="text-sm h-9">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {APAC_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-muted-foreground/60 text-xs text-center">
        Free forever. One-click unsubscribe in every email. No spam.
      </p>
    </form>
  );
}

export default function ThreeBeforeNineBriefing() {
  // Fetch latest 5 editions
  const { data: recentEditions } = useQuery({
    queryKey: ["3b9-recent-editions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, slug, published_at, excerpt")
        .eq("article_type", "three_before_nine")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Fetch subscriber count
  const { data: subscriberCount } = useQuery({
    queryKey: ["3b9-subscriber-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("briefing_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("briefing_type", "three_before_nine")
        .eq("is_active", true);
      if (error) throw error;
      return count || 0;
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const displayCount = subscriberCount
    ? subscriberCount >= 1000
      ? `${(subscriberCount / 1000).toFixed(1).replace(/\.0$/, "")}k+`
      : `${subscriberCount}+`
    : null;

  // Derive the correct category slug for 3B9 articles
  const getCategorySlug = (slug: string) => {
    // 3B9 slugs are like "3-before-9-2026-04-02"
    return "news";
  };

  return (
    <>
      <SEOHead
        title="3 Before 9 - Daily AI Briefing | AI in Asia"
        description="Three AI signals from across Asia, every weekday, before your 9am coffee. Free daily briefing covering the stories that matter."
        canonical="https://aiinasia.com/3-before-9-briefing"
        schemaJson={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "3 Before 9 - Daily AI Briefing",
          description:
            "Three AI signals from across Asia, every weekday, before your 9am coffee.",
          url: "https://aiinasia.com/3-before-9-briefing",
          inLanguage: "en-GB",
          publisher: {
            "@type": "Organization",
            name: "AI in Asia",
            url: "https://aiinasia.com",
            logo: {
              "@type": "ImageObject",
              url: "https://aiinasia.com/icons/aiinasia-512.png",
            },
          },
          potentialAction: {
            "@type": "SubscribeAction",
            target: "https://aiinasia.com/3-before-9-briefing",
            object: {
              "@type": "NewsletterService",
              name: "3 Before 9",
              description:
                "Three AI signals from across Asia, every weekday, before your 9am coffee",
            },
          },
        }}
      />

      <div className="min-h-screen flex flex-col">
        <Header />

        <main id="main-content" className="flex-1">
          {/* Hero Section */}
          <section
            className="border-b"
            style={{ borderColor: AMBER_BORDER }}
          >
            <div className="container mx-auto px-4 py-16 md:py-24 max-w-4xl">
              <Breadcrumb className="mb-8">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/">Home</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>3 Before 9</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="text-center">
                <div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
                  style={{ backgroundColor: AMBER_BG_STRONG }}
                >
                  <Coffee className="h-8 w-8" style={{ color: AMBER }} />
                </div>

                <h1 className="headline text-4xl md:text-6xl mb-4 tracking-tight">
                  <span style={{ color: AMBER }}>3</span> Before{" "}
                  <span style={{ color: AMBER }}>9</span>
                </h1>

                <p className="text-xl md:text-2xl text-muted-foreground mb-3 max-w-2xl mx-auto font-light">
                  Three AI signals from across Asia, every weekday, before your
                  9am coffee
                </p>

                {displayCount && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
                    <Users className="h-4 w-4" style={{ color: AMBER }} />
                    <span>
                      Join{" "}
                      <span className="font-semibold text-foreground">
                        {displayCount}
                      </span>{" "}
                      readers across Asia-Pacific
                    </span>
                  </div>
                )}

                <SignupForm variant="hero" />
              </div>
            </div>
          </section>

          {/* What You Get */}
          <section className="container mx-auto px-4 py-16 max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-10">
              What you get, every weekday
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Zap,
                  title: "3 curated signals",
                  desc: "The AI stories that actually matter - no noise, no fluff. Hand-picked from across the Asia-Pacific region.",
                },
                {
                  icon: Clock,
                  title: "2-minute read",
                  desc: "Briefings are tight and scannable. Read it on your commute, over coffee, or between meetings.",
                },
                {
                  icon: Globe,
                  title: "Asia-Pacific focus",
                  desc: "From Tokyo to Sydney, Singapore to Mumbai - AI developments the Western press often misses.",
                },
              ].map((item) => (
                <Card
                  key={item.title}
                  className="p-6 border-border/60 hover:border-primary/20 transition-colors"
                  style={{ borderTopColor: AMBER, borderTopWidth: "2px" }}
                >
                  <item.icon
                    className="h-6 w-6 mb-3"
                    style={{ color: AMBER }}
                  />
                  <h3 className="font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Sample Preview */}
          <section
            className="border-y"
            style={{ borderColor: AMBER_BORDER }}
          >
            <div className="container mx-auto px-4 py-16 max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-2">
                Here's what a typical edition looks like
              </h2>
              <p className="text-center text-muted-foreground mb-8">
                Concise, actionable, and always Asia-first.
              </p>

              <Card
                className="p-6 md:p-8 border"
                style={{ borderColor: AMBER_BORDER, backgroundColor: AMBER_BG }}
              >
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" style={{ color: AMBER }} />
                  <span className="font-medium" style={{ color: AMBER }}>
                    3 Before 9
                  </span>
                  <span>· Wednesday, 2 April 2026</span>
                </div>

                <div className="space-y-5">
                  {[
                    {
                      num: 1,
                      title: "Singapore launches $500M AI compute cluster",
                      body: "The Smart Nation initiative's biggest infrastructure play yet - a sovereign GPU cluster designed to reduce reliance on foreign cloud providers.",
                      context:
                        "Southeast Asia's AI compute race is heating up. This positions Singapore as the region's inference hub.",
                    },
                    {
                      num: 2,
                      title:
                        "Japan's top 3 banks trial AI fraud detection consortium",
                      body: "MUFG, Mizuho and SMBC are sharing anonymised transaction patterns through a federated learning system.",
                      context:
                        "Cross-institutional AI collaboration in regulated sectors - a model other APAC markets will watch closely.",
                    },
                    {
                      num: 3,
                      title:
                        "India's Krutrim raises $200M at $5B valuation",
                      body: "Ola founder Bhavish Aggarwal's AI venture secures funding to build multilingual models for Indic languages.",
                      context:
                        "The race to build foundation models for non-English languages intensifies across South and Southeast Asia.",
                    },
                  ].map((story) => (
                    <div
                      key={story.num}
                      className="pl-4"
                      style={{ borderLeft: `2px solid ${AMBER}` }}
                    >
                      <h4 className="font-semibold text-foreground mb-1">
                        <span
                          className="font-bold mr-1.5"
                          style={{ color: AMBER }}
                        >
                          {story.num}.
                        </span>
                        {story.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-1.5">
                        {story.body}
                      </p>
                      <p className="text-xs text-muted-foreground/80 italic">
                        {story.context}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  className="mt-6 pt-4 border-t text-xs text-muted-foreground/60 text-center"
                  style={{ borderColor: AMBER_BORDER }}
                >
                  This is a sample edition. Real briefings contain live stories
                  and links.
                </div>
              </Card>
            </div>
          </section>

          {/* Recent Editions */}
          {recentEditions && recentEditions.length > 0 && (
            <section className="container mx-auto px-4 py-16 max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-2">
                Recent editions
              </h2>
              <p className="text-center text-muted-foreground mb-8">
                Catch up on what you've missed.
              </p>

              <div className="space-y-3">
                {recentEditions.map((edition) => (
                  <Link
                    key={edition.id}
                    to={`/${getCategorySlug(edition.slug)}/${edition.slug}`}
                    className="group block"
                  >
                    <Card className="p-4 hover:shadow-md transition-all hover:-translate-y-0.5 border-border/60 hover:border-primary/30">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {edition.title}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(edition.published_at!)}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              <div className="text-center mt-6">
                <Button variant="outline" asChild>
                  <Link to="/news/3-before-9/editions">View all editions</Link>
                </Button>
              </div>
            </section>
          )}

          {/* FAQ */}
          <section
            className="border-t"
            style={{ borderColor: AMBER_BORDER }}
          >
            <div className="container mx-auto px-4 py-16 max-w-2xl">
              <h2 className="text-2xl font-bold text-center mb-8">
                Frequently asked questions
              </h2>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="time">
                  <AccordionTrigger className="text-left">
                    What time does it arrive?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Before 9am in your selected timezone. When you subscribe,
                    you choose your timezone and we schedule delivery
                    accordingly. Most readers get it between 7am and 8:30am
                    local time.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="free">
                  <AccordionTrigger className="text-left">
                    Is it free?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes, always. 3 Before 9 is completely free and always will
                    be. We believe important AI developments across Asia should
                    be accessible to everyone.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="unsubscribe">
                  <AccordionTrigger className="text-left">
                    How do I unsubscribe?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    One click. Every email includes an unsubscribe link at the
                    bottom. No hoops, no guilt trips, no "are you sure?"
                    screens. We respect your inbox.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="difference">
                  <AccordionTrigger className="text-left">
                    How is this different from the weekly newsletter?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    The weekly newsletter is a longer, deeper dive sent every
                    week. 3 Before 9 is a short, sharp daily briefing -
                    three stories, two minutes, five days a week. Many
                    readers subscribe to both.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

          {/* Bottom CTA */}
          <section
            className="border-t"
            style={{
              borderColor: AMBER_BORDER,
              backgroundColor: AMBER_BG,
            }}
          >
            <div className="container mx-auto px-4 py-16 max-w-4xl text-center">
              <Coffee className="h-10 w-10 mx-auto mb-4" style={{ color: AMBER }} />
              <h2 className="text-3xl font-bold mb-3">
                Start your morning smarter
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join readers across Asia-Pacific who start their day with three
                AI signals that matter.
              </p>
              <SignupForm variant="bottom" />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
