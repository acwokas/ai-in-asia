import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Upload, ChevronRight, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import logo from "@/assets/aiinasia-logo.png";

const INTEREST_OPTIONS = [
  "Artificial Intelligence",
  "Machine Learning",
  "Deep Learning",
  "Robotics",
  "Computer Vision",
  "Natural Language Processing",
  "AI Ethics",
  "AI Research",
  "Business AI",
  "Healthcare AI"
];

const Auth = () => {
  // Sign In state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  
  // Sign Up state - Step 1 (Essential)
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  
  // Sign Up state - Step 2 (Optional)
  const [showStep2, setShowStep2] = useState(false);
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [country, setCountry] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  

  // Calculate potential points
  const calculateSignupPoints = () => {
    let points = 20; // Base signup points
    if (newsletterOptIn) points += 5;
    if (avatarFile) points += 5;
    if (lastName) points += 3;
    if (company) points += 5;
    if (jobTitle) points += 5;
    if (country) points += 3;
    points += interests.length * 2; // 2 points per interest
    return points;
  };

  useEffect(() => {
    if (user) {
      navigate("/profile");
    }
  }, [user, navigate]);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setSignInEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.8,
        maxSizeMB: 0.5,
      });
      
      setAvatarFile(compressed);
      setAvatarPreview(URL.createObjectURL(compressed));
    } catch (error) {
      toast.error("Error", { description: "Failed to process image" });
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, data } = await signUp(email, password);

      if (error) {
        console.error('Sign up error:', error);
        toast.error("Error", { description: error.message });
        setLoading(false);
        return;
      }

      if (data.user) {
        // Convert avatar to base64 if present
        let avatarData = null;
        if (avatarFile) {
          const reader = new FileReader();
          avatarData = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(avatarFile);
          });
        }

        // Store signup data in sessionStorage to complete profile after auth
        sessionStorage.setItem('pendingProfileData', JSON.stringify({
          firstName,
          lastName,
          company,
          jobTitle,
          country,
          interests,
          avatarData,
          newsletterOptIn,
          userId: data.user.id,
          email: data.user.email
        }));

        const potentialPoints = calculateSignupPoints();
        
        toast("Welcome! 🎉", { description: `Account created! You'll earn ${potentialPoints} points once you complete your profile.` });

        // The AuthContext will redirect to /profile once auth is established
      }
    } catch (error) {
      console.error('Sign up process error:', error);
      toast.error("Error", { description: error instanceof Error ? error.message : "Something went wrong during sign up" });
    }

    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(signInEmail, signInPassword);

    if (error) {
      toast.error("Error", { description: error.message });
    } else {
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', signInEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      toast("Welcome back!", { description: "Successfully signed in." });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="AI in ASIA" className="h-16 mx-auto mb-4" />
          <p className="text-muted-foreground">Unlock points, bookmarks & personalized AI news</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <label
                    htmlFor="remember-me"
                    className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Remember my email
                  </label>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                {!showStep2 ? (
                  <>
                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-muted-foreground">Step 1 of 2 - Essential Info</span>
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Zap className="h-4 w-4" />
                        {20 + (newsletterOptIn ? 5 : 0)} pts
                      </span>
                    </div>
                    <div>
                      <Label htmlFor="signup-firstname">First Name *</Label>
                      <Input
                        id="signup-firstname"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-email">Email *</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Minimum 6 characters
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="newsletter"
                        checked={newsletterOptIn}
                        onCheckedChange={(checked) => setNewsletterOptIn(checked as boolean)}
                      />
                      <label
                        htmlFor="newsletter"
                        className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        <Link to="/newsletter" className="text-primary hover:underline">Subscribe</Link> to our newsletter for weekly AI insights
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setShowStep2(true)}
                      >
                        Customize Feed
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-muted-foreground">Step 2 of 2 - Customize Your Experience</span>
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Zap className="h-4 w-4" />
                        Total: {calculateSignupPoints()} pts
                      </span>
                    </div>
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
                      <p className="text-xs font-medium mb-2">🏆 Earn More Rewards:</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                        <div className="flex justify-between">
                          <span>Avatar:</span>
                          <span className="font-medium">+5 pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Company:</span>
                          <span className="font-medium">+5 pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Job Title:</span>
                          <span className="font-medium">+5 pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Country:</span>
                          <span className="font-medium">+3 pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Name:</span>
                          <span className="font-medium">+3 pts</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Per Interest:</span>
                          <span className="font-medium">+2 pts</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-primary/20">
                        <p className="text-xs font-medium text-primary">
                          {calculateSignupPoints() >= 45 
                            ? "🎯 Unlock 'Profile Master' badge! 👑" 
                            : `Need ${45 - calculateSignupPoints()} more pts for 'Profile Master' badge 👑`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center mb-4">
                      <Avatar className="h-20 w-20 mb-2">
                        <AvatarImage src={avatarPreview} alt="Avatar preview" />
                        <AvatarFallback>
                          <Upload className="h-8 w-8" />
                        </AvatarFallback>
                      </Avatar>
                      <Label htmlFor="avatar-upload" className="cursor-pointer text-sm text-primary hover:underline">
                        Upload Avatar
                        <Input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </Label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="signup-lastname">Last Name</Label>
                        <Input
                          id="signup-lastname"
                          type="text"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-country">Country</Label>
                        <Input
                          id="signup-country"
                          type="text"
                          placeholder="Singapore"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="signup-company">Company</Label>
                      <Input
                        id="signup-company"
                        type="text"
                        placeholder="Your company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="signup-jobtitle">Job Title</Label>
                      <Input
                        id="signup-jobtitle"
                        type="text"
                        placeholder="AI Engineer"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label className="mb-2 block">Interests (Select topics for your feed)</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                        {INTEREST_OPTIONS.map((interest) => (
                          <div key={interest} className="flex items-center space-x-2">
                            <Checkbox
                              id={interest}
                              checked={interests.includes(interest)}
                              onCheckedChange={() => toggleInterest(interest)}
                            />
                            <label
                              htmlFor={interest}
                              className="text-xs leading-none cursor-pointer"
                            >
                              {interest}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowStep2(false)}
                      >
                        Back
                      </Button>
                      <Button type="submit" className="flex-1" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;
