import { createAdminClient } from "@/lib/supabase/server";
import styles from "./dashboard.module.css";
import Link from "next/link";
import AdminTaskBoardClient, { TaskItem } from "@/components/tasks/AdminTaskBoardClient";
import { TeamMember } from "@/components/tasks/AssignTaskModal";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createAdminClient();

  // ── Real data fetches ─────────────────────────────────────────
  const [
    { count: studentCount },
    { count: pendingInvoiceCount },
    { count: classCount },
    { data: recentInvoices },
    { data: rawTasks },
    { data: rawTeamMembers },
  ] = await Promise.all([
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "unpaid"),
    supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("invoices")
      .select("invoice_number, type, payment_status, created_at, students(name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select(`
        id, title, description, status, is_pinned, due_date, created_at,
        assigned_user:assigned_to ( id, display_name, role, avatar_url ),
        creator:created_by ( id, display_name )
      `)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("users")
      .select("id, display_name, role, avatar_url")
      .in("role", ["staff", "coach"])
      .eq("is_active", true)
      .order("display_name", { ascending: true }),
  ]);

  const tasks = (rawTasks as unknown as TaskItem[]) ?? [];
  const teamMembers = (rawTeamMembers as unknown as TeamMember[]) ?? [];

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.subtitle}>Here&apos;s what&apos;s happening at Kingaqua Academy.</p>
        </div>
        <div className={styles.actionButtons}>
          <Link href="/admin/students/import" className="btn btn-secondary">
            Import CSV
          </Link>
          <Link href="/admin/students/list" className="btn btn-primary">
            <svg className={styles.actionBtnIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            View Students
          </Link>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className="card">
          <h3 className={styles.metricLabel}>Active Students</h3>
          <div className={styles.metricValue}>
            <span className={styles.metricNumber}>{studentCount ?? 0}</span>
          </div>
          <p className={`${styles.trendText} ${styles.trendTextNeutral}`}>
            Enrolled and active
          </p>
        </div>

        <div className="card">
          <h3 className={styles.metricLabel}>Active Classes</h3>
          <div className={styles.metricValue}>
            <span className={styles.metricNumber}>{classCount ?? 0}</span>
          </div>
          <p className={`${styles.trendText} ${styles.trendTextNeutral}`}>
            Running this season
          </p>
        </div>

        <div className="card">
          <h3 className={styles.metricLabel}>Unpaid Invoices</h3>
          <div className={styles.metricValue}>
            <span className={`${styles.metricNumber} ${(pendingInvoiceCount ?? 0) > 0 ? styles.metricNumberDanger : ""}`}>
              {pendingInvoiceCount ?? 0}
            </span>
          </div>
          <p className={`${styles.trendText} ${styles.trendTextNeutral}`}>
            Awaiting parent payment
          </p>
        </div>

        <div className="card">
          <h3 className={styles.metricLabel}>Staff Tasks</h3>
          <div className={styles.metricValue}>
            <span className={styles.metricNumber}>
              {tasks.filter((t) => t.status !== "done").length}
            </span>
          </div>
          <p className={`${styles.trendText} ${styles.trendTextNeutral}`}>
            Pending team assignments
          </p>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Left Column: Recent Invoices & Quick Links */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {/* Recent Invoices */}
          <div className="card">
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Recent Invoices</h3>
              <Link href="/admin/finances" className={styles.cardAction}>View all</Link>
            </div>

            {recentInvoices && recentInvoices.length > 0 ? (
              <div className={styles.paymentList}>
                {recentInvoices.map((inv) => {
                  const student = inv.students as any;
                  return (
                    <div key={inv.invoice_number} className={styles.paymentItem}>
                      <div className={styles.paymentInfo}>
                        <div className={styles.paymentAvatar}>
                          {student?.name?.charAt(0) ?? "?"}
                        </div>
                        <div>
                          <p className={styles.paymentName}>{student?.name ?? "Unknown Student"}</p>
                          <p className={styles.paymentDetails}>
                            {inv.invoice_number} &bull;{" "}
                            {inv.type === "auto_4session" ? "4-Session" : inv.type === "auto_monthly" ? "Monthly" : "Manual"}
                          </p>
                        </div>
                      </div>
                      <div className={styles.paymentAmount}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              inv.payment_status === "confirmed_paid"
                                ? "var(--color-success)"
                                : inv.payment_status === "receipt_submitted"
                                ? "#f59e0b"
                                : "#e5e7eb",
                            color:
                              inv.payment_status === "confirmed_paid" || inv.payment_status === "receipt_submitted"
                                ? "white"
                                : "var(--text-secondary)",
                          }}
                        >
                          {inv.payment_status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={styles.emptyText}>No invoices generated yet.</p>
            )}
          </div>

          {/* Quick Links */}
          <div className="card">
            <div className={styles.cardHeader} style={{ marginBottom: "12px" }}>
              <h3 className={styles.cardTitle}>Quick Links</h3>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "10px",
              }}
            >
              <Link href="/admin/staff" className={styles.quickActionItem}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Staff &amp; Coaches</span>
                <svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
              <Link href="/admin/classes" className={styles.quickActionItem}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span>Manage Classes</span>
                <svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
              <Link href="/admin/students/list" className={styles.quickActionItem}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span>View Students</span>
                <svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
              <Link href="/admin/finances" className={styles.quickActionItem}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                <span>Review Finances</span>
                <svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Staff Tasks & Assignments */}
        <div>
          <AdminTaskBoardClient tasks={tasks} teamMembers={teamMembers} />
        </div>
      </div>
    </div>
  );
}
