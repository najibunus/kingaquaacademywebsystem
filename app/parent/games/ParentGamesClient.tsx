"use client";
import styles from "./games.module.css";

interface Student {
  id: string;
  name: string;
}

interface TournamentResult {
  id: string;
  stroke: string;
  distance: number;
  time_record: string;
  created_at: string;
  students: Student;
}

interface Tournament {
  id: string;
  name: string;
  date: string;
  tournament_results: TournamentResult[];
}

export default function ParentGamesClient({ tournaments }: { tournaments: Tournament[] }) {
  
  // Sort tournaments by date descending, but they should already be sorted from DB.
  // Within each tournament, let's sort results by Stroke -> Distance -> Time
  const processedTournaments = tournaments.map(t => {
    const sortedResults = [...(t.tournament_results || [])].sort((a, b) => {
      if (a.stroke !== b.stroke) return a.stroke.localeCompare(b.stroke);
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.time_record.localeCompare(b.time_record);
    });
    return { ...t, tournament_results: sortedResults };
  });

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <h1 className={styles.title}>Competition Results</h1>
        <p className={styles.subtitle}>View public achievements and results for all students in past competitions.</p>
      </div>

      {!processedTournaments || processedTournaments.length === 0 ? (
        <div className={styles.emptyCard}>No competition records found.</div>
      ) : (
        <div className={styles.gamesGrid}>
          {processedTournaments.map(game => (
            <div key={game.id} className={styles.gameCard}>
              <div className={styles.gameHeader}>
                <div className={styles.gameIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10"></path><path d="M5 4h14a2 2 0 0 1 2 2v2a8 8 0 0 1-8 8h0a8 8 0 0 1-8-8V6a2 2 0 0 1 2-2z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className={styles.gameName}>{game.name}</h2>
                  <p className={styles.gameDate}>
                    {new Date(game.date).toLocaleDateString("en-MY", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              
              <div className={styles.resultsGrid}>
                {game.tournament_results.length === 0 ? (
                  <div style={{ padding: "16px", color: "var(--text-secondary)", textAlign: "center" }}>
                    No results recorded for this competition yet.
                  </div>
                ) : (
                  <>
                    <div className={styles.gridHeader}>
                      <div>Student</div>
                      <div>Event</div>
                      <div style={{ textAlign: "right" }}>Time</div>
                    </div>
                    
                    {game.tournament_results.map(r => (
                      <div key={r.id} className={styles.gridRow}>
                        <div className={styles.studentNameText} style={{ fontWeight: 600, color: "var(--ka-black)" }}>
                          {r.students?.name || "Unknown"}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <div className={styles.strokeBadge}>{r.stroke}</div>
                          <div className={styles.distanceText}>{r.distance}m</div>
                        </div>
                        <div className={styles.timeText}>{r.time_record}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
