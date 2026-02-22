 import { useEffect } from "react";
 import { useNavigate } from "react-router-dom";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { Loader2 } from "lucide-react";
 import SEOHead from "@/components/SEOHead";
 
 /**
  * Redirect page for /newsletter-weekly
  * Always redirects to the most recent sent weekly newsletter edition
  */
 export default function NewsletterWeeklyLatest() {
   const navigate = useNavigate();
 
   const { data: latestEdition, isLoading, error } = useQuery({
     queryKey: ["newsletter-weekly-latest"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("newsletter_editions")
         .select("edition_date, permalink_url")
         .eq("status", "sent")
         .order("edition_date", { ascending: false })
         .limit(1)
         .maybeSingle();
 
       if (error) throw error;
       return data;
     },
   });
 
   useEffect(() => {
     if (latestEdition?.edition_date) {
       // Use the permalink_url if available, otherwise fallback to archive route
       const targetUrl = latestEdition.permalink_url || `/newsletter/archive/${latestEdition.edition_date}`;
       navigate(targetUrl, { replace: true });
     }
   }, [latestEdition, navigate]);
 
    if (isLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <SEOHead title="Latest Weekly Newsletter" description="Redirecting to the latest AI in ASIA Weekly Brief." noIndex={true} />
         <div className="text-center">
           <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
           <p className="text-muted-foreground">Loading latest newsletter...</p>
         </div>
       </div>
     );
   }
 
    if (error || !latestEdition) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <SEOHead title="Latest Weekly Newsletter" description="Redirecting to the latest AI in ASIA Weekly Brief." noIndex={true} />
          <div className="text-center max-w-md px-6">
            <h1 className="text-2xl font-bold mb-4">
              AI in ASIA Weekly Brief
            </h1>
            <p className="text-muted-foreground mb-6">
              No newsletters published yet. Subscribe to be notified when we send our first edition.
            </p>
            <a 
              href="/newsletter"
              className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
            >
              Subscribe Now
            </a>
          </div>
        </div>
      );
    }
  
    return null;
  }