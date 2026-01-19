import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Category = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
};

function extractText(value: unknown, maxChars = 6000): string {
  const out: string[] = [];
  const seen = new Set<unknown>();

  const push = (s: string) => {
    if (!s) return;
    const trimmed = s.replace(/\s+/g, " ").trim();
    if (!trimmed) return;
    out.push(trimmed);
  };

  const walk = (v: unknown) => {
    if (out.join(" ").length >= maxChars) return;
    if (v === null || v === undefined) return;
    if (typeof v === "string") return push(v);
    if (typeof v === "number" || typeof v === "boolean") return;
    if (typeof v !== "object") return;
    if (seen.has(v)) return;
    seen.add(v);

    if (Array.isArray(v)) {
      for (const item of v) walk(item);
      return;
    }

    const obj = v as Record<string, unknown>;
    // Common rich-text keys
    for (const key of ["text", "content", "value", "title", "heading", "caption", "alt"]) {
      const maybe = obj[key];
      if (typeof maybe === "string") push(maybe);
    }

    for (const k in obj) walk(obj[k]);
  };

  walk(value);
  return out.join(" \n").slice(0, maxChars);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articleId, articleTitle, articleExcerpt, articleContent, categories } = await req.json();

    if (!articleId || !articleTitle) {
      return new Response(JSON.stringify({ error: "articleId and articleTitle are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return new Response(JSON.stringify({ error: "categories array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: verify_jwt=true in config, but we still sanity-check we have a user.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? "",
        },
      },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow, error: roleErr } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleErr) {
      console.error("role check error", roleErr);
      return new Response(JSON.stringify({ error: "Role check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const contentText = extractText(articleContent, 5000);
    const excerptText = typeof articleExcerpt === "string" ? articleExcerpt : "";

    const categoriesSafe: Category[] = (categories as Category[])
      .filter((c) => c && typeof c.id === "string" && typeof c.name === "string")
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug ?? null,
        description: c.description ?? null,
      }));

    const tool = {
      type: "function",
      function: {
        name: "pick_category",
        description: "Pick the best matching category for the article from the provided list.",
        parameters: {
          type: "object",
          properties: {
            categoryId: { type: "string", description: "The id of the chosen category" },
            categoryName: { type: "string", description: "The name of the chosen category" },
            confidence: { type: "number", description: "0 to 1" },
            reason: { type: "string", description: "One short reason" },
          },
          required: ["categoryId", "categoryName", "confidence", "reason"],
          additionalProperties: false,
        },
      },
    };

    const systemPrompt =
      "You are an editor maintaining a news site's category taxonomy. " +
      "Choose exactly ONE best category from the provided list for the given article. " +
      "Prefer the most specific category that fits. If uncertain, still choose the closest match and set low confidence.";

    const userPrompt = `Article:\nTitle: ${articleTitle}\nExcerpt: ${excerptText || "(none)"}\n\nContent (may be truncated):\n${contentText || "(no content)"}\n\nCategories (choose ONE):\n${categoriesSafe
      .map((c) => `- ${c.name} (id: ${c.id})${c.slug ? `, slug: ${c.slug}` : ""}${c.description ? ` — ${c.description}` : ""}`)
      .join("\n")}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "pick_category" } },
        temperature: 0.2,
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);

      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required. Please add credits and retry." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI categorization failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const msg = aiData.choices?.[0]?.message;

    const toolCall = msg?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;

    let picked: { categoryId: string; categoryName: string; confidence: number; reason: string } | null = null;

    if (typeof argsStr === "string") {
      try {
        picked = JSON.parse(argsStr);
      } catch (e) {
        console.error("Failed to parse tool arguments", e, argsStr);
      }
    }

    if (!picked) {
      // Fallback: pick first category
      const first = categoriesSafe[0];
      picked = {
        categoryId: first.id,
        categoryName: first.name,
        confidence: 0.1,
        reason: "Fallback selection (tool call missing).",
      };
    }

    // Validate against provided list
    const match = categoriesSafe.find((c) => c.id === picked!.categoryId) ??
      categoriesSafe.find((c) => c.name.toLowerCase() === picked!.categoryName.toLowerCase());

    if (!match) {
      const first = categoriesSafe[0];
      return new Response(
        JSON.stringify({
          categoryId: first.id,
          categoryName: first.name,
          confidence: 0.1,
          reason: "Chosen category not found in list; fell back to first.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        categoryId: match.id,
        categoryName: match.name,
        confidence: picked!.confidence,
        reason: picked!.reason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("assign-article-category error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
