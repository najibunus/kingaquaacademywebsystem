"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AttendanceClient from "@/app/coach/attendance/AttendanceClient";

interface Props {
  classes: any[];
  students: any[];
  staffUserId: string;
  initialClassId: string;
  initialDate: string;
  attendanceMap: Record<string, string>;
}

export default function TakeAttendanceClient({ 
  classes, 
  students, 
  staffUserId, 
  initialClassId, 
  initialDate, 
  attendanceMap 
}: Props) {
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState(initialClassId);
  const [selectedDate, setSelectedDate] = useState(initialDate);

  function handleFilter() {
    router.push(`?classId=${selectedClass}&date=${selectedDate}`);
  }

  const groupedClasses = classes.reduce((acc, cls) => {
    const loc = cls.locations?.name || "Other";
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(cls);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="animate-fade-in-up" style={{ paddingBottom: "40px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.875rem", margin: "0 0 4px 0" }}>Take Attendance</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem" }}>
          Select a class and date to manually record or override student attendance.
        </p>
      </div>

      <div className="card" style={{ padding: "20px", marginBottom: "32px" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: "bold" }}>Class</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-gray)", fontFamily: "inherit", boxSizing: "border-box" }}
              >
                <option value="">-- Select Class --</option>
                {Object.keys(groupedClasses).sort((a, b) => {
                  const order = ["UTHM", "Pura Kencana", "Pontian"];
                  const indexA = order.indexOf(a);
                  const indexB = order.indexOf(b);
                  return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
                }).map(loc => (
                  <optgroup key={loc} label={loc}>
                    {groupedClasses[loc].map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} {c.type === 'ADV01' ? '(ADV01)' : ''}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
          </div>
          
          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: "bold" }}>Date</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-gray)", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ flex: "0 0 auto" }}>
            <button 
              className="btn btn-primary" 
              onClick={handleFilter}
              disabled={!selectedClass || !selectedDate}
              style={{ padding: "10px 24px", height: "100%", boxSizing: "border-box" }}
            >
              Load Students
            </button>
          </div>
        </div>
      </div>

      {initialClassId ? (
        <div style={{ background: "var(--bg-light)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border-gray)" }}>
          <AttendanceClient
            coachId={staffUserId}
            students={students}
            classes={classes.filter(c => c.id === initialClassId)}
            attendanceMap={attendanceMap}
            today={initialDate}
          />
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)", border: "2px dashed var(--border-gray)", borderRadius: "12px" }}>
          Please select a class and date, then click Load Students.
        </div>
      )}
    </div>
  );
}
