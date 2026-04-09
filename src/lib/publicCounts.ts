const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type PublicCountFilters = Record<string, string | number | boolean>;

export const fetchPublicCount = async (
  table: string,
  filters: PublicCountFilters = {},
): Promise<number> => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set("select", "*");

  Object.entries(filters).forEach(([key, value]) => {
    url.searchParams.set(key, `eq.${String(value)}`);
  });

  const response = await fetch(url.toString(), {
    method: "HEAD",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "count=exact",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch count for ${table}: ${response.status}`);
  }

  const contentRange = response.headers.get("content-range");
  const total = contentRange?.split("/")[1];
  const count = total ? Number(total) : 0;

  return Number.isFinite(count) ? count : 0;
};