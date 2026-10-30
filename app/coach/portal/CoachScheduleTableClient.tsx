"use client";

import React, { useState, useMemo } from "react";

export interface CoachScheduleItem {
  id: string;
  coach_id: string;
  class_id: string;
  date: string; // YYYY-MM-DD
  status: string;
  notes: string | null;
  created_at: string;
  classes: {
    id: string;
    name: string;
    type: string;
    schedule?: any;
    locations?: { name: string } | null;
  } | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function parseScheduleNotes(notes: string | null, createdAt?: string): {
  startTime: string;
  endTime: string;
  remarks: string;
} {
  if (!notes) return { startTime: "", endTime: "", remarks: "" };

  if (notes.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(notes);
      return {
        startTime: parsed.startTime || "",
        endTime: parsed.endTime || "",
        remarks: parsed.remarks || "",
      };
    } catch {
      // fall through
    }
  }

  if (notes.startsWith("status:")) {
    let start = "";
    let end = "";
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        start = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    }
    if (notes.includes("|")) {
      const part = notes.split("|")[1];
      const endD = new Date(part);
      if (!isNaN(endD.getTime())) {
        end = `${String(endD.getHours()).padStart(2, "0")}:${String(endD.getMinutes()).padStart(2, "0")}`;
      }
    }
    return { startTime: start, endTime: end, remarks: "" };
  }

  if (notes.startsWith("Class Time:")) {
    return {
      startTime: notes.replace("Class Time:", "").trim(),
      endTime: "",
      remarks: "",
    };
  }

  return { startTime: "", endTime: "", remarks: notes };
}

export function formatTime12h(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr || "00"} ${period}`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  if (startTime && endTime) {
    return `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
  }
  if (startTime) {
    return formatTime12h(startTime);
  }
  return "Time TBD";
}

/**
 * Expands any coach_attendance rows that contain multiple sessions on the same day
 * (stored in notes.sessions) into individual session entries.
 */
export function expandScheduleRecords<
  T extends {
    id: string;
    status: string;
    notes: string | null;
    created_at?: string;
  }
>(records: T[]): T[] {
  const expanded: T[] = [];

  for (const rec of records) {
    if (rec.notes && rec.notes.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(rec.notes);
        if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
          parsed.sessions.forEach((s: any, idx: number) => {
            const subId = s.subId || `s_${idx}`;
            expanded.push({
              ...rec,
              id: `${rec.id}::${subId}`,
              status: s.status || rec.status || "present",
              notes: JSON.stringify({
                startTime: s.startTime || "",
                endTime: s.endTime || "",
                remarks: s.remarks || "",
              }),
            });
          });
          continue;
        }
      } catch {
        // fall through
      }
    }
    expanded.push(rec);
  }

  return expanded;
}

interface Props {
  scheduleRecords: CoachScheduleItem[];
}

