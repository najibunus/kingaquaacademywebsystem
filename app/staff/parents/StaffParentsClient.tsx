"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import styles from "./staff-parents.module.css";
import { updateUserProfile, createParentUser } from "@/lib/actions/users";
import { formatPhoneNumber } from "@/lib/utils/whatsapp";

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

  // Pagination & Search & Filter
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [childrenFilter, setChildrenFilter] = useState<"all" | "no_children" | "has_children">("all");

  const counts = useMemo(() => {
    let noChildren = 0;
    let hasChildren = 0;
    parents.forEach((p) => {
      if (!p.students || p.students.length === 0) {
        noChildren++;
      } else {
        hasChildren++;
      }
    });
    return {
      all: parents.length,
      noChildren,
      hasChildren,
    };
  }, [parents]);

  const filteredParents = useMemo(() => {
    return parents.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.display_name?.toLowerCase().includes(q) || false;
      const matchPhone = p.phone?.toLowerCase().includes(q) || false;
      const matchEmail = p.email?.toLowerCase().includes(q) || false;
      const matchSearch = !q || matchName || matchPhone || matchEmail;
      if (!matchSearch) return false;

      if (childrenFilter === "no_children") {
        return !p.students || p.students.length === 0;
      }
      if (childrenFilter === "has_children") {
        return p.students && p.students.length > 0;
      }
      return true;
    });
  }, [parents, searchQuery, childrenFilter]);

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

  // Add Parent State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    display_name: "",
    email: "",
    password: "",
    phone: "",
    assignedStudentIds: [] as string[],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addStudentSearchQuery, setAddStudentSearchQuery] = useState("");

  const filteredAddStudents = useMemo(() => {
    if (!addStudentSearchQuery) return allStudents;
    return allStudents.filter((s) => s.name.toLowerCase().includes(addStudentSearchQuery.toLowerCase()));
  }, [allStudents, addStudentSearchQuery]);

  const toggleAddStudent = (studentId: string) => {
    setAddForm((prev) => {
      const isSelected = prev.assignedStudentIds.includes(studentId);
      return {
        ...prev,
        assignedStudentIds: isSelected
          ? prev.assignedStudentIds.filter((id) => id !== studentId)
          : [...prev.assignedStudentIds, studentId],
      };
    });
  };

  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.display_name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      setAddError("Please fill in all required fields.");
      return;
    }
    if (addForm.password.length < 6) {
      setAddError("Password must be at least 6 characters.");
      return;
    }

    setIsCreating(true);
    setAddError(null);

    const res = await createParentUser({
      display_name: addForm.display_name.trim(),
      email: addForm.email.trim(),
      password: addForm.password,
      phone: addForm.phone.trim() || null,
      assignedStudentIds: addForm.assignedStudentIds,
    });

    setIsCreating(false);

    if (res.success && res.parent) {
      setParents((prev) => [res.parent, ...prev]);
      setShowAddModal(false);
      setAddForm({
        display_name: "",
        email: "",
        password: "",
        phone: "",
        assignedStudentIds: [],
      });
    } else {
      setAddError(res.error || "Failed to create parent.");
    }
  };

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
        <button
          className={styles.addBtn}
          onClick={() => {
            setShowAddModal(true);
            setAddError(null);
            setAddStudentSearchQuery("");
          }}
        >
          + Add Parent
        </button>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className={styles.toolbarLabel}>Search</span>
          <input
            type="text"
            placeholder="Name, phone, or email..."
            className={styles.toolbarInput}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            style={{ width: "240px" }}
          />
        </div>

        <div className={styles.toolbarSep} />

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className={styles.toolbarLabel}>Children</span>
          <select
            className={styles.toolbarSelect}
            value={childrenFilter}
            onChange={e => {
              setChildrenFilter(e.target.value as "all" | "no_children" | "has_children");
              setPage(1);
            }}
          >
            <option value="all">All Parents ({counts.all})</option>
            <option value="no_children">Without Children Assigned ({counts.noChildren})</option>
            <option value="has_children">With Children Assigned ({counts.hasChildren})</option>
          </select>
        </div>

        {childrenFilter === "no_children" && (
          <span className={`${styles.pillBadge} ${styles.pillBadgeWarn}`}>
            ⚠️ Showing parents without children ({filteredParents.length})
          </span>
        )}
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
                  <th className={styles.colWhatsapp} style={{ textAlign: "center" }}>Contact</th>
                  <th className={styles.colChildren}>Assigned Children</th>
                  <th className={styles.colAction} style={{ textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageParents.map((p, idx) => {
                  const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                  const formattedPhone = formatPhoneNumber(p.phone);
                  return (
                    <tr key={p.id}>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textAlign: "center" }}>{rowNum}</td>
                      <td>
                        <div className={styles.denseName}>{p.display_name || "Unknown"}</div>
                        <div className={styles.denseSub}>Parent Account</div>
                      </td>
                      <td>
                        <div style={{ color: "#0f172a", fontWeight: 500 }}>
                          {p.phone || (
                            <span style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>
                              No Phone
                            </span>
                          )}
                        </div>
                        <div className={styles.denseSub}>{p.email}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {formattedPhone ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <a
                              href={"https://wa.me/" + formattedPhone}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`WhatsApp ${p.display_name || "Parent"} (+${formattedPhone})`}
                              aria-label={`WhatsApp ${p.display_name || "Parent"}`}
                              className={`bg-[#25D366] text-white p-2 rounded-full flex items-center justify-center hover:bg-green-600 transition ${styles.whatsappBtn}`}
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path d="M12.031 2c-5.516 0-9.999 4.486-9.999 10.003 0 1.766.461 3.489 1.338 5.008L2 22l5.118-1.341c1.472.803 3.128 1.227 4.913 1.227h.004c5.515 0 9.998-4.486 9.998-10.002C22.033 6.486 17.547 2 12.031 2zm5.822 14.142c-.246.693-1.432 1.326-1.988 1.409-.508.076-1.15.108-1.856-.116-.428-.136-.978-.317-1.682-.621-2.961-1.278-4.894-4.262-5.042-4.459-.148-.197-1.204-1.601-1.204-3.055 0-1.453.763-2.168 1.034-2.464.271-.296.592-.37.789-.37.197 0 .394.002.567.01.182.009.426-.069.666.508.246.591.838 2.045.912 2.193.074.148.123.32.025.517-.099.197-.148.32-.296.493-.148.172-.311.385-.444.517-.148.148-.302.309-.13.604.173.296.766 1.264 1.645 2.047 1.131 1.008 2.084 1.321 2.38 1.469.296.148.468.123.641-.074.173-.197.74-.862.937-1.158.197-.296.394-.246.665-.148.271.099 1.725.813 2.021.961.296.148.493.222.567.345.074.123.074.714-.172 1.407z" />
                              </svg>
                            </a>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                            —
                          </span>
                        )}
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
            inset: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
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
              maxWidth: "420px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
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

      {/* Add Parent Modal */}
      {mounted && showAddModal && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
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
              maxWidth: "460px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>
                Add New Parent
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                ✕
              </button>
            </div>

            {addError && (
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  marginBottom: "16px",
                }}
              >
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateParent} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>
                  Full Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Tan"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-gray)",
                  }}
                  value={addForm.display_name}
                  onChange={(e) => setAddForm({ ...addForm, display_name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>
                  Email Address <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-gray)",
                  }}
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>
                  Password <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min. 6 characters"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-gray)",
                  }}
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0123456789"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-gray)",
                  }}
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>
                  Assign Existing Children <span style={{ fontWeight: "normal", color: "var(--text-secondary)" }}>(optional)</span>
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
                  value={addStudentSearchQuery}
                  onChange={(e) => setAddStudentSearchQuery(e.target.value)}
                />
                <div
                  style={{
                    maxHeight: "130px",
                    overflowY: "auto",
                    border: "1px solid var(--border-gray)",
                    borderRadius: "8px",
                    padding: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {filteredAddStudents.length === 0 ? (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>No students found.</span>
                  ) : (
                    filteredAddStudents.map((student) => (
                      <label
                        key={student.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={addForm.assignedStudentIds.includes(student.id)}
                          onChange={() => toggleAddStudent(student.id)}
                        />
                        {student.name}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  type="submit"
                  disabled={isCreating}
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
                  {isCreating ? "Creating..." : "Create Parent"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isCreating}
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
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
