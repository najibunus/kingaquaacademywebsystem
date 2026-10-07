import { createAdminClient } from "@/lib/supabase/server";
import styles from "./classes.module.css";
import Link from "next/link";

export default async function AdminClassesPage() {
  const supabase = await createAdminClient();

  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, name, type, is_active")
    .order("name");

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Class Management</h1>
          <p className={styles.subtitle}>
            {classes?.length ?? 0} class{classes?.length !== 1 ? "es" : ""} registered
          </p>
        </div>
        <button className="btn btn-primary" disabled title="Coming soon">
          + New Class
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          ⚠ Failed to load classes: {error.message}
        </div>
      )}

      {!error && classes && classes.length === 0 && (
        <div className={styles.emptyState}>
          <p>No classes found. Add your first class via the Supabase dashboard or use the &ldquo;New Class&rdquo; button above.</p>
        </div>
      )}

      {classes && classes.length > 0 && (
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id}>
                  <td className={styles.nameCell}>{cls.name}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: cls.type === "ADV01" ? "var(--ka-blue)" : "#6b7280",
                        color: "white",
                      }}
                    >
                      {cls.type}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: cls.is_active ? "var(--color-success)" : "#e5e7eb",
                        color: cls.is_active ? "white" : "var(--text-secondary)",
                      }}
                    >
                      {cls.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.hint}>
        💡 To add or edit classes, go to your{" "}
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className={styles.hintLink}
        >
          Supabase dashboard
        </a>{" "}
        → Table Editor → classes. Full in-app class management is coming in a future phase.
      </p>
    </div>
  );
}
