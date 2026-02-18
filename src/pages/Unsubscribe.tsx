 import { useState } from "react";
 import { Link } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import Header from "@/components/Header";
 import Footer from "@/components/Footer";
 import { Button } from "@/components/ui/button";
 import { Card } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
 import { Textarea } from "@/components/ui/textarea";
 import { toast } from "sonner";
 import SEOHead from "@/components/SEOHead";
 import { MailX, Loader2, Check, Home, Heart } from "lucide-react";
 import {
   Breadcrumb,
   BreadcrumbList,
   BreadcrumbItem,
   BreadcrumbLink,
   BreadcrumbSeparator,
   BreadcrumbPage,
 } from "@/components/ui/breadcrumb";
 
 const UNSUBSCRIBE_REASONS = [
   { value: "too_frequent", label: "I receive too many emails" },
   { value: "not_relevant", label: "The content isn't relevant to me" },
   { value: "never_signed_up", label: "I never signed up for this" },
   { value: "switched_job", label: "I've changed jobs/industries" },
   { value: "other", label: "Other reason" },
 ];
 
 export default function Unsubscribe() {
   const [email, setEmail] = useState("");
   const [reason, setReason] = useState("");
   const [feedback, setFeedback] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isSuccess, setIsSuccess] = useState(false);
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!email.trim()) {
       toast.error("Please enter your email address");
       return;
     }
 
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     if (!emailRegex.test(email)) {
       toast.error("Please enter a valid email address");
       return;
     }
 
     setIsSubmitting(true);
     try {
       const { error } = await supabase.functions.invoke("unsubscribe-newsletter", {
         body: {
           email: email.trim().toLowerCase(),
           reason: reason || null,
           feedback: feedback.trim() || null,
         },
       });
 
       if (error) throw error;
 
       setIsSuccess(true);
       toast.success("You've been unsubscribed successfully");
     } catch (error: any) {
       toast.error(error.message || "Failed to unsubscribe. Please try again.");
     } finally {
       setIsSubmitting(false);
     }
   };
 
   if (isSuccess) {
     return (
       <>
         <SEOHead title="Unsubscribed" description="You have been unsubscribed from the AI in ASIA newsletter." noIndex={true} />
         <Header />
         <div className="container mx-auto px-4 py-12 min-h-screen">
           <Card className="p-12 text-center max-w-lg mx-auto">
             <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
               <Check className="h-8 w-8 text-primary" />
             </div>
             <h1 className="text-2xl font-bold mb-4">You've been unsubscribed</h1>
             <p className="text-muted-foreground mb-6">
               We've removed <strong>{email}</strong> from our mailing list. 
               You won't receive any more emails from us.
             </p>
             <p className="text-sm text-muted-foreground mb-8">
               Changed your mind? You can always{" "}
               <Link to="/newsletter" className="text-primary underline">
                 subscribe again
               </Link>.
             </p>
             <Button asChild>
               <Link to="/">
                 <Home className="h-4 w-4 mr-2" />
                 Back to Home
               </Link>
             </Button>
           </Card>
         </div>
         <Footer />
       </>
     );
   }
 
   return (
     <>
       <SEOHead title="Unsubscribe" description="Unsubscribe from the AI in ASIA newsletter." noIndex={true} />
 
       <Header />
       <div className="container mx-auto px-4 py-12 min-h-screen">
         <div className="max-w-lg mx-auto">
           <Breadcrumb className="mb-6">
             <BreadcrumbList>
               <BreadcrumbItem>
                 <BreadcrumbLink asChild>
                   <Link to="/" className="flex items-center gap-1">
                     <Home className="h-4 w-4" />
                   </Link>
                 </BreadcrumbLink>
               </BreadcrumbItem>
               <BreadcrumbSeparator />
               <BreadcrumbItem>
                 <BreadcrumbLink asChild>
                   <Link to="/newsletter">Newsletter</Link>
                 </BreadcrumbLink>
               </BreadcrumbItem>
               <BreadcrumbSeparator />
               <BreadcrumbItem>
                 <BreadcrumbPage>Unsubscribe</BreadcrumbPage>
               </BreadcrumbItem>
             </BreadcrumbList>
           </Breadcrumb>
 
           <Card className="p-8">
             <div className="text-center mb-8">
               <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                 <MailX className="h-8 w-8 text-muted-foreground" />
               </div>
               <h1 className="text-2xl font-bold mb-2">We're sorry to see you go</h1>
               <p className="text-muted-foreground">
                 Before you leave, please let us know why you're unsubscribing. 
                 Your feedback helps us improve.
               </p>
             </div>
 
             {/* Privacy Notice */}
             <div className="bg-muted/50 rounded-lg p-4 mb-6">
               <div className="flex items-start gap-3">
                 <Heart className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                 <div className="text-sm">
                   <p className="font-medium mb-1">Your privacy matters</p>
                   <p className="text-muted-foreground">
                     We respect your decision. Your email will be immediately removed from our 
                     mailing list. We don't sell or share your data with third parties.
                   </p>
                 </div>
               </div>
             </div>
 
             <form onSubmit={handleSubmit} className="space-y-6">
               {/* Reason Selection */}
               <div className="space-y-3">
                 <Label className="text-base">Why are you unsubscribing? (optional)</Label>
                 <RadioGroup value={reason} onValueChange={setReason}>
                   {UNSUBSCRIBE_REASONS.map((option) => (
                     <div key={option.value} className="flex items-center space-x-3 py-2">
                       <RadioGroupItem value={option.value} id={option.value} />
                       <Label htmlFor={option.value} className="font-normal cursor-pointer">
                         {option.label}
                       </Label>
                     </div>
                   ))}
                 </RadioGroup>
               </div>
 
               {/* Additional Feedback */}
               {reason === "other" && (
                 <div className="space-y-2">
                   <Label htmlFor="feedback">Tell us more (optional)</Label>
                   <Textarea
                     id="feedback"
                     placeholder="How could we improve?"
                     value={feedback}
                     onChange={(e) => setFeedback(e.target.value)}
                     maxLength={500}
                     rows={3}
                   />
                 </div>
               )}
 
               {/* Email Input */}
               <div className="space-y-2">
                 <Label htmlFor="email">Your email address</Label>
                 <Input
                   id="email"
                   type="email"
                   placeholder="you@example.com"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   required
                   maxLength={255}
                 />
                 <p className="text-xs text-muted-foreground">
                   Enter the email address you want to unsubscribe.
                 </p>
               </div>
 
               {/* Submit Button */}
               <Button 
                 type="submit" 
                 variant="destructive" 
                 className="w-full" 
                 disabled={isSubmitting}
               >
                 {isSubmitting ? (
                   <>
                     <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                     Unsubscribing...
                   </>
                 ) : (
                   <>
                     <MailX className="h-4 w-4 mr-2" />
                     Unsubscribe
                   </>
                 )}
               </Button>
             </form>
 
             <p className="text-xs text-center text-muted-foreground mt-6">
               Having trouble? Contact us at{" "}
               <a href="mailto:contact@aiinasia.com" className="underline">
                 contact@aiinasia.com
               </a>
             </p>
           </Card>
         </div>
       </div>
       <Footer />
     </>
   );
 }