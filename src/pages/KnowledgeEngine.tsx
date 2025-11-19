import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Brain, Database, Zap, BarChart3 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Progress } from "@/components/ui/progress";

export default function KnowledgeEngine() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdminRole();
  const queryClient = useQueryClient();
  const [batchSize, setBatchSize] = useState(50);

  // Redirect non-admins
  if (!adminLoading && !isAdmin) {
    navigate("/");
    return null;
  }

  // Fetch enrichment stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['enrichment-stats'],
    queryFn: async () => {
      const [articlesRes, enrichedRes, entitiesRes, topicsRes] = await Promise.all([
        supabase.from('articles').select('id', { count: 'exact', head: true }),
        supabase.from('articles_enriched').select('id', { count: 'exact', head: true }),
        supabase.from('entities').select('id', { count: 'exact', head: true }),
        supabase.from('topics').select('id', { count: 'exact', head: true }),
      ]);

      return {
        totalArticles: articlesRes.count || 0,
        enrichedArticles: enrichedRes.count || 0,
        totalEntities: entitiesRes.count || 0,
        totalTopics: topicsRes.count || 0,
      };
    },
    enabled: isAdmin,
  });

  // Fetch latest queue status
  const { data: queueStatus } = useQuery({
    queryKey: ['enrichment-queue-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrichment_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Set up realtime subscription for queue updates
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('enrichment-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrichment_queue'
        },
        (payload) => {
          console.log('Queue update:', payload);
          queryClient.invalidateQueries({ queryKey: ['enrichment-queue-status'] });
          queryClient.invalidateQueries({ queryKey: ['enrichment-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  // Enrich single article
  const enrichSingleMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const batchId = crypto.randomUUID();
      
      // Create queue entry
      await supabase.from('enrichment_queue').insert({
        batch_id: batchId,
        article_ids: [articleId],
        total_items: 1,
        status: 'queued',
      });

      // Call enrichment function
      const { data, error } = await supabase.functions.invoke('enrich-article', {
        body: { article_ids: [articleId], batch_id: batchId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Article enrichment started');
      queryClient.invalidateQueries({ queryKey: ['enrichment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['enrichment-queue-status'] });
    },
    onError: (error) => {
      toast.error(`Enrichment failed: ${error.message}`);
    },
  });

  // Enrich batch of articles
  const enrichBatchMutation = useMutation({
    mutationFn: async (limit: number) => {
      // First get enriched article IDs
      const { data: enrichedArticles } = await supabase
        .from('articles_enriched')
        .select('article_id');
      
      const enrichedIds = enrichedArticles?.map(a => a.article_id) || [];
      
      // Get unenriched articles
      const query = supabase
        .from('articles')
        .select('id')
        .eq('status', 'published')
        .limit(limit);
      
      // Only apply not.in filter if there are enriched IDs
      const { data: articles, error: fetchError } = enrichedIds.length > 0
        ? await query.not('id', 'in', `(${enrichedIds.join(',')})`)
        : await query;

      if (fetchError) throw fetchError;
      if (!articles || articles.length === 0) {
        throw new Error('No unenriched articles found');
      }

      const articleIds = articles.map(a => a.id);
      const batchId = crypto.randomUUID();

      // Create queue entry
      await supabase.from('enrichment_queue').insert({
        batch_id: batchId,
        article_ids: articleIds,
        total_items: articleIds.length,
        status: 'queued',
      });

      // Call enrichment function
      const { data, error } = await supabase.functions.invoke('enrich-article', {
        body: { article_ids: articleIds, batch_id: batchId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Started enriching ${data.processed} articles`);
      queryClient.invalidateQueries({ queryKey: ['enrichment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['enrichment-queue-status'] });
    },
    onError: (error) => {
      toast.error(`Batch enrichment failed: ${error.message}`);
    },
  });

  // Enrich all articles
  const enrichAllMutation = useMutation({
    mutationFn: async () => {
      // Get all unenriched articles
      const { data: articles, error: fetchError } = await supabase
        .from('articles')
        .select('id')
        .eq('status', 'published');

      if (fetchError) throw fetchError;
      if (!articles || articles.length === 0) {
        throw new Error('No articles found');
      }

      // Get already enriched IDs
      const { data: enriched } = await supabase
        .from('articles_enriched')
        .select('article_id');

      const enrichedIds = new Set(enriched?.map(e => e.article_id) || []);
      const unenrichedArticles = articles.filter(a => !enrichedIds.has(a.id));

      if (unenrichedArticles.length === 0) {
        throw new Error('All articles are already enriched');
      }

      const articleIds = unenrichedArticles.map(a => a.id);
      const batchId = crypto.randomUUID();

      // Create queue entry
      await supabase.from('enrichment_queue').insert({
        batch_id: batchId,
        article_ids: articleIds,
        total_items: articleIds.length,
        status: 'queued',
      });

      // Process in batches of 50
      const BATCH_SIZE = 50;
      const results = [];
      
      for (let i = 0; i < articleIds.length; i += BATCH_SIZE) {
        const batch = articleIds.slice(i, i + BATCH_SIZE);
        
        const { data, error } = await supabase.functions.invoke('enrich-article', {
          body: { article_ids: batch, batch_id: batchId }
        });

        if (error) {
          console.error('Batch error:', error);
          continue;
        }
        
        results.push(data);
        
        // Update queue status
        await supabase
          .from('enrichment_queue')
          .update({
            processed_items: Math.min(i + BATCH_SIZE, articleIds.length),
            status: i + BATCH_SIZE >= articleIds.length ? 'completed' : 'processing',
          })
          .eq('batch_id', batchId);
      }

      return { totalProcessed: articleIds.length, results };
    },
    onSuccess: (data) => {
      toast.success(`Enriched all ${data.totalProcessed} articles!`);
      queryClient.invalidateQueries({ queryKey: ['enrichment-stats'] });
      queryClient.invalidateQueries({ queryKey: ['enrichment-queue-status'] });
    },
    onError: (error) => {
      toast.error(`Failed to enrich all: ${error.message}`);
    },
  });

  const enrichmentProgress = stats ? (stats.enrichedArticles / stats.totalArticles) * 100 : 0;

  if (adminLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold mb-2">Knowledge Engine</h1>
            <p className="text-muted-foreground">
              AI-powered semantic enrichment for AIinASIA articles
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalArticles || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enriched</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.enrichedArticles || 0}</div>
                <Progress value={enrichmentProgress} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entities</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalEntities || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Topics</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalTopics || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Queue Status */}
          {queueStatus && queueStatus.status !== 'completed' && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span>{queueStatus.processed_items} / {queueStatus.total_items}</span>
                  </div>
                  <Progress 
                    value={(queueStatus.processed_items / queueStatus.total_items) * 100} 
                  />
                  <p className="text-sm text-muted-foreground">
                    Status: {queueStatus.status}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Enrichment Actions</CardTitle>
              <CardDescription>
                Process articles to extract entities, topics, and generate semantic embeddings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => enrichBatchMutation.mutate(batchSize)}
                  disabled={enrichBatchMutation.isPending}
                  className="w-full"
                >
                  {enrichBatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enrich Next {batchSize}
                </Button>

                <Button
                  onClick={() => enrichAllMutation.mutate()}
                  disabled={enrichAllMutation.isPending}
                  variant="secondary"
                  className="w-full"
                >
                  {enrichAllMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enrich All Remaining
                </Button>

                <Button
                  onClick={() => navigate('/admin')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Admin
                </Button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Note:</strong> Enrichment uses AI to analyze articles and extract semantic metadata. 
                  This process preserves original articles and stores metadata separately for SEO safety.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Batches process 50 articles at a time</li>
                  <li>Progress updates every 5 seconds</li>
                  <li>Safe to close page while processing</li>
                  <li>Original articles remain unchanged</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}