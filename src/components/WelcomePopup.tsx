import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Mail, User, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Please enter a valid email address" }).max(255);
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" });

const WelcomePopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Don't show if already logged in
    if (user) return;
    
    // Check if user has dismissed popup or chosen "don't show again"
    const hasSeenPopup = localStorage.getItem("welcome-popup-seen");
    const dontShow = localStorage.getItem("welcome-popup-dont-show");
    
    if (hasSeenPopup || dontShow === "true") return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000); // Show after 3 seconds
    
    return () => clearTimeout(timer);
  }, [user]);

  const handleClose = () => {
    setIsVisible(false);
    if (dontShowAgain) {
      localStorage.setItem("welcome-popup-dont-show", "true");
    } else {
      localStorage.setItem("welcome-popup-seen", "true");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate email
      const validatedEmail = emailSchema.parse(email);

      if (createAccount) {
        // Validate password if creating account
        passwordSchema.parse(password);

        // Sign up user
        const redirectUrl = `${window.location.origin}/`;
        const { error: signUpError } = await supabase.auth.signUp({
          email: validatedEmail,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
          } else {
            throw signUpError;
          }
          setIsSubmitting(false);
          return;
        }

        // Also subscribe to newsletter
        await supabase
          .from("newsletter_subscribers")
          .insert([{ email: validatedEmail }])
          .throwOnError();

        toast({
          title: "Account created!",
          description: "Welcome to AI in ASIA! You're now subscribed to our newsletter.",
        });
      } else {
        // Newsletter only
        const { error } = await supabase
          .from("newsletter_subscribers")
          .insert([{ email: validatedEmail }]);

        if (error) {
          if (error.code === "23505") {
            toast({
              title: "Already subscribed",
              description: "This email is already on our newsletter list.",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "Successfully subscribed!",
            description: "Welcome to the AI in ASIA newsletter!",
          });
        }
      }

      handleClose();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Something went wrong",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 h-10 w-10 hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
          aria-label="Close popup"
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Stay in the Loop
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Get the latest AI news, insights, and trends from across Asia delivered to your inbox.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="popup-email" className="text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="popup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Optional account creation */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <Checkbox
                id="create-account"
                checked={createAccount}
                onCheckedChange={(checked) => setCreateAccount(checked as boolean)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label
                  htmlFor="create-account"
                  className="text-sm font-medium cursor-pointer block"
                >
                  Also create a free AI in ASIA account
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Earn rewards, bookmark articles, and join our community
                </p>
              </div>
            </div>

            {/* Password field - shown when creating account */}
            {createAccount && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="popup-password" className="text-sm font-medium">
                  Create a password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="popup-password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required={createAccount}
                    minLength={6}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Please wait..."
              ) : createAccount ? (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Subscribe & Create Account
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Subscribe to Newsletter
                </>
              )}
            </Button>
          </form>

          {/* Continue reading */}
          <Button
            variant="ghost"
            className="w-full mt-3 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
          >
            No thanks, continue reading
          </Button>

          {/* Don't show again */}
          <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-border">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label
              htmlFor="dont-show"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Don't show me this again
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup;
