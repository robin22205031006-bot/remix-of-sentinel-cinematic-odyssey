import { createClient } from '@supabase/supabase-js';

// Same public Lovable backend fallback as integrations/supabase/client so a
// missing env var at build time can never crash the app on load.
const supabaseUrl =
  import.meta.env["VITE_SUPABASE_URL"] ||
  "https://c--003cbc84-1f37-48c5-886f-4a215a227e32-prod.lovable.cloud";
const supabaseAnonKey =
  import.meta.env["VITE_SUPABASE_ANON_KEY"] ||
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  "sb_publishable_bMvuynRqotDNoiSZT00XZw_dZ1JSvuB";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);