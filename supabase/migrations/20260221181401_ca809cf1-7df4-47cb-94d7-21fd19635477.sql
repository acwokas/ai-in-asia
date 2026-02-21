-- Add editorial_note and is_sponsored columns to events table
ALTER TABLE public.events ADD COLUMN editorial_note text;
ALTER TABLE public.events ADD COLUMN is_sponsored boolean NOT NULL DEFAULT false;