import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminActionState {
  scrapingEvents: boolean;
  fixingDates: boolean;
  autoScheduling: boolean;
  refreshingContent: boolean;
  calculatingReadingTimes: boolean;
  readingTimeProgress: { current: number; total: number };
}

export const useAdminActions = () => {
  
  const queryClient = useQueryClient();
  
  const [scrapingEvents, setScrapingEvents] = useState(false);
  const [fixingDates, setFixingDates] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [refreshingContent, setRefreshingContent] = useState(false);
  const [calculatingReadingTimes, setCalculatingReadingTimes] = useState(false);
  const [readingTimeProgress, setReadingTimeProgress] = useState({ current: 0, total: 0 });

  const handleAutoScheduleComments = async () => {
    try {
      setAutoScheduling(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Authentication Required", {
          description: "You must be logged in",
        });
        return;
      }

      const response = await supabase.functions.invoke('auto-schedule-comments', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast.success("Success", {
        description: `Comment generation scheduled for ${response.data.articlesScheduled} articles`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast.error("Error", {
        description: error.message || "Failed to schedule comments",
      });
    } finally {
      setAutoScheduling(false);
    }
  };


  const handleCalculateReadingTimes = async () => {
    try {
      setCalculatingReadingTimes(true);
      setReadingTimeProgress({ current: 0, total: 0 });
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Authentication Required", {
          description: "You must be logged in",
        });
        return;
      }

      let totalProcessed = 0;
      let hasMore = true;
      let totalCount = 0;

      while (hasMore) {
        const response = await supabase.functions.invoke('calculate-reading-times', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.error) {
          throw response.error;
        }

        totalProcessed += response.data.processed || 0;
        totalCount = response.data.totalCount || totalProcessed;
        hasMore = response.data.needsAnotherRun || false;

        setReadingTimeProgress({
          current: totalProcessed,
          total: totalCount
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast.success("Complete!", {
        description: `Successfully calculated reading times for ${totalProcessed} articles`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setReadingTimeProgress({ current: 0, total: 0 });
    } catch (error: any) {
      console.error('Error:', error);
      toast.error("Error", {
        description: error.message || "Failed to calculate reading times",
      });
      setReadingTimeProgress({ current: 0, total: 0 });
    } finally {
      setCalculatingReadingTimes(false);
    }
  };

  const handleScrapeEvents = async () => {
    try {
      setScrapingEvents(true);
      
      const { data, error } = await supabase.functions.invoke('scrape-ai-events');
      
      if (error) throw error;

      const results = data?.results;
      toast.success("Events scraped successfully!", {
        description: `Inserted: ${results?.inserted || 0}, Updated: ${results?.updated || 0}, Skipped: ${results?.skipped || 0} (${results?.unique_events || 0} unique from ${results?.total_extracted || 0} extracted)`,
      });

      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events-widget"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (error: any) {
      toast.error("Error scraping events", {
        description: error.message || "Failed to scrape events",
      });
    } finally {
      setScrapingEvents(false);
    }
  };

  const handleFixArticleDates = async () => {
    try {
      setFixingDates(true);
      
      toast("Processing dates...", {
        description: "This will take 2-3 minutes. Please wait.",
      });
      
      const csvResponse = await fetch('/import-data/ai-in-asia-export2-updated.csv');
      const csvData = await csvResponse.text();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 300000)
      );
      
      const requestPromise = supabase.functions.invoke('fix-article-dates', {
        body: { csvData }
      });
      
      const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any;
      
      if (error) throw error;

      const results = data?.results;
      toast.success("Article dates fixed!", {
        description: `${results?.updated || 0} articles updated, ${results?.skipped || 0} skipped`,
      });

      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      if (error.message === 'timeout' || error.message?.includes('fetch')) {
        toast("Processing may still be running", {
          description: "The operation is taking longer than expected. Check the logs or refresh the page in a minute.",
        });
      } else {
        toast.error("Error fixing dates", {
          description: error.message || "Failed to fix article dates",
        });
      }
    } finally {
      setFixingDates(false);
    }
  };

  const handleRefreshFeaturedContent = async () => {
    try {
      setRefreshingContent(true);
      
      toast("Refreshing content...", {
        description: "Updating editors picks and trending articles",
      });

      const { data, error } = await supabase.functions.invoke('auto-refresh-featured-content', {
        body: { manual: true }
      });
      
      if (error) throw error;

      const results = data;
      const messages = [];
      
      if (results.editorsPicksRefreshed) {
        messages.push("Editors picks refreshed");
      }
      if (results.trendingRefreshed) {
        messages.push("Category trending refreshed");
      }
      if (results.homepageTrendingRefreshed) {
        messages.push("Homepage trending refreshed");
      }

      toast.success("Content refreshed successfully!", {
        description: messages.length > 0 ? messages.join(", ") : "All content is up to date",
      });

      queryClient.invalidateQueries({ queryKey: ["editors-picks"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["trending-articles"] });
    } catch (error: any) {
      toast.error("Error refreshing content", {
        description: error.message || "Failed to refresh featured content",
      });
    } finally {
      setRefreshingContent(false);
    }
  };

  const approveComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ approved: true })
        .eq('id', commentId);

      if (error) throw error;

      toast.success("Comment approved", {
        description: "The comment is now visible on the article",
      });

      queryClient.invalidateQueries({ queryKey: ['pending-comments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to approve comment",
      });
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast.success("Comment deleted", {
        description: "The comment has been removed",
      });

      queryClient.invalidateQueries({ queryKey: ['pending-comments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to delete comment",
      });
    }
  };

  return {
    // State
    scrapingEvents,
    fixingDates,
    autoScheduling,
    refreshingContent,
    calculatingReadingTimes,
    readingTimeProgress,
    // Actions
    handleAutoScheduleComments,
    handleCalculateReadingTimes,
    handleScrapeEvents,
    handleFixArticleDates,
    handleRefreshFeaturedContent,
    approveComment,
    deleteComment,
  };
};
