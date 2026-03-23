import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const REDIRECT_URI = "https://aiinasia.com/admin/analytics/oauth-callback";

const SERVICE_SCOPES: Record<string, string[]> = {
  search_console: ["https://www.googleapis.com/auth/webmasters.readonly"],
  adsense: ["https://www.googleapis.com/auth/adsense.readonly"],
  analytics: ["https://www.googleapis.com/auth/analytics.readonly"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Google OAuth credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: AUTHORIZE ──────────────────────────────────────────
    if (action === "authorize") {
      const service = url.searchParams.get("service");
      if (!service || !SERVICE_SCOPES[service]) {
        return new Response(
          JSON.stringify({ error: "Invalid service. Use: search_console, adsense, or analytics" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scopes = SERVICE_SCOPES[service].join(" ");
      const state = service; // pass service name through state param

      const authUrl = new URL(GOOGLE_AUTH_URL);
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: CALLBACK ───────────────────────────────────────────
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state"); // service name
      const error = url.searchParams.get("error");

      if (error) {
        return new Response(
          JSON.stringify({ error: `OAuth error: ${error}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!code || !state) {
        return new Response(
          JSON.stringify({ error: "Missing code or state parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        return new Response(
          JSON.stringify({ error: "Token exchange failed", details: tokenData }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

      // Store tokens using service role
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: upsertError } = await supabase
        .from("google_oauth_tokens")
        .upsert(
          {
            service: state,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "service" }
        );

      if (upsertError) {
        return new Response(
          JSON.stringify({ error: "Failed to store tokens", details: upsertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, service: state }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: REFRESH ────────────────────────────────────────────
    if (action === "refresh") {
      const service = url.searchParams.get("service");
      if (!service) {
        return new Response(
          JSON.stringify({ error: "Missing service parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: tokenRow, error: fetchErr } = await supabase
        .from("google_oauth_tokens")
        .select("*")
        .eq("service", service)
        .single();

      if (fetchErr || !tokenRow) {
        return new Response(
          JSON.stringify({ error: "No tokens found for this service" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: tokenRow.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        return new Response(
          JSON.stringify({ error: "Token refresh failed", details: tokenData }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

      await supabase
        .from("google_oauth_tokens")
        .update({
          access_token: tokenData.access_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("service", service);

      return new Response(
        JSON.stringify({ success: true, access_token: tokenData.access_token, expires_at: expiresAt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACTION: STATUS ─────────────────────────────────────────────
    if (action === "status") {
      // Verify admin via JWT
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data, error: claimsErr } = await supabase.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );
      if (claimsErr || !data?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use service role to read tokens
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: tokens } = await adminClient
        .from("google_oauth_tokens")
        .select("service,expires_at,updated_at");

      const connected: Record<string, boolean> = {};
      for (const t of tokens ?? []) {
        connected[t.service] = true;
      }

      return new Response(JSON.stringify({ connected }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: authorize, callback, refresh, or status" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("google-oauth error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
