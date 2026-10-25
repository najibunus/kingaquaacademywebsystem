import { createClient, createAdminClient } from "@/lib/supabase/server";
import styles from "./coach-students.module.css";
import CoachScheduleTableClient from "../portal/CoachScheduleTableClient";

export default async function CoachClassesPage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const authId = user?.id ?? "";

  const supabase = await createAdminClient();

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .single();
  const coachUsersId = (userRow as any)?.id ?? "";

  // Fetch scheduled classes for this coach
  const { data: scheduleRecords } = coachUsersId
    ? await supabase
        .from("coach_attendance")
        .select("id, coach_id, class_id, date, status, notes, created_at, classes(id, name, type, schedule, locations(name))")
        .eq("coach_id", coachUsersId)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };

  // Also fetch student rosters for the classes this coach teaches (read-only)
  const scheduledClassIds = Array.from(
    new Set(((scheduleRecords as any[]) ?? []).map((r) => r.class_id).filter(Boolean))
  );

  const { data: classesList } = scheduledClassIds.length > 0
    ? await supabase
        .from("classes")
        .select("id, name, type, locations(name)")
        .in("id", scheduledClassIds)
        .order("name")
    : await supabase
        .from("classes")
        .select("id, name, type, locations(name)")
        .eq("is_active", true)
        .order("name");

  const { data: students } = await supabase
    .from("students")
    .select("id, name, class_id, status")
    .eq("status", "active")
    .order("name", { ascending: true });

  const studentsByClass = new Map<string, { id: string; name: string }[]>();
  (students ?? []).forEach((s: any) => {
    if (!s.class_id) return;
    if (!studentsByClass.has(s.class_id)) studentsByClass.set(s.class_id, []);
    studentsByClass.get(s.class_id)!.push({ id: s.id, name: s.name });
  });

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Classes</h1>
          <p className={styles.subtitle}>
            View your monthly teaching schedule and enrolled class rosters.
          </p>
        </div>
      </div>

      {/* Monthly Schedule Table */}
      <CoachScheduleTableClient scheduleRecords={(scheduleRecords as any[]) ?? []} />

      {/* Read-Only Class Rosters */}
      <div className={styles.classesContainer}>
        <div className={styles.classSection}>
          <h2 className={styles.classTitle}>Enrolled Class Rosters</h2>
          {!classesList || classesList.length === 0 ? (
            <div className={styles.emptyClassState}>No classes found.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {classesList.map((cls: any) => {
                const roster = studentsByClass.get(cls.id) || [];
                return (
                  <div key={cls.id} className="card" style={{ padding: "18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "12px", borderBottom: "1px solid var(--border-gray)", paddingBottom: "10px" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--ka-black)" }}>
                          {cls.name}
                        </h3>
                        {cls.locations?.name && (
                          <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                            {cls.locations.name}
                          </p>
                        )}
                      </div>
                      <span className="badge badge-secondary">{roster.length} Students</span>
                    </div>
                    {roster.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                        No active students enrolled.
                      </p>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.875rem", color: "var(--ka-black)", display: "flex", flexDirection: "column", gap: "4px", maxHeight: "180px", overflowY: "auto" }}>
                        {roster.map((stu) => (
                          <li key={stu.id}>{stu.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
