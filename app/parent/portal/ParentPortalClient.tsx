"use client";

import { useState } from "react";
import Link from "next/link";
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
  classes: { name: string; type: string } | null;
  attendance: Attendance[] | null;
  student_evaluations: Evaluation[] | null;
}

interface Props {
  unpaidInvoices: Invoice[];
  children: any[]; // Using any[] here to bypass complex nested Supabase types that are implicitly mapped
}



export default function ParentPortalClient({ unpaidInvoices, children }: Props) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    children && children.length > 0 ? children[0].id : null
  );
  
  // Edit state
  const [editingChild, setEditingChild] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editIc, setEditIc] = useState("");
  const [editSchool, setEditSchool] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  const supabase = createClient();

  const selectedChild = children.find(c => c.id === selectedChildId);

  function openEdit(child: any) {
    setEditingChild(child);
    setEditName(child.name ?? "");
    setEditAge(child.date_of_birth ?? "");
    setEditGender(child.gender ?? "");
    setEditIc(child.real_ic ?? "");
    setEditSchool((child as any).school_name ?? "");
    setEditError(null);
  }

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
      if (!editingChild) return;

      const fileExt = "jpg";
      const filePath = `${editingChild.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setEditingChild({ ...editingChild, avatar_url: data.publicUrl });
    } catch (error) {
      alert("Error uploading image!");
      console.error(error);
    } finally {
      setEditSaving(false);
    }
  };

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingChild) return;
    setEditSaving(true);
    setEditError(null);
    
    const res = await updateStudentProfile(editingChild.id, {
      name: editName,
      date_of_birth: editAge,
      gender: editGender,
      real_ic: editIc,
      school_name: editSchool,
      avatar_url: editingChild.avatar_url
    }, ["/parent/portal"]);
    
    setEditSaving(false);
    if (!res.success) {
      setEditError(res.error);
      return;
    }
    setEditingChild(null);
    window.location.reload();
  }

  return (
    <div className="animate-fade-in-up w-full max-w-[100vw] overflow-x-hidden px-4 box-border">
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Welcome back! Here is how your children are doing.</p>
      </div>

      {!children || children.length === 0 ? (
        <div className="card" style={{textAlign: "center", padding: "3rem", color: "var(--text-secondary)"}}>
          No children registered under your account yet.
        </div>
      ) : (
        <>
          <div className={`${styles.pillContainer} w-full max-w-full overflow-x-auto scrollbar-width-none flex flex-nowrap sm:flex-wrap`}>
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 20px", borderRadius: "100px",
                  border: selectedChildId === child.id ? "2px solid var(--ka-blue)" : "1px solid var(--border-gray)",
                  backgroundColor: selectedChildId === child.id ? "var(--bg-tint)" : "var(--ka-white)",
                  cursor: "pointer", transition: "all 0.2s",
                  minWidth: "max-content"
                }}
              >
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  backgroundColor: selectedChildId === child.id ? "var(--ka-blue)" : "var(--bg-light)",
                  color: selectedChildId === child.id ? "white" : "var(--ka-black)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: "bold", fontSize: "1rem"
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
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className={styles.childHeader} style={{ alignItems: "flex-start", flexWrap: "wrap", flexDirection: "column", gap: "24px", width: "100%" }}>
                <div className={styles.childAvatar} style={{ width: "64px", height: "64px", fontSize: "1.75rem", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {selectedChild.avatar_url ? (
                    <img src={selectedChild.avatar_url} alt={selectedChild.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : selectedChild.name.charAt(0)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", flex: 1 }}>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0, color: "var(--ka-black)" }}>
                    {selectedChild.name}
                  </h2>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {(() => {
                      const rawName = selectedChild.classes?.name || "Unassigned";
                      return rawName.split(" (")[0].trim();
                    })()}
                  </p>
                </div>
                <div style={{ flexShrink: 0, marginLeft: "auto" }}>
                  <button
                    onClick={() => openEdit(selectedChild)}
                    style={{
                      background: "none", border: "1px solid var(--border-gray)", borderRadius: "6px",
                      padding: "6px 12px", fontSize: "0.75rem", cursor: "pointer",
                      color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px"
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                </div>
              </div>
              
              <div className={styles.childContent} style={{ padding: "24px" }}>
                
                <h3 style={{ fontSize: "1.25rem", margin: "0 0 16px 0", borderBottom: "1px solid var(--border-gray)", paddingBottom: "12px" }}>
                  Class Progress
                </h3>
                
                {(() => {
                  const sortedAtt = [...(selectedChild.attendance || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  let blocks = [];
                  const isAdvance = selectedChild.classes?.type === "ADV01";

                  if (isAdvance) {
                    const monthsMap = new Map<string, any[]>();
                    sortedAtt.forEach(a => {
                      const d = new Date(a.date);
                      const monthKey = d.getFullYear() + "-" + d.getMonth();
                      if (!monthsMap.has(monthKey)) monthsMap.set(monthKey, []);
                      monthsMap.get(monthKey)!.push(a);
                    });
                    blocks = Array.from(monthsMap.values()).map(records => ({ records, isAdvance: true }));
                  } else {
                    for (let i = 0; i < sortedAtt.length; i += 4) {
                      blocks.push({ records: sortedAtt.slice(i, i + 4), isAdvance: false });
                    }
                  }

                  blocks.reverse(); // Latest package first

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {blocks.map((block, idx) => {
                        const targetIndex = blocks.length - 1 - idx;
                        

                        const isComplete = block.isAdvance ? false : block.records.length === 4;
                        let progressText = "";
                        if (block.isAdvance) {
                          const mName = block.records.length > 0 ? new Date(block.records[0].date).toLocaleDateString("en-MY", { month: "long", year: "numeric" }) : "";
                          progressText = `${mName} (Advance Class - ${block.records.length} Sessions)`;
                        } else {
                          progressText = `Package ${targetIndex + 1} (${block.records.length}/4 Sessions)`;
                        }

                        return (
                          <div key={idx} style={{ 
                            border: "1px solid var(--border-gray)", 
                            borderRadius: "12px", 
                            overflow: "hidden",
                            backgroundColor: "var(--ka-white)"
                          }} className="w-full max-w-full box-border">
                            <div style={{ 
                              padding: "16px 20px", 
                              borderBottom: "1px solid var(--border-gray)",
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              flexWrap: "wrap", gap: "16px",
                              backgroundColor: isComplete ? "var(--bg-tint)" : "transparent"
                            }} className="w-full max-w-full box-border">
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{ 
                                  width: "12px", height: "12px", borderRadius: "50%", 
                                  backgroundColor: isComplete ? "var(--color-success)" : "var(--ka-blue)" 
                                }} />
                                <span style={{ fontWeight: 600, fontSize: "1.05rem" }}>{progressText}</span>
                              </div>
                              
                              
                            </div>

                            <details className={`${styles.accordion} w-full max-w-full box-border`}>
                              <summary className={`${styles.accordionSummary} w-full max-w-full box-border`} style={{ padding: "12px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", outline: "none", userSelect: "none" }}>
                                <span style={{ fontWeight: 600, color: "var(--ka-black)" }}>View Attendance History</span>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                  {!block.isAdvance && (
                                    <div style={{ display: "flex", gap: "4px" }}>
                                      {[1,2,3,4].map(pip => (
                                        <div key={pip} style={{ 
                                          width: "8px", height: "8px", borderRadius: "50%", 
                                          backgroundColor: pip <= block.records.length ? "var(--ka-blue)" : "var(--border-gray)" 
                                        }} />
                                      ))}
                                    </div>
                                  )}
                                  <div style={{
                                    width: "32px", height: "32px", 
                                    borderRadius: "50%", 
                                    backgroundColor: "var(--bg-light)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "var(--text-secondary)"
                                  }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                  </div>
                                </div>
                              </summary>
                              
                              <div style={{ padding: "16px 20px", backgroundColor: "var(--bg-light)" }}>
                                {block.records.length === 0 ? (
                                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>No records yet.</p>
                                ) : (
                                  <table style={{ width: "100%", borderCollapse: "collapse" }} className="w-full max-w-full box-border">
                                    <tbody>
                                      {block.records.map((r: any, rIdx: number) => (
                                        <tr key={rIdx} style={{ borderBottom: rIdx < block.records.length - 1 ? "1px solid var(--border-gray)" : "none" }}>
                                          <td style={{ padding: "12px 0", fontSize: "0.95rem" }}>
                                            <div>{new Date(r.date).toLocaleDateString("en-MY", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            {r.classes?.name && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>{r.classes.name}</div>}
                                          </td>
                                          <td style={{ padding: "12px 0", textAlign: "right" }}>
                                            <span className="badge" style={{
                                              backgroundColor: 
                                                r.status === "present" ? "var(--color-success)" : 
                                                r.status === "absent" ? "#dc2626" : 
                                                r.status === "medical" ? "#f59e0b" : "#6b7280",
                                              color: "white",
                                              textTransform: "capitalize"
                                            }}>
                                              {r.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </details>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* â­ï¸ Evaluations (if any) â­ï¸ */}
                {selectedChild.student_evaluations && selectedChild.student_evaluations.length > 0 && (
                  <div style={{ marginTop: "32px", marginBottom: "0", padding: "16px", backgroundColor: "var(--bg-light)", borderRadius: "8px", border: "1px solid var(--border-gray)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ka-blue)" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        Latest Evaluation
                      </h3>
                      <Link href="/parent/evaluations" style={{ fontSize: "0.85rem", color: "var(--ka-blue)", textDecoration: "none", fontWeight: 600 }}>
                        View All
                      </Link>
                    </div>
                    {(() => {
                      const latestEval = selectedChild.student_evaluations[0];
                      return (
                        <div>
                          <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
                            {[1,2,3,4,5].map(star => (
                              <svg key={star} width="16" height="16" viewBox="0 0 24 24" fill={(latestEval.star_rating || 0) >= star ? "#f59e0b" : "none"} stroke={(latestEval.star_rating || 0) >= star ? "#f59e0b" : "var(--border-gray)"} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            ))}
                          </div>
                          {latestEval.skill_tag && (
                            <span className="badge" style={{ backgroundColor: "var(--bg-tint)", color: "var(--ka-blue)", display: "inline-block", marginBottom: "8px" }}>
                              {latestEval.skill_tag}
                            </span>
                          )}
                          <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--ka-black)" }}>"{latestEval.comments}"</p>
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

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
        />
      )}

      {/* Edit Child Modal */}
      {editingChild && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "24px"
        }} onClick={() => setEditingChild(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            backgroundColor: "var(--ka-white)", borderRadius: "12px", padding: "32px",
            width: "100%", maxWidth: "480px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto", boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Edit Child Details</h3>
              <button onClick={() => setEditingChild(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.5rem", lineHeight: 1 }}>&times;</button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "var(--bg-light)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {editingChild.avatar_url ? (
                    <img src={editingChild.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  )}
                </div>
                <div>
                  <label style={{ display: "inline-block", padding: "8px 12px", backgroundColor: "var(--bg-light)", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}>
                    {editSaving ? "Uploading..." : "Upload Picture"}
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: "none" }} 
                      onChange={handleFileSelect} 
                      disabled={editSaving} 
                      onClick={(e: any) => e.target.value = ''}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ka-black)" }}>Full Name</label>
                <input
                  type="text" required value={editName} onChange={e => setEditName(e.target.value)}
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-gray)", fontSize: "1rem", outline: "none", boxSizing: "border-box", width: "100%" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ka-black)" }}>Date of Birth</label>
                <input
                  type="date" value={editAge} onChange={e => setEditAge(e.target.value)}
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-gray)", fontSize: "1rem", outline: "none", boxSizing: "border-box", width: "100%" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ka-black)" }}>Gender</label>
                <select value={editGender} onChange={e => setEditGender(e.target.value)}
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-gray)", fontSize: "1rem", outline: "none", backgroundColor: "var(--ka-white)", width: "100%" }}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              {editError && <p style={{ margin: 0, color: "var(--color-danger)", fontSize: "0.875rem" }}>{editError}</p>}
              
              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => setEditingChild(null)} disabled={editSaving} style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-gray)",
                  background: "none", cursor: "pointer", fontSize: "0.95rem", color: "var(--text-secondary)"
                }}>Cancel</button>
                <button type="submit" disabled={editSaving} style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                  backgroundColor: "var(--ka-blue)", color: "white", cursor: "pointer",
                  fontSize: "0.95rem", fontWeight: 600, opacity: editSaving ? 0.6 : 1
                }}>{editSaving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}







