import { useState, memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/aiinasia-logo.png";
import { z } from "zod";

const emailSchema = z.string()
  .trim()
  .email({ message: "Invalid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

const Footer = memo(() => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate email
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
        // Award newsletter badge and points if logged in
        if (user) {
          await supabase.rpc('award_points', { 
            _user_id: user.id, 
            _points: 25 
          });
          
          // Award Newsletter Insider achievement
          const { data: achievement } = await supabase
            .from('achievements')
            .select('id')
            .eq('name', 'Newsletter Insider')
            .single();
          
          if (achievement) {
            // Check if already earned
            const { data: existing } = await supabase
              .from('user_achievements')
              .select('id')
              .eq('user_id', user.id)
              .eq('achievement_id', achievement.id)
              .maybeSingle();
            
            if (!existing) {
              await supabase
                .from('user_achievements')
                .insert({ 
                  user_id: user.id, 
                  achievement_id: achievement.id 
                });
            }
          }

          toast({
            title: "Successfully subscribed!",
            description: "You earned 25 points and the Newsletter Insider badge! 🎉",
          });
        } else {
          toast({
            title: "Successfully subscribed!",
            description: "Check your inbox for a confirmation email.",
          });
        }
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
    <footer className="border-t border-border bg-muted/30 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <img src={logo} alt="AI in ASIA" className="h-24 mb-0 -ml-6" width={171} height={96} />
            <p className="text-sm text-muted-foreground mb-4 -mt-4">
              Your trusted source for AI news, insights and innovation across Asia.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" aria-label="Twitter">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </Button>
              <Button variant="outline" size="icon" aria-label="LinkedIn">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Content</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/category/news" className="hover:text-primary transition-colors">News</Link></li>
              <li><Link to="/category/business" className="hover:text-primary transition-colors">Business</Link></li>
              <li><Link to="/category/life" className="hover:text-primary transition-colors">Life</Link></li>
              <li><Link to="/category/learn" className="hover:text-primary transition-colors">Learn</Link></li>
              <li><Link to="/category/create" className="hover:text-primary transition-colors">Create</Link></li>
              <li><Link to="/category/voices" className="hover:text-primary transition-colors">Voices</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/prompts" className="hover:text-primary transition-colors">Prompts</Link></li>
              <li><Link to="/tools" className="hover:text-primary transition-colors">Tools</Link></li>
              <li><Link to="/events" className="hover:text-primary transition-colors">Events</Link></li>
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Advertise</Link></li>
              <li><a href="https://pbmtnvxywplgpldmlygv.supabase.co/functions/v1/generate-rss" className="hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">RSS Feed</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">AI in ASIA Brief</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Get weekly insights delivered to your inbox.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="flex-1"
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "..." : "Subscribe"}
              </Button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2025 AI in ASIA. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/cookie-policy" className="hover:text-primary transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
