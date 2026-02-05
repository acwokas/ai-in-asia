-- Create newsletter_unsubscribes table to track unsubscriptions
CREATE TABLE public.newsletter_unsubscribes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  reason TEXT,
  feedback TEXT,
  unsubscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'weekly'
);

-- Enable RLS
ALTER TABLE public.newsletter_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Admin can view all unsubscribes
CREATE POLICY "Admins can view unsubscribes"
ON public.newsletter_unsubscribes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index on email for faster lookups
CREATE INDEX idx_newsletter_unsubscribes_email ON public.newsletter_unsubscribes(email);
CREATE INDEX idx_newsletter_unsubscribes_date ON public.newsletter_unsubscribes(unsubscribed_at DESC);