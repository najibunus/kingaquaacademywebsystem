import NavLink from "@/components/NavLink";
import { logoutAction } from "@/lib/actions/auth";
import styles from "./layout.module.css";

export default function StaffLayout({
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
          <h2 className={styles.topbarTitle}>Staff Operations</h2>
          <div className={styles.userProfile}>
            <span className={styles.userEmail}>staff@kingaqua.test</span>
            <div className={styles.divider}></div>
            <div className={styles.avatar}>ST</div>
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
