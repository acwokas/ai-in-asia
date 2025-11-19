-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Articles Enriched: metadata layer (backend intelligence only)
CREATE TABLE IF NOT EXISTS public.articles_enriched (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  original_url TEXT NOT NULL,
  raw_content_reference TEXT, -- reference only, not stored content
  summary TEXT, -- internal only, never published
  embedding_vector vector(1536), -- OpenAI/Gemini embedding dimension
  entities JSONB DEFAULT '[]'::jsonb,
  keyphrases TEXT[] DEFAULT ARRAY[]::text[],
  topics TEXT[] DEFAULT ARRAY[]::text[],
  cluster_id UUID,
  related_articles UUID[] DEFAULT ARRAY[]::uuid[],
  metadata_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id)
);

-- Topics: semantic topic groups
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_name TEXT NOT NULL UNIQUE,
  topic_slug TEXT NOT NULL UNIQUE,
  topic_description TEXT, -- unique, editorial-style, LLM-generated
  topic_image TEXT,
  related_entities JSONB DEFAULT '[]'::jsonb,
  related_topics UUID[] DEFAULT ARRAY[]::uuid[],
  article_ids UUID[] DEFAULT ARRAY[]::uuid[],
  article_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entities: companies, people, regions, products, laws, concepts
CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'person', 'law', 'region', 'product', 'concept')),
  entity_slug TEXT NOT NULL,
  description TEXT, -- unique, LLM-generated
  related_articles UUID[] DEFAULT ARRAY[]::uuid[],
  co_occurring_entities UUID[] DEFAULT ARRAY[]::uuid[],
  related_topics UUID[] DEFAULT ARRAY[]::uuid[],
  mention_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_name, entity_type)
);

-- Enrichment Queue: batch processing tracker
CREATE TABLE IF NOT EXISTS public.enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  article_ids JSONB NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  successful_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error_message TEXT,
  results JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_enriched_article_id ON public.articles_enriched(article_id);
CREATE INDEX IF NOT EXISTS idx_articles_enriched_embedding ON public.articles_enriched USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_articles_enriched_topics ON public.articles_enriched USING gin(topics);
CREATE INDEX IF NOT EXISTS idx_articles_enriched_cluster ON public.articles_enriched(cluster_id);

CREATE INDEX IF NOT EXISTS idx_topics_slug ON public.topics(topic_slug);
CREATE INDEX IF NOT EXISTS idx_topics_article_ids ON public.topics USING gin(article_ids);

CREATE INDEX IF NOT EXISTS idx_entities_slug ON public.entities(entity_slug);
CREATE INDEX IF NOT EXISTS idx_entities_type ON public.entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_related_articles ON public.entities USING gin(related_articles);

CREATE INDEX IF NOT EXISTS idx_enrichment_queue_status ON public.enrichment_queue(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_queue_batch_id ON public.enrichment_queue(batch_id);

-- RLS Policies
ALTER TABLE public.articles_enriched ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_queue ENABLE ROW LEVEL SECURITY;

-- Admins can manage all enrichment data
CREATE POLICY "Admins can manage articles_enriched"
  ON public.articles_enriched
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage topics"
  ON public.topics
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage entities"
  ON public.entities
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage enrichment_queue"
  ON public.enrichment_queue
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can view topics and entities (for public pages)
CREATE POLICY "Anyone can view topics"
  ON public.topics
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view entities"
  ON public.entities
  FOR SELECT
  USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_enrichment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_articles_enriched_timestamp
  BEFORE UPDATE ON public.articles_enriched
  FOR EACH ROW
  EXECUTE FUNCTION update_enrichment_timestamp();

CREATE TRIGGER update_topics_timestamp
  BEFORE UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION update_enrichment_timestamp();

CREATE TRIGGER update_entities_timestamp
  BEFORE UPDATE ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION update_enrichment_timestamp();