"use client";

import { useState } from "react";
import styles from "./evaluations.module.css";

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

  const selectedChild = children?.find(c => c.id === selectedChildId);
  const evals = [...(selectedChild?.student_evaluations || [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <h1 className={styles.title}>Evaluations</h1>
        <p className={styles.subtitle}>Track your children's progress and coach feedback.</p>
      </div>

      {!children || children.length === 0 ? (
        <div className={styles.emptyCard}>
          No children registered under your account yet.
        </div>
      ) : (
        <>
          <div className={styles.childTabs}>
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={styles.childTab}
                style={{
                  border: selectedChildId === child.id ? "2px solid var(--ka-blue)" : "1px solid var(--border-gray)",
                  backgroundColor: selectedChildId === child.id ? "var(--bg-tint)" : "var(--ka-white)",
                }}
              >
                <div className={styles.childTabIcon} style={{
                  backgroundColor: selectedChildId === child.id ? "var(--ka-blue)" : "var(--bg-light)",
                  color: selectedChildId === child.id ? "white" : "var(--text-secondary)",
                }}>
                  {child.name.charAt(0)}
                </div>
                <span className={styles.childTabName} style={{
                  fontWeight: selectedChildId === child.id ? 700 : 500,
                  color: selectedChildId === child.id ? "var(--ka-blue)" : "var(--ka-black)",
                }}>
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
              evals.map(ev => (
                <div key={ev.id} className={styles.evalCard}>
                  <div className={styles.evalTop}>
                    <div className={styles.skillTag}>
                      {ev.skill_tag || "General Assessment"}
                    </div>
                    <div className={styles.evalDate}>
                      {new Date(ev.created_at).toLocaleDateString("en-MY", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                    </div>
                  </div>
                  <div className={styles.stars}>
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="20" height="20" viewBox="0 0 24 24" 
                           fill={(ev.star_rating || 0) > i ? "currentColor" : "none"} 
                           stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    ))}
                  </div>
                  <div className={styles.commentBox}>
                    <p className={styles.commentText}>"{ev.comments}"</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
