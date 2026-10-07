"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { reopenClassSessionAction, deleteClassSessionAction } from "@/lib/actions/attendance";
import { createClient } from "@/lib/supabase/client";

interface Props {
  recordId: string;
  className: string;
  hasOngoingClass: boolean;
  classId: string;
  date: string;
}

export default function HistoryActions({ recordId, className, hasOngoingClass, classId, date }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);

  function handleReopen() {
    if (hasOngoingClass) {
      alert("You already have an ongoing class. Please end it before reopening this one.");
      return;
    }

    if (!confirm(`Are you sure you want to re-open the session for ${className}?`)) return;

    const fd = new FormData();
    fd.append("record_id", recordId);

    startTransition(async () => {
      await reopenClassSessionAction(fd);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Are you sure you want to permanently delete the session log for ${className}? This cannot be undone.`)) return;

    const fd = new FormData();
    fd.append("record_id", recordId);

    startTransition(async () => {
      await deleteClassSessionAction(fd);
      router.refresh();
    });
  }

  async function handleView() {
    setShowModal(true);
    setLoadingAttendees(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("attendance")
      .select("status, students(name)")
      .eq("class_id", classId)
      .eq("date", date);

    if (!error && data) {
      setAttendees(data);
    }
    setLoadingAttendees(false);
  }

  return (
    <>
      <div style={{ display: "flex", gap: "8px" }}>
        <button 
          type="button"
          onClick={handleView}
          style={{
            padding: "4px 8px",
            fontSize: "0.8rem",
            fontWeight: 600,
            backgroundColor: "var(--bg-light)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-gray)",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          View
        </button>

        <button 
          type="button"
          onClick={handleReopen}
          disabled={isPending}
          style={{
            padding: "4px 8px",
            fontSize: "0.8rem",
            fontWeight: 600,
            backgroundColor: "var(--ka-blue)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "..." : "Re-open"}
        </button>

        <button 
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          style={{
            padding: "4px 8px",
            fontSize: "0.8rem",
            fontWeight: 600,
            backgroundColor: "var(--color-danger)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "..." : "Delete"}
        </button>
      </div>

      {showModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px"
        }}>
          <div className="card animate-fade-in-up" style={{ 
            width: "100%", maxWidth: "400px", padding: "24px", 
            maxHeight: "80vh", display: "flex", flexDirection: "column"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{className} Attendees</h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-secondary)" }}
              >&times;</button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, paddingRight: "8px" }}>
              {loadingAttendees ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                  Loading attendees...
                </div>
              ) : attendees.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                  No attendance records found.
                </div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {attendees.map((a, i) => {
                    const studentName = (a.students as any)?.name ?? "Unknown";
                    const isPresent = a.status === "present";
                    return (
                      <li key={i} style={{ 
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "12px", border: "1px solid var(--border-gray)", borderRadius: "6px" 
                      }}>
                        <span style={{ fontWeight: 500, fontSize: "0.95rem" }}>{studentName}</span>
                        <span className={`badge ${isPresent ? 'badge-primary' : ''}`} style={!isPresent ? { backgroundColor: "#f3f4f6", color: "#6b7280" } : {}}>
                          {isPresent ? "Present" : a.status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowModal(false)}
              style={{ marginTop: "24px", width: "100%", padding: "12px" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
