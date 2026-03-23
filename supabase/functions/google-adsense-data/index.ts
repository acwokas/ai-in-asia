import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SERVICE = "adsense";

async function getAccessToken(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from("google_oauth_tokens")
    .select("*")
    .eq("service", SERVICE)
    .single();

  if (!data) return null;

  if (new Date(data.expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
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
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: "start_date and end_date required (YYYY-MM-DD)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // First, list accounts to get the account ID
    const accountsRes = await fetch("https://adsense.googleapis.com/v2/accounts", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const accountsData = await accountsRes.json();

    if (!accountsRes.ok || !accountsData.accounts?.length) {
      return new Response(
        JSON.stringify({ error: "No AdSense accounts found or API error", details: accountsData }),
        { status: accountsRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountName = accountsData.accounts[0].name; // e.g. "accounts/pub-XXX"

    // Fetch report
    const reportUrl = new URL(`https://adsense.googleapis.com/v2/${accountName}/reports:generate`);
    reportUrl.searchParams.set("dateRange", "CUSTOM");
    reportUrl.searchParams.set("startDate.year", startDate.split("-")[0]);
    reportUrl.searchParams.set("startDate.month", String(parseInt(startDate.split("-")[1])));
    reportUrl.searchParams.set("startDate.day", String(parseInt(startDate.split("-")[2])));
    reportUrl.searchParams.set("endDate.year", endDate.split("-")[0]);
    reportUrl.searchParams.set("endDate.month", String(parseInt(endDate.split("-")[1])));
    reportUrl.searchParams.set("endDate.day", String(parseInt(endDate.split("-")[2])));
    reportUrl.searchParams.set("metrics", "ESTIMATED_EARNINGS");
    reportUrl.searchParams.append("metrics", "IMPRESSIONS");
    reportUrl.searchParams.append("metrics", "CLICKS");
    reportUrl.searchParams.append("metrics", "PAGE_VIEWS_RPM");
    reportUrl.searchParams.append("metrics", "COST_PER_CLICK");
    reportUrl.searchParams.set("dimensions", "DATE");
    reportUrl.searchParams.set("reportingTimeZone", "ACCOUNT_TIME_ZONE");

    const reportRes = await fetch(reportUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const reportData = await reportRes.json();

    if (!reportRes.ok) {
      return new Response(
        JSON.stringify({ error: "AdSense report error", details: reportData }),
        { status: reportRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse rows — AdSense v2 returns headers + rows
    const headers = reportData.headers?.map((h: any) => h.name) || [];
    const rows = (reportData.rows || []).map((row: any) => {
      const cells = row.cells || [];
      const obj: Record<string, any> = {};
      headers.forEach((header: string, i: number) => {
        const val = cells[i]?.value;
        obj[header] = header === "DATE" ? val : parseFloat(val || "0");
      });
      return obj;
    });

    // Totals
    const totals = reportData.totals?.cells?.reduce((acc: Record<string, any>, cell: any, i: number) => {
      acc[headers[i]] = headers[i] === "DATE" ? cell.value : parseFloat(cell.value || "0");
      return acc;
    }, {}) || {};

    return new Response(
      JSON.stringify({
        connected: true,
        rows,
        totals,
        account: accountsData.accounts[0].displayName || accountName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("google-adsense-data error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
