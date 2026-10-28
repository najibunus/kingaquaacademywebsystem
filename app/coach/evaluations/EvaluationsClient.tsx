"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import {
  EVALUATION_LEVELS,
  LEVEL_6_TIME_STANDARDS,
  parseEvaluationRecord,
} from "@/lib/constants/evaluationCurriculum";
import {
  submitStructuredEvaluationAction,
  deleteEvaluationAction,
} from "@/lib/actions/evaluation";
import ReportCardView, {
  KingAquaBadgeEmblem,
  printReportCardElement,
} from "@/components/ReportCardView";
import styles from "./evaluations.module.css";

export interface EvalStudent {
  id: string;
  name: string;
  class_id: string | null;
  class_name: string | null;
}

export interface EvalClass {
  id: string;
  name: string;
}

export interface PastEvalItem {
  id: string;
  student_id: string;
  class_id?: string | null;
  student_name: string;
  evaluator_name?: string;
  star_rating: number | null;
  comments: string;
  skill_tag: string | null;
  created_at: string;
}

interface Props {
  students: EvalStudent[];
  classes?: EvalClass[];
  pastEvals: PastEvalItem[];
  isStaffMode?: boolean;
}

const WALLPAPER_STORAGE_KEY = "ka_report_card_custom_wallpaper_v1";
const BADGES_STORAGE_KEY = "ka_report_card_custom_badges_v1";

