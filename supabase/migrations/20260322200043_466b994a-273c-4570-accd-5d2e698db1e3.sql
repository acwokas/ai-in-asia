CREATE OR REPLACE FUNCTION public.get_avg_engagement(p_start timestamp with time zone, p_end timestamp with time zone)
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
    SELECT COALESCE(AVG(duration_seconds), 0)::integer
    FROM public.analytics_sessions
    WHERE started_at >= p_start
      AND started_at <= p_end
      AND duration_seconds > 0
      AND duration_seconds < 1800
  );
END;
$$;