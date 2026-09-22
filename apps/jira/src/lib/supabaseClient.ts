import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Public Supabase client for browser usage (uses anon key)
export const supabaseBrowserClient: SupabaseClient | null = (() => {
  if (typeof window === "undefined") {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // In development this will help you catch misconfiguration early.
    // In production you may want to handle this differently.

    console.warn(
      "Supabase browser client is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
    return null;
  }

  return createClient(url, anonKey);
})();
