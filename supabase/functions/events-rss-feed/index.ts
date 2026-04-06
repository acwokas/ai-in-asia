const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: events, error } = await supabase
      .from("events")
      .select(
        "id, title, slug, description, event_type, start_date, end_date, city, country, location, website_url, organizer, region"
      )
      .eq("status", "upcoming")
      .gte("start_date", new Date().toISOString())
      .order("start_date", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Error fetching events:", error);
      return new Response("Error fetching events", {
        status: 500,
        headers: corsHeaders,
      });
    }

    const escapeXml = (str: string | null): string => {
      if (!str) return "";
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    const now = new Date().toUTCString();

    const items = (events || [])
      .map((e: any) => {
        const link = `https://aiinasia.com/events/${e.slug}`;
        const pubDate = new Date(e.start_date).toUTCString();
        const desc = e.description
          ? escapeXml(e.description.slice(0, 300))
          : `${escapeXml(e.title)} in ${escapeXml(e.city)}, ${escapeXml(e.country)}`;

        return `    <item>
      <title>${escapeXml(e.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
      <category>${escapeXml(e.event_type)}</category>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI in Asia: Events Calendar</title>
    <link>https://aiinasia.com/events</link>
    <description>Upcoming AI events, conferences, and workshops across Asia-Pacific</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="https://aiinasia.com/events/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("RSS feed error:", err);
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    });
  }
});
