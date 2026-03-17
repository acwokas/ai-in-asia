
-- Create platform_accounts table
CREATE TABLE public.platform_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_name text NOT NULL UNIQUE,
  publer_account_id text NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('photo', 'status', 'video')),
  media_format text NOT NULL CHECK (media_format IN ('landscape', 'square', 'vertical', 'none')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_accounts ENABLE ROW LEVEL SECURITY;

-- Service role bypass policy
CREATE POLICY "Service role full access on platform_accounts"
  ON public.platform_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin read access
CREATE POLICY "Admins can view platform_accounts"
  ON public.platform_accounts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_platform_accounts_updated_at
  BEFORE UPDATE ON public.platform_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data
INSERT INTO public.platform_accounts (platform_name, publer_account_id, post_type, media_format)
VALUES
  ('facebook', '69b92eda65ddd43ff9d42c64', 'photo', 'landscape'),
  ('instagram', '69b9329dcf9ec22c1c54eb52', 'photo', 'square'),
  ('linkedin', '69b92f0865ddd43ff9d42cea', 'photo', 'landscape'),
  ('tiktok', '69b933fd1a60518fd8dc905c', 'video', 'vertical'),
  ('twitter', '69b93186cf9ec22c1c54e9b8', 'photo', 'landscape'),
  ('youtube', '69b92f24e569bab056426221', 'video', 'vertical')
ON CONFLICT (platform_name) DO NOTHING;
