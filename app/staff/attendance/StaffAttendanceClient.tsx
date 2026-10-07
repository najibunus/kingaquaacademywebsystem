"use client";

import React, { useState, useTransition, useMemo, useCallback } from "react";
import styles from "./staff-attendance.module.css";
import { bulkLogAttendanceAction, deleteAttendanceAction } from "@/lib/actions/attendance";
import { updateStudentProfile } from "@/lib/actions/students";
import { deleteInvoiceAction } from "@/lib/actions/invoices";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassOption {
  id: string;
  name: string;
  type?: string;
  locations?: { name: string } | null;
}
interface InvoiceItem { description: string; unit_price: number; quantity: number; }
interface Invoice {
  id: string; invoice_number: string; type: string; status: string;
  payment_status: string; created_at: string; due_date: string | null;
  invoice_items: InvoiceItem[];
}
interface AttendanceLog {
  id: string; date: string; timestamp: string | null;
  status: string; sessions_deducted: number; created_at: string;
}
interface Student {
  id: string; name: string; class_id: string | null;
  status: string; parent_id: string | null; pricing_tier: string | null;
  classes: { name: string; type: string; locations?: { name: string } | null } | null;
  invoices: Invoice[] | null;
  attendance: AttendanceLog[] | null;
}
interface Props { students: Student[]; classes: ClassOption[]; }

