import { createAdminClient } from "@/lib/supabase/server";
import styles from "./audit.module.css";

export default async function SuperadminAuditPage() {
  const supabase = await createAdminClient();

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("id, actor_role, action, entity_type, entity_id, ip_address, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit Logs</h1>
          <p className={styles.subtitle}>Last 50 recorded system events.</p>
        </div>
      </div>

      {error && <div className={styles.error}>⚠ Failed to load logs: {error.message}</div>}

      <div className="card">
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor Role</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {!logs || logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>No audit logs recorded yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className={styles.tableRow}>
                    <td className={styles.muted}>{new Date(log.created_at).toLocaleString("en-MY")}</td>
                    <td className={styles.bold}>{log.actor_role}</td>
                    <td><span className="badge badge-secondary">{log.action}</span></td>
                    <td className={styles.muted}>{log.entity_type}</td>
                    <td className={styles.mono}>{log.ip_address ?? "—"}</td>
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
