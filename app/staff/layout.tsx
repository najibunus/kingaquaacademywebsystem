import NavLink from "@/components/NavLink";
import BrandLogo from "@/components/BrandLogo";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import styles from "./layout.module.css";

export default async function StaffLayout({
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
    displayName = email ? email.split("@")[0] : "Staff";
  }

  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "ST";

  return (
    <div className={styles.layoutContainer}>
      {/* ── Sidebar (Desktop) ── */}
      <aside className={styles.sidebar}>
        {/* Brand Area */}
        <div className={styles.brand}>
          <BrandLogo size={36} textSize="1.05rem" />
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <p className={styles.navSectionLabel}>
            Operations
          </p>
          <NavLink href="/staff/dashboard" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Dashboard
          </NavLink>
          <NavLink href="/staff/invoices" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Invoice Queue
          </NavLink>
          <NavLink href="/staff/students" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Students
          </NavLink>
          <NavLink href="/staff/parents" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Parents
          </NavLink>
          <NavLink href="/staff/games" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10"></path><path d="M5 4h14a2 2 0 0 1 2 2v2a8 8 0 0 1-8 8h0a8 8 0 0 1-8-8V6a2 2 0 0 1 2-2z"></path>
            </svg>
            Competition
          </NavLink>
          
          <p className={styles.navSectionLabel} style={{marginTop: "1.5rem"}}>
            Classes
          </p>
          <NavLink href="/staff/pricing" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Class Pricing
          </NavLink>
          <NavLink href="/staff/attendance" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Attendance
          </NavLink>
          <NavLink href="/staff/coach-schedule" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Coach Schedule
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
            <div className={styles.divider}></div>
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
          <NavLink href="/staff/dashboard" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Dashboard
          </NavLink>
          <NavLink href="/staff/invoices" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Invoices
          </NavLink>
          <NavLink href="/staff/students" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Students
          </NavLink>
          <NavLink href="/staff/parents" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Parents
          </NavLink>
          <NavLink href="/staff/attendance" className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Attendance
          </NavLink>
          <NavLink href="/staff/coach-schedule" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Coach Schedule
          </NavLink>
          <NavLink href="/staff/games" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Competition
          </NavLink>
          <NavLink href="/staff/pricing" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Pricing
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
