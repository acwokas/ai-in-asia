// Server-side Supabase client — no localStorage, no browser APIs.
// Used only in .astro server pages and API endpoints.
import { createClient } from '@supabase/supabase-js';

export function createServerClient(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
