"use client";

import { useState, useTransition } from "react";
import { submitEvaluationAction } from "@/lib/actions/evaluation";
import styles from "./evaluations.module.css";

interface Student {
  id: string;
  name: string;
  class_id: string | null;
  class_name: string | null;
}

interface PastEval {
  id: string;
  student_name: string;
  star_rating: number | null;
  comments: string;
  skill_tag: string | null;
  created_at: string;
}

const SKILL_TAGS = [
  "Freestyle", "Backstroke", "Breaststroke", "Butterfly",
  "Water Safety", "Breathing", "Kicking", "Arm Technique",
  "Turns & Walls", "Endurance", "Confidence",
];

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className={styles.starPicker}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.star} ${(hovered || value) >= n ? styles.starFilled : ""}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span className={styles.starLabel}>
          {["", "Needs Work", "Developing", "Good", "Great", "Excellent!"][value]}
        </span>
      )}
    </div>
  );
}

export default function EvaluationsClient({
  students,
  pastEvals,
}: {
  students: Student[];
  pastEvals: PastEval[];
}) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [starRating, setStarRating] = useState(0);
  const [comments, setComments] = useState("");
  const [skillTag, setSkillTag] = useState("");
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setSelectedStudent(null);
    setSearchQuery("");
    setStarRating(0);
    setComments("");
    setSkillTag("");
    setResult(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setResult(null);

    const fd = new FormData();
    fd.append("student_id",  selectedStudent.id);
    fd.append("class_id",    selectedStudent.class_id ?? "");
    fd.append("star_rating", String(starRating));
    fd.append("comments",    comments);
    fd.append("skill_tag",   skillTag);

    startTransition(async () => {
      const res = await submitEvaluationAction(fd);
      setResult(res);
      if (res.success) {
        setComments("");
        setSkillTag("");
        setStarRating(0);
      }
    });
  }

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Student Evaluations</h1>
          <p className={styles.subtitle}>
            Submit skill assessments — parents see these in their portal.
          </p>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* ── Left: Student Picker + Form ── */}
        <div className={styles.formPanel}>
          {/* Step 1 — Pick a student */}
          <div className={styles.evalCard}>
            <h2 className={styles.panelTitle}>
              {selectedStudent ? `Evaluating: ${selectedStudent.name}` : "Step 1 — Select a Student"}
            </h2>

            {!selectedStudent ? (
              students.length === 0 ? (
                <p className={styles.emptyText}>No active students found for your assigned classes.</p>
              ) : (
                <>
                  <input 
                    type="text" 
                    placeholder="Search by student name..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%", 
                      padding: "12px", 
                      marginBottom: "16px", 
                      borderRadius: "8px", 
                      border: "1px solid var(--border-gray)",
                      fontFamily: "inherit"
                    }}
                  />
                  <div className={styles.studentGrid}>
                    {filteredStudents.length > 0 ? filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        className={styles.studentPickerBtn}
                        onClick={() => setSelectedStudent(s)}
                      >
                        <div className={styles.studentInitial}>{s.name.charAt(0)}</div>
                        <div>
                          <p className={styles.studentPickerName}>{s.name}</p>
                          <p className={styles.studentPickerClass}>{s.class_name ?? "—"}</p>
                        </div>
                      </button>
                    )) : (
                      <p className={styles.emptyText} style={{gridColumn: "1 / -1"}}>No students matched your search.</p>
                    )}
                  </div>
                </>
              )
            ) : (
              <form onSubmit={handleSubmit} className={styles.evalForm}>
                {/* Star Rating */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Step 2 — Star Rating</label>
                  <input type="hidden" name="star_rating" value={starRating} />
                  <StarPicker value={starRating} onChange={setStarRating} />
                </div>

                {/* Skill Tag */}
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Step 3 — Skill Focus <span className={styles.optional}>(optional)</span></label>
                  <div className={styles.tagGrid}>
                    {SKILL_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`${styles.tagBtn} ${skillTag === tag ? styles.tagBtnActive : ""}`}
                        onClick={() => setSkillTag(prev => prev === tag ? "" : tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comments */}
                <div className={styles.formField}>
                  <label className={styles.formLabel} htmlFor="comments">
                    Step 4 — Progress Comments <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    id="comments"
                    className={styles.textarea}
                    rows={4}
                    placeholder="e.g. Great improvement on freestyle kick today. Needs to work on breathing rhythm."
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    required
                    maxLength={600}
                  />
                  <p className={styles.charCount}>{comments.length} / 600</p>
                </div>

                {result?.error && <div className={styles.errorMsg}>⚠ {result.error}</div>}
                {result?.success && (
                  <div className={styles.successMsg}>✅ Evaluation submitted! Parents can now see this update.</div>
                )}

                <div className={styles.formActions}>
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    ← Change Student
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isPending || starRating === 0}
                  >
                    {isPending ? "Submitting..." : "Submit Evaluation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ── Right: Recent Evaluations ── */}
        <div className={styles.historyPanel}>
          <div className={styles.evalCard}>
            <h2 className={styles.panelTitle}>Recent Submissions</h2>
            {pastEvals.length === 0 ? (
              <p className={styles.emptyText}>No evaluations submitted yet.</p>
            ) : (
              <div className={styles.evalList}>
                {pastEvals.map((ev) => (
                  <div key={ev.id} className={styles.evalItem}>
                    <div className={styles.evalTop}>
                      <div className={styles.evalStudent}>
                        <div className={styles.evalInitial}>{ev.student_name.charAt(0)}</div>
                        <div>
                          <p className={styles.evalStudentName}>{ev.student_name}</p>
                          {ev.skill_tag && <span className={styles.evalTag}>{ev.skill_tag}</span>}
                        </div>
                      </div>
                      <div className={styles.evalStars}>
                        {"★".repeat(ev.star_rating ?? 0)}
                        {"☆".repeat(5 - (ev.star_rating ?? 0))}
                      </div>
                    </div>
                    <p className={styles.evalComment}>&ldquo;{ev.comments}&rdquo;</p>
                    <p className={styles.evalDate}>
                      {new Date(ev.created_at).toLocaleDateString("en-MY", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