export default function EvaluationsClient({
  students,
  classes = [],
  pastEvals,
  isStaffMode = false,
}: Props) {
  const [selectedStudent, setSelectedStudent] = useState<EvalStudent | null>(null);
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  // Evaluation Form State matching the physical Report Card
  const [acquiredLevel, setAcquiredLevel] = useState<number>(1);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [customCriteriaText, setCustomCriteriaText] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [showAllLevelsInForm, setShowAllLevelsInForm] = useState(false);

  // Staff Report Card Studio State
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string | null>(null);
  const [wallpaperFit, setWallpaperFit] = useState<"cover" | "contain" | "fill">("cover");
  const [sheetOpacity, setSheetOpacity] = useState<number>(0.93);
  const [customBadges, setCustomBadges] = useState<Record<number, string>>({});

  const [feedback, setFeedback] = useState<{ error?: string; success?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const reportCardRef = useRef<HTMLDivElement | null>(null);

  // Load persisted custom wallpaper & badges on mount (for staff convenience)
  useEffect(() => {
    try {
      const savedWp = localStorage.getItem(WALLPAPER_STORAGE_KEY);
      if (savedWp) setCustomWallpaperUrl(savedWp);
      const savedBadges = localStorage.getItem(BADGES_STORAGE_KEY);
      if (savedBadges) setCustomBadges(JSON.parse(savedBadges));
    } catch {}
  }, []);

  // Select level handler: highlights only this badge
  function handleSelectBadgeLevel(lvl: number) {
    setAcquiredLevel(lvl);
    // Pre-initialize scores for this level to 4 if none exist yet for this level
    const lvlObj = EVALUATION_LEVELS.find((l) => l.level === lvl);
    if (lvlObj) {
      const hasAnyScoreInLevel = lvlObj.criteria.some((c) => scores[c.id] && scores[c.id] > 0);
      if (!hasAnyScoreInLevel) {
        const nextScores = { ...scores };
        lvlObj.criteria.forEach((c) => {
          nextScores[c.id] = 4;
        });
        setScores(nextScores);
      }
    }
  }

  function handleScoreChange(criterionId: string, val: number) {
    setScores((prev) => {
      const next = { ...prev };
      if (val <= 0) {
        delete next[criterionId];
      } else {
        next[criterionId] = val;
      }
      return next;
    });
  }

  function handleQuickFillCurrentLevel(scaleValue: number) {
    const lvlObj = EVALUATION_LEVELS.find((l) => l.level === acquiredLevel);
    if (!lvlObj) return;
    const next = { ...scores };
    lvlObj.criteria.forEach((c) => {
      next[c.id] = scaleValue;
    });
    setScores(next);
  }

  function handleClearOtherLevels() {
    const lvlObj = EVALUATION_LEVELS.find((l) => l.level === acquiredLevel);
    if (!lvlObj) return;
    const keepIds = new Set(lvlObj.criteria.map((c) => c.id));
    const next: Record<string, number> = {};
    Object.entries(scores).forEach(([k, v]) => {
      if (keepIds.has(k)) next[k] = v;
    });
    setScores(next);
  }

  function handleCriteriaTextChange(criterionId: string, val: string) {
    setCustomCriteriaText((prev) => ({
      ...prev,
      [criterionId]: val,
    }));
  }

  function handleResetCriterionText(criterionId: string) {
    setCustomCriteriaText((prev) => {
      const next = { ...prev };
      delete next[criterionId];
      return next;
    });
  }

  function startNewEvaluationForStudent(student: EvalStudent) {
    setSelectedStudent(student);
    setFeedback(null);

    // Rule: A student only gets ONE badge.
    // Check if this student already has an evaluation recorded:
    const existingEval = pastEvals.find((ev) => ev.student_id === student.id);
    if (existingEval) {
      loadPastEvaluation(existingEval);
    } else {
      setEditingEvalId(null);
      setAcquiredLevel(1);
      const initialScores: Record<string, number> = {};
      EVALUATION_LEVELS[0].criteria.forEach((c) => {
        initialScores[c.id] = 4;
      });
      setScores(initialScores);
      setCustomCriteriaText({});
      setNotes("");
    }
  }

  function loadPastEvaluation(ev: PastEvalItem) {
    const parsed = parseEvaluationRecord(ev);
    const foundStudent = students.find((s) => s.id === ev.student_id) || {
      id: ev.student_id,
      name: ev.student_name,
      class_id: ev.class_id || null,
      class_name: null,
    };
    setSelectedStudent(foundStudent);
    setEditingEvalId(ev.id);
    setAcquiredLevel(parsed.acquiredLevel);
    setScores(parsed.scores);
    setCustomCriteriaText(parsed.customCriteriaText || {});
    setNotes(parsed.notes);
    setFeedback(null);
  }

  function openReportCardForPastEval(ev: PastEvalItem) {
    loadPastEvaluation(ev);
    setShowReportCardModal(true);
  }

  function handleWallpaperUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomWallpaperUrl(dataUrl);
      try {
        localStorage.setItem(WALLPAPER_STORAGE_KEY, dataUrl);
      } catch {}
    };
    reader.readAsDataURL(file);
  }

  function handleResetWallpaper() {
    setCustomWallpaperUrl(null);
    try {
      localStorage.removeItem(WALLPAPER_STORAGE_KEY);
    } catch {}
  }

  function handleBadgeUpload(level: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomBadges((prev) => {
        const updated = { ...prev, [level]: dataUrl };
        try {
          localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await submitStructuredEvaluationAction({
        id: editingEvalId || undefined,
        studentId: selectedStudent.id,
        classId: selectedStudent.class_id,
        acquiredLevel,
        scores,
        customCriteriaText,
        notes,
      });

      if (res.error) {
        setFeedback({ error: res.error });
      } else {
        setFeedback({
          success: editingEvalId
            ? "Evaluation updated successfully!"
            : "Evaluation saved! (Any previous level evaluation for this student was replaced with their new badge).",
        });
      }
    });
  }

  function handleDeleteEval(evalId: string) {
    if (!confirm("Delete this evaluation record?")) return;
    startTransition(async () => {
      const res = await deleteEvaluationAction(evalId);
      if (res.success && editingEvalId === evalId) {
        setEditingEvalId(null);
      }
    });
  }

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = classFilter === "all" || s.class_id === classFilter;
    return matchesSearch && matchesClass;
  });

  const activeLevelObj =
    EVALUATION_LEVELS.find((l) => l.level === acquiredLevel) || EVALUATION_LEVELS[0];

  const levelsToDisplay = showAllLevelsInForm ? EVALUATION_LEVELS : [activeLevelObj];

  return (
    <div className="animate-fade-in-up">
      {/* ── Page Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {isStaffMode
              ? "Student Evaluations & Report Card Generator"
              : "Student Syllabus Evaluations"}
          </h1>
          <p className={styles.subtitle}>
            {isStaffMode
              ? "Assess students across KingAqua Levels 1–6, highlight their acquired badge, customize the report card wallpaper, and generate official landscape Report Cards."
              : "Evaluate students using the official KingAqua 6-Level curriculum (Turtle to Shark) and score criteria on the 5–1 scale."}
          </p>
        </div>

        {isStaffMode && selectedStudent && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowReportCardModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#6d1b2d",
              borderColor: "#6d1b2d",
              fontWeight: 700,
              padding: "10px 18px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            Generate / Preview Report Card
          </button>
        )}
      </div>

      <div className={styles.contentGrid}>
        {/* ════════════ LEFT PANEL: EVALUATION BUILDER ════════════ */}
        <div className={styles.formPanel}>
          {/* STEP 1: STUDENT SELECTION */}
          <div className={styles.evalCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <h2 className={styles.panelTitle} style={{ margin: 0 }}>
                {selectedStudent
                  ? `Student: ${selectedStudent.name}`
                  : "Step 1 — Select a Student"}
              </h2>
              {selectedStudent && (
                <button
                  type="button"
                  className={styles.changeStudentBtn}
                  onClick={() => {
                    setSelectedStudent(null);
                    setEditingEvalId(null);
                    setFeedback(null);
                  }}
                >
                  Change Student
                </button>
              )}
            </div>

            {!selectedStudent ? (
              students.length === 0 ? (
                <p className={styles.emptyText}>No active students found.</p>
              ) : (
                <>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                    <input
                      type="text"
                      placeholder="Search by student name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        flex: "1 1 220px",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-gray)",
                        fontFamily: "inherit",
                      }}
                    />
                    {classes.length > 0 && (
                      <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-gray)",
                          fontFamily: "inherit",
                          backgroundColor: "#fff",
                        }}
                      >
                        <option value="all">All Classes ({students.length})</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className={styles.studentGrid}>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((s) => {
                        const sEval = pastEvals.find((ev) => ev.student_id === s.id);
                        const sParsed = sEval ? parseEvaluationRecord(sEval) : null;
                        const sLvl = sParsed
                          ? EVALUATION_LEVELS.find((l) => l.level === sParsed.acquiredLevel)
                          : null;

                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={styles.studentPickerBtn}
                            onClick={() => startNewEvaluationForStudent(s)}
                          >
                            <div className={styles.studentInitial}>
                              {s.name.charAt(0)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p className={styles.studentPickerName}>{s.name.toUpperCase()}</p>
                              <p className={styles.studentPickerClass}>
                                {s.class_name ?? "Assigned Class"}
                              </p>
                              {sLvl ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    marginTop: "4px",
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: "#dbeafe",
                                    color: "#1e40af",
                                  }}
                                >
                                  Badge: {sLvl.shortTitle}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-block",
                                    marginTop: "4px",
                                    fontSize: "0.68rem",
                                    color: "#94a3b8",
                                  }}
                                >
                                  No badge yet
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <p className={styles.emptyText} style={{ gridColumn: "1 / -1" }}>
                        No students matched your search.
                      </p>
                    )}
                  </div>
                </>
              )
            ) : (
              <div className={styles.selectedStudentBanner} style={{ marginTop: "12px" }}>
                <div className={styles.studentInitialLg}>
                  {selectedStudent.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <p className={styles.selectedName}>{selectedStudent.name.toUpperCase()}</p>
                  <p className={styles.selectedClass}>
                    {selectedStudent.class_name ?? "Active Student"}
                    {editingEvalId ? " • Active Saved Evaluation" : " • New Evaluation"}
                  </p>
                  {(() => {
                    const prevEval = pastEvals.find((ev) => ev.student_id === selectedStudent.id);
                    if (!prevEval) return null;
                    const prevParsed = parseEvaluationRecord(prevEval);
                    if (prevParsed.acquiredLevel === acquiredLevel) return null;
                    return (
                      <p
                        style={{
                          margin: "6px 0 0 0",
                          fontSize: "0.78rem",
                          color: "#b45309",
                          backgroundColor: "#fef3c7",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #fde68a",
                          fontWeight: 700,
                        }}
                      >
                        ⚠️ Level Advancement: Saving this will advance {selectedStudent.name} to Level {acquiredLevel} and replace their previous Level {prevParsed.acquiredLevel} badge on the Report Card.
                      </p>
                    );
                  })()}
                </div>
                {isStaffMode && (
                  <button
                    type="button"
                    onClick={() => setShowReportCardModal(true)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      backgroundColor: "#6d1b2d",
                      color: "#fff",
                      border: "none",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    Open Report Card
                  </button>
                )}
              </div>
            )}
          </div>

          {/* STEP 2 & 3: BADGE SELECTION + CRITERIA SCORING */}
          {selectedStudent && (
            <form onSubmit={handleSubmit} className={styles.evalCard}>
              {/* STEP 2: SELECT ACQUIRED BADGE (Only acquired badge is highlighted!) */}
              <div style={{ marginBottom: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                  <label className={styles.fieldLabel} style={{ margin: 0, fontSize: "1rem" }}>
                    Step 2 — Select Acquired Badge Level
                  </label>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Only the selected badge will be highlighted in color on the Report Card
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
                    gap: "12px",
                    marginTop: "12px",
                  }}
                >
                  {EVALUATION_LEVELS.map((lvl) => {
                    const isAcquired = acquiredLevel === lvl.level;
                    return (
                      <button
                        key={lvl.level}
                        type="button"
                        onClick={() => handleSelectBadgeLevel(lvl.level)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "8px",
                          padding: "14px 10px",
                          borderRadius: "12px",
                          border: isAcquired
                            ? "2.5px solid #6d1b2d"
                            : "1.5px solid var(--border-gray)",
                          backgroundColor: isAcquired ? "#fffbeb" : "#f8fafc",
                          cursor: "pointer",
                          transition: "all 0.18s ease",
                        }}
                      >
                        <KingAquaBadgeEmblem
                          levelData={lvl}
                          isAcquired={isAcquired}
                          customBadgeUrl={customBadges[lvl.level]}
                          size={68}
                        />
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              color: isAcquired ? "#6d1b2d" : "#64748b",
                            }}
                          >
                            LEVEL {lvl.level}
                          </div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 800,
                              color: isAcquired ? "#0f172a" : "#94a3b8",
                            }}
                          >
                            {lvl.animal}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            backgroundColor: isAcquired ? "#16a34a" : "#e2e8f0",
                            color: isAcquired ? "#ffffff" : "#64748b",
                          }}
                        >
                          {isAcquired ? "★ Acquired Badge" : "Unacquired"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 3: CRITERIA & SCALE (5 4 3 2 1) */}
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <label className={styles.fieldLabel} style={{ margin: 0, fontSize: "1rem" }}>
                      Step 3 — Score Criteria (Scale 5 to 1)
                    </label>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Click a number (5 = Excellent, 1 = Needs Work) to mark{" "}
                      <strong>\</strong> on the student&apos;s report card.
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b" }}>
                      Quick Fill Level {acquiredLevel}:
                    </span>
                    {[5, 4, 3].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickFillCurrentLevel(val)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        All {val}s
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClearOtherLevels}
                      title="Keep scores only for the currently selected badge level"
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#f8fafc",
                        color: "#475569",
                        cursor: "pointer",
                      }}
                    >
                      Only Level {acquiredLevel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAllLevelsInForm((v) => !v)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        borderRadius: "6px",
                        border: "1px solid #6d1b2d",
                        backgroundColor: showAllLevelsInForm ? "#6d1b2d" : "#fff",
                        color: showAllLevelsInForm ? "#fff" : "#6d1b2d",
                        cursor: "pointer",
                      }}
                    >
                      {showAllLevelsInForm ? "Show Selected Level Only" : "Show All 6 Levels"}
                    </button>
                  </div>
                </div>

                {/* Criteria Table matching the Report Card Maroon Header */}
                <div
                  style={{
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  {levelsToDisplay.map((lvl) => {
                    const isCurrentAcquired = lvl.level === acquiredLevel;
                    return (
                      <div key={lvl.level} style={{ borderBottom: "1px solid #cbd5e1" }}>
                        {/* Maroon Level Header */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 190px",
                            backgroundColor: isCurrentAcquired ? "#6d1b2d" : "#334155",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            padding: "8px 14px",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            {lvl.title}{" "}
                            {isCurrentAcquired && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  backgroundColor: "#facc15",
                                  color: "#111",
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                  fontSize: "0.7rem",
                                }}
                              >
                                Highlighted Badge
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(5, 1fr)",
                              textAlign: "center",
                              fontSize: "0.78rem",
                            }}
                          >
                            <span>5</span>
                            <span>4</span>
                            <span>3</span>
                            <span>2</span>
                            <span>1</span>
                          </div>
                        </div>

                        {/* Criteria Rows */}
                        {lvl.criteria.map((c) => {
                          const currentVal = scores[c.id] || 0;
                          const isCustomized =
                            customCriteriaText[c.id] !== undefined &&
                            customCriteriaText[c.id].trim() !== "" &&
                            customCriteriaText[c.id] !== c.text;
                          const currentText =
                            customCriteriaText[c.id] !== undefined
                              ? customCriteriaText[c.id]
                              : c.text;

                          return (
                            <div
                              key={c.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 190px",
                                borderBottom: "1px solid #e2e8f0",
                                alignItems: "center",
                                backgroundColor: isCustomized ? "#f0fdf4" : "#ffffff",
                              }}
                            >
                              <div style={{ padding: "8px 12px" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                  <span
                                    style={{
                                      fontSize: "0.85rem",
                                      fontWeight: 800,
                                      color: "#475569",
                                      marginTop: "5px",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {c.number}.
                                  </span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <input
                                      type="text"
                                      value={currentText}
                                      onChange={(e) => handleCriteriaTextChange(c.id, e.target.value)}
                                      placeholder={c.text}
                                      style={{
                                        width: "100%",
                                        fontSize: "0.85rem",
                                        fontWeight: isCustomized ? 700 : 500,
                                        color: isCustomized ? "#15803d" : "#1e293b",
                                        backgroundColor: isCustomized ? "#f0fdf4" : "#f8fafc",
                                        border: isCustomized ? "1.5px solid #22c55e" : "1px solid #cbd5e1",
                                        borderRadius: "6px",
                                        padding: "6px 10px",
                                        boxSizing: "border-box",
                                        outline: "none",
                                      }}
                                    />
                                    {isCustomized ? (
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          marginTop: "3px",
                                        }}
                                      >
                                        <span style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 }}>
                                          ✓ Custom text for {selectedStudent.name} (Default: &quot;{c.text}&quot;)
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleResetCriterionText(c.id)}
                                          style={{
                                            fontSize: "0.7rem",
                                            padding: "2px 6px",
                                            borderRadius: "4px",
                                            border: "1px solid #cbd5e1",
                                            backgroundColor: "#fff",
                                            color: "#64748b",
                                            cursor: "pointer",
                                          }}
                                        >
                                          ↺ Reset
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>
                                        (Click to customize text for this student — original remains default)
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(5, 1fr)",
                                  gap: "4px",
                                  padding: "6px 8px",
                                  backgroundColor: "#f8fafc",
                                }}
                              >
                                {[5, 4, 3, 2, 1].map((scaleVal) => {
                                  const isSelected = currentVal === scaleVal;
                                  return (
                                    <button
                                      key={scaleVal}
                                      type="button"
                                      onClick={() =>
                                        handleScoreChange(
                                          c.id,
                                          isSelected ? 0 : scaleVal
                                        )
                                      }
                                      style={{
                                        height: "32px",
                                        borderRadius: "6px",
                                        border: isSelected
                                          ? "2px solid #6d1b2d"
                                          : "1px solid #cbd5e1",
                                        backgroundColor: isSelected
                                          ? "#fef2f2"
                                          : "#ffffff",
                                        color: isSelected ? "#6d1b2d" : "#64748b",
                                        fontWeight: 800,
                                        fontSize: "0.82rem",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {isSelected ? `\\ (${scaleVal})` : scaleVal}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Level 6 Reference Time Table */}
                        {lvl.hasTimeTable && (
                          <div
                            style={{
                              padding: "12px 14px",
                              backgroundColor: "#f8fafc",
                              borderTop: "1px dashed #cbd5e1",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                marginBottom: "6px",
                                color: "#0f172a",
                              }}
                            >
                              Level 6 Qualifying Time Standards (50m):
                            </div>
                            <table
                              style={{
                                width: "100%",
                                maxWidth: "420px",
                                borderCollapse: "collapse",
                                fontSize: "0.78rem",
                                backgroundColor: "#fff",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              <thead>
                                <tr style={{ backgroundColor: "#f1f5f9", fontWeight: 700 }}>
                                  <th style={{ padding: "4px 8px", textAlign: "left" }}>Cat</th>
                                  <th style={{ padding: "4px 8px" }}>Freestyle (FR)</th>
                                  <th style={{ padding: "4px 8px" }}>Breaststroke (BR)</th>
                                  <th style={{ padding: "4px 8px" }}>Backstroke (BK)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {LEVEL_6_TIME_STANDARDS.map((r) => (
                                  <tr key={r.category} style={{ borderTop: "1px solid #e2e8f0", textAlign: "center" }}>
                                    <td style={{ padding: "4px 8px", fontWeight: 700, textAlign: "left" }}>{r.category}</td>
                                    <td style={{ padding: "4px 8px" }}>{r.freestyle}</td>
                                    <td style={{ padding: "4px 8px" }}>{r.breaststroke}</td>
                                    <td style={{ padding: "4px 8px" }}>{r.backstroke}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 4: NOTES */}
              <div className={styles.fieldGroup} style={{ marginBottom: "18px" }}>
                <label className={styles.fieldLabel} htmlFor="eval-notes">
                  Step 4 — Report Card Notes (Optional)
                </label>
                <textarea
                  id="eval-notes"
                  className={styles.textarea}
                  rows={3}
                  placeholder="Write coach/instructor remarks for the 'Notes:' box on the student's report card..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {feedback?.error && (
                <div className={styles.errorMsg}>{feedback.error}</div>
              )}
              {feedback?.success && (
                <div className={styles.successMsg}>✅ {feedback.success}</div>
              )}

              <div className={styles.formActions} style={{ flexWrap: "wrap" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isPending}
                >
                  {isPending
                    ? "Saving..."
                    : editingEvalId
                    ? "Update Evaluation"
                    : "Save Evaluation"}
                </button>

                {isStaffMode && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowReportCardModal(true)}
                    style={{
                      backgroundColor: "#6d1b2d",
                      color: "#ffffff",
                      borderColor: "#6d1b2d",
                      fontWeight: 700,
                    }}
                  >
                    Generate Report Card (PDF / Print)
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* ════════════ RIGHT PANEL: PAST EVALUATIONS ════════════ */}
        <div className={styles.historyPanel}>
          <div className={styles.evalCard}>
            {(() => {
              // Ensure 1 active badge per student
              const activeBadgesList = pastEvals.filter(
                (ev, idx, arr) => arr.findIndex((t) => t.student_id === ev.student_id) === idx
              );

              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                    <h2 className={styles.panelTitle} style={{ margin: 0 }}>
                      Active Student Badges ({activeBadgesList.length})
                    </h2>
                    <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                      1 badge per student
                    </span>
                  </div>

                  {activeBadgesList.length === 0 ? (
                    <p className={styles.emptyText}>No evaluations submitted yet.</p>
                  ) : (
                    <div className={styles.evalList}>
                      {activeBadgesList.map((ev) => {
                        const parsed = parseEvaluationRecord(ev);
                        const lvlObj =
                          EVALUATION_LEVELS.find(
                            (l) => l.level === parsed.acquiredLevel
                          ) || EVALUATION_LEVELS[0];
                        const scoredCount = Object.values(parsed.scores).filter(
                          (v) => v > 0
                        ).length;

                        return (
                    <div key={ev.id} className={styles.evalItem}>
                      <div className={styles.evalItemHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <KingAquaBadgeEmblem
                            levelData={lvlObj}
                            isAcquired={true}
                            customBadgeUrl={customBadges[lvlObj.level]}
                            size={42}
                          />
                          <div>
                            <p className={styles.evalStudentName}>
                              {ev.student_name.toUpperCase()}
                            </p>
                            <span className={styles.evalSkillBadge}>
                              {lvlObj.title}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>
                            {scoredCount} criteria scored
                          </span>
                        </div>
                      </div>

                      {parsed.notes && (
                        <p className={styles.evalComment}>
                          &ldquo;{parsed.notes}&rdquo;
                        </p>
                      )}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "10px",
                          paddingTop: "8px",
                          borderTop: "1px solid var(--border-gray)",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <span className={styles.evalDate} style={{ margin: 0 }}>
                          {new Date(ev.created_at).toLocaleDateString("en-MY", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => loadPastEvaluation(ev)}
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              backgroundColor: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          {isStaffMode && (
                            <button
                              type="button"
                              onClick={() => openReportCardForPastEval(ev)}
                              style={{
                                padding: "4px 10px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                borderRadius: "6px",
                                border: "1px solid #6d1b2d",
                                backgroundColor: "#6d1b2d",
                                color: "#fff",
                                cursor: "pointer",
                              }}
                            >
                              Report Card
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteEval(ev.id)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                              backgroundColor: "#fef2f2",
                              color: "#dc2626",
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}
    </div>
  </div>
      </div>

      {/* ════════════ STAFF REPORT CARD GENERATOR & WALLPAPER STUDIO MODAL ════════════ */}
      {showReportCardModal && selectedStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.78)",
            backdropFilter: "blur(6px)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            padding: "20px",
          }}
        >
          {/* Top Studio Control Bar */}
          <div
            style={{
              maxWidth: "1160px",
              width: "100%",
              margin: "0 auto 16px auto",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "16px 22px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "12px",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                  KingAqua Report Card Studio — {selectedStudent.name}
                </h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  Customize the background wallpaper, click any badge or scale cell directly on the card to adjust, then print or save as PDF.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() =>
                    printReportCardElement(
                      reportCardRef.current,
                      selectedStudent.name
                    )
                  }
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    backgroundColor: "#6d1b2d",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(109, 27, 45, 0.35)",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print / Save as PDF
                </button>

                <button
                  type="button"
                  onClick={() => setShowReportCardModal(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    backgroundColor: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                  }}
                >
                  Close Studio
                </button>
              </div>
            </div>

            {/* Replaceable Background Wallpaper Controls */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "16px",
                backgroundColor: "#f8fafc",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                  1. Background Wallpaper:
                </span>
                <label
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload Custom Wallpaper
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleWallpaperUpload}
                    style={{ display: "none" }}
                  />
                </label>

                {customWallpaperUrl && (
                  <button
                    type="button"
                    onClick={handleResetWallpaper}
                    style={{
                      padding: "7px 12px",
                      borderRadius: "8px",
                      backgroundColor: "#fff",
                      color: "#dc2626",
                      border: "1px solid #fecaca",
                      fontWeight: 600,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    Reset to Default Splatter
                  </button>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>
                  Fit:
                </span>
                <select
                  value={wallpaperFit}
                  onChange={(e) => setWallpaperFit(e.target.value as any)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.8rem",
                    backgroundColor: "#fff",
                  }}
                >
                  <option value="cover">Cover (Full Bleed)</option>
                  <option value="fill">Stretch to Fit</option>
                  <option value="contain">Contain</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>
                  Table Opacity ({Math.round(sheetOpacity * 100)}%):
                </span>
                <input
                  type="range"
                  min="0.7"
                  max="1"
                  step="0.02"
                  value={sheetOpacity}
                  onChange={(e) => setSheetOpacity(parseFloat(e.target.value))}
                  style={{ width: "90px", cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#6d1b2d" }}>
                  Highlighted Badge:
                </span>
                <select
                  value={acquiredLevel}
                  onChange={(e) => handleSelectBadgeLevel(Number(e.target.value))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: "1.5px solid #6d1b2d",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    backgroundColor: "#fff",
                    color: "#0f172a",
                  }}
                >
                  {EVALUATION_LEVELS.map((l) => (
                    <option key={l.level} value={l.level}>
                      Level {l.level} — {l.animal}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Custom Badge Logos Uploader Bar */}
            <details style={{ fontSize: "0.8rem", color: "#475569" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "#0f172a" }}>
                Optional: Upload Custom Badge Logos (Level 1–6)
              </summary>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "10px",
                  paddingTop: "8px",
                  borderTop: "1px dashed #cbd5e1",
                }}
              >
                {EVALUATION_LEVELS.map((l) => (
                  <label
                    key={l.level}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    Upload L{l.level} ({l.animal})
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleBadgeUpload(l.level, e)}
                      style={{ display: "none" }}
                    />
                  </label>
                ))}
              </div>
            </details>
          </div>

          {/* Live Landscape Report Card Preview Container */}
          <div
            style={{
              maxWidth: "1160px",
              width: "100%",
              margin: "0 auto",
              overflowX: "auto",
              display: "flex",
              justifyContent: "center",
              paddingBottom: "30px",
            }}
          >
            <ReportCardView
              cardRef={reportCardRef}
              studentName={selectedStudent.name}
              acquiredLevel={acquiredLevel}
              scores={scores}
              customCriteriaText={customCriteriaText}
              notes={notes}
              customWallpaperUrl={customWallpaperUrl}
              wallpaperFit={wallpaperFit}
              sheetOpacity={sheetOpacity}
              customBadges={customBadges}
              interactive={true}
              onSelectLevel={handleSelectBadgeLevel}
              onScoreChange={handleScoreChange}
              onNotesChange={setNotes}
            />
          </div>
        </div>
      )}
    </div>
  );
}
