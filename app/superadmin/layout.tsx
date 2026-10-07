import NavLink from "@/components/NavLink";
import { logoutAction } from "@/lib/actions/auth";
import styles from "./layout.module.css";

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layoutContainer}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        {/* Brand Area */}
        <div className={styles.brand}>
          <div className={styles.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 14c2-2 4-3 6-2l4 2c2 1 4 1 6-1" />
              <path d="M6 18c1.5-1 3-1.5 4.5-1l2 1c1.5.5 3 .5 4.5-1" opacity="0.6" />
            </svg>
          </div>
          <span className={styles.brandName}>Kingaqua</span>
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
          <h2 className={styles.topbarTitle}>Superadmin Controls</h2>
          <div className={styles.userProfile}>
            <span className={styles.userEmail}>superadmin@kingaqua.test</span>
            <div className={styles.avatar}></div>
          </div>
        </header>

        {/* Page Content */}
        <div className={styles.pageContainer}>
          {children}
        </div>
      </main>
    </div>
  );
}
