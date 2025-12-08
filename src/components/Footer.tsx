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
