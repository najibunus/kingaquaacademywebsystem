"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./games.module.css";
import {
  createTournamentAction,
  updateTournamentAction,
  deleteTournamentAction,
  addTournamentResultAction,
  deleteTournamentResultAction,
} from "@/lib/actions/games";

interface StudentResult {
  id: string;
  stroke: string;
  distance: number;
  time_record: string;
  created_at: string;
  students?: {
    id: string;
    name: string;
  } | null;
}

interface Tournament {
  id: string;
  name: string;
  date: string;
  venue?: string | null;
  created_at?: string;
  tournament_results?: StudentResult[];
}

interface ClassOption {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  name: string;
  class_id?: string | null;
  classes?: {
    name: string;
  } | null;
}

interface RecentResult {
  id: string;
  stroke: string;
  distance: number;
  time_record: string;
  created_at: string;
  students?: {
    name: string;
  } | null;
  tournaments?: {
    name: string;
  } | null;
}

interface Props {
  tournaments: Tournament[];
  classes: ClassOption[];
  students: StudentOption[];
  recentResults: RecentResult[];
}

export default function StaffGamesClient({
  tournaments,
  classes,
  students,
  recentResults,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  // Create form state
  const [gameName, setGameName] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [gameVenue, setGameVenue] = useState("");

  // Edit modal state
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editVenue, setEditVenue] = useState("");

  // Delete modal state
  const [deletingTournament, setDeletingTournament] = useState<Tournament | null>(null);

  // Result entry state
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [stroke, setStroke] = useState("FR");
  const [distance, setDistance] = useState("50");
  const [timeRecord, setTimeRecord] = useState("");

  // Accordion state for viewing individual tournament results
  const [expandedTournamentId, setExpandedTournamentId] = useState<string | null>(null);

  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const resultFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const distances = stroke === "IM" ? ["100", "200"] : ["20", "50", "100", "200", "400", "800"];

  const showToast = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 4000);
  };

  // 1. Create Tournament
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !gameDate) return;

    startTransition(async () => {
      const res = await createTournamentAction(gameName, gameDate, gameVenue);
      if (res.success) {
        showToast("Competition created successfully!");
        setGameName("");
        setGameDate("");
        setGameVenue("");
        if (res.data?.id) {
          setSelectedTournament(res.data.id);
        }
      } else {
        showToast("Error: " + res.error, true);
      }
    });
  };

  // 2. Open Edit Modal
  const handleStartEdit = (t: Tournament) => {
    setEditingTournament(t);
    setEditName(t.name);
    setEditDate(t.date ? t.date.split("T")[0] : "");
    setEditVenue(t.venue || "");
  };

  // 3. Save Edit Tournament
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournament || !editName.trim() || !editDate) return;

    startTransition(async () => {
      const res = await updateTournamentAction(
        editingTournament.id,
        editName,
        editDate,
        editVenue
      );
      if (res.success) {
        showToast("Competition updated successfully!");
        setEditingTournament(null);
      } else {
        showToast("Error updating competition: " + res.error, true);
      }
    });
  };

  // 4. Confirm Delete Tournament
  const handleConfirmDelete = async () => {
    if (!deletingTournament) return;

    startTransition(async () => {
      const res = await deleteTournamentAction(deletingTournament.id);
      if (res.success) {
        showToast(`Competition "${deletingTournament.name}" deleted.`);
        if (selectedTournament === deletingTournament.id) {
          setSelectedTournament("");
        }
        if (expandedTournamentId === deletingTournament.id) {
          setExpandedTournamentId(null);
        }
        setDeletingTournament(null);
      } else {
        showToast("Error deleting competition: " + res.error, true);
      }
    });
  };

  // 5. Add Result to Tournament
  const handleAddResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !selectedStudent || !timeRecord.trim()) return;

    startTransition(async () => {
      const res = await addTournamentResultAction(
        selectedTournament,
        selectedStudent,
        stroke,
        parseInt(distance),
        timeRecord
      );
      if (res.success) {
        showToast("Race result recorded successfully!");
        setTimeRecord(""); // Reset time for next rapid entry
      } else {
        showToast("Error: " + res.error, true);
      }
    });
  };

  // 6. Delete a single result
  const handleDeleteResult = async (resultId: string) => {
    if (!confirm("Are you sure you want to delete this race result?")) return;

    startTransition(async () => {
      const res = await deleteTournamentResultAction(resultId);
      if (res.success) {
        showToast("Result deleted.");
      } else {
        showToast("Error deleting result: " + res.error, true);
      }
    });
  };

  // Adjust distance if switching to IM
  const handleStrokeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setStroke(val);
    if (val === "IM" && distance !== "100" && distance !== "200") {
      setDistance("100");
    }
  };

  const filteredStudents = selectedClassId
    ? students.filter((s) => s.class_id === selectedClassId)
    : students;

  const quickSelectTournament = (tId: string) => {
    setSelectedTournament(tId);
    if (resultFormRef.current) {
      resultFormRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 className={styles.title}>Competitions &amp; Tournaments</h1>
            <p className={styles.subtitle}>
              Manage swim meets, edit existing events, record student times, and update parent-facing results.
            </p>
          </div>
          <span className={styles.badgeResults}>
            {tournaments.length} Competition{tournaments.length !== 1 ? "s" : ""} Total
          </span>
        </div>
      </div>

      {/* Toast Alert */}
      {message && (
        <div
          style={{
            padding: "12px 18px",
            background: message.isError ? "#ef4444" : "#10b981",
            color: "white",
            borderRadius: "10px",
            marginBottom: "20px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <span>{message.isError ? "⚠️" : "✓"}</span>
          <span>{message.text}</span>
        </div>
      )}

      {/* ── SECTION 1: EXISTING COMPETITIONS ── */}
      <div className={styles.card} style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-gray)", paddingBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
          <h2 className={styles.cardTitle} style={{ borderBottom: "none", margin: 0, padding: 0 }}>
            Active &amp; Past Competitions
          </h2>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            Changes here sync directly to the Parent &amp; Public results page
          </span>
        </div>

        {tournaments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-secondary)" }}>
            <p style={{ margin: 0, fontWeight: 500 }}>No competitions recorded yet.</p>
            <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>
              Create your first competition using the form below.
            </p>
          </div>
        ) : (
          <div className={styles.competitionsGrid}>
            {tournaments.map((t) => {
              const resultCount = t.tournament_results?.length || 0;
              const isSelected = selectedTournament === t.id;
              const isExpanded = expandedTournamentId === t.id;

              return (
                <div
                  key={t.id}
                  className={`${styles.compCard} ${isSelected ? styles.compCardActive : ""}`}
                >
                  <div className={styles.compTop}>
                    {/* Left info */}
                    <div className={styles.compInfo}>
                      <div className={styles.compIcon}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8 21h8"></path>
                          <path d="M12 17v4"></path>
                          <path d="M7 4h10"></path>
                          <path d="M5 4h14a2 2 0 0 1 2 2v2a8 8 0 0 1-8 8h0a8 8 0 0 1-8-8V6a2 2 0 0 1 2-2z"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 className={styles.compName}>{t.name}</h3>
                        <div className={styles.compMeta}>
                          <span className={styles.compMetaItem}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" x2="21" y1="10" y2="10" />
                            </svg>
                            {new Date(t.date).toLocaleDateString("en-MY", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className={styles.compMetaItem}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {t.venue || "Venue not specified"}
                          </span>
                          <span className={`${styles.badgeResults} ${resultCount > 0 ? styles.badgeActive : ""}`}>
                            {resultCount} {resultCount === 1 ? "result" : "results"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className={styles.compActions}>
                      <button
                        type="button"
                        className={`${styles.btnAction} ${isSelected ? styles.btnActionPrimary : ""}`}
                        onClick={() => quickSelectTournament(t.id)}
                        title="Select this competition to input student results"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>{isSelected ? "Selected" : "Record Times"}</span>
                      </button>

                      <button
                        type="button"
                        className={styles.btnAction}
                        onClick={() =>
                          setExpandedTournamentId(isExpanded ? null : t.id)
                        }
                        title="View and manage results for this competition"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="8" y1="6" x2="21" y2="6"></line>
                          <line x1="8" y1="12" x2="21" y2="12"></line>
                          <line x1="8" y1="18" x2="21" y2="18"></line>
                          <line x1="3" y1="6" x2="3.01" y2="6"></line>
                          <line x1="3" y1="12" x2="3.01" y2="12"></line>
                          <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                        <span>{isExpanded ? "Hide" : "View"} ({resultCount})</span>
                      </button>

                      <button
                        type="button"
                        className={styles.btnAction}
                        onClick={() => handleStartEdit(t)}
                        title="Edit competition name, date, or venue"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className={`${styles.btnAction} ${styles.btnActionDanger}`}
                        onClick={() => setDeletingTournament(t)}
                        title="Remove competition and its results"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Results Table */}
                  {isExpanded && (
                    <div className={styles.compResultsWrap}>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "var(--ka-black)" }}>
                        Recorded Race Results for {t.name}
                      </h4>
                      {resultCount === 0 ? (
                        <div style={{ padding: "14px", color: "var(--text-secondary)", fontSize: "0.85rem", background: "var(--bg-light)", borderRadius: "8px", textAlign: "center" }}>
                          No results recorded yet for this competition. Use the form below to enter student times.
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table className={styles.resultsTable}>
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>Event</th>
                                <th>Time</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {t.tournament_results!.map((r) => (
                                <tr key={r.id}>
                                  <td style={{ fontWeight: 600 }}>{r.students?.name || "Unknown"}</td>
                                  <td>
                                    <span style={{ background: "var(--bg-light)", padding: "2px 8px", borderRadius: "6px", fontWeight: 600, fontSize: "0.78rem" }}>
                                      {r.distance}m {r.stroke}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 800, color: "var(--ka-blue)" }}>
                                    {r.time_record}
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <button
                                      type="button"
                                      className={`${styles.btnAction} ${styles.btnActionDanger}`}
                                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                      onClick={() => handleDeleteResult(r.id)}
                                      title="Delete this result"
                                      disabled={isPending}
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECTION 2: CREATE TOURNAMENT & INPUT RESULTS ── */}
      <div className={styles.grid}>
        {/* Left Column: Create Tournament */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>1. Create New Competition</h2>
            <form onSubmit={handleCreateGame}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Competition Name</label>
                <input
                  required
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Kejohanan MSSD 2026"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Event Date</label>
                <input
                  required
                  type="date"
                  className={styles.input}
                  value={gameDate}
                  onChange={(e) => setGameDate(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Venue / Pool Location</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. UTHM Swimming Pool, Parit Raja"
                  value={gameVenue}
                  onChange={(e) => setGameVenue(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <button disabled={isPending || !gameName.trim() || !gameDate} className={styles.submitBtn}>
                {isPending ? "Creating..." : "Create Competition"}
              </button>
            </form>
          </div>

          {/* Input Results Form */}
          <div className={styles.card} ref={resultFormRef}>
            <h2 className={styles.cardTitle}>2. Record Student Time</h2>
            <form onSubmit={handleAddResult}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Select Competition</label>
                <select
                  required
                  className={styles.select}
                  value={selectedTournament}
                  onChange={(e) => setSelectedTournament(e.target.value)}
                  disabled={isPending}
                >
                  <option value="">-- Choose Competition --</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({new Date(t.date).toLocaleDateString()}) {t.venue ? `• ${t.venue}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Filter by Class (Optional)</label>
                <select
                  className={styles.select}
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedStudent("");
                  }}
                  disabled={isPending}
                >
                  <option value="">-- All Classes --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Select Student</label>
                <select
                  required
                  className={styles.select}
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  disabled={isPending}
                >
                  <option value="">-- Choose Student --</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {!selectedClassId && s.classes?.name ? `(${s.classes.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.rowGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Stroke</label>
                  <select className={styles.select} value={stroke} onChange={handleStrokeChange} disabled={isPending}>
                    <option value="FR">Freestyle (FR)</option>
                    <option value="BR">Breaststroke (BR)</option>
                    <option value="FL">Butterfly (FL)</option>
                    <option value="BK">Backstroke (BK)</option>
                    <option value="IM">Ind. Medley (IM)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Distance (m)</label>
                  <select className={styles.select} value={distance} onChange={(e) => setDistance(e.target.value)} disabled={isPending}>
                    {distances.map((d) => (
                      <option key={d} value={d}>
                        {d}m
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Time Record</label>
                <input
                  required
                  type="text"
                  className={styles.input}
                  placeholder="e.g. 00:32.45 or 01:14.20"
                  value={timeRecord}
                  onChange={(e) => setTimeRecord(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <button
                disabled={isPending || !selectedTournament || !selectedStudent || !timeRecord.trim()}
                className={styles.submitBtn}
              >
                {isPending ? "Saving..." : "Save Result"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Recent Results Feed */}
        <div className={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-gray)", paddingBottom: "8px" }}>
            <h2 className={styles.cardTitle} style={{ borderBottom: "none", margin: 0, padding: 0 }}>
              Recent Recorded Times
            </h2>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {recentResults.length} total
            </span>
          </div>

          <div className={styles.resultList}>
            {recentResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-secondary)" }}>
                <p style={{ margin: 0, fontWeight: 500 }}>No results recorded yet.</p>
                <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>
                  Record a student time to populate this feed.
                </p>
              </div>
            ) : (
              recentResults.map((r) => (
                <div key={r.id} className={styles.resultItem}>
                  <div className={styles.resultInfo}>
                    <span className={styles.resultStudent}>{r.students?.name || "Unknown"}</span>
                    <span className={styles.resultDetails}>
                      {r.tournaments?.name || "Competition"} &bull; {r.distance}m {r.stroke}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className={styles.resultTime}>{r.time_record}</div>
                    <button
                      type="button"
                      className={`${styles.btnAction} ${styles.btnActionDanger}`}
                      style={{ padding: "4px 8px", fontSize: "0.75rem", borderRadius: "6px" }}
                      onClick={() => handleDeleteResult(r.id)}
                      title="Delete this result"
                      disabled={isPending}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: EDIT TOURNAMENT ── */}
      {mounted && editingTournament && typeof document !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setEditingTournament(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit Competition Details</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setEditingTournament(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Competition Name</label>
                  <input
                    required
                    type="text"
                    className={styles.input}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isPending}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Event Date</label>
                  <input
                    required
                    type="date"
                    className={styles.input}
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    disabled={isPending}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Venue / Pool Location</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. UTHM Swimming Pool"
                    value={editVenue}
                    onChange={(e) => setEditVenue(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnAction}
                  onClick={() => setEditingTournament(null)}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.btnAction} ${styles.btnActionPrimary}`}
                  disabled={isPending || !editName.trim() || !editDate}
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: DELETE TOURNAMENT CONFIRMATION ── */}
      {mounted && deletingTournament && typeof document !== "undefined" && createPortal(
        <div className={styles.modalOverlay} onClick={() => setDeletingTournament(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: "#dc2626" }}>
                Delete Competition?
              </h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setDeletingTournament(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ marginTop: 0, fontSize: "0.95rem", color: "var(--ka-black)" }}>
                Are you sure you want to permanently delete:
              </p>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 16px", borderRadius: "8px", marginBottom: "14px" }}>
                <strong style={{ fontSize: "1.05rem", color: "#b91c1c" }}>
                  {deletingTournament.name}
                </strong>
                <div style={{ fontSize: "0.85rem", color: "#7f1d1d", marginTop: "4px" }}>
                  Date: {new Date(deletingTournament.date).toLocaleDateString()}
                  {deletingTournament.venue ? ` • Venue: ${deletingTournament.venue}` : ""}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#dc2626" }}>
                ⚠️ Warning: This will delete this competition and all race times recorded under it. It will also be removed immediately from the Parent view.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnAction}
                onClick={() => setDeletingTournament(null)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnActionDanger}`}
                style={{ backgroundColor: "#dc2626", color: "#fff", borderColor: "#dc2626" }}
                onClick={handleConfirmDelete}
                disabled={isPending}
              >
                {isPending ? "Deleting..." : "Yes, Delete Competition"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
