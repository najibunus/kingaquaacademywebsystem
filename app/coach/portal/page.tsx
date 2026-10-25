import styles from "./portal.module.css";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import CoachScheduleTableClient from "./CoachScheduleTableClient";

export default async function CoachPortalPage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const authId = user?.id ?? "";

  const supabase = await createAdminClient();

  const { data: userRow } = await supabase
    .from("users")
    .select("id, display_name, phone, avatar_url")
    .eq("auth_id", authId)
    .single();
  
  const uRow = userRow as any;
  const coachUsersId = uRow?.id ?? "";
  const displayName = uRow?.display_name ?? "Coach";
  const phone = uRow?.phone ?? "No phone added";
  const avatarUrl = uRow?.avatar_url ?? null;
  const email = user?.email ?? "";
  const initials = displayName.substring(0, 2).toUpperCase();

  // Fetch all scheduled classes for this coach from coach_attendance
  const { data: scheduleRecords } = coachUsersId
    ? await supabase
        .from("coach_attendance")
        .select("id, coach_id, class_id, date, status, notes, created_at, classes(id, name, type, schedule, locations(name))")
        .eq("coach_id", coachUsersId)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] };

  // Get distinct class IDs from the coach's schedule (or active classes fallback) for Quick Evaluations
  const scheduledClassIds = Array.from(
    new Set(((scheduleRecords as any[]) ?? []).map((r) => r.class_id).filter(Boolean))
  );

  let classIdsForEval = scheduledClassIds;
  if (classIdsForEval.length === 0) {
    const { data: activeClasses } = await supabase
      .from("classes")
      .select("id")
      .eq("is_active", true);
    classIdsForEval = (activeClasses ?? []).map((c: any) => c.id);
  }

  const { data: studentsToEvaluate } = classIdsForEval.length > 0
    ? await supabase
        .from("students")
        .select("id, name, classes(name)")
        .in("class_id", classIdsForEval)
        .eq("status", "active")
        .limit(5)
    : { data: [] };

  const todayDisplay = new Date().toLocaleDateString("en-MY", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 className={styles.title}>Hello, {displayName}!</h1>
          <p className={styles.subtitle}>{todayDisplay}</p>
        </div>
      </div>

      {/* Quick Profile View */}
      <div className={styles.profileCard}>
        <div className={styles.profileInfo}>
          <div className={styles.profileAvatar} style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>
          <div className={styles.profileMeta}>
            <div className={styles.profileNameRow}>
              <h2 className={styles.profileName}>{displayName}</h2>
              <span className="badge badge-primary" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
                Coach
              </span>
            </div>
            <div className={styles.profileDetails}>
              <span className={styles.profileDetailItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>{email}</span>
              </span>
              <span className={styles.profileDetailItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>{phone}</span>
              </span>
            </div>
          </div>
        </div>

        <div className={styles.profileAction}>
          <Link href="/coach/profile" className={styles.profileEditBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Monthly Schedule Table (Read-Only for Coaches) */}
      <CoachScheduleTableClient scheduleRecords={(scheduleRecords as any[]) ?? []} />

      <div className={styles.sectionTitle}>
        Quick Evaluations
      </div>
      
      <div className={styles.evalCard}>
        {!studentsToEvaluate || studentsToEvaluate.length === 0 ? (
          <div style={{textAlign: "center", padding: "2rem", color: "var(--text-secondary)"}}>
            No students found to evaluate.
          </div>
        ) : (
          studentsToEvaluate.map((student: any) => {
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
