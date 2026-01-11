-- Add three_before_nine to article_type_new enum
ALTER TYPE article_type_new ADD VALUE IF NOT EXISTS 'three_before_nine';

-- Create subscription preferences table for briefing formats
CREATE TABLE public.briefing_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  briefing_type TEXT NOT NULL DEFAULT '3-before-9',
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(email, briefing_type)
);

-- Enable RLS
ALTER TABLE public.briefing_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (insert)
CREATE POLICY "Anyone can subscribe to briefings"
  ON public.briefing_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.briefing_subscriptions
  FOR SELECT
  USING (
    email = current_setting('request.jwt.claims', true)::json->>'email'
    OR user_id = auth.uid()
  );

-- Allow users to update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON public.briefing_subscriptions
  FOR UPDATE
  USING (
    email = current_setting('request.jwt.claims', true)::json->>'email'
    OR user_id = auth.uid()
  );

-- Create index for fast lookups
CREATE INDEX idx_briefing_subscriptions_email ON public.briefing_subscriptions(email);
CREATE INDEX idx_briefing_subscriptions_type_active ON public.briefing_subscriptions(briefing_type, is_active);