import NavLink from "@/components/NavLink";
import BrandLogo from "@/components/BrandLogo";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import styles from "./layout.module.css";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? "";
  
  let displayName = user?.user_metadata?.display_name || "";
  let avatarUrl: string | null = null;

  if (user?.id) {
    const { data: profile } = await supabase
      .from("users")
      .select("display_name, avatar_url")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (profile?.display_name) displayName = profile.display_name;
    if (profile?.avatar_url) avatarUrl = profile.avatar_url;
  }

  if (!displayName) {
    displayName = email ? email.split("@")[0] : "Superadmin";
  }

  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "SA";

  return (
    <div className={styles.layoutContainer}>
      {/* ── Sidebar (Desktop) ── */}
      <aside className={styles.sidebar}>
        {/* Brand Area */}
        <div className={styles.brand}>
          <BrandLogo size={36} textSize="1.05rem" textColor="#ffffff" />
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <p className={styles.navSectionLabel}>
            Superadmin
          </p>
          <NavLink href="/superadmin" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
            </svg>
            System Health
          </NavLink>
          <NavLink href="/superadmin/users" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
            User Management
          </NavLink>
          <NavLink href="/superadmin/payments" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Payment Gateways
          </NavLink>
          <NavLink href="/superadmin/audit" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Audit Logs
          </NavLink>
          <NavLink href="/superadmin/admins" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Admin Access
          </NavLink>
        </nav>

        {/* User / Logout */}
        <div className={styles.logoutArea}>
          <form action={logoutAction}>
            <button className={styles.logoutBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className={styles.mainContent}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <BrandLogo size={30} textSize="0.95rem" />
          </div>
          <div className={styles.userProfile}>
            <span className={styles.userEmail} title={email}>{email || displayName}</span>
            <form action={logoutAction} className={styles.mobileLogoutForm}>
              <button type="submit" className={styles.mobileLogoutBtn}>
                Sign Out
              </button>
            </form>
            <div className={styles.avatar} style={{ overflow: "hidden" }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                initials
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Strip */}
        <nav className={styles.mobileNav}>
          <NavLink href="/superadmin" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            System Health
          </NavLink>
          <NavLink href="/superadmin/users" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            User Management
          </NavLink>
          <NavLink href="/superadmin/payments" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Payment Gateways
          </NavLink>
          <NavLink href="/superadmin/audit" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Audit Logs
          </NavLink>
          <NavLink href="/superadmin/admins" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Admin Access
          </NavLink>
        </nav>

        {/* Page Content */}
        <div className={styles.pageContainer}>
          {children}
        </div>
      </main>
    </div>
  );
}
