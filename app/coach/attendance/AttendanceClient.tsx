"use client";

import { useState, useTransition } from "react";
import { markAttendanceAction } from "@/lib/actions/attendance";
import styles from "./attendance.module.css";

type Student = {
  id: string;
  name: string;
  session_count: number;
  class_id: string | null;
  classes: { name: string } | null;
};

type AttendanceStatus = "present" | "absent" | "medical" | "leave";

interface Props {
  coachId: string;
  students: Student[];
  classes: { id: string; name: string; type: string }[];
  attendanceMap: Record<string, string>;
  today: string;
}

export default function AttendanceClient({ coachId, students, classes, attendanceMap, today }: Props) {
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>(
    () => attendanceMap as Record<string, AttendanceStatus>
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filterClass, setFilterClass] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const filteredStudents = filterClass === "all"
    ? students
    : students.filter((s) => s.class_id === filterClass);

  async function handleMark(student: Student, status: AttendanceStatus) {
    setStatusMap((prev) => ({ ...prev, [student.id]: status }));
    setSaving((prev) => ({ ...prev, [student.id]: true }));
    setSaved((prev) => ({ ...prev, [student.id]: false }));
    setErrors((prev) => ({ ...prev, [student.id]: "" }));

    const fd = new FormData();
    fd.append("student_id", student.id);
    fd.append("class_id", student.class_id ?? "");
    fd.append("status", status);
    fd.append("coach_id", coachId);
    if (today) {
      fd.append("target_date", today);
    }

    startTransition(async () => {
      const result = await markAttendanceAction(fd);
      setSaving((prev) => ({ ...prev, [student.id]: false }));
      if (result?.error) {
        setErrors((prev) => ({ ...prev, [student.id]: result.error as string }));
      } else {
        setSaved((prev) => ({ ...prev, [student.id]: true }));
        setTimeout(() => setSaved((prev) => ({ ...prev, [student.id]: false })), 2000);
      }
    });
  }

  const presentCount = Object.values(statusMap).filter((s) => s === "present").length;
  const absentCount = Object.values(statusMap).filter((s) => s === "absent").length;

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mark Attendance</h1>
          <p className={styles.subtitle}>
            {today} — {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
            {presentCount > 0 && <span className={styles.presentCount}> · {presentCount} present</span>}
            {absentCount > 0 && <span className={styles.absentCount}> · {absentCount} absent</span>}
          </p>
        </div>
        {classes.length > 1 && (
          <select
            className={styles.classFilter}
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {filteredStudents.length === 0 && (
        <div className={styles.emptyCard}>
          <p className={styles.emptyText}>
            No active students found for your assigned classes. Contact admin to be assigned to a class.
          </p>
        </div>
      )}

      <div className={styles.studentList}>
        {filteredStudents.map((student) => {
          const current = statusMap[student.id];
          const isSaving = saving[student.id];
          const isSaved = saved[student.id];
          const err = errors[student.id];
          const cls = student.classes as { name: string } | null;

          return (
            <div
              key={student.id}
              className={`${styles.studentCard} ${
                current === "present" ? styles.cardPresent
                : current === "absent" ? styles.cardAbsent
                : current === "medical" || current === "leave" ? styles.cardExcused
                : ""
              }`}
            >
              <div className={styles.studentInfo}>
                <div className={styles.avatar}>{student.name.charAt(0).toUpperCase()}</div>
                <div>
                  <p className={styles.studentName}>{student.name}</p>
                  <p className={styles.studentMeta}>
                    {cls?.name ?? "Unassigned"} &bull; {student.session_count} session{student.session_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className={styles.actions}>
                {(["present", "absent", "medical", "leave"] as AttendanceStatus[]).map((s) => (
                  <button
                    key={s}
                    disabled={isSaving}
                    onClick={() => handleMark(student, s)}
                    className={`${styles.statusBtn} ${
                      s === "present" ? styles.btnPresent
                      : s === "absent" ? styles.btnAbsent
                      : styles.btnExcused
                    } ${current === s ? styles.btnActive : ""}`}
                  >
                    {s === "present" ? "✓ Present" : s === "absent" ? "✗ Absent" : s === "medical" ? "🏥 MC" : "📋 Leave"}
                  </button>
                ))}
              </div>

              {isSaving && <p className={styles.savingText}>Saving…</p>}
              {isSaved && <p className={styles.savedText}>✓ Saved</p>}
              {err && <p className={styles.errorText}>⚠ {err}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
