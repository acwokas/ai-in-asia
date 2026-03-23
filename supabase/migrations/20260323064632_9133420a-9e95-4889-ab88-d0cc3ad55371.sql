CREATE TABLE public.google_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read google_oauth_tokens"
ON public.google_oauth_tokens
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert google_oauth_tokens"
ON public.google_oauth_tokens
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update google_oauth_tokens"
ON public.google_oauth_tokens
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete google_oauth_tokens"
ON public.google_oauth_tokens
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));