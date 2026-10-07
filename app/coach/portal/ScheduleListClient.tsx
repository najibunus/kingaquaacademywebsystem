"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { startClassAction } from "@/lib/actions/attendance";
import styles from "./portal.module.css";

type ClassData = {
  id: string;
  name: string;
  type: string;
  schedule: any;
};

interface Props {
  classes: ClassData[];
  coachUsersId: string;
  ongoingClassId: string | null;
}

export default function ScheduleListClient({ classes, coachUsersId, ongoingClassId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingClass, setLoadingClass] = useState<string | null>(null);
  
  // Date and Time states
  const [classDate, setClassDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  const [endTime, setEndTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  if (classes.length === 0) {
    return (
      <div className="card" style={{textAlign: "center", padding: "2rem", color: "var(--text-secondary)"}}>
        No classes available.
      </div>
    );
  }

  function handleStartClass(classId: string) {
    if (ongoingClassId) {
      if (ongoingClassId === classId) {
        router.push("/coach/students");
        return;
      } else {
        alert("You already have an ongoing class! Please end it first before starting another.");
        return;
      }
    }

    setLoadingClass(classId);
    const fd = new FormData();
    fd.append("class_id", classId);
    fd.append("coach_id", coachUsersId);
    
    if (classDate && startTime) {
      fd.append("target_date", `${classDate}T${startTime}`);
    }
    if (classDate && endTime) {
      fd.append("target_end_date", `${classDate}T${endTime}`);
    }

    startTransition(async () => {
      await startClassAction(fd);
      router.push("/coach/students");
    });
  }

  return (
    <>
      {!ongoingClassId && (
        <div style={{ marginBottom: "16px", padding: "16px", backgroundColor: "var(--ka-white)", borderRadius: "8px", border: "1px solid var(--border-gray)" }}>
          <label style={{ display: "block", marginBottom: "12px", fontWeight: "bold", fontSize: "0.95rem" }}>
            Class Date & Time
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Date</label>
              <input 
                type="date" 
                value={classDate} 
                onChange={(e) => setClassDate(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-gray)", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>Start Time</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-gray)", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>End Time</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-gray)", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
          </div>
        </div>
      )}

      {classes.map((cls) => {
        const isOngoing = ongoingClassId === cls.id;
        
        return (
          <div key={cls.id} className={styles.classCard} style={isOngoing ? { borderColor: "var(--ka-blue)", borderWidth: "2px" } : {}}>
            <div className={styles.classHeader}>
              <div>
                <h3 className={styles.className}>{cls.name}</h3>
                <div className={styles.classTime}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {isOngoing ? "Session Ongoing!" : (cls.schedule ? "Scheduled" : "Time TBD")}
                </div>
              </div>
              <span className="badge badge-secondary" style={cls.type === "ADV01" ? {backgroundColor: "var(--bg-tint)", color: "var(--ka-blue)", borderColor: "var(--ka-blue)"} : {}}>
                {cls.type}
              </span>
            </div>
            
            <div className={styles.classActions}>
              <button 
                type="button" 
                disabled={isPending && loadingClass === cls.id}
                className={`${styles.actionBtn} ${isOngoing ? styles.actionBtnPrimary : ""}`}
                style={isOngoing ? {} : { gridColumn: "1 / -1", backgroundColor: "var(--ka-black)", color: "var(--ka-white)" }}
                onClick={() => handleStartClass(cls.id)}
              >
                {isPending && loadingClass === cls.id ? "Starting..." : (isOngoing ? "Resume Class" : "Start Class")}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
