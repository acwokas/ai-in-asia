import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AdminActionState {
  scrapingEvents: boolean;
  fixingDates: boolean;
  autoScheduling: boolean;
  cleaningMarkup: boolean;
  refreshingContent: boolean;
  calculatingReadingTimes: boolean;
  readingTimeProgress: { current: number; total: number };
}

export const useAdminActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [scrapingEvents, setScrapingEvents] = useState(false);
  const [fixingDates, setFixingDates] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [cleaningMarkup, setCleaningMarkup] = useState(false);
  const [refreshingContent, setRefreshingContent] = useState(false);
  const [calculatingReadingTimes, setCalculatingReadingTimes] = useState(false);
  const [readingTimeProgress, setReadingTimeProgress] = useState({ current: 0, total: 0 });

  const handleAutoScheduleComments = async () => {
    try {
      setAutoScheduling(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in",
          variant: "destructive",
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

      toast({
        title: "Success",
        description: `Comment generation scheduled for ${response.data.articlesScheduled} articles`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule comments",
        variant: "destructive",
      });
    } finally {
      setAutoScheduling(false);
    }
  };

  const handleCleanWordPressMarkup = async () => {
    try {
      setCleaningMarkup(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      const response = await supabase.functions.invoke('clean-wordpress-markup', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: "Success",
        description: `Cleaned ${response.data.cleaned} of ${response.data.processed} articles`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to clean markup",
        variant: "destructive",
      });
    } finally {
      setCleaningMarkup(false);
    }
  };

  const handleCalculateReadingTimes = async () => {
    try {
      setCalculatingReadingTimes(true);
      setReadingTimeProgress({ current: 0, total: 0 });
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in",
          variant: "destructive",
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

      toast({
        title: "Complete!",
        description: `Successfully calculated reading times for ${totalProcessed} articles`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setReadingTimeProgress({ current: 0, total: 0 });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to calculate reading times",
        variant: "destructive",
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
      toast({
        title: "Events scraped successfully!",
        description: `Inserted: ${results?.inserted || 0}, Updated: ${results?.updated || 0}, Skipped: ${results?.skipped || 0} (${results?.unique_events || 0} unique from ${results?.total_extracted || 0} extracted)`,
      });

      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events-widget"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (error: any) {
      toast({
        title: "Error scraping events",
        description: error.message || "Failed to scrape events",
        variant: "destructive",
      });
    } finally {
      setScrapingEvents(false);
    }
  };

  const handleFixArticleDates = async () => {
    try {
      setFixingDates(true);
      
      toast({
        title: "Processing dates...",
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
      toast({
        title: "Article dates fixed!",
        description: `${results?.updated || 0} articles updated, ${results?.skipped || 0} skipped`,
      });

      queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error: any) {
      if (error.message === 'timeout' || error.message?.includes('fetch')) {
        toast({
          title: "Processing may still be running",
          description: "The operation is taking longer than expected. Check the logs or refresh the page in a minute.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error fixing dates",
          description: error.message || "Failed to fix article dates",
          variant: "destructive",
        });
      }
    } finally {
      setFixingDates(false);
    }
  };

  const handleRefreshFeaturedContent = async () => {
    try {
      setRefreshingContent(true);
      
      toast({
        title: "Refreshing content...",
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

      toast({
        title: "Content refreshed successfully!",
        description: messages.length > 0 ? messages.join(", ") : "All content is up to date",
      });

      queryClient.invalidateQueries({ queryKey: ["editors-picks"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["trending-articles"] });
    } catch (error: any) {
      toast({
        title: "Error refreshing content",
        description: error.message || "Failed to refresh featured content",
        variant: "destructive",
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

      toast({
        title: "Comment approved",
        description: "The comment is now visible on the article",
      });

      queryClient.invalidateQueries({ queryKey: ['pending-comments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve comment",
        variant: "destructive",
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

      toast({
        title: "Comment deleted",
        description: "The comment has been removed",
      });

      queryClient.invalidateQueries({ queryKey: ['pending-comments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  return {
    // State
    scrapingEvents,
    fixingDates,
    autoScheduling,
    cleaningMarkup,
    refreshingContent,
    calculatingReadingTimes,
    readingTimeProgress,
    // Actions
    handleAutoScheduleComments,
    handleCleanWordPressMarkup,
    handleCalculateReadingTimes,
    handleScrapeEvents,
    handleFixArticleDates,
    handleRefreshFeaturedContent,
    approveComment,
    deleteComment,
  };
};