export default function CoachScheduleTableClient({ scheduleRecords }: Props) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-11

  const expandedRecords = useMemo(
    () => expandScheduleRecords(scheduleRecords),
    [scheduleRecords]
  );

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  const monthlyClasses = useMemo(() => {
    const prefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    return expandedRecords
      .filter((r) => r.date && r.date.startsWith(prefix))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const notesA = parseScheduleNotes(a.notes, a.created_at);
        const notesB = parseScheduleNotes(b.notes, b.created_at);
        return (notesA.startTime || "").localeCompare(notesB.startTime || "");
      });
  }, [expandedRecords, selectedYear, selectedMonth]);

  const stats = useMemo(() => {
    let upcoming = 0;
    let completed = 0;
    let todayCount = 0;
    monthlyClasses.forEach((item) => {
      if (item.date === todayStr) todayCount++;
      else if (item.date > todayStr) upcoming++;
      else completed++;
    });
    return {
      total: monthlyClasses.length,
      upcoming: upcoming + todayCount,
      todayCount,
      completed,
    };
  }, [monthlyClasses, todayStr]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "32px" }}>
      {/* Month Navigation Bar */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--ka-black)" }}>
            Monthly Teaching Schedule
          </h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Classes assigned to you for {MONTHS[selectedMonth]} {selectedYear}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="btn btn-secondary"
            style={{ padding: "8px 12px", fontSize: "0.85rem" }}
            aria-label="Previous month"
          >
            &larr; Prev
          </button>

          <div
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-tint)",
              color: "var(--ka-blue)",
              fontWeight: 700,
              fontSize: "0.95rem",
              minWidth: "150px",
              textAlign: "center",
            }}
          >
            {MONTHS[selectedMonth]} {selectedYear}
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="btn btn-secondary"
            style={{ padding: "8px 12px", fontSize: "0.85rem" }}
            aria-label="Next month"
          >
            Next &rarr;
          </button>

          {(selectedYear !== now.getFullYear() || selectedMonth !== now.getMonth()) && (
            <button
              type="button"
              onClick={handleCurrentMonth}
              className="btn btn-primary"
              style={{ padding: "8px 12px", fontSize: "0.8rem" }}
            >
              This Month
            </button>
          )}
        </div>
      </div>

      {/* Monthly Summary Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
        }}
      >
        <div className="card" style={{ padding: "16px" }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Total Classes ({MONTHS[selectedMonth].slice(0, 3)})
          </p>
          <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--ka-black)" }}>
            {stats.total}
          </p>
        </div>

        <div className="card" style={{ padding: "16px" }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Upcoming / Today
          </p>
          <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--ka-blue)" }}>
            {stats.upcoming}
          </p>
        </div>

        <div className="card" style={{ padding: "16px" }}>
          <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
            Completed
          </p>
          <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--color-success)" }}>
            {stats.completed}
          </p>
        </div>
      </div>

      {/* Schedule Table Card */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {monthlyClasses.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-secondary)" }}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ margin: "0 auto 12px", display: "block", opacity: 0.5 }}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p style={{ margin: "0 0 4px 0", fontWeight: 600, fontSize: "1rem", color: "var(--ka-black)" }}>
              No classes scheduled for {MONTHS[selectedMonth]} {selectedYear}
            </p>
            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              Your monthly teaching schedule will appear here once assigned by staff.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "620px", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-light)", borderBottom: "1px solid var(--border-gray)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", width: "48px" }}>
                    #
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Date &amp; Day
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Time
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Class to Teach
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Type
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Remarks
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyClasses.map((item, idx) => {
                  const [y, m, d] = item.date.split("-").map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  const dayName = dateObj.toLocaleDateString("en-MY", { weekday: "long" });
                  const dateFormatted = dateObj.toLocaleDateString("en-MY", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  const { startTime, endTime, remarks } = parseScheduleNotes(item.notes, item.created_at);
                  const timeDisplay = formatTimeRange(startTime, endTime);
                  const className = item.classes?.name || "Assigned Class";
                  const classType = item.classes?.type || "STANDARD";
                  const locationName = item.classes?.locations?.name;

                  const isToday = item.date === todayStr;
                  const isUpcoming = item.date > todayStr;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: idx < monthlyClasses.length - 1 ? "1px solid var(--bg-light)" : "none",
                        backgroundColor: isToday ? "var(--bg-tint)" : "var(--ka-white)",
                      }}
                    >
                      <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, color: "var(--ka-black)" }}>{dateFormatted}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{dayName}</div>
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "var(--ka-blue)", whiteSpace: "nowrap" }}>
                        {timeDisplay}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, color: "var(--ka-black)" }}>{className}</div>
                        {locationName && (
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                            {locationName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          className="badge badge-secondary"
                          style={
                            classType === "ADV01"
                              ? { backgroundColor: "var(--bg-tint)", color: "var(--ka-blue)", borderColor: "var(--ka-blue)" }
                              : {}
                          }
                        >
                          {classType}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {remarks || <span style={{ opacity: 0.5 }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {isToday ? (
                          <span
                            className="badge"
                            style={{ backgroundColor: "var(--ka-blue)", color: "white" }}
                          >
                            Today
                          </span>
                        ) : isUpcoming ? (
                          <span
                            className="badge"
                            style={{ backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}
                          >
                            Upcoming
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{ backgroundColor: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0" }}
                          >
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
