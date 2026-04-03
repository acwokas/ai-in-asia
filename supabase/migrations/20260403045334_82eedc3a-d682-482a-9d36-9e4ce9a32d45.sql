CREATE TABLE public.jargon_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text VARCHAR(2000) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  votes INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.jargon_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit jargon"
  ON public.jargon_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read jargon submissions"
  ON public.jargon_submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);