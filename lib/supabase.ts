import { createClient, SupabaseClient } from "@supabase/supabase-js";
let instance: SupabaseClient | null = null;
export function browserDB() {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  instance = createClient(url, key);
  return instance;
}
