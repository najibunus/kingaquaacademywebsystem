"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import styles from "./portal.module.css";
import { updateStudentProfile } from "@/lib/actions/students";
import ImageCropperModal from "@/components/ui/ImageCropperModal";
import { createClient } from "@/lib/supabase/client";

interface Invoice {
  id: string;
  invoice_number: string;
  type: string;
  due_date?: string;
  student_id?: string | null;
  payment_status: "unpaid" | "confirmed_paid" | "pending_verification";
  payment_date?: string | null;
}

interface Attendance {
  status: string;
  date: string;
  classes?: { name: string } | null;
}

interface Evaluation {
  star_rating: number | null;
  comments: string;
  skill_tag: string | null;
  created_at: string;
}

interface Child {
  id: string;
  name: string;
  session_count: number;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  real_ic?: string | null;
  school_name?: string | null;
  classes: { name: string; type: string } | null;
  attendance: Attendance[] | null;
  student_evaluations: Evaluation[] | null;
}

interface Props {
  unpaidInvoices: Invoice[];
  children: Child[];
}

function calculateAge(dobString?: string | null): string | null {
  if (!dobString) return null;
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} years old` : null;
}

function formatDate(dobString?: string | null): string {
  if (!dobString) return "Not registered";
  try {
    const d = new Date(dobString);
    if (isNaN(d.getTime())) return dobString;
    return d.toLocaleDateString("en-MY", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dobString;
  }
}

export default function ParentPortalClient({ unpaidInvoices, children }: Props) {
  const router = useRouter();
  const [childrenList, setChildrenList] = useState<Child[]>(children || []);
  const initialChild = childrenList.length > 0 ? childrenList[0] : null;

  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    initialChild ? initialChild.id : null
  );

  const [mounted, setMounted] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states for editing
  const [editName, setEditName] = useState<string>("");
  const [editIc, setEditIc] = useState<string>("");
  const [editDob, setEditDob] = useState<string>("");
  const [editSchool, setEditSchool] = useState<string>("");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);

  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update children list when props change
  useEffect(() => {
    setChildrenList(children || []);
    if (!selectedChildId && children && children.length > 0) {
      setSelectedChildId(children[0].id);
    }
  }, [children]);

  const selectedChild = childrenList.find(c => c.id === selectedChildId);

  // Sync form state when active child changes or edit modal opens
  const syncFormWithChild = (child: Child) => {
    setEditName(child.name ?? "");
    setEditIc(child.real_ic ?? "");
    setEditDob(child.date_of_birth ?? "");
    setEditSchool(child.school_name ?? "");
    setEditAvatarUrl(child.avatar_url ?? null);
    setEditError(null);
    setEditSuccess(false);
  };

  function handleSelectChild(child: Child) {
    setSelectedChildId(child.id);
    syncFormWithChild(child);
  }

  function handleOpenEditModal() {
    if (selectedChild) {
      syncFormWithChild(selectedChild);
      setIsEditModalOpen(true);
    }
  }

  function handleCloseEditModal() {
    setIsEditModalOpen(false);
    setEditError(null);
    setEditSuccess(false);
  }

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isEditModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isEditModalOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditModalOpen && !imageToCrop) {
        handleCloseEditModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditModalOpen, imageToCrop]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageToCrop(reader.result?.toString() || null);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      setEditSaving(true);
      setImageToCrop(null);
      if (!selectedChild) return;

      const fileExt = "jpg";
      const filePath = `${selectedChild.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setEditAvatarUrl(data.publicUrl);
    } catch (error) {
      alert("Error uploading image!");
      console.error(error);
    } finally {
      setEditSaving(false);
    }
  };

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChild) return;
    setEditSaving(true);
    setEditError(null);
    setEditSuccess(false);

    const payload = {
      name: editName.trim(),
      real_ic: editIc.trim() || null,
      date_of_birth: editDob || null,
      school_name: editSchool.trim() || null,
      avatar_url: editAvatarUrl,
    };

    const res = await updateStudentProfile(
      selectedChild.id,
      payload,
      ["/parent/portal", "/parent/invoices", "/staff/students"]
    );

    setEditSaving(false);
    if (!res.success) {
      setEditError(res.error || "Failed to update profile.");
      return;
    }

    // Update local state immediately for instant feedback
    setChildrenList(prev =>
      prev.map(c =>
        c.id === selectedChild.id
          ? {
              ...c,
              name: payload.name,
              real_ic: payload.real_ic,
              date_of_birth: payload.date_of_birth,
              school_name: payload.school_name,
              avatar_url: payload.avatar_url,
            }
          : c
      )
    );

    setEditSuccess(true);
    setTimeout(() => {
      setIsEditModalOpen(false);
      setEditSuccess(false);
      router.refresh();
    }, 600);
  }

  const childAge = selectedChild ? calculateAge(selectedChild.date_of_birth) : null;

  return (
    <div className="animate-fade-in-up" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Welcome back! View your children&apos;s profiles and class overview below.</p>
      </div>

      {!childrenList || childrenList.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          No children registered under your account yet.
        </div>
      ) : (
        <>
          {/* Child Selector Pills */}
          <div className={styles.pillContainer} style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            {childrenList.map((child) => (
              <button
                key={child.id}
                onClick={() => handleSelectChild(child)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "10px 18px", borderRadius: "100px",
                  border: selectedChildId === child.id ? "2px solid var(--ka-blue)" : "1px solid var(--border-gray)",
                  backgroundColor: selectedChildId === child.id ? "var(--bg-tint)" : "var(--ka-white)",
                  cursor: "pointer", transition: "all 0.2s",
                  minWidth: "max-content",
                  boxShadow: selectedChildId === child.id ? "0 2px 8px rgba(71, 169, 218, 0.2)" : "none"
                }}
              >
                <div style={{
                  width: "34px", height: "34px", borderRadius: "50%",
                  backgroundColor: selectedChildId === child.id ? "var(--ka-blue)" : "var(--bg-light)",
                  color: selectedChildId === child.id ? "white" : "var(--ka-black)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: "bold", fontSize: "0.95rem", overflow: "hidden", flexShrink: 0
                }}>
                  {child.avatar_url ? (
                    <img src={child.avatar_url} alt={child.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  ) : child.name.charAt(0)}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem", color: selectedChildId === child.id ? "var(--ka-blue)" : "var(--ka-black)" }}>
                    {child.name}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedChild && (
            <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: "16px", border: "1px solid var(--border-gray)", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", boxSizing: "border-box", maxWidth: "100%" }}>
              {/* Profile Card Header Banner */}
              <div
                style={{
                  padding: "18px 20px",
                  backgroundColor: "var(--bg-light)",
                  borderBottom: "1px solid var(--border-gray)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "14px",
                  boxSizing: "border-box",
                  width: "100%",
                  maxWidth: "100%"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", minWidth: 0 }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      backgroundColor: "var(--bg-tint)",
                      color: "var(--ka-blue)",
                      fontSize: "1.75rem",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "2px solid var(--ka-blue)",
                      boxShadow: "0 2px 8px rgba(71, 169, 218, 0.25)",
                      flexShrink: 0
                    }}
                  >
                    {selectedChild.avatar_url ? (
                      <img src={selectedChild.avatar_url} alt={selectedChild.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : selectedChild.name.charAt(0)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--ka-black)", wordBreak: "break-word" }}>
                        {selectedChild.name}
                      </h2>
                      {selectedChild.real_ic && (
                        <span style={{ fontSize: "0.75rem", backgroundColor: "var(--bg-tint)", color: "var(--ka-blue)", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                          ID: {selectedChild.real_ic}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
                        {(() => {
                          const rawName = selectedChild.classes?.name || "Unassigned";
                          return rawName.split(" (")[0].trim();
                        })()}
                      </span>
                      {childAge && (
                        <>
                          <span style={{ color: "var(--border-gray)" }}>&bull;</span>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                            {childAge}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", boxSizing: "border-box", maxWidth: "100%" }}>
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      backgroundColor: "var(--ka-blue)",
                      color: "white",
                      border: "none",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(71, 169, 218, 0.35)",
                      transition: "opacity 0.2s",
                      boxSizing: "border-box",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit Profile
                  </button>

                  <Link
                    href="/parent/invoices"
                    style={{
                      backgroundColor: "var(--bg-tint)",
                      border: "1.5px solid var(--ka-blue)",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--ka-blue)",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxSizing: "border-box",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <span>View Class Progress &amp; Payments</span>
                    <span style={{ fontSize: "0.95rem", lineHeight: 1, flexShrink: 0 }}>&rarr;</span>
                  </Link>
                </div>
              </div>

              {/* Profile Overview Body */}
              <div style={{ padding: "clamp(14px, 4vw, 24px)", boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--ka-black)" }}>
                    Child Profile Overview
                  </h3>
                  <button
                    onClick={handleOpenEditModal}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--ka-blue)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline"
                    }}
                  >
                    Edit Profile
                  </button>
                </div>

                {/* Structured Overview Cards Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                    marginBottom: "24px"
                  }}
                >
                  {/* Item 1: Full Name */}
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-gray)",
                      backgroundColor: "var(--ka-white)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px"
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        backgroundColor: "var(--bg-tint)",
                        color: "var(--ka-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        FULL NAME
                      </p>
                      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--ka-black)", wordBreak: "break-word" }}>
                        {selectedChild.name}
                      </p>
                    </div>
                  </div>

                  {/* Item 2: Identity Card / MyKid */}
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-gray)",
                      backgroundColor: "var(--ka-white)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px"
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        backgroundColor: "var(--bg-tint)",
                        color: "var(--ka-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                        <line x1="7" y1="8" x2="11" y2="8"></line>
                        <line x1="7" y1="12" x2="17" y2="12"></line>
                        <line x1="7" y1="16" x2="14" y2="16"></line>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        IDENTITY CARD / MYKID
                      </p>
                      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: selectedChild.real_ic ? "var(--ka-black)" : "var(--text-secondary)" }}>
                        {selectedChild.real_ic ? (
                          <span style={{ fontFamily: "monospace", letterSpacing: "0.5px" }}>{selectedChild.real_ic}</span>
                        ) : (
                          <span style={{ fontStyle: "italic", fontSize: "0.9rem" }}>Not registered</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Item 3: Date of Birth & Age */}
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-gray)",
                      backgroundColor: "var(--ka-white)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px"
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        backgroundColor: "var(--bg-tint)",
                        color: "var(--ka-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        DATE OF BIRTH
                      </p>
                      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: selectedChild.date_of_birth ? "var(--ka-black)" : "var(--text-secondary)" }}>
                        {selectedChild.date_of_birth ? (
                          <span>
                            {formatDate(selectedChild.date_of_birth)}
                            {childAge && (
                              <span style={{ marginLeft: "8px", fontSize: "0.8rem", backgroundColor: "var(--bg-light)", padding: "2px 8px", borderRadius: "10px", border: "1px solid var(--border-gray)", fontWeight: 500 }}>
                                {childAge}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ fontStyle: "italic", fontSize: "0.9rem" }}>Not registered</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Item 4: School Name */}
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-gray)",
                      backgroundColor: "var(--ka-white)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px"
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        backgroundColor: "var(--bg-tint)",
                        color: "var(--ka-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        SCHOOL NAME
                      </p>
                      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: selectedChild.school_name ? "var(--ka-black)" : "var(--text-secondary)" }}>
                        {selectedChild.school_name ? selectedChild.school_name : (
                          <span style={{ fontStyle: "italic", fontSize: "0.9rem" }}>Not specified</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Item 5: Current Program / Class */}
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-gray)",
                      backgroundColor: "var(--ka-white)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px"
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        backgroundColor: "var(--bg-tint)",
                        color: "var(--ka-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        CURRENT PROGRAM / CLASS
                      </p>
                      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--ka-black)" }}>
                        {selectedChild.classes?.name || "Unassigned"}
                      </p>
                    </div>
                  </div>

                  {/* Item 6: Attendance Record */}
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-gray)",
                      backgroundColor: "var(--ka-white)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "14px"
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        backgroundColor: "var(--bg-tint)",
                        color: "var(--ka-blue)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        ATTENDANCE RECORD
                      </p>
                      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--ka-black)" }}>
                        {(selectedChild.attendance || []).length} sessions recorded
                      </p>
                    </div>
                  </div>
                </div>

                {/* Evaluations Section (if any) */}
                {selectedChild.student_evaluations && selectedChild.student_evaluations.length > 0 && (
                  <div style={{ marginTop: "24px", padding: "18px 20px", backgroundColor: "var(--bg-light)", borderRadius: "12px", border: "1px solid var(--border-gray)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", color: "var(--ka-black)" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ka-blue)" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        Latest Coach Evaluation
                      </h3>
                      <Link href="/parent/evaluations" style={{ fontSize: "0.85rem", color: "var(--ka-blue)", textDecoration: "none", fontWeight: 600 }}>
                        View All &rarr;
                      </Link>
                    </div>
                    {(() => {
                      const latestEval = selectedChild.student_evaluations[0];
                      return (
                        <div>
                          <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <svg key={star} width="16" height="16" viewBox="0 0 24 24" fill={(latestEval.star_rating || 0) >= star ? "#f59e0b" : "none"} stroke={(latestEval.star_rating || 0) >= star ? "#f59e0b" : "var(--border-gray)"} strokeWidth="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                              </svg>
                            ))}
                          </div>
                          {latestEval.skill_tag && (
                            <span className="badge" style={{ backgroundColor: "var(--bg-tint)", color: "var(--ka-blue)", display: "inline-block", marginBottom: "8px", fontWeight: 600, fontSize: "0.8rem", padding: "3px 8px", borderRadius: "6px" }}>
                              {latestEval.skill_tag.split("|||")[0]}
                            </span>
                          )}
                          <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--ka-black)", fontStyle: "italic" }}>
                            &ldquo;{latestEval.comments}&rdquo;
                          </p>
                          <p style={{ margin: "8px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {new Date(latestEval.created_at).toLocaleDateString("en-MY", { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Child Profile Modal (Rendered to document.body to bypass container transform restrictions) */}
      {isEditModalOpen && mounted && createPortal(
        <div
          onClick={handleCloseEditModal}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99990,
            padding: "16px",
            boxSizing: "border-box"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--ka-white, #ffffff)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "540px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              position: "relative"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-gray)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--bg-light)"
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--ka-black)" }}>
                  Edit Child Profile
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Update profile details for {selectedChild?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "8px",
                  color: "var(--text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Profile Picture Upload */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", backgroundColor: "var(--bg-light)", borderRadius: "10px", border: "1px solid var(--border-gray)" }}>
                  <div style={{ width: "70px", height: "70px", borderRadius: "50%", backgroundColor: "var(--bg-tint)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--ka-blue)", flexShrink: 0 }}>
                    {editAvatarUrl ? (
                      <img src={editAvatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--ka-blue)" }}>
                        {editName ? editName.charAt(0) : "A"}
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", backgroundColor: "var(--ka-white)", border: "1px solid var(--border-gray)", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem", color: "var(--ka-black)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      {editSaving ? "Uploading..." : "Change Profile Picture"}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleFileSelect}
                        disabled={editSaving}
                        onClick={(e: any) => (e.target.value = "")}
                      />
                    </label>
                    <p style={{ margin: "6px 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      Recommended format: Square JPG or PNG.
                    </p>
                  </div>
                </div>

                {/* Full Name */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ka-black)" }}>
                    Full Name <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter child's full name"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-gray)", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", width: "100%" }}
                  />
                </div>

                {/* Identity Card / MyKid */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ka-black)" }}>
                    Identity Card / MyKid
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 160101-01-1234"
                    value={editIc}
                    onChange={e => setEditIc(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-gray)", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", width: "100%" }}
                  />
                </div>

                {/* Date of Birth */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ka-black)" }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={e => setEditDob(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-gray)", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", width: "100%" }}
                  />
                </div>

                {/* School Name (Optional) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ka-black)" }}>
                    School Name <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SK Seri Gading"
                    value={editSchool}
                    onChange={e => setEditSchool(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-gray)", fontSize: "0.95rem", outline: "none", boxSizing: "border-box", width: "100%" }}
                  />
                </div>

                {editError && (
                  <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", fontSize: "0.875rem" }}>
                    {editError}
                  </div>
                )}

                {editSuccess && (
                  <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#f0fdf4", border: "1px solid #86efac", color: "#16a34a", fontSize: "0.875rem", fontWeight: 600 }}>
                    Child profile updated successfully!
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "16px 24px",
                  borderTop: "1px solid var(--border-gray)",
                  backgroundColor: "var(--bg-light)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px"
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={editSaving}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-gray)",
                    backgroundColor: "var(--ka-white)",
                    color: "var(--ka-black)",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "var(--ka-blue)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    opacity: editSaving ? 0.7 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Image Cropper Modal (z-index 99999 sits comfortably above the edit profile modal 99990) */}
      {imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
        />
      )}
    </div>
  );
}
