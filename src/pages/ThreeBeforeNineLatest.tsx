import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Redirect page for /news/3-before-9
 * Always redirects to the most recent published 3-Before-9 edition
 */
export default function ThreeBeforeNineLatest() {
  const navigate = useNavigate();

  const { data: latestEdition, isLoading, error } = useQuery({
    queryKey: ["three-before-nine-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("slug")
        .eq("article_type", "three_before_nine")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (latestEdition?.slug) {
      navigate(`/news/${latestEdition.slug}`, { replace: true });
    }
  }, [latestEdition, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading latest edition...</p>
        </div>
      </div>
    );
  }

  if (error || !latestEdition) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h1 className="text-2xl font-bold text-white mb-4">
            <span className="text-amber-400">3</span> Before <span className="text-amber-400">9</span>
          </h1>
          <p className="text-slate-400 mb-6">
            No editions published yet. Check back soon for your weekday morning AI briefing.
          </p>
          <a 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium rounded-lg transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return null;
}
