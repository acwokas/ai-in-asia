import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";

const WelcomePopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const handleSignUp = () => {
    handleClose();
    navigate("/auth?mode=signup");
  };

  const handleSignIn = () => {
    handleClose();
    navigate("/auth?mode=signin");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 h-10 w-10 hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Desktop Version */}
        <div className="hidden md:block p-8 lg:p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Welcome to the New AI in Asia
            </h2>
            <div className="space-y-4 text-muted-foreground text-base lg:text-lg leading-relaxed">
              <p>
                We've had a glow up! Our redesigned home is now part of the <span className="font-semibold text-foreground">You.WithThePowerOf.AI Collective</span>, bringing you even more stories, ideas, and inspiration from across the region.
              </p>
              <p>
                Thanks for being here — whether you've been with us from the start or just found us, you're what makes this community special.
              </p>
              <p className="text-lg font-medium text-foreground">
                🎁 New: Create a free account to earn rewards you can use across all You.WithThePowerOf.AI projects.
              </p>
              <p>
                Have thoughts or ideas? Tell us! This space is built for curious minds like yours, and we want to keep shaping it together.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Button 
              className="flex-1 h-12 text-base font-semibold" 
              size="lg"
              onClick={handleSignUp}
            >
              Create Free Account
            </Button>
            <Button 
              className="flex-1 h-12 text-base font-semibold" 
              variant="outline"
              size="lg"
              onClick={handleSignIn}
            >
              Sign In
            </Button>
          </div>
          
          <Button 
            className="w-full h-12 text-base font-semibold mb-4" 
            variant="secondary"
            size="lg"
            onClick={handleClose}
          >
            Continue Reading Without Account
          </Button>

          <div className="flex items-center justify-center gap-2 pt-4 border-t border-border">
            <Checkbox 
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label 
              htmlFor="dont-show" 
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Don't show me this again
            </label>
          </div>
        </div>

        {/* Mobile Version */}
        <div className="block md:hidden p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Welcome to the New AI in Asia!
            </h2>
            <div className="space-y-3 text-muted-foreground text-sm leading-relaxed">
              <p>
                We've had a glow up and joined the <span className="font-semibold text-foreground">You.WithThePowerOf.AI Collective</span> to bring you more stories, ideas, and inspiration.
              </p>
              <p className="text-base font-medium text-foreground">
                🎁 New: Sign up for a free account to earn rewards across all projects.
              </p>
              <p>
                Thanks for being part of the journey — your support keeps this community thriving!
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-3">
            <Button 
              className="w-full h-11 font-semibold" 
              onClick={handleSignUp}
            >
              Create Free Account
            </Button>
            <Button 
              className="w-full h-11 font-semibold" 
              variant="outline"
              onClick={handleSignIn}
            >
              Sign In
            </Button>
          </div>
          
          <Button 
            className="w-full h-11 font-semibold mb-3" 
            variant="secondary"
            onClick={handleClose}
          >
            Continue Reading
          </Button>

          <div className="flex items-center justify-center gap-2 pt-3 border-t border-border">
            <Checkbox 
              id="dont-show-mobile"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label 
              htmlFor="dont-show-mobile" 
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
