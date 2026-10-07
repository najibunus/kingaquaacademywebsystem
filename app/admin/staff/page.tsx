import { createAdminClient } from "@/lib/supabase/server";
import styles from "./staff-roster.module.css";

export default async function AdminStaffPage() {
  const supabase = await createAdminClient();

  // Query users filtered strictly to staff and coach roles only
  const { data: members, error } = await supabase
    .from("users")
    .select("id, auth_id, display_name, phone, role, is_active, created_at")
    .in("role", ["staff", "coach"])
    .order("role", { ascending: true })
    .order("display_name", { ascending: true });

  const coaches = (members ?? []).filter((m) => m.role === "coach");
  const staff   = (members ?? []).filter((m) => m.role === "staff");

  function RoleSection({ title, people }: { title: string; people: typeof members }) {
    if (!people || people.length === 0) return null;
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>{title} — {people.length}</h2>

        {/* Desktop table */}
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {people.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className={styles.nameGroup}>
                      <div className={styles.avatar}>{(m.display_name ?? "?").charAt(0).toUpperCase()}</div>
                      <div>
                        <p className={styles.nameText}>{m.display_name ?? "—"}</p>
                        <p className={styles.roleChip}>{m.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className={styles.phoneCell}>{m.phone ?? <span className={styles.empty}>—</span>}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: m.is_active ? "var(--color-success)" : "#e5e7eb",
                        color: m.is_active ? "white" : "var(--text-secondary)",
                      }}
                    >
                      {m.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(m.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className={styles.mobileList}>
          {people.map((m) => (
            <div key={m.id} className={styles.mobileCard}>
              <div className={styles.mobileLeft}>
                <div className={styles.avatar}>{(m.display_name ?? "?").charAt(0).toUpperCase()}</div>
                <div>
                  <p className={styles.nameText}>{m.display_name ?? "—"}</p>
                  <p className={styles.phoneCell}>{m.phone ?? "No phone"}</p>
                </div>
              </div>
              <span
                className="badge"
                style={{
                  backgroundColor: m.is_active ? "var(--color-success)" : "#e5e7eb",
                  color: m.is_active ? "white" : "var(--text-secondary)",
                  fontSize: "0.75rem",
                }}
              >
                {m.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Staff &amp; Coaches</h1>
          <p className={styles.subtitle}>
            {(members ?? []).length} team member{(members ?? []).length !== 1 ? "s" : ""} — {coaches.length} coach{coaches.length !== 1 ? "es" : ""}, {staff.length} staff
          </p>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>⚠ Failed to load team: {error.message}</div>
      )}

      {!error && (members ?? []).length === 0 && (
        <div className={styles.emptyState}>
          <p>No staff or coach accounts found. Create accounts in Supabase Auth and assign the appropriate role in the users table.</p>
        </div>
      )}

      <RoleSection title="Coaches" people={coaches} />
      <RoleSection title="Staff" people={staff} />
    </div>
  );
}
