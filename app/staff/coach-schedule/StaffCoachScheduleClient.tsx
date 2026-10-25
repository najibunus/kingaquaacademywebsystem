"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addCoachScheduleEntriesAction,
  updateCoachScheduleEntryAction,
  deleteCoachScheduleEntryAction,
} from "@/lib/actions/coachSchedule";
import {
  parseScheduleNotes,
  formatTimeRange,
} from "@/app/coach/portal/CoachScheduleTableClient";

interface CoachOption {
  id: string;
  display_name: string | null;
  phone: string | null;
  is_active: boolean;
  avatar_url?: string | null;
}

interface ClassOption {
  id: string;
  name: string;
  type: string;
  locations?: { name: string } | null;
}

interface ScheduleRecord {
  id: string;
  coach_id: string;
  class_id: string;
  date: string;
  status: string;
  notes: string | null;
  created_at: string;
  users?: { id: string; display_name: string | null; avatar_url?: string | null } | null;
  classes?: {
    id: string;
    name: string;
    type: string;
    locations?: { name: string } | null;
  } | null;
}

interface Props {
  coaches: CoachOption[];
  classes: ClassOption[];
  initialRecords: ScheduleRecord[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function StaffCoachScheduleClient({
  coaches,
  classes,
  initialRecords,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const todayStr = toYMD(now.getFullYear(), now.getMonth(), now.getDate());

  // Selected Month & Year (shared between the Calendar Picker and the Monthly Table)
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth()); // 0 - 11

  // Form States for Adding Coach Classes in the Month
  const [selectedCoachId, setSelectedCoachId] = useState<string>(
    coaches.length > 0 ? coaches[0].id : ""
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes.length > 0 ? classes[0].id : ""
  );
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("10:00");
  const [remarks, setRemarks] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Table Filters
  const [filterCoachId, setFilterCoachId] = useState<string>("all");
  const [filterClassId, setFilterClassId] = useState<string>("all");

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<ScheduleRecord | null>(null);
  const [editCoachId, setEditCoachId] = useState<string>("");
  const [editClassId, setEditClassId] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editStartTime, setEditStartTime] = useState<string>("");
  const [editEndTime, setEditEndTime] = useState<string>("");
  const [editRemarks, setEditRemarks] = useState<string>("");

  // Group classes by location for dropdown
  const groupedClasses = useMemo(() => {
    return classes.reduce((acc, cls) => {
      const loc = cls.locations?.name || "General";
      if (!acc[loc]) acc[loc] = [];
      acc[loc].push(cls);
      return acc;
    }, {} as Record<string, ClassOption[]>);
  }, [classes]);

  // Calendar grid generation for (year, month)
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; dateStr: string | null; dow: number }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, dateStr: null, dow: i });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      cells.push({ day: d, dateStr: toYMD(year, month, d), dow });
    }
    return cells;
  }, [year, month]);

  // Dates in this month where the currently selected coach already has ANY class scheduled
  const existingCoachDatesMap = useMemo(() => {
    const map = new Map<string, number>();
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    initialRecords.forEach((r) => {
      if (r.coach_id === selectedCoachId && r.date && r.date.startsWith(prefix)) {
        map.set(r.date, (map.get(r.date) || 0) + 1);
      }
    });
    return map;
  }, [initialRecords, selectedCoachId, year, month]);

  // Filtered monthly schedule records for the table
  const monthlyScheduleRecords = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return initialRecords
      .filter((r) => {
        if (!r.date || !r.date.startsWith(prefix)) return false;
        if (filterCoachId !== "all" && r.coach_id !== filterCoachId) return false;
        if (filterClassId !== "all" && r.class_id !== filterClassId) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const nA = parseScheduleNotes(a.notes, a.created_at);
        const nB = parseScheduleNotes(b.notes, b.created_at);
        return (nA.startTime || "").localeCompare(nB.startTime || "");
      });
  }, [initialRecords, year, month, filterCoachId, filterClassId]);

  const handlePrevMonth = () => {
    setSelectedDates(new Set());
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDates(new Set());
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const selectAllDayOfWeek = (dow: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const matchingDates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month, d).getDay() === dow) {
        matchingDates.push(toYMD(year, month, d));
      }
    }
    setSelectedDates((prev) => {
      const next = new Set(prev);
      const allAlreadySelected = matchingDates.every((dt) => next.has(dt));
      if (allAlreadySelected) {
        matchingDates.forEach((dt) => next.delete(dt));
      } else {
        matchingDates.forEach((dt) => next.add(dt));
      }
      return next;
    });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedCoachId) {
      setFeedback({ type: "error", text: "Please select a coach." });
      return;
    }
    if (!selectedClassId) {
      setFeedback({ type: "error", text: "Please select a class." });
      return;
    }
    if (selectedDates.size === 0) {
      setFeedback({
        type: "error",
        text: "Please select at least one date on the calendar.",
      });
      return;
    }

    const datesArray = Array.from(selectedDates).sort();

    startTransition(async () => {
      const res = await addCoachScheduleEntriesAction({
        coachId: selectedCoachId,
        classId: selectedClassId,
        dates: datesArray,
        startTime,
        endTime,
        remarks: remarks.trim(),
      });

      if (res.error) {
        setFeedback({ type: "error", text: res.error });
      } else {
        setFeedback({
          type: "success",
          text: `Scheduled ${datesArray.length} class session(s) for ${MONTHS[month]} ${year}.`,
        });
        setSelectedDates(new Set());
        setRemarks("");
        router.refresh();
      }
    });
  };

  const openEditModal = (rec: ScheduleRecord) => {
    const parsed = parseScheduleNotes(rec.notes, rec.created_at);
    setEditingRecord(rec);
    setEditCoachId(rec.coach_id);
    setEditClassId(rec.class_id);
    setEditDate(rec.date);
    setEditStartTime(parsed.startTime || "09:00");
    setEditEndTime(parsed.endTime || "10:00");
    setEditRemarks(parsed.remarks || "");
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    startTransition(async () => {
      const res = await updateCoachScheduleEntryAction(editingRecord.id, {
        coachId: editCoachId,
        classId: editClassId,
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        remarks: editRemarks.trim(),
      });
      if (res.error) {
        alert(res.error);
      } else {
        setEditingRecord(null);
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteCoachScheduleEntryAction(id);
      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header & Month Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--ka-black)",
              margin: "0 0 4px 0",
            }}
          >
            Coach Monthly Schedule
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Assign and manage the classes each coach will teach in a month.
          </p>
        </div>

        {/* Month Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="btn btn-secondary"
            style={{ padding: "8px 14px", fontSize: "0.85rem" }}
          >
            &larr; Prev
          </button>
          <div
            style={{
              padding: "8px 18px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--ka-white)",
              border: "1px solid var(--border-gray)",
              fontWeight: 700,
              fontSize: "0.95rem",
              color: "var(--ka-black)",
              minWidth: "155px",
              textAlign: "center",
            }}
          >
            {MONTHS[month]} {year}
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="btn btn-secondary"
            style={{ padding: "8px 14px", fontSize: "0.85rem" }}
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            backgroundColor: feedback.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: feedback.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${feedback.type === "success" ? "#a7f3d0" : "#fca5a5"}`,
            fontSize: "0.9rem",
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              color: "inherit",
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* ── SECTION 1: Fill In Coach Classes in a Month ── */}
      <form
        onSubmit={handleAssignSubmit}
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Coach, Class, Time & Remarks */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ borderBottom: "1px solid var(--border-gray)", paddingBottom: "10px" }}>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--ka-black)" }}>
              1. Class &amp; Coach Details
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Choose the coach, class, and teaching time slot.
            </p>
          </div>

          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
              Select Coach
            </label>
            <select
              className="form-input"
              value={selectedCoachId}
              onChange={(e) => setSelectedCoachId(e.target.value)}
              required
            >
              {coaches.length === 0 && <option value="">No coaches found</option>}
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name || "Unnamed Coach"} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
              Select Class to Teach
            </label>
            <select
              className="form-input"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              required
            >
              {Object.entries(groupedClasses).map(([locName, clsList]) => (
                <optgroup key={locName} label={locName}>
                  {clsList.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.type})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
                Start Time
              </label>
              <input
                type="time"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
                End Time
              </label>
              <input
                type="time"
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
              Remarks / Notes <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Lane 1-2, Bring kickboards"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>

        {/* Right Column: Multi-Date Monthly Calendar Picker */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ borderBottom: "1px solid var(--border-gray)", paddingBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--ka-black)" }}>
                2. Select Teaching Dates in {MONTHS[month]} {year}
              </h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Click individual dates or quick-select a recurring day of the week.
              </p>
            </div>
            {selectedDates.size > 0 && (
              <span className="badge badge-primary">
                {selectedDates.size} Date{selectedDates.size !== 1 ? "s" : ""} Selected
              </span>
            )}
          </div>

          {/* Quick Select Day-of-Week Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {DAYS_SHORT.map((dayLabel, dow) => (
              <button
                key={dayLabel}
                type="button"
                onClick={() => selectAllDayOfWeek(dow)}
                style={{
                  padding: "5px 10px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--border-gray)",
                  backgroundColor: "var(--bg-light)",
                  color: "var(--ka-black)",
                  cursor: "pointer",
                }}
              >
                All {dayLabel}s
              </button>
            ))}
            {selectedDates.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedDates(new Set())}
                style={{
                  padding: "5px 10px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  borderRadius: "var(--radius-full)",
                  border: "1px solid #fecaca",
                  backgroundColor: "#fef2f2",
                  color: "#dc2626",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Calendar Grid */}
          <div
            style={{
              border: "1px solid var(--border-gray)",
              borderRadius: "var(--radius-md)",
              padding: "12px",
              backgroundColor: "var(--bg-light)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "6px",
                textAlign: "center",
                marginBottom: "8px",
              }}
            >
              {DAYS_SHORT.map((d) => (
                <div
                  key={d}
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "6px",
              }}
            >
              {calendarCells.map((cell, idx) => {
                if (!cell.dateStr || !cell.day) {
                  return <div key={`empty-${idx}`} style={{ height: "38px" }} />;
                }
                const isSelected = selectedDates.has(cell.dateStr);
                const existingCount = existingCoachDatesMap.get(cell.dateStr) || 0;
                const isToday = cell.dateStr === todayStr;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => toggleDate(cell.dateStr!)}
                    title={
                      existingCount > 0
                        ? `${existingCount} class(es) already scheduled for this coach on ${cell.dateStr}`
                        : cell.dateStr
                    }
                    style={{
                      height: "38px",
                      borderRadius: "8px",
                      border: isSelected
                        ? "2px solid var(--ka-blue)"
                        : isToday
                        ? "1.5px solid var(--ka-black)"
                        : "1px solid var(--border-gray)",
                      backgroundColor: isSelected
                        ? "var(--ka-blue)"
                        : existingCount > 0
                        ? "var(--bg-tint)"
                        : "var(--ka-white)",
                      color: isSelected ? "white" : "var(--ka-black)",
                      fontWeight: isSelected || isToday ? 700 : 500,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.12s",
                    }}
                  >
                    {cell.day}
                    {existingCount > 0 && !isSelected && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: "3px",
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          backgroundColor: "var(--ka-blue)",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || selectedDates.size === 0}
            className="btn btn-primary btn-full"
            style={{ padding: "12px", fontSize: "0.95rem", marginTop: "4px" }}
          >
            {isPending
              ? "Saving Schedule..."
              : `Save ${selectedDates.size > 0 ? `${selectedDates.size} ` : ""}Class Session${selectedDates.size === 1 ? "" : "s"} to Monthly Schedule`}
          </button>
        </div>
      </form>

      {/* ── SECTION 2: Monthly Coach Schedule Table ── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Table Header & Filters */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--border-gray)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            backgroundColor: "var(--ka-white)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--ka-black)" }}>
              Scheduled Coach Classes — {MONTHS[month]} {year}
            </h2>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Showing {monthlyScheduleRecords.length} scheduled session{monthlyScheduleRecords.length === 1 ? "" : "s"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <select
              className="form-input"
              style={{ width: "auto", minWidth: "170px", padding: "8px 12px", fontSize: "0.85rem" }}
              value={filterCoachId}
              onChange={(e) => setFilterCoachId(e.target.value)}
            >
              <option value="all">All Coaches</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name || "Unnamed Coach"}
                </option>
              ))}
            </select>

            <select
              className="form-input"
              style={{ width: "auto", minWidth: "180px", padding: "8px 12px", fontSize: "0.85rem" }}
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {monthlyScheduleRecords.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-secondary)" }}>
            No coach classes scheduled for {MONTHS[month]} {year} matching the current filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-light)", borderBottom: "1px solid var(--border-gray)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", width: "44px" }}>
                    #
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Date &amp; Day
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Time
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Coach
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Class to Teach
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Remarks
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyScheduleRecords.map((rec, idx) => {
                  const [y, m, d] = rec.date.split("-").map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  const dayName = dateObj.toLocaleDateString("en-MY", { weekday: "short" });
                  const dateFormatted = dateObj.toLocaleDateString("en-MY", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  const { startTime: st, endTime: et, remarks: rem } = parseScheduleNotes(
                    rec.notes,
                    rec.created_at
                  );
                  const coachObj = coaches.find((c) => c.id === rec.coach_id);
                  const coachName =
                    rec.users?.display_name ||
                    coachObj?.display_name ||
                    "Coach";
                  const coachAvatarUrl =
                    rec.users?.avatar_url ||
                    coachObj?.avatar_url ||
                    null;
                  const clsObj = rec.classes || classes.find((c) => c.id === rec.class_id);
                  const className = clsObj?.name || "Class";
                  const classType = clsObj?.type || "STANDARD";
                  const locName = clsObj?.locations?.name;

                  return (
                    <tr
                      key={rec.id}
                      style={{
                        borderBottom:
                          idx < monthlyScheduleRecords.length - 1
                            ? "1px solid var(--bg-light)"
                            : "none",
                      }}
                    >
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, color: "var(--ka-black)" }}>{dateFormatted}</span>{" "}
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>({dayName})</span>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--ka-blue)", whiteSpace: "nowrap" }}>
                        {formatTimeRange(st, et)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              backgroundColor: "var(--bg-tint)",
                              color: "var(--ka-blue)",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              overflow: "hidden",
                            }}
                          >
                            {coachAvatarUrl ? (
                              <img
                                src={coachAvatarUrl}
                                alt={coachName}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              coachName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <span style={{ fontWeight: 600, color: "var(--ka-black)" }}>{coachName}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, color: "var(--ka-black)" }}>{className}</span>
                          <span className="badge badge-secondary" style={{ fontSize: "0.68rem", padding: "2px 6px" }}>
                            {classType}
                          </span>
                        </div>
                        {locName && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                            {locName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                        {rem || <span style={{ opacity: 0.4 }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(rec)}
                          style={{
                            padding: "5px 10px",
                            marginRight: "6px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid #bfdbfe",
                            backgroundColor: "#eff6ff",
                            color: "#1d4ed8",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id)}
                          disabled={isPending}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid #fecaca",
                            backgroundColor: "#fff1f2",
                            color: "#dc2626",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Schedule Modal */}
      {editingRecord && (
        <div
          onClick={() => setEditingRecord(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ maxWidth: "440px", width: "100%", padding: "24px" }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "1.15rem", fontWeight: 700 }}>
              Edit Scheduled Class
            </h3>
            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px" }}>
                  Coach
                </label>
                <select
                  className="form-input"
                  value={editCoachId}
                  onChange={(e) => setEditCoachId(e.target.value)}
                  required
                >
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name || "Unnamed Coach"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px" }}>
                  Class
                </label>
                <select
                  className="form-input"
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  required
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px" }}>
                  Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px" }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "4px" }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "4px" }}>
                  Remarks
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="btn btn-primary">
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
