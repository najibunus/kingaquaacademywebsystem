"use client";

import { useState, useRef } from "react";
import styles from "./evaluations.module.css";
import {
  EVALUATION_LEVELS,
  parseEvaluationRecord,
} from "@/lib/constants/evaluationCurriculum";
import ReportCardView, {
  KingAquaBadgeEmblem,
  printReportCardElement,
} from "@/components/ReportCardView";

interface Evaluation {
  id: string;
  star_rating: number | null;
  comments: string;
  skill_tag: string | null;
  created_at: string;
}

interface Child {
  id: string;
  name: string;
  student_evaluations: Evaluation[] | null;
}

export default function ParentEvaluationsClient({ children }: { children: Child[] }) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    children && children.length > 0 ? children[0].id : null
  );
  const [activeReportCardEval, setActiveReportCardEval] = useState<Evaluation | null>(
    null
  );
  const reportCardRef = useRef<HTMLDivElement | null>(null);

  const selectedChild = children?.find((c) => c.id === selectedChildId);
  const evals = [...(selectedChild?.student_evaluations || [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <h1 className={styles.title}>Evaluations &amp; Report Cards</h1>
        <p className={styles.subtitle}>
          Track your children&apos;s badge progression, skill scores, and official report cards.
        </p>
      </div>

      {!children || children.length === 0 ? (
        <div className={styles.emptyCard}>
          No children registered under your account yet.
        </div>
      ) : (
        <>
          <div className={styles.childTabs}>
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={styles.childTab}
                style={{
                  border:
                    selectedChildId === child.id
                      ? "2px solid var(--ka-blue)"
                      : "1px solid var(--border-gray)",
                  backgroundColor:
                    selectedChildId === child.id
                      ? "var(--bg-tint)"
                      : "var(--ka-white)",
                }}
              >
                <div
                  className={styles.childTabIcon}
                  style={{
                    backgroundColor:
                      selectedChildId === child.id
                        ? "var(--ka-blue)"
                        : "var(--bg-light)",
                    color:
                      selectedChildId === child.id
                        ? "white"
                        : "var(--text-secondary)",
                  }}
                >
                  {child.name.charAt(0)}
                </div>
                <span
                  className={styles.childTabName}
                  style={{
                    fontWeight: selectedChildId === child.id ? 700 : 500,
                    color:
                      selectedChildId === child.id
                        ? "var(--ka-blue)"
                        : "var(--ka-black)",
                  }}
                >
                  {child.name}
                </span>
              </button>
            ))}
          </div>

          <div className={styles.evalGrid}>
            {evals.length === 0 ? (
              <div className={styles.emptyCard} style={{ marginTop: "16px" }}>
                <p style={{ color: "var(--text-secondary)" }}>
                  No evaluations have been submitted for {selectedChild?.name} yet.
                </p>
              </div>
            ) : (
              evals.map((ev) => {
                const parsed = parseEvaluationRecord(ev);
                const levelObj = EVALUATION_LEVELS.find(
                  (l) => l.level === parsed.acquiredLevel
                );
                const cleanLabel = ev.skill_tag
                  ? ev.skill_tag.split("|||")[0]
                  : levelObj
                  ? levelObj.title
                  : "General Assessment";

                return (
                  <div key={ev.id} className={styles.evalCard}>
                    <div
                      className={styles.evalTop}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        {levelObj && (
                          <KingAquaBadgeEmblem
                            levelData={levelObj}
                            isAcquired={true}
                            size={46}
                          />
                        )}
                        <div>
                          <div className={styles.skillTag}>{cleanLabel}</div>
                          <div
                            className={styles.evalDate}
                            style={{ marginTop: "4px" }}
                          >
                            {new Date(ev.created_at).toLocaleDateString("en-MY", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveReportCardEval(ev)}
                        style={{
                          padding: "7px 13px",
                          borderRadius: "8px",
                          border: "1.5px solid #8b1a1a",
                          background: "#fef2f2",
                          color: "#8b1a1a",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        View Report Card
                      </button>
                    </div>

                    <div className={styles.stars} style={{ marginTop: "10px" }}>
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill={(ev.star_rating || 0) > i ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                      ))}
                    </div>

                    {levelObj && Object.keys(parsed.scores).length > 0 && (
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.74rem",
                            fontWeight: 800,
                            color: "#475569",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            marginBottom: "6px",
                          }}
                        >
                          {levelObj.title} Criteria Scores
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          {levelObj.criteria.map((c) => {
                            const s = parsed.scores[c.id];
                            if (!s) return null;
                            return (
                              <div
                                key={c.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.8rem",
                                  color: "#1e293b",
                                  gap: "8px",
                                }}
                              >
                                <span>
                                  {c.number}. {c.text}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 800,
                                    color: "var(--ka-blue)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {s} / 5
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className={styles.commentBox} style={{ marginTop: "12px" }}>
                      <p className={styles.commentText}>
                        &ldquo;{parsed.notes || ev.comments}&rdquo;
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Report Card Preview Modal for Parents */}
      {activeReportCardEval && selectedChild && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "20px",
            overflowY: "auto",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveReportCardEval(null);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1180px",
              background: "#fff",
              borderRadius: "16px",
              boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                background: "#0f172a",
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
                  Official KingAqua Report Card — {selectedChild.name}
                </h2>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() =>
                    printReportCardElement(
                      reportCardRef.current,
                      selectedChild.name
                    )
                  }
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, #b91c1c, #7f1d1d)",
                    color: "#fff",
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportCardEval(null)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    background: "#1e293b",
                    color: "#cbd5e1",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <div
              style={{
                padding: "20px",
                background: "#1e293b",
                overflowX: "auto",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {(() => {
                const parsed = parseEvaluationRecord(activeReportCardEval);
                return (
                  <ReportCardView
                    cardRef={reportCardRef}
                    studentName={selectedChild.name}
                    acquiredLevel={parsed.acquiredLevel}
                    scores={parsed.scores}
                    notes={parsed.notes}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
