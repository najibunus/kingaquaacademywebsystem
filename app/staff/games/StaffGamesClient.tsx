"use client";
import { useState, useTransition } from "react";
import styles from "./games.module.css";
import { createTournamentAction, addTournamentResultAction } from "@/lib/actions/games";

export default function StaffGamesClient({ tournaments, classes, students, recentResults }: { tournaments: any[], classes: any[], students: any[], recentResults: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [gameName, setGameName] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [gameVenue, setGameVenue] = useState("");

  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [stroke, setStroke] = useState("FR");
  const [distance, setDistance] = useState("50");
  const [timeRecord, setTimeRecord] = useState("");

  const [message, setMessage] = useState("");

  const distances = stroke === "IM" ? ["100", "200"] : ["20", "50", "100", "200", "400", "800"];

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName || !gameDate || !gameVenue) return;
    
    startTransition(async () => {
      const res = await createTournamentAction(gameName, gameDate, gameVenue);
      if (res.success) {
        setMessage("Tournament created successfully!");
        setGameName("");
        setGameDate("");
        setGameVenue("");
      } else {
        setMessage("Error: " + res.error);
      }
      setTimeout(() => setMessage(""), 3000);
    });
  };

  const handleAddResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !selectedStudent || !timeRecord) return;
    
    startTransition(async () => {
      const res = await addTournamentResultAction(selectedTournament, selectedStudent, stroke, parseInt(distance), timeRecord);
      if (res.success) {
        setMessage("Result added!");
        setTimeRecord(""); // Reset time for next entry
      } else {
        setMessage("Error: " + res.error);
      }
      setTimeout(() => setMessage(""), 3000);
    });
  };

  // Adjust distance if switching to IM
  const handleStrokeChange = (e: any) => {
    const val = e.target.value;
    setStroke(val);
    if (val === "IM" && distance !== "100" && distance !== "200") {
      setDistance("100");
    }
  };

  const filteredStudents = selectedClassId 
    ? students.filter(s => s.class_id === selectedClassId)
    : students;

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <h1 className={styles.title}>Competitions</h1>
        <p className={styles.subtitle}>Manage tournaments and input student times.</p>
      </div>

      {message && (
        <div style={{ padding: "12px", background: "var(--color-success)", color: "white", borderRadius: "8px", marginBottom: "16px" }}>
          {message}
        </div>
      )}

      <div className={styles.grid}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Create Game */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>1. Create Tournament</h2>
            <form onSubmit={handleCreateGame}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Game Name</label>
                <input required type="text" className={styles.input} placeholder="e.g. Kejohanan MSSD 2026" value={gameName} onChange={e => setGameName(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Date</label>
                <input required type="date" className={styles.input} value={gameDate} onChange={e => setGameDate(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Venue</label>
                <input required type="text" className={styles.input} placeholder="e.g. UTHM Swimming Pool" value={gameVenue} onChange={e => setGameVenue(e.target.value)} />
              </div>
              <button disabled={isPending} className={styles.submitBtn}>
                {isPending ? "Saving..." : "Create Game"}
              </button>
            </form>
          </div>

          {/* Input Results */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>2. Input Result</h2>
            <form onSubmit={handleAddResult}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Select Tournament</label>
                <select required className={styles.select} value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)}>
                  <option value="">-- Select --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name} {t.venue ? `- ${t.venue}` : ""} ({new Date(t.date).toLocaleDateString()})</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Select Class (Optional)</label>
                <select className={styles.select} value={selectedClassId} onChange={e => {
                  setSelectedClassId(e.target.value);
                  setSelectedStudent(""); // reset student when class changes
                }}>
                  <option value="">-- All Classes --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Select Student</label>
                <select required className={styles.select} value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                  <option value="">-- Select --</option>
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {!selectedClassId && s.classes?.name ? `(${s.classes.name})` : ""}</option>
                  ))}
                </select>
              </div>

              <div className={styles.rowGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Stroke</label>
                  <select className={styles.select} value={stroke} onChange={handleStrokeChange}>
                    <option value="FR">Freestyle (FR)</option>
                    <option value="BR">Breaststroke (BR)</option>
                    <option value="FL">Butterfly (FL)</option>
                    <option value="BK">Backstroke (BK)</option>
                    <option value="IM">Ind. Medley (IM)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Distance (m)</label>
                  <select className={styles.select} value={distance} onChange={e => setDistance(e.target.value)}>
                    {distances.map(d => (
                      <option key={d} value={d}>{d}m</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Time Result</label>
                <input required type="text" className={styles.input} placeholder="e.g. 01:23.45" value={timeRecord} onChange={e => setTimeRecord(e.target.value)} />
              </div>

              <button disabled={isPending} className={styles.submitBtn}>
                {isPending ? "Saving..." : "Save Result"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column - Recent Results */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Recent Results</h2>
          <div className={styles.resultList}>
            {recentResults.length === 0 ? (
              <p style={{ color: "var(--text-secondary)" }}>No results yet.</p>
            ) : (
              recentResults.map(r => (
                <div key={r.id} className={styles.resultItem}>
                  <div className={styles.resultInfo}>
                    <span className={styles.resultStudent}>{r.students?.name}</span>
                    <span className={styles.resultDetails}>{r.tournaments?.name} • {r.distance}m {r.stroke}</span>
                  </div>
                  <div className={styles.resultTime}>{r.time_record}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
