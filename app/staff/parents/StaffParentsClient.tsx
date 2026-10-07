"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import styles from "./staff-parents.module.css";
import { updateUserProfile } from "@/lib/actions/users";

interface ParentData {
  id: string;
  auth_id: string;
  display_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  email: string;
  students: { id: string; name: string }[];
}

interface Student {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Props {
  initialParents: ParentData[];
  allStudents: Student[];
}

const PAGE_SIZE = 15;

export default function StaffParentsClient({ initialParents, allStudents }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [parents, setParents] = useState<ParentData[]>(initialParents);
  
  useEffect(() => {
    setParents(initialParents);
  }, [initialParents]);

  // Pagination & Search
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParents = useMemo(() => {
    return parents.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchName = p.display_name?.toLowerCase().includes(q) || false;
      const matchPhone = p.phone?.toLowerCase().includes(q) || false;
      const matchEmail = p.email?.toLowerCase().includes(q) || false;
      return matchName || matchPhone || matchEmail;
    });
  }, [parents, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredParents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageParents = filteredParents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Edit State
  const [editingParent, setEditingParent] = useState<ParentData | null>(null);
  const [editForm, setEditForm] = useState({ 
    display_name: "", 
    phone: "", 
    password: "", 
    assignedStudentIds: [] as string[] 
  });
  const [isPending, startTransition] = useTransition();

  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const filteredAllStudents = useMemo(() => {
    if (!studentSearchQuery) return allStudents;
    return allStudents.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()));
  }, [allStudents, studentSearchQuery]);

  const handleEditClick = (parent: ParentData) => {
    setEditingParent(parent);
    setStudentSearchQuery("");
    setEditForm({
      display_name: parent.display_name || "",
      phone: parent.phone || "",
      password: "",
      assignedStudentIds: parent.students.map(s => s.id)
    });
  };

  const toggleStudent = (studentId: string) => {
    setEditForm(prev => {
      const isSelected = prev.assignedStudentIds.includes(studentId);
      if (isSelected) {
        return { ...prev, assignedStudentIds: prev.assignedStudentIds.filter(id => id !== studentId) };
      } else {
        return { ...prev, assignedStudentIds: [...prev.assignedStudentIds, studentId] };
      }
    });
  };

  const handleSave = () => {
    if (!editingParent) return;

    startTransition(async () => {
      const res = await updateUserProfile(
        editingParent.id,
        {
          display_name: editForm.display_name,
          phone: editForm.phone,
          auth_id: editingParent.auth_id,
          ...(editForm.password ? { password: editForm.password } : {}),
          assignedStudentIds: editForm.assignedStudentIds
        },
        ["/staff/parents"]
      );

      if (res.success) {
        setParents((prev) =>
          prev.map((p) =>
            p.id === editingParent.id
              ? { 
                  ...p, 
                  display_name: editForm.display_name, 
                  phone: editForm.phone,
                  // Optimistically update students list
                  students: allStudents.filter(s => editForm.assignedStudentIds.includes(s.id))
                }
              : p
          )
        );
        setEditingParent(null);
      } else {
        alert("Failed to update parent: " + res.error);
      }
    });
  };

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Parent Directory</h1>
          <p className={styles.subtitle}>
            {filteredParents.length} parent{filteredParents.length !== 1 && "s"} found
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>Search</span>
        <input
          type="text"
          placeholder="Name, phone, or email..."
          className={styles.toolbarInput}
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
          style={{ width: "250px" }}
        />
      </div>

      {filteredParents.length === 0 ? (
        <div className={styles.emptyState}>No parents found.</div>
      ) : (
        <>
          {/* Desktop Dense Table */}
          <div className={styles.denseTableCard}>
            <table className={`${styles.denseTable} ${styles.spreadsheetTable}`}>
              <thead>
                <tr>
                  <th className={styles.colId}>#</th>
                  <th className={styles.colInfo}>Parent Info</th>
                  <th className={styles.colContact}>Contact Details</th>
                  <th className={styles.colChildren}>Assigned Children</th>
                  <th className={styles.colAction}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageParents.map((p, idx) => {
                  const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr key={p.id}>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textAlign: "center" }}>{rowNum}</td>
                      <td>
                        <div className={styles.denseName}>{p.display_name || "Unknown"}</div>
                        <div className={styles.denseSub}>Parent Account</div>
                      </td>
                      <td>
                        <div style={{ color: "var(--ka-black)", fontWeight: 500 }}>{p.phone || <span style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>No Phone</span>}</div>
                        <div className={styles.denseSub}>{p.email}</div>
                      </td>
                      <td>
                        <div className={styles.childrenContainer}>
                          {p.students && p.students.length > 0
                            ? p.students.map((s) => (
                                <span key={s.id} className={styles.childPill}>
                                  {s.name}
                                </span>
                              ))
                            : <span style={{ fontStyle: "italic", color: "var(--text-secondary)", padding: "2px 0" }}>None</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleEditClick(p)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button 
                className={styles.pageBtn} 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={safePage <= 1}
              >
                ← Previous
              </button>
              <span className={styles.pageInfo}>Page {safePage} of {totalPages}</span>
              <button 
                className={styles.pageBtn} 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={safePage >= totalPages}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {mounted && editingParent && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "400px",
            }}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "20px" }}>
              Edit Parent
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>
                  Display Name
                </label>
                <input
                  type="text"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-gray)",
                  }}
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-gray)",
                  }}
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>
                  New Password <span style={{ fontWeight: "normal", color: "var(--text-secondary)" }}>(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-gray)",
                  }}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>
                  Assigned Children
                </label>
                <input
                  type="text"
                  placeholder="Search students..."
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-gray)",
                    marginBottom: "8px",
                    fontSize: "0.85rem",
                  }}
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                />
                <div style={{
                  maxHeight: "150px",
                  overflowY: "auto",
                  border: "1px solid var(--border-gray)",
                  borderRadius: "8px",
                  padding: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  {filteredAllStudents.length === 0 ? (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>No students found.</span>
                  ) : (
                    filteredAllStudents.map(student => (
                      <label key={student.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
                        <input 
                          type="checkbox" 
                          checked={editForm.assignedStudentIds.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                        />
                        {student.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "var(--ka-blue)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {isPending ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingParent(null)}
                  disabled={isPending}
                  style={{
                    padding: "12px",
                    backgroundColor: "var(--bg-light)",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
