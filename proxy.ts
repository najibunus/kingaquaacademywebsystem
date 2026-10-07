import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/roles";

/**
 * Role-based route protection map.
 * Keys are URL prefixes; values are allowed roles.
 * Any authenticated user can access "/" and "/auth/*".
 */
const ROLE_ROUTES: Record<string, UserRole[]> = {
  "/superadmin": ["superadmin"],
  "/admin":      ["superadmin", "admin"],
  "/staff":      ["superadmin", "admin", "staff"],
  "/coach":      ["superadmin", "admin", "staff", "coach"],
  "/parent":     ["superadmin", "admin", "staff", "parent"],
  "/api/cron":   [], // protected by CRON_SECRET header — not role-based
};

/**
 * Default redirect per role after login.
 */
const ROLE_HOME: Record<UserRole, string> = {
  superadmin: "/superadmin",
  admin:      "/admin/dashboard",
  staff:      "/staff/dashboard",
  coach:      "/coach/portal",
  parent:     "/parent/portal",
};

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — do NOT remove this.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ── Redirect unauthenticated users to login ───────────────────────────────
  const isAuthRoute = pathname.startsWith("/auth") || pathname === "/";
  if (!user && !isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ── Redirect authenticated users away from auth pages ────────────────────
  if (user && isAuthRoute && pathname !== "/") {
    const role = (user.user_metadata?.role as UserRole) ?? "parent";
    return NextResponse.redirect(
      new URL(ROLE_HOME[role] ?? "/parent/portal", request.url)
    );
  }

  // ── Redirect "/" to role home ─────────────────────────────────────────────
  if (user && pathname === "/") {
    const role = (user.user_metadata?.role as UserRole) ?? "parent";
    return NextResponse.redirect(
      new URL(ROLE_HOME[role] ?? "/parent/portal", request.url)
    );
  }

  // ── Enforce role-based access control ────────────────────────────────────
  if (user) {
    const role = (user.user_metadata?.role as UserRole) ?? "parent";
    for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(prefix)) {
        // Cron routes: checked by secret header, not user role
        if (allowedRoles.length === 0) break;

        if (!allowedRoles.includes(role)) {
          // Redirect to the user's own dashboard (forbidden)
          return NextResponse.redirect(
            new URL(ROLE_HOME[role] ?? "/parent/portal", request.url)
          );
        }
        break;
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static assets)
     * - _next/image   (image optimization)
     * - favicon.ico   (browser favicon)
     * - public/       (public directory)
     */
    "/((?!_next/static|_next/image|favicon.ico|css/|js/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|html)$).*)",
  ],
};
