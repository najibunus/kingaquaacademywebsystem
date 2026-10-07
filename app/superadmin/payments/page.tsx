import styles from "./payments.module.css";
import { createAdminClient } from "@/lib/supabase/server";

export default async function SuperadminPaymentsPage() {
  const supabase = await createAdminClient();
  const { data: providers, error } = await supabase
    .from("payment_providers")
    .select("id, provider_name, is_active, created_at")
    .order("provider_name");

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Payment Gateways</h1>
          <p className={styles.subtitle}>Manage active payment providers. FPX integration coming soon.</p>
        </div>
      </div>

      {error && <div className={styles.error}>⚠ Failed to load providers: {error.message}</div>}

      <div className="card">
        <table className={styles.table}>
          <thead>
            <tr><th>Provider</th><th>Status</th><th>Added</th></tr>
          </thead>
          <tbody>
            {!providers || providers.length === 0 ? (
              <tr><td colSpan={3} className={styles.emptyCell}>No payment providers configured yet.</td></tr>
            ) : (
              providers.map((p) => (
                <tr key={p.id} className={styles.tableRow}>
                  <td className={styles.bold}>{p.provider_name}</td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: p.is_active ? "var(--color-success)" : "#e5e7eb",
                      color: p.is_active ? "white" : "var(--text-secondary)"
                    }}>{p.is_active ? "Active" : "Inactive"}</span>
                  </td>
                  <td className={styles.muted}>{new Date(p.created_at).toLocaleDateString("en-MY")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className={styles.note}>
          💡 Manual DuitNow/Bank Transfer is handled by staff. FPX (ToyyibPay/Billplz) will be configured here when ready.
        </p>
      </div>
    </div>
  );
}
