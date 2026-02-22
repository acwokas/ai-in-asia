import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Upload, ChevronRight, Zap, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import { Skeleton } from "@/components/ui/skeleton";
import logo from "@/assets/aiinasia-logo.png";
import { INTEREST_OPTIONS } from "@/constants/interests";

const GoogleIcon = () => (
  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AppleIcon = () => (
  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const Auth = () => {
  const [searchParams] = useSearchParams();
  const isResetMode = searchParams.get("mode") === "reset";

  // Sign In state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // Reset password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
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
  const { signIn, signUp, signInWithGoogle, signInWithApple, resetPassword, updatePassword, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const calculateSignupPoints = () => {
    let points = 20;
    if (newsletterOptIn) points += 5;
    if (avatarFile) points += 5;
    if (lastName) points += 3;
    if (company) points += 5;
    if (jobTitle) points += 5;
    if (country) points += 3;
    points += interests.length * 2;
    return points;
  };

  useEffect(() => {
    if (user && !isResetMode) {
      navigate("/profile");
    }
  }, [user, navigate, isResetMode]);

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
      const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.8, maxSizeMB: 0.5 });
      setAvatarFile(compressed);
      setAvatarPreview(URL.createObjectURL(compressed));
    } catch {
      toast.error("Error", { description: "Failed to process image" });
    }
  };

  const toggleInterest = (interest: string) => {
    setInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast.error("Error", { description: error?.message || "Failed to sign in with Google" });
    }
    setLoading(false);
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithApple();
    } catch (error: any) {
      toast.error("Error", { description: error?.message || "Failed to sign in with Apple" });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(forgotEmail);
    if (error) {
      toast.error("Error", { description: error.message });
    } else {
      toast.success("Check your email", { description: "We sent you a password reset link." });
      setShowForgotPassword(false);
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(newPassword);
    if (error) {
      toast.error("Error", { description: error.message });
    } else {
      toast.success("Password updated!", { description: "You can now sign in with your new password." });
      navigate("/auth");
    }
    setLoading(false);
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
        let avatarData = null;
        if (avatarFile) {
          const reader = new FileReader();
          avatarData = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(avatarFile);
          });
        }
        sessionStorage.setItem('pendingProfileData', JSON.stringify({
          firstName, lastName, company, jobTitle, country, interests, avatarData, newsletterOptIn,
          userId: data.user.id, email: data.user.email
        }));
        const potentialPoints = calculateSignupPoints();
        toast("Welcome! 🎉", { description: `Account created! You'll earn ${potentialPoints} points once you complete your profile.` });
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
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', signInEmail);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      toast("Welcome back!", { description: "Successfully signed in." });
    }
    setLoading(false);
  };

  // Loading skeleton while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Reset password mode
  if (isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
          <div className="text-center mb-8">
            <img src={logo} alt="AI in ASIA" className="h-16 mx-auto mb-4" />
            <h1 className="text-xl font-semibold">Set New Password</h1>
            <p className="text-muted-foreground text-sm mt-1">Enter your new password below</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </div>
          <div className="text-center mt-4">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="inline h-3 w-3 mr-1" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to site
        </Link>
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
              {/* Social OAuth */}
              <div className="space-y-3 mb-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white text-gray-800 hover:bg-gray-50 border-border dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                  Continue with Google
                </Button>
                <Button
                  type="button"
                  className="w-full bg-black text-white hover:bg-black/90 border-none"
                  onClick={handleAppleSignIn}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AppleIcon />}
                  Continue with Apple
                </Button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
                </div>
              </div>

              {showForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                  <div>
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-primary w-full text-center"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Back to sign in
                  </button>
                </form>
              ) : (
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => {
                          setForgotEmail(signInEmail);
                          setShowForgotPassword(true);
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
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
                        {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <label htmlFor="remember-me" className="text-sm text-muted-foreground leading-none cursor-pointer">
                      Remember my email
                    </label>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              {/* Social OAuth for signup too */}
              <div className="space-y-3 mb-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white text-gray-800 hover:bg-gray-50 border-border dark:bg-white dark:text-gray-800 dark:hover:bg-gray-100"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                  Continue with Google
                </Button>
                <Button
                  type="button"
                  className="w-full bg-black text-white hover:bg-black/90 border-none"
                  onClick={handleAppleSignIn}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AppleIcon />}
                  Continue with Apple
                </Button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
                </div>
              </div>

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
                      <Input id="signup-firstname" type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div>
                      <Label htmlFor="signup-email">Email *</Label>
                      <Input id="signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox id="newsletter" checked={newsletterOptIn} onCheckedChange={(checked) => setNewsletterOptIn(checked as boolean)} />
                      <label htmlFor="newsletter" className="text-sm text-muted-foreground leading-none cursor-pointer">
                        <Link to="/newsletter" className="text-primary hover:underline">Subscribe</Link> to our newsletter for weekly AI insights
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setShowStep2(true)}>
                        Customize Feed <ChevronRight className="ml-2 h-4 w-4" />
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
                        <div className="flex justify-between"><span>Avatar:</span><span className="font-medium">+5 pts</span></div>
                        <div className="flex justify-between"><span>Company:</span><span className="font-medium">+5 pts</span></div>
                        <div className="flex justify-between"><span>Job Title:</span><span className="font-medium">+5 pts</span></div>
                        <div className="flex justify-between"><span>Country:</span><span className="font-medium">+3 pts</span></div>
                        <div className="flex justify-between"><span>Last Name:</span><span className="font-medium">+3 pts</span></div>
                        <div className="flex justify-between"><span>Per Interest:</span><span className="font-medium">+2 pts</span></div>
                      </div>
                      <div className="pt-2 border-t border-primary/20">
                        <p className="text-xs font-medium text-primary">
                          {calculateSignupPoints() >= 45 ? "🎯 Unlock 'Profile Master' badge! 👑" : `Need ${45 - calculateSignupPoints()} more pts for 'Profile Master' badge 👑`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center mb-4">
                      <Avatar className="h-20 w-20 mb-2">
                        <AvatarImage src={avatarPreview} alt="Avatar preview" />
                        <AvatarFallback><Upload className="h-8 w-8" /></AvatarFallback>
                      </Avatar>
                      <Label htmlFor="avatar-upload" className="cursor-pointer text-sm text-primary hover:underline">
                        Upload Avatar
                        <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                      </Label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="signup-lastname">Last Name</Label>
                        <Input id="signup-lastname" type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="signup-country">Country</Label>
                        <Input id="signup-country" type="text" placeholder="Singapore" value={country} onChange={(e) => setCountry(e.target.value)} />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="signup-company">Company</Label>
                      <Input id="signup-company" type="text" placeholder="Your company" value={company} onChange={(e) => setCompany(e.target.value)} />
                    </div>

                    <div>
                      <Label htmlFor="signup-jobtitle">Job Title</Label>
                      <Input id="signup-jobtitle" type="text" placeholder="AI Engineer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                    </div>

                    <div>
                      <Label className="mb-2 block">Interests (Select topics for your feed)</Label>
                      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                        {INTEREST_OPTIONS.map((interest) => (
                           <div key={interest} className="flex items-center space-x-2 min-h-[44px]">
                             <Checkbox id={interest} checked={interests.includes(interest)} onCheckedChange={() => toggleInterest(interest)} />
                             <label htmlFor={interest} className="text-xs leading-none cursor-pointer select-none">{interest}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setShowStep2(false)}>Back</Button>
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

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="inline h-3 w-3 mr-1" />
            Back to site
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
