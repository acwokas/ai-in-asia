
CREATE TABLE public.event_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location TEXT NOT NULL,
  is_virtual BOOLEAN NOT NULL DEFAULT false,
  is_hybrid BOOLEAN NOT NULL DEFAULT false,
  event_type TEXT NOT NULL,
  region TEXT NOT NULL,
  expected_attendance INTEGER,
  ticket_price TEXT,
  description TEXT,
  submitter_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_event_id UUID REFERENCES public.events(id)
);

ALTER TABLE public.event_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit
CREATE POLICY "Anyone can submit events"
  ON public.event_submissions
  FOR INSERT
  WITH CHECK (true);

-- Admins can do everything
CREATE POLICY "Admins can manage submissions"
  ON public.event_submissions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
