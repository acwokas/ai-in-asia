import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const EMPTY_STATUS = { connected: {} as Record<string, boolean> };

export function useGoogleOAuthStatus() {
  return useQuery({
    queryKey: ["google-oauth-status"],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return EMPTY_STATUS;

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/google-oauth?action=status`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!res.ok) return EMPTY_STATUS;
        const json = await res.json();
        return { connected: json?.connected ?? {} };
      } catch {
        return EMPTY_STATUS;
      }
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export async function startGoogleOAuth(service: "search_console" | "adsense" | "analytics") {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/google-oauth?action=authorize&service=${service}`
  );
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  }
}
