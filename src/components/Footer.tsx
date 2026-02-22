import { useState, memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logo from "@/assets/aiinasia-logo.png";
import { z } from "zod";
import { ExternalLink } from "lucide-react";
import { isNewsletterSubscribed as checkSubscribed, markNewsletterSubscribed, awardNewsletterPoints } from "@/lib/newsletterUtils";

const emailSchema = z.string()
  .trim()
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

const exploreLinks = [
  { to: "/category/news", label: "News" },
  { to: "/category/business", label: "Business" },
  { to: "/category/life", label: "Life" },
  { to: "/category/learn", label: "Learn" },
  { to: "/category/create", label: "Create" },
  { to: "/category/voices", label: "Voices" },
  { to: "/category/policy", label: "Policy" },
];

const toolsLinks = [
  { to: "/guides", label: "AI Guides" },
  { to: "/prompts", label: "Prompt Library" },
  { to: "/ai-policy-atlas", label: "Policy Atlas" },
  { to: "/events", label: "Events" },
  { to: "/newsletter", label: "Newsletter" },
];

const companyLinks = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/editorial-standards", label: "Editorial Standards" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
  { to: "/cookie-policy", label: "Cookie Policy" },
];

const Footer = memo(() => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(checkSubscribed());
  const { user } = useAuth();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedEmail = emailSchema.parse(email);

      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert([{ email: validatedEmail }]);

      if (error) {
        if (error.code === "23505") {
          toast("Already subscribed", {
            description: "This email is already on our list.",
          });
        } else {
          throw error;
        }
      } else {
        markNewsletterSubscribed();
        setIsSubscribed(true);
        await awardNewsletterPoints(user?.id ?? null, supabase);

        toast("Successfully subscribed!", {
          description: user ? "You earned 25 points and the Newsletter Insider badge!" : "Check your inbox for a confirmation email.",
        });
        setEmail("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error("Validation Error", {
          description: error.errors[0].message,
        });
      } else {
        toast.error("Subscription failed", {
          description: "Please try again later.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const headingClass = "text-xs font-bold uppercase tracking-wider text-foreground mb-4";
  const linkClass = "text-muted-foreground hover:text-primary transition-colors text-sm";

  return (
    <footer className="bg-card border-t border-border mt-16 pb-16 md:pb-0">
      {/* Main columns */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand */}
          <div>
            <Link to="/">
              <img src={logo} alt="AI in ASIA" className="h-16 mb-3" width={114} height={64} />
            </Link>
            <p className="text-sm text-muted-foreground mb-5">
              Asia-Pacific's source for AI news and intelligence.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://x.com/aiaborneasia" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="https://www.linkedin.com/company/aiinasia/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="/rss.xml" target="_blank" rel="noopener noreferrer" aria-label="RSS Feed" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796 0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795 0 3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966 11.022 11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-8.18v4.819c12.951.115 23.357 10.71 23.497 23.625h4.503c-.145-15.761-12.958-28.558-28-28.444z" /></svg>
              </a>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div>
            <h4 className={headingClass}>Explore</h4>
            <ul className="space-y-2.5">
              {exploreLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Tools & Resources */}
          <div>
            <h4 className={headingClass}>Tools & Resources</h4>
            <ul className="space-y-2.5">
              {toolsLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h4 className={headingClass}>Company</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className={linkClass}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Newsletter bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-6 py-8">
          {!isSubscribed ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-xl">
              <p className="text-sm text-muted-foreground shrink-0">Get the AI in ASIA Brief weekly:</p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2 w-full sm:w-auto">
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="flex-1 sm:w-56 h-9 text-sm"
                />
                <Button type="submit" size="sm" disabled={isSubmitting} className="h-9 shrink-0">
                  {isSubmitting ? "..." : "Subscribe"}
                </Button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">✓ You're subscribed to the AI in ASIA Brief.</p>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <p>© 2026 AI in ASIA. All rights reserved.</p>
          <a
            href="https://you.withthepowerof.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
          >
            Part of the You.WithThePowerOf.AI collective
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
