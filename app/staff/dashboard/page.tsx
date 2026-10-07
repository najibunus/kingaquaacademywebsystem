import styles from "./dashboard.module.css";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function StaffDashboardPage() {
  const supabase = await createAdminClient();

  const [
    { count: taskCount },
    { count: receiptCount },
    { count: classCount },
    { data: receiptsToVerify },
    { data: pendingTasks },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "in_progress"]),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "receipt_submitted"),
    supabase
      .from("classes")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("invoices")
      .select("id, invoice_number, type, payment_status, created_at, students(name)")
      .eq("payment_status", "receipt_submitted")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, status, due_date")
      .in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Daily Operations</h1>
          <p className={styles.subtitle}>Review tasks and manage incoming parent payments.</p>
        </div>
        <Link href="/staff/invoices" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
          Invoice Queue
        </Link>
      </div>

      <div className={styles.metricsGrid}>
        {/* Metric 1 */}
        <div className="card">
          <h3 className={styles.metricLabel}>My Pending Tasks</h3>
          <div className={styles.metricValue}>
            <span className={`${styles.metricNumber} ${(taskCount ?? 0) > 0 ? styles.metricNumberDanger : ""}`}>
              {taskCount ?? 0}
            </span>
          </div>
          <p className={styles.trendTextNeutral}>
            Needs your attention
          </p>
        </div>

        {/* Metric 2 */}
        <div className="card">
          <h3 className={styles.metricLabel}>Receipts to Verify</h3>
          <div className={styles.metricValue}>
            <span className={`${styles.metricNumber} ${(receiptCount ?? 0) > 0 ? styles.metricNumberWarning : ""}`}>
              {receiptCount ?? 0}
            </span>
          </div>
          <p className={styles.trendTextNeutral}>
            Awaiting manual approval
          </p>
        </div>

        {/* Metric 3 */}
        <div className="card">
          <h3 className={styles.metricLabel}>Active Classes</h3>
          <div className={styles.metricValue}>
            <span className={styles.metricNumber}>{classCount ?? 0}</span>
          </div>
          <p className={styles.trendTextNeutral}>
            Running this season
          </p>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Left Column: Needs Attention (Invoices) */}
        <div className="card">
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Needs Attention: Receipts</h3>
            <Link href="/staff/invoices" className={styles.cardAction}>Go to Queue</Link>
          </div>
          
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Student / Invoice</th>
                  <th>Invoice Type</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!receiptsToVerify || receiptsToVerify.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={styles.emptyText}>No receipts pending verification.</td>
                  </tr>
                ) : (
                  receiptsToVerify.map((inv) => {
                    const student = inv.students as { name: string } | null;
                    return (
                      <tr key={inv.id} className={styles.tableRow}>
                        <td>
                          <div style={{fontWeight: 600}}>{student?.name ?? "Unknown"}</div>
                          <div className="text-secondary" style={{fontSize: "0.75rem"}}>{inv.invoice_number}</div>
                        </td>
                        <td>
                          {inv.type === "auto_4session" ? "4-Session" : inv.type === "auto_monthly" ? "Monthly" : "Manual"}
                        </td>
                        <td className="text-secondary">{new Date(inv.created_at).toLocaleDateString("en-MY")}</td>
                        <td>
                          <Link href={`/staff/invoices`} className="btn btn-secondary" style={{padding: "0.25rem 0.5rem", fontSize: "0.75rem"}}>Review</Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Staff Tasks */}
        <div className={`card ${styles.taskBoardCard}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>My To-Do List</h3>
            <button className="btn btn-ghost" style={{padding: "0.25rem", color: "var(--ka-blue)"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
          
          <div className={styles.taskList}>
            {!pendingTasks || pendingTasks.length === 0 ? (
              <p className={styles.emptyText}>You have no pending tasks. Great job!</p>
            ) : (
              pendingTasks.map((task) => (
                <div key={task.id} className={styles.taskItem}>
                  <div className={styles.taskHeader}>
                    <p className={styles.taskTitle}>{task.title}</p>
                    <span className={`${styles.priorityDot} ${styles.priorityMedium}`}></span>
                  </div>
                  <div className={styles.taskFooter}>
                    <p className={styles.taskDue}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString("en-MY") : "No due date"}
                    </p>
                    <button className="btn btn-ghost" style={{padding: "0.25rem 0.5rem", fontSize: "0.75rem"}}>Done</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
