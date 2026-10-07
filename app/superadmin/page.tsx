import styles from "./page.module.css";
import { createAdminClient } from "@/lib/supabase/server";

export default async function SuperadminPage() {
  const supabase = await createAdminClient();

  const [
    { count: totalUsers },
    { count: totalStudents },
    { count: totalClasses },
    { data: auditLogs }
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("classes").select("*", { count: "exact", head: true }),
    supabase
      .from("audit_logs")
      .select("id, actor_role, action, entity_type, ip_address, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Health</h1>
          <p className={styles.subtitle}>Overview of the Kingaqua Academy database and infrastructure.</p>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className="card">
          <h3 className={styles.metricLabel}>Total Users</h3>
          <div className={styles.metricValue}>
            <span className={styles.metricNumber}>{totalUsers ?? 0}</span>
          </div>
          <p className={styles.statusText}>
            Registered accounts
          </p>
        </div>

        <div className="card">
          <h3 className={styles.metricLabel}>Total Students</h3>
          <div className={styles.metricValue}>
            <span className={styles.metricNumber}>{totalStudents ?? 0}</span>
          </div>
          <p className={styles.statusText}>
            Across all classes
          </p>
        </div>

        <div className="card">
          <h3 className={styles.metricLabel}>Total Classes</h3>
          <div className={styles.metricValue}>
            <span className={styles.metricNumber}>{totalClasses ?? 0}</span>
          </div>
          <p className={styles.statusText}>
            Active & Inactive
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className={styles.tableTitle}>Recent Audit Logs</h3>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {!auditLogs || auditLogs.length === 0 ? (
                <tr className={styles.tableRow}>
                  <td colSpan={5} style={{textAlign: "center", padding: "2rem", color: "var(--text-secondary)"}}>
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className={styles.tableRow}>
                    <td className="text-secondary">{new Date(log.created_at).toLocaleString("en-MY")}</td>
                    <td style={{fontWeight: 500}}>{log.actor_role}</td>
                    <td>
                      <span className={`badge ${log.action.includes('delete') ? 'badge-danger' : 'badge-secondary'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-secondary">{log.entity_type}</td>
                    <td className={styles.fontMono}>{log.ip_address ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
