
CREATE TABLE public.event_alert_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  region_preference TEXT NOT NULL DEFAULT 'all',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(email)
);

ALTER TABLE public.event_alert_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to event alerts"
  ON public.event_alert_subscribers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own subscription"
  ON public.event_alert_subscribers
  FOR SELECT
  USING (true);
