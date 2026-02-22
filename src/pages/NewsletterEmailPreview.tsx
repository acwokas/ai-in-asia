 import { useEffect, useState } from "react";
 import { useParams } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { Loader2 } from "lucide-react";
 import SEOHead from "@/components/SEOHead";
 
 export default function NewsletterEmailPreview() {
   const { id } = useParams<{ id: string }>();
   const [html, setHtml] = useState("");
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
   useEffect(() => {
     async function fetchEmailPreview() {
       if (!id) {
         setError("No edition ID provided");
         setIsLoading(false);
         return;
       }
 
       try {
         const { data, error } = await supabase.functions.invoke("preview-newsletter", {
           body: { edition_id: id },
         });
 
         if (error) throw error;
 
         setHtml(data.html);
       } catch (err: any) {
         setError(err.message || "Failed to load email preview");
       } finally {
         setIsLoading(false);
       }
     }
 
     fetchEmailPreview();
   }, [id]);
 
   if (isLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   if (error) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <p className="text-destructive">{error}</p>
       </div>
     );
   }
 
   // Render the email HTML directly
   return (
     <>
       <SEOHead title="Newsletter Email Preview" description="Preview newsletter email content." noIndex={true} />
       <div 
         className="min-h-screen bg-white"
         dangerouslySetInnerHTML={{ __html: html }} 
       />
     </>
   );
 }