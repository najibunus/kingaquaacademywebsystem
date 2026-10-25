import NavLink from "@/components/NavLink";
import BrandLogo from "@/components/BrandLogo";
import { logoutAction } from "@/lib/actions/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import styles from "./layout.module.css";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const email = user?.email ?? "coach@kingaqua.test";

  const supabase = await createAdminClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("display_name, avatar_url")
    .eq("auth_id", user?.id ?? "")
    .single();

  const uRow = userRow as any;
  const name = uRow?.display_name ?? "Coach";
  const avatarUrl = uRow?.avatar_url ?? null;
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <div className={styles.layoutContainer}>
      {/* ── Mobile Topbar ── */}
      <header className={styles.mobileTopbar}>
        <BrandLogo size={32} textSize="0.95rem" />
        <div className={styles.avatarMobile} style={{ overflow: "hidden" }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials
          )}
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.brandDesktop}>
          <BrandLogo size={36} textSize="1.05rem" />
        </div>

        <nav className={styles.navDesktop}>
          <NavLink href="/coach/portal" exact className={styles.navLinkDesktop} activeClassName={styles.navLinkDesktopActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            My Schedule
          </NavLink>
          <NavLink href="/coach/students" exact className={styles.navLinkDesktop} activeClassName={styles.navLinkDesktopActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            My Classes
          </NavLink>
          <NavLink href="/coach/evaluations" exact className={styles.navLinkDesktop} activeClassName={styles.navLinkDesktopActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Evaluations
          </NavLink>
          <NavLink href="/coach/profile" exact className={styles.navLinkDesktop} activeClassName={styles.navLinkDesktopActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </NavLink>
        </nav>
        
        <div style={{padding: "var(--space-4)", borderTop: "1px solid var(--border-gray)"}}>
          <form action={logoutAction}>
            <button className={styles.navLinkDesktop} style={{width: "100%", background: "none", border: "none", cursor: "pointer"}}>
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
        {/* Desktop Topbar */}
        <header className={styles.desktopTopbar}>
          <h2 className={styles.topbarTitle}>Coach Portal</h2>
          <div className={styles.userProfile}>
            <span className={styles.userEmail}>{email}</span>
            <div className={styles.avatarMobile} style={{ width: "36px", height: "36px", overflow: "hidden" }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                initials
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className={styles.pageContainer}>
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className={styles.bottomNav}>
        <NavLink href="/coach/portal" exact className={styles.navLinkMobile} activeClassName={styles.navLinkMobileActive}>
          <svg className={styles.navIconMobile} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Schedule
        </NavLink>
        <NavLink href="/coach/students" exact className={styles.navLinkMobile} activeClassName={styles.navLinkMobileActive}>
          <svg className={styles.navIconMobile} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Classes
        </NavLink>
        <NavLink href="/coach/evaluations" exact className={styles.navLinkMobile} activeClassName={styles.navLinkMobileActive}>
          <svg className={styles.navIconMobile} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Evaluations
        </NavLink>
        <NavLink href="/coach/profile" exact className={styles.navLinkMobile} activeClassName={styles.navLinkMobileActive}>
          <svg className={styles.navIconMobile} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
          </svg>
          Profile
        </NavLink>
        <form action={logoutAction} style={{display: "flex", flex: 1, height: "100%"}}>
          <button className={styles.navLinkMobile} style={{width: "100%", background: "none", border: "none", cursor: "pointer"}}>
            <svg className={styles.navIconMobile} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </form>
      </nav>
    </div>
  );
}

