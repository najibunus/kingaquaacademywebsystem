"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [zoom, setZoom] = useState<number>(0.85);
  const [isFitMode, setIsFitMode] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const reportCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateFitScale = () => {
    if (typeof window === "undefined") return 0.8;
    const availW = Math.max(window.innerWidth - 32, 280);
    const availH = Math.max(window.innerHeight - 110, 240);
    const scaleW = availW / 1120;
    const scaleH = availH / 792;
    return Math.min(scaleW, scaleH, 1.0);
  };

  useEffect(() => {
    if (activeReportCardEval) {
      const fit = calculateFitScale();
      setZoom(fit);
      setIsFitMode(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeReportCardEval]);

  useEffect(() => {
    if (!activeReportCardEval) return;

    const handleResize = () => {
      if (isFitMode) {
        setZoom(calculateFitScale());
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveReportCardEval(null);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeReportCardEval, isFitMode]);

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
                  {child.name.toUpperCase()}
                </span>
              </button>
            ))}
          </div>

          <div className={styles.evalGrid}>
            {evals.length === 0 ? (
              <div className={styles.emptyCard} style={{ marginTop: "16px" }}>
                <p style={{ color: "var(--text-secondary)" }}>
                  No evaluations have been submitted for {selectedChild?.name.toUpperCase()} yet.
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
                            const criterionText =
                              parsed.customCriteriaText?.[c.id] || c.text;
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
                                  {c.number}. {criterionText}
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
      {activeReportCardEval && selectedChild && mounted && typeof document !== "undefined" && createPortal(
        (() => {
          const parsed = parseEvaluationRecord(activeReportCardEval);
          const levelObj = EVALUATION_LEVELS.find((l) => l.level === parsed.acquiredLevel);

          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(11, 15, 25, 0.94)",
                backdropFilter: "blur(10px)",
                zIndex: 99999,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
            {/* Top Toolbar */}
            <div
              style={{
                padding: "10px 16px",
                background: "#0f172a",
                borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                flexShrink: 0,
                zIndex: 10,
              }}
            >
              {/* Left Info */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                {levelObj && (
                  <KingAquaBadgeEmblem
                    levelData={levelObj}
                    isAcquired={true}
                    size={38}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "0.98rem",
                      fontWeight: 800,
                      letterSpacing: "0.02em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    Report Card — {selectedChild.name.toUpperCase()}
                  </h2>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                      {levelObj?.title || `Level ${parsed.acquiredLevel}`}
                    </span>
                    <span>•</span>
                    <span>Official Assessment</span>
                  </div>
                </div>
              </div>

              {/* Center Zoom & View Controls */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#1e293b",
                  padding: "3px 6px",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                  gap: "4px",
                }}
              >
                <button
                  type="button"
                  title="Zoom Out (-)"
                  onClick={() => {
                    setIsFitMode(false);
                    setZoom((z) => Math.max(0.3, Math.round((z - 0.1) * 10) / 10));
                  }}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    border: "none",
                    background: "transparent",
                    color: "#cbd5e1",
                    fontSize: "1rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  -
                </button>

                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: "#f8fafc",
                    minWidth: "42px",
                    textAlign: "center",
                    userSelect: "none",
                  }}
                >
                  {Math.round(zoom * 100)}%
                </span>

                <button
                  type="button"
                  title="Zoom In (+)"
                  onClick={() => {
                    setIsFitMode(false);
                    setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10));
                  }}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    border: "none",
                    background: "transparent",
                    color: "#cbd5e1",
                    fontSize: "1rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>

                <div style={{ width: "1px", height: "18px", backgroundColor: "#334155", margin: "0 2px" }} />

                <button
                  type="button"
                  title="Fit Report Card to Screen"
                  onClick={() => {
                    setIsFitMode(true);
                    setZoom(calculateFitScale());
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: isFitMode ? "1px solid #38bdf8" : "1px solid transparent",
                    background: isFitMode ? "rgba(56, 189, 248, 0.18)" : "transparent",
                    color: isFitMode ? "#38bdf8" : "#94a3b8",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                  Fit to Screen
                </button>

                <button
                  type="button"
                  title="View at 100% Size"
                  onClick={() => {
                    setIsFitMode(false);
                    setZoom(1.0);
                  }}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: zoom === 1.0 && !isFitMode ? "1px solid #38bdf8" : "1px solid transparent",
                    background: zoom === 1.0 && !isFitMode ? "rgba(56, 189, 248, 0.18)" : "transparent",
                    color: zoom === 1.0 && !isFitMode ? "#38bdf8" : "#94a3b8",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  100%
                </button>
              </div>

              {/* Right Action Buttons */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() =>
                    printReportCardElement(
                      reportCardRef.current,
                      selectedChild.name.toUpperCase()
                    )
                  }
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, #b91c1c, #7f1d1d)",
                    color: "#fff",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(185, 28, 28, 0.4)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportCardEval(null)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    background: "#1e293b",
                    color: "#cbd5e1",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Viewer Canvas Area */}
            <div
              style={{
                flex: 1,
                width: "100%",
                overflow: "auto",
                backgroundColor: "#090d16",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                padding: "16px 12px 24px 12px",
                boxSizing: "border-box",
                overscrollBehavior: "contain",
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setActiveReportCardEval(null);
              }}
            >
              {zoom < 0.9 && (
                <div
                  style={{
                    marginBottom: "10px",
                    fontSize: "0.74rem",
                    color: "#94a3b8",
                    backgroundColor: "rgba(30, 41, 59, 0.7)",
                    padding: "4px 12px",
                    borderRadius: "999px",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Fitted to screen ({Math.round(zoom * 100)}%). Click <strong>100%</strong> to inspect criteria or <strong>Print / Save PDF</strong> for high-resolution download.
                </div>
              )}

              {/* Scaled wrapper */}
              <div
                style={{
                  width: `${Math.round(1120 * zoom)}px`,
                  height: `${Math.round(792 * zoom)}px`,
                  flexShrink: 0,
                  margin: "auto",
                  position: "relative",
                  boxShadow: "0 25px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.12)",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    width: "1120px",
                    height: "792px",
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                    transition: isFitMode ? "transform 0.15s ease" : "none",
                  }}
                >
                  <ReportCardView
                    cardRef={reportCardRef}
                    studentName={selectedChild.name.toUpperCase()}
                    acquiredLevel={parsed.acquiredLevel}
                    scores={parsed.scores}
                    customCriteriaText={parsed.customCriteriaText}
                    notes={parsed.notes}
                    customWallpaperUrl={parsed.customWallpaperUrl}
                    wallpaperFit={parsed.wallpaperFit}
                    sheetOpacity={parsed.sheetOpacity}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })(),
      document.body
    )}
    </div>
  );
}
