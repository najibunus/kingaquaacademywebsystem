import styles from "./portal.module.css";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import ScheduleListClient from "./ScheduleListClient";

export default async function CoachPortalPage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const authId = user?.id ?? "";

  const supabase = await createAdminClient();

  const { data: userRow } = await supabase
    .from("users")
    .select("id, display_name, phone")
    .eq("auth_id", authId)
    .single();
  
  const coachUsersId = userRow?.id ?? "";
  const displayName = userRow?.display_name ?? "Coach";
  const phone = userRow?.phone ?? "No phone added";
  const email = user?.email ?? "";
  const initials = displayName.substring(0, 2).toUpperCase();

  // Find if there is an ongoing class for this coach today
  const today = new Date().toISOString().split("T")[0];
  const { data: ongoingRecords } = await supabase
    .from("coach_attendance")
    .select("class_id")
    .eq("coach_id", coachUsersId)
    .eq("date", today)
    .ilike("notes", "%status:ongoing%");

  const ongoingClassId = ongoingRecords && ongoingRecords.length > 0 ? ongoingRecords[0].class_id : null;

  // Get ALL active classes (coaches can start any class)
  const { data: classesToShow } = await supabase
    .from("classes")
    .select("id, name, type, schedule")
    .eq("is_active", true)
    .order("name");

  // Get some students for evaluations (just from the ongoing class if exists, else first class)
  const classIds = classesToShow ? classesToShow.map((c: any) => c.id) : [];
  const { data: studentsToEvaluate } = classIds.length > 0
    ? await supabase
        .from("students")
        .select("id, name, classes(name)")
        .in("class_id", classIds)
        .eq("status", "active")
        .limit(3)
    : { data: [] };

  const todayDisplay = new Date().toLocaleDateString("en-MY", { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className={styles.title}>Hello, Coach!</h1>
          <p className={styles.subtitle}>{todayDisplay}</p>
        </div>
      </div>

      {/* Quick Profile View */}
      <div className="card" style={{ padding: "20px", marginBottom: "32px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "20px" }}>
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%", 
          backgroundColor: "var(--ka-blue)", color: "white", 
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.75rem", fontWeight: "bold", flexShrink: 0
        }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: "1.25rem", color: "var(--ka-black)" }}>{displayName}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              {email}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              {phone}
            </span>
          </div>
        </div>
        <Link href="/coach/profile" className="btn btn-secondary" style={{ padding: "8px 16px", fontSize: "0.85rem", height: "fit-content" }}>
          Edit Profile
        </Link>
      </div>

      <div className={styles.sectionTitle}>
        Assigned Classes
        <span className="badge badge-primary">{classesToShow?.length ?? 0} Classes</span>
      </div>

      <div className={styles.scheduleList}>
        <ScheduleListClient classes={classesToShow ?? []} coachUsersId={coachUsersId} ongoingClassId={ongoingClassId} />
      </div>

      <div className={styles.sectionTitle}>
        Quick Evaluations
      </div>
      
      <div className={styles.evalCard}>
        {!studentsToEvaluate || studentsToEvaluate.length === 0 ? (
          <div style={{textAlign: "center", padding: "2rem", color: "var(--text-secondary)"}}>
            No students found to evaluate.
          </div>
        ) : (
          studentsToEvaluate.map((student) => {
            const clsName = (student.classes as { name: string } | null)?.name ?? "Unassigned";
            return (
              <div key={student.id} className={styles.evalItem}>
                <div className={styles.evalStudent}>
                  <div className={styles.evalAvatar}>{student.name.charAt(0)}</div>
                  <div>
                    <p className={styles.evalName}>{student.name}</p>
                    <p className={styles.evalClass}>{clsName}</p>
                  </div>
                </div>
                <Link href="/coach/evaluations" className={styles.evalBtn}>Evaluate</Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
