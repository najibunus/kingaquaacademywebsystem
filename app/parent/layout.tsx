import NavLink from "@/components/NavLink";
import { logoutAction } from "@/lib/actions/auth";
import styles from "./layout.module.css";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.layoutContainer} min-h-screen w-full max-w-[100vw] flex flex-col bg-[#F8FAFC] box-border`}>
      {/* ── Mobile Topbar ── */}
      <header className={`${styles.mobileTopbar} flex flex-row justify-between items-center w-full px-4 py-3 box-border`}>
        <div className={styles.brandMobile}>
          <div className={styles.logoIconMobile}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 14c2-2 4-3 6-2l4 2c2 1 4 1 6-1" />
              <path d="M6 18c1.5-1 3-1.5 4.5-1l2 1c1.5.5 3 .5 4.5-1" opacity="0.6" />
            </svg>
          </div>
          <span className={styles.brandNameMobile}>Kingaqua</span>
        </div>
        <div className={`${styles.avatarMobile} h-8 w-8 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center`}>PA</div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.brandDesktop}>
          <div className={styles.logoIconMobile}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 14c2-2 4-3 6-2l4 2c2 1 4 1 6-1" />
              <path d="M6 18c1.5-1 3-1.5 4.5-1l2 1c1.5.5 3 .5 4.5-1" opacity="0.6" />
            </svg>
          </div>
          <span className={styles.brandNameMobile}>Kingaqua</span>
        </div>

        <nav className={styles.navDesktop}>
          <NavLink href="/parent/portal" exact className={styles.navLinkDesktop} activeClassName={styles.navLinkDesktopActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Dashboard
          </NavLink>
          <NavLink href="/parent/invoices" exact className={styles.navLinkDesktop} activeClassName={styles.navLinkDesktopActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Payments
          </NavLink>
          <NavLink href="/parent/evaluations" exact className={styles.navLinkDesktop} activeClassName={styles.navLinkDesktopActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Evaluations
          </NavLink>
          <NavLink href="/parent/games" exact className={styles.navLinkDesktop} activeClassName={styles.navLinkDesktopActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10"></path><path d="M5 4h14a2 2 0 0 1 2 2v2a8 8 0 0 1-8 8h0a8 8 0 0 1-8-8V6a2 2 0 0 1 2-2z"></path>
            </svg>
            Competition
          </NavLink>
          <NavLink href="/parent/settings" exact className={styles.navLinkDesktop} activeClassName={styles.navLinkDesktopActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
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
          <h2 className={styles.topbarTitle}>Parent Portal</h2>
          <div className={styles.userProfile}>
            <span className={styles.userEmail}>parent@kingaqua.test</span>
            <div className={styles.avatarMobile} style={{width: "36px", height: "36px"}}>PA</div>
          </div>
        </header>

        {/* Page Content */}
        <div className={`${styles.pageContainer} pb-20 w-full max-w-[100vw] overflow-x-hidden px-4 box-border`}>
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className={`${styles.bottomNav} fixed bottom-0 left-0 right-0 w-full max-w-[100vw] box-border z-50 bg-white flex justify-around items-center px-2 md:hidden`}>
        <NavLink href="/parent/portal" exact className={styles.navLinkMobile} activeClassName={styles.navLinkMobileActive}>
          <svg className={styles.navIconMobile} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Children
        </NavLink>
        <NavLink href="/parent/invoices" exact className={styles.navLinkMobile} activeClassName={styles.navLinkMobileActive}>
          <svg className={styles.navIconMobile} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          Payments
        </NavLink>
        <NavLink href="/parent/evaluations" exact className={styles.navLinkMobile} activeClassName={styles.navLinkMobileActive}>
          <svg className={styles.navIconMobile} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Evaluation
        </NavLink>
        <NavLink href="/parent/games" exact className={styles.navLinkMobile} activeClassName={styles.navLinkMobileActive}>
          <svg className={styles.navIconMobile} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10"></path><path d="M5 4h14a2 2 0 0 1 2 2v2a8 8 0 0 1-8 8h0a8 8 0 0 1-8-8V6a2 2 0 0 1 2-2z"></path>
          </svg>
          Competition
        </NavLink>
        <NavLink href="/parent/settings" exact className={styles.navLinkMobile} activeClassName={styles.navLinkMobileActive}>
          <svg className={styles.navIconMobile} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          Settings
        </NavLink>
      </nav>
    </div>
  );
}
