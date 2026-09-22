import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseBrowserClient: SupabaseClient | null = (() => {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.warn(
      "Supabase browser client not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
    return null;
  }
  return createClient(url, anonKey);
})();