// A single entry in the modal pending list
interface PendingEntry {
  date: string;   // YYYY-MM-DD
  sessions: 1 | 2;
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

interface CalendarProps {
  pendingDates: Set<string>;   // dates already in the pending list
  loggedDates: Set<string>;    // already saved in DB
  onToggle: (dateStr: string) => void;
}

function MiniCalendar({ pendingDates, loggedDates, onToggle }: CalendarProps) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, dateStr: toYMD(calYear, calMonth, d) });

  return (
    <div>
      <div className={styles.calNav}>
        <button className={styles.calNavBtn} onClick={prevMonth}>‹</button>
        <span className={styles.calMonthLabel}>{MONTHS[calMonth]} {calYear}</span>
        <button className={styles.calNavBtn} onClick={nextMonth}>›</button>
      </div>
      <div className={styles.calGrid}>
        {DAYS.map(d => <div key={d} className={styles.calDayHeader}>{d}</div>)}
        {cells.map((cell, i) => {
          if (!cell.dateStr) return <div key={`e-${i}`} className={`${styles.calDay} ${styles.calDayEmpty}`} />;
          const isPending = pendingDates.has(cell.dateStr);
          const hasLog = loggedDates.has(cell.dateStr);
          return (
            <div
              key={cell.dateStr}
              className={[
                styles.calDay,
                isPending ? styles.calDaySelected : "",
                !isPending && hasLog ? styles.calDayHasLog : "",
              ].join(" ")}
              onClick={() => onToggle(cell.dateStr!)}
              title={hasLog ? "Already logged on this date" : undefined}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export default function StaffAttendanceClient({ students, classes }: Props) {
  // Filters
  const [selectedClass, setSelectedClass] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Master date — filter/display only
  const todayLocal = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
  }, []);
  const [filterDate, setFilterDate] = useState(todayLocal);

  // Pagination
  const [page, setPage] = useState(1);

  // History drawer
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedPkgId, setExpandedPkgId] = useState<string | null>(null);

  // Active status optimistic
  const [localActiveStatus, setLocalActiveStatus] = useState<Record<string, string>>({});
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Modal and multi-select state
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [modalStudents, setModalStudents] = useState<Student[]>([]);
  const [modalStatus, setModalStatus] = useState("present");
  // Pending list: ordered array so staff can see what they've built up
  const [pendingList, setPendingList] = useState<PendingEntry[]>([]);
  const [isSavingModal] = useState(false); // kept for button label compat; modal closes optimistically

  const [, startTransition] = useTransition();

  // ── Derived data ──────────────────────────────────────────────────────────────

  const groupedClasses = useMemo(() => classes.reduce((acc, cls) => {
    const loc = cls.locations?.name || "Other";
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(cls);
    return acc;
  }, {} as Record<string, ClassOption[]>), [classes]);

  const filteredStudents = useMemo(() => students.filter(s => {
    const matchClass = selectedClass === "all" || s.class_id === selectedClass;
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchClass && matchSearch;
  }), [students, selectedClass, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStudents = filteredStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Set of pending dates for fast lookup by the calendar
  const pendingDateSet = useMemo(() => new Set(pendingList.map(e => e.date)), [pendingList]);

  // Total sessions that will be saved
  const totalPendingSessions = useMemo(() => pendingList.reduce((sum, e) => sum + e.sessions, 0), [pendingList]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const openModal = (studentsToOpen: Student[]) => {
    setModalStudents(studentsToOpen);
    setModalStatus("present");
    setPendingList([]);
  };
  const closeModal = () => { setModalStudents([]); setPendingList([]); };

  // Toggle a date in the pending list
  const toggleDate = useCallback((dateStr: string) => {
    setPendingList(prev => {
      if (prev.some(e => e.date === dateStr)) {
        return prev.filter(e => e.date !== dateStr);
      }
      const next = [...prev, { date: dateStr, sessions: 1 as const }];
      next.sort((a, b) => a.date.localeCompare(b.date));
      return next;
    });
  }, []);

  // Change session count for a specific pending date
  const setDateSessions = useCallback((dateStr: string, sessions: 1 | 2) => {
    setPendingList(prev => prev.map(e => e.date === dateStr ? { ...e, sessions } : e));
  }, []);

  // Remove one entry from the pending list
  const removeDate = useCallback((dateStr: string) => {
    setPendingList(prev => prev.filter(e => e.date !== dateStr));
  }, []);

  const handleBulkSave = () => {
    if (modalStudents.length === 0 || pendingList.length === 0) return;

    // Expand: a date with sessions=2 becomes two entries in the dates array
    const expanded: string[] = [];
    for (const entry of pendingList) {
      for (let i = 0; i < entry.sessions; i++) {
        expanded.push(entry.date);
      }
    }

    // Snapshot values before closing modal
    const studentsToProcess = [...modalStudents];

    // ✅ OPTIMISTIC: close the modal instantly
    closeModal();
    setSelectedStudentIds(new Set()); // clear multi-select

    // Fire the actual save in the background
    startTransition(async () => {
      for (const s of studentsToProcess) {
        const res = await bulkLogAttendanceAction(
          s.id,
          s.class_id || "",
          modalStatus,
          expanded,
          1 // each record deducts 1 session
        );
        if (!(res as { success?: boolean }).success) {
          alert(`Failed to save attendance for ${s.name}: ${(res as { error?: string }).error}`);
        }
      }
    });
  };

  const toggleStatus = (s: Student) => {
    const currentStatus = localActiveStatus[s.id] ?? s.status;
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    
    // Prompt warning when marking as inactive
    if (newStatus === "inactive") {
      if (!confirm(`Are you sure you want to mark ${s.name} as inactive?`)) {
        return;
      }
    }

    setLocalActiveStatus(p => ({ ...p, [s.id]: newStatus }));
    setTogglingIds(prev => new Set(prev).add(s.id));
    startTransition(async () => {
      const res = await updateStudentProfile(s.id, { status: newStatus }, ["/staff/attendance"]);
      setTogglingIds(prev => { const n = new Set(prev); n.delete(s.id); return n; });
      if (!res.success) {
        alert(res.error || "Failed to update status");
        setLocalActiveStatus(p => ({ ...p, [s.id]: currentStatus }));
      }
    });
  };

  const handleDelete = (attId: string, studentId: string, status: string, deduction: number) => {
    if (!confirm("Delete this attendance record?")) return;
    startTransition(async () => {
      const res = await deleteAttendanceAction(attId, studentId, status, deduction);
      if (!(res as { success?: boolean }).success) alert((res as { error?: string }).error || "Failed to delete");
    });
  };

  const handleDeletePackage = (invoiceId: string, attendanceIds: string[], studentId: string) => {
    if (!confirm(`Delete this package? This will permanently remove the package and its ${attendanceIds.length} associated attendance dates.`)) return;
    startTransition(async () => {
      const res = await deleteInvoiceAction(invoiceId, attendanceIds, studentId);
      if (!res.success) alert(res.error || "Failed to delete package");
    });
  };


  // ── Package label helper ──────────────────────────────────────────────────────

  // For group-billed students (e.g. "2 People (Private)"), the invoice is only
  // linked to ONE sibling via student_id. This helper merges invoices from all
  // siblings sharing the same parent + class so every group member sees the
  // correct package status.
  const GROUP_TIERS = new Set(["2 People (Private)"]);

  function getEffectiveInvoices(s: Student): Invoice[] {
    const own = s.invoices || [];
    if (!GROUP_TIERS.has(s.pricing_tier ?? "")) return own;

    // Collect invoices from siblings in the same parent + class
    const merged = new Map<string, Invoice>();
    for (const inv of own) merged.set(inv.id, inv);

    for (const sibling of students) {
      if (sibling.id === s.id) continue;
      if (sibling.parent_id !== s.parent_id) continue;
      if (sibling.class_id !== s.class_id) continue;
      if (!GROUP_TIERS.has(sibling.pricing_tier ?? "")) continue;
      for (const inv of (sibling.invoices || [])) {
        merged.set(inv.id, inv);
      }
    }
    return Array.from(merged.values());
  }

  function getPkgLabel(s: Student): string {
    const invoices = [...getEffectiveInvoices(s)].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (!invoices.length) return "";
    const pkgIndex = invoices.length;
    if (s.classes?.type === "ADV01") {
      const latest = invoices[0];
      const month = new Date(latest.created_at).getMonth();
      const year = new Date(latest.created_at).getFullYear();
      const count = (s.attendance || [])
        .filter(a => { const d = new Date(a.date); return d.getMonth() === month && d.getFullYear() === year; })
        .reduce((sum, a) => sum + a.sessions_deducted, 0);
      return `Package ${pkgIndex} (${count} sessions this month)`;
    }
    const total = (s.attendance || []).reduce((sum, a) => sum + a.sessions_deducted, 0);
    let cur = total % 4;
    if (cur === 0 && total > 0) cur = 4;
    return `Package ${pkgIndex} (${cur}/4 Sessions)`;
  }

  const modalLoggedDates = useMemo((): Set<string> => {
    if (modalStudents.length !== 1) return new Set();
    return new Set((modalStudents[0].attendance || []).map(a => a.date));
  }, [modalStudents]);

  const colSpan = 8;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="animate-fade-in-up">
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Attendance Logging</h1>
            <p className={styles.subtitle}>
              {filteredStudents.length} students · {totalPages} page{totalPages !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <span className={styles.toolbarLabel}>Search</span>
          <input
            type="text"
            placeholder="Student name..."
            className={styles.toolbarInput}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            style={{ maxWidth: "160px" }}
          />
          <div className={styles.toolbarSep} />
          <span className={styles.toolbarLabel}>Filter Date</span>
          <input
            type="date"
            className={styles.toolbarInput}
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            ← filters the &quot;Logged&quot; column
          </span>
          <div className={styles.toolbarSep} />
          <span className={styles.toolbarLabel}>Class</span>
          <select
            className={styles.toolbarSelect}
            value={selectedClass}
            onChange={e => { setSelectedClass(e.target.value); setPage(1); }}
          >
            <option value="all">All Classes</option>
            {Object.keys(groupedClasses).sort().map(loc => (
              <optgroup key={loc} label={loc}>
                {groupedClasses[loc].map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.type === "ADV01" ? " (ADV01)" : ""}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {selectedStudentIds.size > 0 && (
            <>
              <div className={styles.toolbarSep} />
              <button
                style={{
                  background: "var(--ka-blue)", color: "white", padding: "6px 12px",
                  borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, border: "none", cursor: "pointer"
                }}
                onClick={() => {
                  const toOpen = students.filter(s => selectedStudentIds.has(s.id));
                  openModal(toOpen);
                }}
              >
                Take Attendance for {selectedStudentIds.size} Students
              </button>
            </>
          )}
        </div>

        {/* Dense Table */}
        <div className={styles.denseTableCard}>
          <table className={styles.denseTable}>
            <thead>
              <tr>
                <th style={{ width: "30px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={pageStudents.length > 0 && pageStudents.every(s => selectedStudentIds.has(s.id))}
                    onChange={e => {
                      const next = new Set(selectedStudentIds);
                      if (e.target.checked) {
                        pageStudents.forEach(s => next.add(s.id));
                      } else {
                        pageStudents.forEach(s => next.delete(s.id));
                      }
                      setSelectedStudentIds(next);
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th style={{ width: "30px" }}>#</th>
                <th>Student</th>
                <th>Package Status</th>
                <th>History</th>
                <th>Logged on {filterDate}</th>
                <th>Active Status</th>
                <th>Add Attendance</th>
              </tr>
            </thead>
            <tbody>
              {pageStudents.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)", fontStyle: "italic" }}>
                    No students found.
                  </td>
                </tr>
              ) : pageStudents.map((s, idx) => {
                const sortedInvoices = [...getEffectiveInvoices(s)].sort(
                  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                const activeInvoice = sortedInvoices[0];
                const isApproved = activeInvoice?.payment_status === "paid" || activeInvoice?.status === "approved";
                const hasPending = activeInvoice && !isApproved;
                const noPackage = !activeInvoice;
                const pkgLabel = getPkgLabel(s);
                const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                const logsForDate = (s.attendance || []).filter(a => a.date === filterDate);
                const isActive = (localActiveStatus[s.id] ?? s.status) === "active";
                const isToggling = togglingIds.has(s.id);
                const isExpanded = expandedId === s.id;

                const colSpan = 8;
                return (
                  <React.Fragment key={s.id}>
                    <tr>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(s.id)}
                          onChange={e => {
                            const next = new Set(selectedStudentIds);
                            if (e.target.checked) next.add(s.id);
                            else next.delete(s.id);
                            setSelectedStudentIds(next);
                          }}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{rowNum}</td>
                      <td>
                        <div className={styles.denseStudentName}>{s.name}</div>
                        <div className={styles.denseClassName}>{s.classes?.name ?? "Unassigned"}</div>
                      </td>
                      <td>
                        {pkgLabel ? (
                          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ka-black)" }}>
                            {pkgLabel}
                            {GROUP_TIERS.has(s.pricing_tier ?? "") && (
                              <span style={{ 
                                display: "inline-block",
                                fontSize: "0.6rem", fontWeight: 700, padding: "1px 4px", 
                                borderRadius: "4px", background: "#e0e7ff", color: "#3730a3",
                                marginLeft: "6px", verticalAlign: "middle", marginTop: "-2px"
                              }}>
                                SHARED BILL
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={styles.badgeNone}>No Package</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={styles.historyToggle}
                          onClick={() => { setExpandedId(isExpanded ? null : s.id); setExpandedPkgId(null); }}
                        >
                          {isExpanded ? "Hide ▲" : "Show ▼"}
                        </button>
                      </td>
                      <td>
                        {logsForDate.length === 0 ? (
                          <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontStyle: "italic" }}>—</span>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            {logsForDate.map(att => (
                              <div key={att.id} style={{ fontSize: "0.75rem", fontWeight: 700, color: "#059669" }}>
                                ✓ {att.status.charAt(0).toUpperCase() + att.status.slice(1)}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => toggleStatus(s)}
                          disabled={isToggling}
                          style={{
                            padding: "4px 10px", borderRadius: "999px", border: "none",
                            fontSize: "0.75rem", fontWeight: 700,
                            cursor: isToggling ? "not-allowed" : "pointer",
                            opacity: isToggling ? 0.6 : 1,
                            background: isActive ? "#dcfce7" : "#f1f5f9",
                            color: isActive ? "#166534" : "#475569",
                            transition: "all 0.2s",
                          }}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td>
                        <button className={styles.addAttBtn} onClick={() => openModal([s])}>
                          + Add Attendance
                        </button>
                      </td>
                    </tr>

                    {/* History drawer */}
                    {isExpanded && (
                      <tr className={styles.historyRow}>
                        <td colSpan={colSpan}>
                          <div className={styles.historyDrawer}>
                            
                            {/* Packages Section */}
                            <div className={styles.historyDrawerTitle}>Package History</div>
                            {sortedInvoices.length === 0 ? (
                              <div className={styles.historyEmpty}>No packages on record.</div>
                            ) : (
                              (() => {
                                const allPresent = [...(s.attendance || [])]
                                  .filter(a => a.status === 'present')
                                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                                return sortedInvoices.map((inv, i, arr) => {
                                  const pkgIndex = arr.length - i;
                                  const pkgLabel2 = `Package ${pkgIndex}`;
                                  const total = inv.invoice_items?.reduce((sum, it) => sum + it.unit_price * it.quantity, 0) || 0;
                                  
                                  let pkgAttendances: typeof allPresent = [];
                                  if (s.classes?.type === "ADV01") {
                                    const month = new Date(inv.created_at).getMonth();
                                    const year = new Date(inv.created_at).getFullYear();
                                    pkgAttendances = allPresent.filter(a => {
                                      const d = new Date(a.date);
                                      return d.getMonth() === month && d.getFullYear() === year;
                                    });
                                  } else {
                                    const startIndex = (pkgIndex - 1) * 4;
                                    pkgAttendances = allPresent.slice(startIndex, startIndex + 4);
                                  }

                                  const isPkgExpanded = expandedPkgId === inv.id;

                                  return (
                                    <div key={inv.id} style={{ marginBottom: "12px", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>{pkgLabel2}</span>
                                          {GROUP_TIERS.has(s.pricing_tier ?? "") && (
                                            <span style={{ 
                                              fontSize: "0.6rem", fontWeight: 700, padding: "1px 4px", 
                                              borderRadius: "4px", background: "#e0e7ff", color: "#3730a3",
                                              marginRight: "2px"
                                            }}>
                                              SHARED BILL
                                            </span>
                                          )}
                                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }} suppressHydrationWarning>
                                            RM {total.toFixed(2)} · {new Date(inv.created_at).toLocaleDateString()}
                                          </span>
                                          <span style={{
                                            fontSize: "0.7rem", fontWeight: 700, padding: "1px 6px", borderRadius: "999px",
                                            background: (inv.payment_status === "paid" || inv.status === "approved") ? "#dcfce7" : "#fef3c7",
                                            color: (inv.payment_status === "paid" || inv.status === "approved") ? "#166534" : "#92400e",
                                          }}>
                                            {inv.payment_status.toUpperCase()}
                                          </span>
                                        </div>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                          <button 
                                            onClick={() => setExpandedPkgId(isPkgExpanded ? null : inv.id)}
                                            style={{ 
                                              background: "none", border: "1px solid #cbd5e1", borderRadius: "6px", 
                                              padding: "4px 8px", fontSize: "0.7rem", cursor: "pointer", color: "#475569" 
                                            }}
                                          >
                                            {isPkgExpanded ? "Hide Details" : "Details"}
                                          </button>
                                          <button 
                                            onClick={() => {
                                              const attIds = pkgAttendances.map(a => a.id);
                                              handleDeletePackage(inv.id, attIds, s.id);
                                            }}
                                            style={{ 
                                              background: "none", border: "1px solid #fca5a5", borderRadius: "6px", 
                                              padding: "4px 8px", fontSize: "0.7rem", cursor: "pointer", color: "#dc2626" 
                                            }}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {isPkgExpanded && (
                                        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed #cbd5e1" }}>
                                          {pkgAttendances.length === 0 ? (
                                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>No present attendances found for this package.</div>
                                          ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                              {pkgAttendances.map(att => (
                                                <div key={att.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem" }}>
                                                  <span style={{ color: "#059669", fontWeight: 600 }}>✓ {att.date}</span>
                                                  <button
                                                    onClick={() => handleDelete(att.id, s.id, att.status, att.sessions_deducted)}
                                                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                                                  >
                                                    Delete
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                });
                              })()
                            )}

                            {/* Independent Full Attendance Section */}
                            <div className={styles.historyDrawerTitle} style={{ marginTop: "16px" }}>Full Attendance History</div>
                            {!(s.attendance?.length) ? (
                              <div className={styles.historyEmpty}>No attendance records found.</div>
                            ) : (
                              [...(s.attendance || [])]
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(att => (
                                  <div key={att.id} className={styles.historyEntry}>
                                    <div>
                                      <div className={styles.historyEntryDate}>{att.date}</div>
                                      <div className={styles.historyEntryMeta}>
                                        {att.status.charAt(0).toUpperCase() + att.status.slice(1)} · {att.sessions_deducted} session{att.sessions_deducted !== 1 ? "s" : ""} deducted
                                      </div>
                                    </div>
                                    <button
                                      className={styles.historyDeleteBtn}
                                      onClick={() => handleDelete(att.id, s.id, att.status, att.sessions_deducted)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ))
                            )}

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}>← Previous</button>
            <span className={styles.pageInfo}>Page {safePage} of {totalPages}</span>
            <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>Next →</button>
          </div>
        )}
      </div>

      {/* ── Attendance Modal ── */}
      {modalStudents.length > 0 && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={styles.modalBox}>

            {/* Header */}
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalTitle}>Add Attendance</p>
                <p className={styles.modalSubtitle}>
                  {modalStudents.length === 1 
                    ? `${modalStudents[0].name} · ${modalStudents[0].classes?.name ?? "Unassigned"}`
                    : `${modalStudents.length} Students Selected`}
                </p>
              </div>
              <button className={styles.modalClose} onClick={closeModal} aria-label="Close">✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* Status picker */}
              <div className={styles.modalStatusRow}>
                <span className={styles.modalStatusLabel}>Status for all dates</span>
                <select
                  className={styles.modalStatusSelect}
                  value={modalStatus}
                  onChange={e => setModalStatus(e.target.value)}
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="medical">MC</option>
                  <option value="leave">Leave</option>
                </select>
              </div>

              {/* Two-column layout: Calendar | Pending list */}
              <div className={styles.modalColumns}>
                {/* Left: Calendar */}
                <div className={styles.modalCalCol}>
                  <div className={styles.modalColLabel}>Select dates</div>
                  <MiniCalendar
                    pendingDates={pendingDateSet}
                    loggedDates={modalLoggedDates}
                    onToggle={toggleDate}
                  />
                  <div className={styles.calLegend}>
                    <span className={styles.calLegendBlue} /> Selected &nbsp;·&nbsp;
                    <span className={styles.calLegendGreen} /> Already logged
                  </div>
                </div>

                {/* Right: Pending list */}
                <div className={styles.modalListCol}>
                  <div className={styles.modalColLabel}>
                    Attendance to save
                    {pendingList.length > 0 && (
                      <span style={{ fontWeight: 400, color: "var(--text-secondary)", marginLeft: "6px" }}>
                        ({totalPendingSessions} session{totalPendingSessions !== 1 ? "s" : ""} total)
                      </span>
                    )}
                  </div>
                  {pendingList.length === 0 ? (
                    <div className={styles.pendingEmpty}>
                      Click dates on the calendar to add them here.
                    </div>
                  ) : (
                    <div className={styles.pendingList}>
                      {pendingList.map(entry => (
                        <div key={entry.date} className={styles.pendingRow}>
                          <div className={styles.pendingDate}>{formatDisplayDate(entry.date)}</div>
                          {/* Session toggle: 1x or 2x */}
                          <div className={styles.sessionToggleGroup}>
                            <button
                              className={`${styles.sessionToggleBtn} ${entry.sessions === 1 ? styles.sessionToggleBtnActive : ""}`}
                              onClick={() => setDateSessions(entry.date, 1)}
                            >
                              1×
                            </button>
                            <button
                              className={`${styles.sessionToggleBtn} ${entry.sessions === 2 ? styles.sessionToggleBtnActive : ""}`}
                              onClick={() => setDateSessions(entry.date, 2)}
                            >
                              2×
                            </button>
                          </div>
                          <button
                            className={styles.pendingRemoveBtn}
                            onClick={() => removeDate(entry.date)}
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                {pendingList.length === 0
                  ? "No dates selected yet."
                  : `${pendingList.length} date${pendingList.length !== 1 ? "s" : ""} · ${totalPendingSessions} session${totalPendingSessions !== 1 ? "s" : ""} will be saved.`}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className={styles.modalCancelBtn} onClick={closeModal} disabled={isSavingModal}>Cancel</button>
                <button
                  className={styles.modalConfirmBtn}
                  onClick={handleBulkSave}
                  disabled={pendingList.length === 0 || isSavingModal}
                >
                  {isSavingModal ? "Saving…" : `Confirm & Save`}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
