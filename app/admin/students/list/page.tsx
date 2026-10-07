import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import styles from "./students-list.module.css";

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminStudentsListPage({ searchParams }: PageProps) {
  const { q = "", status = "all" } = await searchParams;
  const supabase = await createAdminClient();

  // Build query — filtering happens in Supabase, not the client
  let query = supabase
    .from("students")
    .select("temp_id, id, name, session_count, status, class_id, classes(name)", { count: "exact" })
    .order("name", { ascending: true })
    .limit(100);

  if (q.trim()) {
    query = query.ilike("name", `%${q.trim()}%`);
  }
  if (status !== "all") {
    query = query.eq("status", status as "active" | "inactive" | "on_hold");
  }

  const { data: students, error, count } = await query;

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Student Directory</h1>
          <p className={styles.subtitle}>
            {count ?? 0} student{count !== 1 ? "s" : ""} found
            {q ? ` for "${q}"` : ""}
          </p>
        </div>
        <Link href="/admin/students/import" className="btn btn-primary">
          + Import CSV
        </Link>
      </div>

      {/* ── Search + Filter Bar ── */}
      <form method="GET" className={styles.filterBar}>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className={styles.searchInput}
        />
        <select name="status" defaultValue={status} className={styles.filterSelect}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_hold">On Hold</option>
        </select>
        <button type="submit" className="btn btn-secondary">Search</button>
        {(q || status !== "all") && (
          <Link href="/admin/students/list" className="btn btn-ghost">Clear</Link>
        )}
      </form>

      {error && (
        <div className={styles.errorBanner}>⚠ Failed to load students: {error.message}</div>
      )}

      {!error && (!students || students.length === 0) && (
        <div className={styles.emptyState}>
          <p>
            No students found.{" "}
            {q ? (
              <>Try a different search term or <Link href="/admin/students/list" className={styles.inlineLink}>clear the filter</Link>.</>
            ) : (
              <>Use the <Link href="/admin/students/import" className={styles.inlineLink}>CSV Importer</Link> to bulk-add students.</>
            )}
          </p>
        </div>
      )}

      {students && students.length > 0 && (
        <>
          {/* ── Desktop scrollable table (hidden on mobile) ── */}
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Sessions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const cls = s.classes as { name: string } | null;
                  return (
                    <tr key={s.id}>
                      <td className={styles.idCell}>{s.temp_id}</td>
                      <td className={styles.nameCell}>{s.name}</td>
                      <td>{cls?.name ?? <span className={styles.noClass}>Unassigned</span>}</td>
                      <td>
                        <span className={styles.sessionPip} data-full={String(s.session_count >= 4)}>
                          {s.session_count} / 4
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              s.status === "active" ? "var(--color-success)"
                              : s.status === "on_hold" ? "#f59e0b"
                              : "#e5e7eb",
                            color: s.status !== "inactive" ? "white" : "var(--text-secondary)",
                          }}
                        >
                          {s.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile card list ── */}
          <div className={styles.mobileList}>
            {students.map((s) => {
              const cls = s.classes as { name: string } | null;
              return (
                <div key={s.id} className={styles.mobileCard}>
                  <div className={styles.mobileCardLeft}>
                    <div className={styles.mobileAvatar}>{s.name.charAt(0)}</div>
                    <div>
                      <p className={styles.mobileName}>{s.name}</p>
                      <p className={styles.mobileSub}>{cls?.name ?? "Unassigned"}</p>
                    </div>
                  </div>
                  <div className={styles.mobileCardRight}>
                    <span className={styles.sessionPip} data-full={String(s.session_count >= 4)}>
                      {s.session_count}/4
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor:
                          s.status === "active" ? "var(--color-success)"
                          : s.status === "on_hold" ? "#f59e0b"
                          : "#e5e7eb",
                        color: s.status !== "inactive" ? "white" : "var(--text-secondary)",
                        fontSize: "0.7rem",
                      }}
                    >
                      {s.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
