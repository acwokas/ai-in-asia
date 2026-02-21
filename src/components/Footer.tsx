import { useState, memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
  { to: "/prompts", label: "Prompts" },
  { to: "/events", label: "Events" },
  { to: "/ai-policy-atlas", label: "Policy Atlas" },
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
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

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
          toast({
            title: "Already subscribed",
            description: "This email is already on our list.",
          });
        } else {
          throw error;
        }
      } else {
        markNewsletterSubscribed();
        setIsSubscribed(true);
        await awardNewsletterPoints(user?.id ?? null, supabase);

        toast({
          title: "Successfully subscribed!",
          description: user ? "You earned 25 points and the Newsletter Insider badge! 🎉" : "Check your inbox for a confirmation email.",
        });
        setEmail("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Subscription failed",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-[hsl(0,0%,7%)] text-[hsl(0,0%,85%)] mt-16">
      <div className="container mx-auto px-6 py-14">
        {/* Row 1 — Three columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Column 1: Brand */}
          <div>
            <img src={logo} alt="AI in ASIA" className="h-20 -ml-4 mb-1" width={142} height={80} />
            <p className="text-sm text-[hsl(0,0%,55%)] mb-5 -mt-2">
              Asia-Pacific's source for AI news.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://x.com/aiaborncurious" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter" className="text-[hsl(0,0%,55%)] hover:text-white transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
              <a href="https://www.linkedin.com/company/aiinasia" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-[hsl(0,0%,55%)] hover:text-white transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="https://pbmtnvxywplgpldmlygv.supabase.co/functions/v1/generate-rss" target="_blank" rel="noopener noreferrer" aria-label="RSS Feed" className="text-[hsl(0,0%,55%)] hover:text-white transition-colors">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796 0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795 0 3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966 11.022 11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-8.18v4.819c12.951.115 23.357 10.71 23.497 23.625h4.503c-.145-15.761-12.958-28.558-28-28.444z" /></svg>
              </a>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2.5 text-sm">
              {exploreLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-[hsl(0,0%,55%)] hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5 text-sm">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-[hsl(0,0%,55%)] hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Row 2 — Newsletter */}
        <div className="border-t border-[hsl(0,0%,15%)] pt-8 mb-8">
          {!isSubscribed ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-xl">
              <p className="text-sm text-[hsl(0,0%,55%)] shrink-0">Get the AI in ASIA Brief weekly:</p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2 w-full sm:w-auto">
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="flex-1 sm:w-56 h-9 bg-[hsl(0,0%,12%)] border-[hsl(0,0%,20%)] text-white placeholder:text-[hsl(0,0%,40%)] text-sm"
                />
                <Button type="submit" size="sm" disabled={isSubmitting} className="h-9 shrink-0">
                  {isSubmitting ? "..." : "Subscribe"}
                </Button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-[hsl(0,0%,55%)]">✓ You're subscribed to the AI in ASIA Brief.</p>
          )}
        </div>

        {/* Row 3 — Copyright + Collective */}
        <div className="border-t border-[hsl(0,0%,15%)] pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[hsl(0,0%,40%)]">
          <p>© {currentYear} AI in ASIA. All rights reserved.</p>
          <a
            href="https://you.withthepowerof.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[hsl(0,0%,65%)] transition-colors"
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
