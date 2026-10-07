import { createClient, createAdminClient } from "@/lib/supabase/server";
import styles from "./coach-students.module.css";
import AttendanceClient from "../attendance/AttendanceClient";
import EndClassForm from "./EndClassForm";
import HistoryActions from "./HistoryActions";

export default async function CoachClassesPage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const authId = user?.id ?? "";

  const supabase = await createAdminClient();

  // 1. Resolve true users.id
  const { data: userRow } = await supabase.from("users").select("id").eq("auth_id", authId).single();
  const coachUsersId = userRow?.id ?? "";

  // 2. Get the ongoing class from coach_attendance (regardless of date, so they can edit backdated ones)
  const today = new Date().toISOString().split("T")[0]; // Still used for default attendance map
  const { data: ongoingRecords } = await supabase
    .from("coach_attendance")
    .select("class_id, date, created_at, notes, classes(id, name, type)")
    .eq("coach_id", coachUsersId)
    .ilike("notes", "%status:ongoing%");

  const ongoingClass = ongoingRecords && ongoingRecords.length > 0 ? (ongoingRecords[0].classes as any) : null;
  const ongoingDate = ongoingRecords && ongoingRecords.length > 0 ? ongoingRecords[0].date : today;

  // 3. If ongoing class exists, get its students and today's attendance
  let ongoingStudents: any[] = [];
  let attendanceMap: Record<string, string> = {};

  if (ongoingClass) {
    const { data: roster } = await supabase
      .from("students")
      .select("id, temp_id, name, session_count, status, class_id, classes(name)")
      .eq("class_id", ongoingClass.id)
      .eq("status", "active")
      .order("name", { ascending: true });
    
    ongoingStudents = roster ?? [];

    const studentIds = ongoingStudents.map((s) => s.id);
    if (studentIds.length > 0) {
      const { data: att } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("date", ongoingDate)
        .in("student_id", studentIds);
      
      attendanceMap = Object.fromEntries((att ?? []).map((a) => [a.student_id, a.status]));
    }
  }

  // 4. Class History (past coach_attendance records for this coach)
  const { data: pastRecords } = await supabase
    .from("coach_attendance")
    .select("id, date, created_at, status, notes, class_id, classes(name, type)")
    .eq("coach_id", coachUsersId)
    .not("notes", "ilike", "%status:ongoing%")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Classes</h1>
          <p className={styles.subtitle}>
            Manage your ongoing session and view class history.
          </p>
        </div>
      </div>

      <div className={styles.classesContainer}>
        {/* ── ONGOING CLASS SECTION ── */}
        <div className={styles.classSection}>
          <h2 className={styles.classTitle} style={{ color: "var(--ka-blue)", borderColor: "var(--ka-blue)" }}>
            Ongoing Class
          </h2>
          
          {!ongoingClass ? (
            <div className={styles.emptyClassState}>
              You have no ongoing class right now. Go to your Dashboard to start a class.
            </div>
          ) : (
            <div className="card" style={{ padding: "24px", border: "2px solid var(--ka-blue)" }}>
              <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "1.5rem" }}>{ongoingClass.name}</h3>
                  <span className="badge badge-secondary" style={{ marginRight: "8px" }}>{ongoingClass.type}</span>
                  <span className="badge badge-primary">
                    {ongoingRecords && ongoingRecords[0]?.created_at 
                      ? `${new Date(ongoingRecords[0].created_at).toLocaleDateString("en-MY", { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ${ongoingRecords[0]?.notes?.includes("|") ? ` - ${new Date(ongoingRecords[0].notes.split("|")[1]).toLocaleTimeString("en-MY", { hour: '2-digit', minute: '2-digit' })}` : ""}`
                      : new Date(ongoingDate).toLocaleDateString("en-MY", { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Embed the Attendance UI directly here */}
              <div style={{ background: "var(--bg-light)", padding: "16px", borderRadius: "12px", marginBottom: "24px" }}>
                <AttendanceClient
                  coachId={coachUsersId}
                  students={ongoingStudents}
                  classes={[ongoingClass]}
                  attendanceMap={attendanceMap}
                  today={ongoingDate}
                />
              </div>

              {/* End Class Button */}
              <div style={{ borderTop: "1px solid var(--border-gray)", paddingTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                <EndClassForm classId={ongoingClass.id} coachId={coachUsersId} />
              </div>
            </div>
          )}
        </div>

        {/* ── CLASS HISTORY SECTION ── */}
        <div className={styles.classSection} style={{ marginTop: "24px" }}>
          <h2 className={styles.classTitle}>Recent Class History</h2>
          
          {!pastRecords || pastRecords.length === 0 ? (
            <div className={styles.emptyClassState}>
              No past classes recorded yet.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={styles.tableCard}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Class Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastRecords.map((record) => {
                      const c = record.classes as any;
                      const cName = c?.name ?? "Unknown Class";
                      return (
                        <tr key={record.id}>
                          <td className={styles.nameCell}>
                            {new Date(record.created_at).toLocaleDateString("en-MY", { weekday: 'short', month: 'short', day: 'numeric' })}
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                              {new Date(record.created_at).toLocaleTimeString("en-MY", { hour: '2-digit', minute: '2-digit' })}
                              {record.notes?.includes("|") ? ` - ${new Date(record.notes.split("|")[1]).toLocaleTimeString("en-MY", { hour: '2-digit', minute: '2-digit' })}` : ""}
                            </div>
                          </td>
                          <td>{cName}</td>
                          <td>
                            <span className="badge badge-secondary">{c?.type ?? "-"}</span>
                          </td>
                          <td>
                            <span className="badge" style={{ backgroundColor: "#10b981", color: "white" }}>
                              Completed
                            </span>
                          </td>
                          <td>
                            <HistoryActions recordId={record.id} className={cName} hasOngoingClass={!!ongoingClass} classId={record.class_id} date={record.date} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className={styles.mobileList}>
                {pastRecords.map((record) => {
                  const c = record.classes as any;
                  const cName = c?.name ?? "Unknown Class";
                  return (
                    <div key={record.id} className={styles.mobileCard}>
                      <div className={styles.mobileCardLeft}>
                        <div>
                          <p className={styles.mobileName}>{cName}</p>
                          <p className={styles.mobileSub}>
                            {new Date(record.created_at).toLocaleDateString("en-MY", { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(record.created_at).toLocaleTimeString("en-MY", { hour: '2-digit', minute: '2-digit' })}
                            {record.notes?.includes("|") ? ` - ${new Date(record.notes.split("|")[1]).toLocaleTimeString("en-MY", { hour: '2-digit', minute: '2-digit' })}` : ""}
                          </p>
                          <div style={{ marginTop: "8px" }}>
                            <HistoryActions recordId={record.id} className={cName} hasOngoingClass={!!ongoingClass} classId={record.class_id} date={record.date} />
                          </div>
                        </div>
                      </div>
                      <div className={styles.mobileCardRight}>
                        <span className="badge badge-secondary" style={{ fontSize: "0.7rem", marginBottom: "4px" }}>
                          {c?.type ?? "-"}
                        </span>
                        <span className="badge" style={{ backgroundColor: "#10b981", color: "white", fontSize: "0.7rem" }}>
                          Completed
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
