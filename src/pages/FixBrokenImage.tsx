import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import Header from "@/components/Header";

const FixBrokenImage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isFixing, setIsFixing] = useState(false);
  const [isFixed, setIsFixed] = useState(false);

  const fixImage = async () => {
    setIsFixing(true);
    
    try {
      const { error } = await supabase
        .from('articles')
        .update({ 
          featured_image_url: 'https://ppvifagplcdjpdpqknzt.supabase.co/storage/v1/object/public/article-images/1760799481013-pe3shc.jpg'
        })
        .eq('id', '99be2f9c-0700-41bf-b44c-db1dd8859d75');

      if (error) throw error;

      setIsFixed(true);
      toast({
        title: "Image Fixed!",
        description: "The broken image has been updated to use the Supabase storage URL.",
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error("Error fixing image:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fix image",
        variant: "destructive",
      });
    } finally {
      setIsFixing(false);
    }
  };

  useEffect(() => {
    // Auto-fix on page load
    fixImage();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle>Fixing Broken Image</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {isFixing && (
              <div>
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-muted-foreground">Updating image URL...</p>
              </div>
            )}
            
            {isFixed && (
              <div>
                <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
                <p className="mt-4 text-muted-foreground">Image fixed! Redirecting to homepage...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FixBrokenImage;
