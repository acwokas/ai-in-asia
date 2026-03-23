import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERVICE = "search_console";
const SEARCH_ANALYTICS_URL = "https://www.googleapis.com/webmasters/v3/sites";

async function getAccessToken(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from("google_oauth_tokens")
    .select("*")
    .eq("service", SERVICE)
    .single();

  if (!data) return null;

  // Check if token is expired (with 5 min buffer)
  if (new Date(data.expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
    // Refresh token
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: data.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const tokenData = await res.json();
    if (!res.ok) return null;

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
    await supabase
      .from("google_oauth_tokens")
      .update({ access_token: tokenData.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
      .eq("service", SERVICE);

    return tokenData.access_token;
  }

  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const accessToken = await getAccessToken(supabase);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Not connected", connected: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const siteUrl = url.searchParams.get("site_url") || "sc-domain:aiinasia.com";
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const dimension = url.searchParams.get("dimension") || "query"; // query, page, date

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: "start_date and end_date are required (YYYY-MM-DD)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = `${SEARCH_ANALYTICS_URL}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

    const body: any = {
      startDate,
      endDate,
      dimensions: [dimension],
      rowLimit: 25,
    };

    // For date dimension, we want the trend
    if (dimension === "date") {
      body.rowLimit = 90;
    }

    const gscRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const gscData = await gscRes.json();

    if (!gscRes.ok) {
      return new Response(
        JSON.stringify({ error: "Search Console API error", details: gscData }),
        { status: gscRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform rows
    const rows = (gscData.rows || []).map((row: any) => ({
      key: row.keys?.[0] || "",
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: Math.round((row.ctr || 0) * 10000) / 100, // percentage
      position: Math.round((row.position || 0) * 10) / 10,
    }));

    return new Response(
      JSON.stringify({
        connected: true,
        rows,
        totals: {
          clicks: rows.reduce((s: number, r: any) => s + r.clicks, 0),
          impressions: rows.reduce((s: number, r: any) => s + r.impressions, 0),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("google-search-console error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
