import NavLink from "@/components/NavLink";
import BrandLogo from "@/components/BrandLogo";
import { logoutAction } from "@/lib/actions/auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import AdminNotificationDropdown from "@/components/notifications/AdminNotificationDropdown";
import styles from "./layout.module.css";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const adminDb = await createAdminClient();

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
    displayName = email ? email.split("@")[0] : "Admin";
  }

  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AD";

  // Fetch real-time operational notifications
  const [
    { data: rawReceipts },
    { data: rawTasks },
    { count: unpaidCount },
    { data: rawStudents },
  ] = await Promise.all([
    adminDb
      .from("invoices")
      .select("id, invoice_number, payment_status, created_at, students(name)")
      .eq("payment_status", "receipt_submitted")
      .order("created_at", { ascending: false })
      .limit(5),
    adminDb
      .from("tasks")
      .select("id, title, due_date, status, created_at, assigned_user:assigned_to(display_name)")
      .in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true })
      .limit(5),
    adminDb
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "unpaid"),
    adminDb
      .from("students")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

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
            Management
          </p>
          <NavLink href="/admin/dashboard" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Dashboard
          </NavLink>
          <NavLink href="/admin/students" className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Students
          </NavLink>
          <NavLink href="/admin/students/list" exact className={styles.navLink} activeClassName={styles.navLinkActive} style={{paddingLeft: "2.5rem", fontSize: "0.875rem"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            All Students
          </NavLink>
          <NavLink href="/admin/students/import" exact className={styles.navLink} activeClassName={styles.navLinkActive} style={{paddingLeft: "2.5rem", fontSize: "0.875rem"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Import CSV
          </NavLink>

          <NavLink href="/admin/finances" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Finances
          </NavLink>
          
          <p className={styles.navSectionLabel} style={{marginTop: "1.5rem"}}>
            Operations
          </p>
          <NavLink href="/admin/classes" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Classes
          </NavLink>
          <NavLink href="/admin/pricing" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Class Pricing
          </NavLink>
          <NavLink href="/admin/staff" exact className={styles.navLink} activeClassName={styles.navLinkActive}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            Staff & Coaches
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
            <AdminNotificationDropdown
              receiptInvoices={(rawReceipts as any) ?? []}
              pendingTasks={(rawTasks as any) ?? []}
              unpaidCount={unpaidCount ?? 0}
              recentStudents={(rawStudents as any) ?? []}
            />
            <div className={styles.divider}></div>
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
          <NavLink href="/admin/dashboard" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Dashboard
          </NavLink>
          <NavLink href="/admin/students" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Students
          </NavLink>
          <NavLink href="/admin/students/list" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            All Students
          </NavLink>
          <NavLink href="/admin/students/import" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Import CSV
          </NavLink>
          <NavLink href="/admin/finances" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Finances
          </NavLink>
          <NavLink href="/admin/classes" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Classes
          </NavLink>
          <NavLink href="/admin/pricing" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Pricing
          </NavLink>
          <NavLink href="/admin/staff" exact className={styles.mobileNavLink} activeClassName={styles.mobileNavLinkActive}>
            Staff &amp; Coaches
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
