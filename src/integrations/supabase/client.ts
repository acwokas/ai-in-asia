import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrYWNxbGpvZ3NzcmV5Y3Vtb2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDU4ODIsImV4cCI6MjA5MjE4MTg4Mn0.1Ru2w_4NG1a7koKYPmr4uQUACYE34YBsKkPwZIhMWBE';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ukacqljogssreycumocn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ANON_KEY_FALLBACK;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});