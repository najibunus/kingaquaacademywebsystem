import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

/**
 * Supabase server client (with cookie-based session).
 * Use this in Server Components, Route Handlers, and Server Actions.
 * Reads the session from the request cookies — auth state is automatically
 * handled by the middleware.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can throw in Server Components — the middleware
            // handles refreshing the session instead.
          }
        },
      },
    }
  );
}

/**
 * Supabase admin client (bypasses RLS).
 * SERVER-SIDE ONLY. Never call from Client Components.
 * Uses the service_role key — treat like a root password.
 */
export async function createAdminClient() {
  const { createClient: createSupabaseAdminClient } = await import(
    "@supabase/supabase-js"
  );
  return createSupabaseAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
