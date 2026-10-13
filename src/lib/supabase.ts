import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase é opcional: sem as variáveis o app roda 100% local.
let client: SupabaseClient | null | undefined;
export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}
export const supabaseEnabled = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
