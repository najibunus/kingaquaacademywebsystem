import { createAdminClient } from "@/lib/supabase/server";
import styles from "./admins.module.css";

export default async function SuperadminAdminsPage() {
  const supabase = await createAdminClient();

  const { data: users, error } = await supabase
    .from("users")
    .select("id, role, display_name, created_at")
    .in("role", ["superadmin", "admin", "staff", "coach"])
    .order("role")
    .order("created_at");

  const roleOrder = ["superadmin", "admin", "staff", "coach"];

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Admin &amp; Staff Access</h1>
          <p className={styles.subtitle}>{users?.length ?? 0} team members with system access.</p>
        </div>
      </div>

      {error && <div className={styles.error}>⚠ Failed to load users: {error.message}</div>}

      <div className="card">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {!users || users.length === 0 ? (
              <tr><td colSpan={3} className={styles.emptyCell}>No staff users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className={styles.tableRow}>
                  <td>
                    <p className={styles.userName}>{u.display_name ?? "—"}</p>
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: u.role === "superadmin" ? "#7c3aed" : u.role === "admin" ? "var(--ka-blue)" : u.role === "staff" ? "#0891b2" : "#059669",
                      color: "white"
                    }}>{u.role}</span>
                  </td>
                  <td className={styles.muted}>{new Date(u.created_at).toLocaleDateString("en-MY")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
