import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

function cleanEnv(val: string | undefined): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
}

/**
 * Supabase browser client.
 * Use this in Client Components ("use client") only.
 */
export function createClient() {
  return createBrowserClient<Database>(
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}
