import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch sources due for harvest
    const { data: sources, error: sourcesError } = await supabase
      .from('trusted_sources')
      .select('*')
      .eq('is_active', true);

    if (sourcesError) throw sourcesError;

    const now = new Date();
    const dueForHarvest = (sources || []).filter((source: any) => {
      if (!source.last_harvested_at) return true;
      const lastHarvest = new Date(source.last_harvested_at);
      const hoursSince = (now.getTime() - lastHarvest.getTime()) / (1000 * 60 * 60);
      return hoursSince >= source.harvest_frequency_hours;
    });

    console.log(`Found ${dueForHarvest.length} sources due for harvest`);

    let totalInserted = 0;
    let totalErrors = 0;

    for (const source of dueForHarvest) {
      try {
        console.log(`Harvesting: ${source.name}`);

        const response = await fetch(source.rss_url, {
          headers: {
            'User-Agent': 'AIinASIA-LinkHarvester/1.0',
            'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${source.name}: ${response.status}`);
          totalErrors++;
          continue;
        }

        const xml = await response.text();
        const entries = parseRSSEntries(xml, source);

        if (entries.length > 0) {
          const { error: insertError } = await supabase
            .from('external_links')
            .upsert(
              entries.map((e: RSSEntry) => ({
                url: e.url,
                title: e.title,
                source_name: source.name,
                domain: source.domain,
                published_at: e.publishedAt,
                category: source.category,
                region: source.region,
              })),
              { onConflict: 'url', ignoreDuplicates: true }
            );

          if (insertError) {
            console.error(`Insert error for ${source.name}:`, insertError);
          } else {
            totalInserted += entries.length;
          }
        }

        // Update last_harvested_at
        await supabase
          .from('trusted_sources')
          .update({ last_harvested_at: now.toISOString() })
          .eq('id', source.id);

      } catch (sourceError) {
        console.error(`Error harvesting ${source.name}:`, sourceError);
        totalErrors++;
      }
    }

    // Cleanup: remove links older than 90 days
    const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('external_links')
      .delete()
      .lt('created_at', cutoff);

    return new Response(
      JSON.stringify({
        sourcesChecked: dueForHarvest.length,
        linksInserted: totalInserted,
        errors: totalErrors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Harvest error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface RSSEntry {
  title: string;
  url: string;
  publishedAt: string | null;
}

function parseRSSEntries(xml: string, source: any): RSSEntry[] {
  const entries: RSSEntry[] = [];

  try {
    // Try RSS 2.0 format
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const item = match[1];
      const title = extractTag(item, 'title');
      const link = extractTag(item, 'link') || extractAtomLink(item);
      const pubDate = extractTag(item, 'pubDate') || extractTag(item, 'dc:date') || extractTag(item, 'published');

      if (title && link && link.startsWith('http')) {
        entries.push({
          title: cleanTitle(title),
          url: link.trim(),
          publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
        });
      }
    }

    // Try Atom format if no RSS items found
    if (entries.length === 0) {
      const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;

      while ((match = entryRegex.exec(xml)) !== null) {
        const entry = match[1];
        const title = extractTag(entry, 'title');
        const link = extractAtomLink(entry) || extractTag(entry, 'link');
        const published = extractTag(entry, 'published') || extractTag(entry, 'updated');

        if (title && link && link.startsWith('http')) {
          entries.push({
            title: cleanTitle(title),
            url: link.trim(),
            publishedAt: published ? new Date(published).toISOString() : null,
          });
        }
      }
    }
  } catch (parseError) {
    console.error(`Parse error for ${source.name}:`, parseError);
  }

  return entries.slice(0, 20);
}

function extractTag(xml: string, tagName: string): string | null {
  const cdataRegex = new RegExp(`<${tagName}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tagName}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractAtomLink(xml: string): string | null {
  const linkRegex = /<link[^>]*href=["']([^"']+)["'][^>]*(?:rel=["']alternate["'][^>]*)?\/?\s*>/i;
  const match = xml.match(linkRegex);
  return match ? match[1] : null;
}

function cleanTitle(title: string): string {
  return title
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
