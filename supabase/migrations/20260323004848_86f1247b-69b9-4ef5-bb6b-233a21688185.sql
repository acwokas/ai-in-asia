CREATE OR REPLACE FUNCTION public.get_total_sessions(p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN (
    SELECT COUNT(*)::integer
    FROM public.analytics_sessions
    WHERE started_at >= p_start
      AND started_at <= p_end
  );
END;
$$;