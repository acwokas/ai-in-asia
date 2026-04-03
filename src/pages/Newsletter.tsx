import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, CheckCircle2 } from "lucide-react";
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
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  firstName: z.string()
    .trim()
    .min(1, { message: "First name is required" })
    .max(100, { message: "First name must be less than 100 characters" }),
});

const Newsletter = () => {
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedData = newsletterSchema.parse({ email, firstName });

      // Check if already subscribed or previously unsubscribed
      const { data: existing, error: checkError } = await supabase
        .from("newsletter_subscribers")
        .select("id, unsubscribed_at")
        .eq("email", validatedData.email)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        if (existing.unsubscribed_at === null) {
          toast.info("Already subscribed", { description: "This email is already on our newsletter list." });
        } else {
          // Re-activate
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
      toast.success("Successfully subscribed!", { description: "Welcome aboard! Check your inbox for our latest insights." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Validation Error", { description: error.errors[0].message });
      } else {
        console.error('Error subscribing:', error);
        toast.error("Error", { description: "Failed to subscribe. Please try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Subscribe to Newsletter"
        description="Get weekly AI insights, breaking news, and expert analysis delivered straight to your inbox. Join thousands of AI enthusiasts across Asia."
        canonical="https://aiinasia.com/newsletter"
        schemaJson={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Subscribe to AI in Asia Newsletter",
          "description": "Get weekly AI insights, breaking news, and expert analysis delivered straight to your inbox.",
          "url": "https://aiinasia.com/newsletter",
          "inLanguage": "en-GB",
          "publisher": {
            "@type": "Organization",
            "name": "AI in Asia",
            "url": "https://aiinasia.com",
            "logo": {
              "@type": "ImageObject",
              "url": "https://aiinasia.com/icons/aiinasia-512.png"
            }
          },
          "potentialAction": {
            "@type": "SubscribeAction",
            "target": "https://aiinasia.com/newsletter",
            "object": {
              "@type": "NewsletterService",
              "name": "AI in Asia Weekly",
              "description": "Weekly AI insights and breaking news across Asia-Pacific"
            }
          }
        }}
      />

      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main id="main-content" className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Newsletter</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            
            <h1 className="headline text-4xl md:text-5xl mb-4">
              Stay Ahead of the AI Revolution
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of AI enthusiasts, researchers, and business leaders who get weekly insights, breaking news, and expert analysis delivered straight to their inbox.
            </p>

            {!isSubscribed ? (
              <>
                <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-12">
                  <div className="flex flex-col gap-3">
                    <Input 
                      id="firstName" 
                      name="firstName" 
                      type="text" 
                      required 
                      maxLength={100}
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      required 
                      maxLength={255}
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Subscribing..." : "Subscribe"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    No spam. Unsubscribe anytime. We respect your privacy.
                  </p>
                </form>

                <div className="grid md:grid-cols-3 gap-6 text-left mb-12">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <CheckCircle2 className="h-5 w-5" />
                      Weekly Insights
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Curated AI news and trends from across Asia and beyond
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <CheckCircle2 className="h-5 w-5" />
                      Expert Analysis
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Deep dives into AI technologies, applications, and impacts
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                      <CheckCircle2 className="h-5 w-5" />
                      Exclusive Content
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Interviews, reports, and insights available only to subscribers
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-8 mb-12">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
                <p className="text-muted-foreground">
                  Check your inbox for a confirmation email. We'll send you our next newsletter soon.
                </p>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-6">
              <h2 className="font-semibold mb-2">What to Expect</h2>
              <p className="text-sm text-muted-foreground">
                Every week, you'll receive a carefully curated digest of the most important AI developments in Asia. From breakthrough research to business applications, policy changes to ethical considerations - we cover it all with depth and insight.
              </p>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Newsletter;
