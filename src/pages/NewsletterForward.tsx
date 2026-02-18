 import { useState } from "react";
 import { useSearchParams, Link } from "react-router-dom";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import Header from "@/components/Header";
 import Footer from "@/components/Footer";
 import { Button } from "@/components/ui/button";
 import { Card } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { toast } from "sonner";
 import SEOHead from "@/components/SEOHead";
 import { Send, Mail, Loader2, Check, Home } from "lucide-react";
 import {
   Breadcrumb,
   BreadcrumbList,
   BreadcrumbItem,
   BreadcrumbLink,
   BreadcrumbSeparator,
   BreadcrumbPage,
 } from "@/components/ui/breadcrumb";
 
 export default function NewsletterForward() {
   const [searchParams] = useSearchParams();
   const editionId = searchParams.get("edition");
   
   const [senderName, setSenderName] = useState("");
   const [recipientEmail, setRecipientEmail] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isSuccess, setIsSuccess] = useState(false);
 
   const { data: edition, isLoading } = useQuery({
     queryKey: ["newsletter-edition-forward", editionId],
     queryFn: async () => {
       if (!editionId) return null;
       
       const { data, error } = await supabase
         .from("newsletter_editions")
         .select("id, edition_date, subject_line, status")
         .eq("id", editionId)
         .eq("status", "sent")
         .single();
 
       if (error) throw error;
       return data;
     },
     enabled: !!editionId,
   });
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!editionId || !senderName.trim() || !recipientEmail.trim()) {
       toast.error("Please fill in all fields");
       return;
     }
 
     // Basic email validation
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     if (!emailRegex.test(recipientEmail)) {
       toast.error("Please enter a valid email address");
       return;
     }
 
     setIsSubmitting(true);
     try {
       const { error } = await supabase.functions.invoke("forward-newsletter", {
         body: {
           edition_id: editionId,
           sender_name: senderName.trim(),
           recipient_email: recipientEmail.trim(),
         },
       });
 
       if (error) throw error;
 
       setIsSuccess(true);
       toast.success("Newsletter forwarded successfully!");
     } catch (error: any) {
       toast.error(error.message || "Failed to forward newsletter");
     } finally {
       setIsSubmitting(false);
     }
   };
 
   if (!editionId) {
     return (
       <>
         <Header />
         <div className="container mx-auto px-4 py-12 min-h-screen">
           <Card className="p-12 text-center max-w-md mx-auto">
             <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
             <h2 className="text-2xl font-bold mb-2">Missing Edition</h2>
             <p className="text-muted-foreground mb-6">
               No newsletter edition was specified to forward.
             </p>
             <Button asChild>
               <Link to="/newsletter/archive">Browse Archive</Link>
             </Button>
           </Card>
         </div>
         <Footer />
       </>
     );
   }
 
   if (isLoading) {
     return (
       <>
         <Header />
         <div className="container mx-auto px-4 py-12 min-h-screen">
           <div className="animate-pulse space-y-4 max-w-md mx-auto">
             <div className="h-8 bg-muted rounded w-1/3" />
             <div className="h-64 bg-muted rounded" />
           </div>
         </div>
         <Footer />
       </>
     );
   }
 
   if (!edition) {
     return (
       <>
         <Header />
         <div className="container mx-auto px-4 py-12 min-h-screen">
           <Card className="p-12 text-center max-w-md mx-auto">
             <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
             <h2 className="text-2xl font-bold mb-2">Newsletter Not Found</h2>
             <p className="text-muted-foreground mb-6">
               This newsletter edition doesn't exist or hasn't been published yet.
             </p>
             <Button asChild>
               <Link to="/newsletter/archive">Browse Archive</Link>
             </Button>
           </Card>
         </div>
         <Footer />
       </>
     );
   }
 
   if (isSuccess) {
     return (
       <>
         <SEOHead title="Newsletter Forwarded" description="The newsletter has been forwarded successfully." noIndex={true} />
         <Header />
         <div className="container mx-auto px-4 py-12 min-h-screen">
           <Card className="p-12 text-center max-w-md mx-auto">
             <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
               <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
             </div>
             <h2 className="text-2xl font-bold mb-2">Newsletter Sent!</h2>
             <p className="text-muted-foreground mb-6">
               We've forwarded the newsletter to {recipientEmail}. They'll receive it shortly.
             </p>
             <div className="flex flex-col sm:flex-row gap-3 justify-center">
               <Button asChild variant="outline">
                 <Link to="/">Back to Home</Link>
               </Button>
               <Button onClick={() => {
                 setIsSuccess(false);
                 setSenderName("");
                 setRecipientEmail("");
               }}>
                 Forward to Another
               </Button>
             </div>
           </Card>
         </div>
         <Footer />
       </>
     );
   }
 
   return (
     <>
       <SEOHead title="Forward Newsletter" description="Share the AI in ASIA Weekly Brief with a colleague or friend." noIndex={true} />
 
       <Header />
       <div className="container mx-auto px-4 py-12 min-h-screen">
         <div className="max-w-md mx-auto">
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
                 <BreadcrumbPage>Forward</BreadcrumbPage>
               </BreadcrumbItem>
             </BreadcrumbList>
           </Breadcrumb>
 
           <Card className="p-8">
             <div className="text-center mb-8">
               <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Send className="h-8 w-8 text-primary" />
               </div>
               <h1 className="text-2xl font-bold mb-2">Forward This Newsletter</h1>
               <p className="text-muted-foreground">
                 Share the AI in ASIA Weekly Brief with someone who'd find it valuable.
               </p>
             </div>
 
             <div className="mb-6 p-4 bg-muted/50 rounded-lg">
               <p className="text-sm text-muted-foreground mb-1">Forwarding:</p>
               <p className="font-medium">{edition.subject_line}</p>
               <p className="text-sm text-muted-foreground">
                 {new Date(edition.edition_date).toLocaleDateString('en-US', {
                   weekday: 'long',
                   year: 'numeric',
                   month: 'long',
                   day: 'numeric',
                 })}
               </p>
             </div>
 
             <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="senderName">Your Name</Label>
                 <Input
                   id="senderName"
                   type="text"
                   placeholder="Enter your name"
                   value={senderName}
                   onChange={(e) => setSenderName(e.target.value)}
                   maxLength={100}
                   required
                 />
                 <p className="text-xs text-muted-foreground">
                   We'll include your name so they know who sent it.
                 </p>
               </div>
 
               <div className="space-y-2">
                 <Label htmlFor="recipientEmail">Friend's Email</Label>
                 <Input
                   id="recipientEmail"
                   type="email"
                   placeholder="friend@example.com"
                   value={recipientEmail}
                   onChange={(e) => setRecipientEmail(e.target.value)}
                   maxLength={255}
                   required
                 />
               </div>
 
               <Button type="submit" className="w-full" disabled={isSubmitting}>
                 {isSubmitting ? (
                   <>
                     <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                     Sending...
                   </>
                 ) : (
                   <>
                     <Send className="h-4 w-4 mr-2" />
                     Send Newsletter
                   </>
                 )}
               </Button>
             </form>
 
             <p className="text-xs text-muted-foreground text-center mt-6">
               Your friend's email is only used to deliver this newsletter and is not stored or added to any mailing list. 
               <Link to="/privacy" className="underline ml-1">Privacy Policy</Link>
             </p>
           </Card>
         </div>
       </div>
       <Footer />
     </>
   );
 }