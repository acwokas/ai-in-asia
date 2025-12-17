-- Create an admin-only helper to compute unique visitors without the REST row-limit cap
CREATE OR REPLACE FUNCTION public.get_unique_visitors(p_start timestamptz, p_end timestamptz)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN (
    SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id))::integer
    FROM public.analytics_sessions
    WHERE started_at >= p_start
      AND started_at <= p_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_unique_visitors(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unique_visitors(timestamptz, timestamptz) TO authenticated;