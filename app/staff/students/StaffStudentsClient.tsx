"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./staff-students.module.css";
import { createClient } from "@/lib/supabase/client";
import { updateStudentProfile } from "@/lib/actions/students";
import ImageCropperModal from "@/components/ui/ImageCropperModal";

interface Student {
  id: string;
  temp_id: number;
  name: string;
  session_count: number;
  status: string;
  date_of_birth?: string | null;
  gender?: string | null;
  avatar_url?: string | null;
  class_id: string | null;
  pricing_tier: string;
  classes: { name: string; type: string } | null;
}

interface ClassOption {
  id: string;
  name: string;
  type?: string;
  locations?: { name: string } | null;
}

interface Props {
  students: Student[];
  classes: ClassOption[];
}

export default function StaffStudentsClient({ students: initialStudents, classes }: Props) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const [uploading, setUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  let filteredStudents = selectedClass === "all" 
    ? students 
    : selectedClass === "unassigned"
    ? students.filter(s => !s.class_id)
    : students.filter(s => s.class_id === selectedClass);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredStudents = filteredStudents.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.temp_id && s.temp_id.toString().includes(q))
    );
  }

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStudents = filteredStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
      setUploading(true);
      setImageToCrop(null); // Close the cropper modal
      if (!editingStudent) return;

      const fileExt = "jpg"; // the canvas produces image/jpeg
      const filePath = `${editingStudent.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setEditingStudent({ ...editingStudent, avatar_url: data.publicUrl });
    } catch (error) {
      alert("Error uploading image!");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const saveStudentProfile = async () => {
    if (!editingStudent) return;
    startTransition(async () => {
      const res = await updateStudentProfile(editingStudent.id, {
        name: editingStudent.name,
        date_of_birth: editingStudent.date_of_birth,
        gender: editingStudent.gender,
        avatar_url: editingStudent.avatar_url,
        pricing_tier: editingStudent.pricing_tier,
        real_ic: (editingStudent as any).real_ic,
        school_name: (editingStudent as any).school_name,
        class_id: editingStudent.class_id
      }, ["/staff/students"]);

      if (res.success) {
        const updatedStudent = { ...editingStudent };
        if (updatedStudent.class_id) {
          const selectedClassObj = classes.find(c => c.id === updatedStudent.class_id);
          updatedStudent.classes = selectedClassObj ? { name: selectedClassObj.name, type: selectedClassObj.type || "standard" } : null;
        } else {
          updatedStudent.classes = null;
        }
        setStudents(students.map(s => s.id === editingStudent.id ? updatedStudent : s));
        setEditingStudent(null);
      } else {
        alert("Failed to update profile: " + res.error);
      }
    });
  };

  const groupedClasses = classes.reduce((acc, cls) => {
    const loc = cls.locations?.name || "Other";
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(cls);
    return acc;
  }, {} as Record<string, ClassOption[]>);

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Student Directory</h1>
          <p className={styles.subtitle}>
            {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-gray)",
              fontFamily: "inherit",
              minWidth: "220px"
            }}
          />
          <select
            value={selectedClass}
            onChange={(e) => { setSelectedClass(e.target.value); setPage(1); }}
            style={{ 
              padding: "8px 12px", 
              borderRadius: "6px", 
              border: "1px solid var(--border-gray)", 
              fontFamily: "inherit",
              backgroundColor: "var(--ka-white)",
              minWidth: "200px"
            }}
          >
            <option value="all">All Classes</option>
            <option value="unassigned">Unassigned</option>
            {Object.keys(groupedClasses).sort((a, b) => {
              const order = ["UTHM", "Pura Kencana", "Pontian"];
              const indexA = order.indexOf(a);
              const indexB = order.indexOf(b);
              return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
            }).map(loc => (
              <optgroup key={loc} label={loc}>
                {groupedClasses[loc].map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No students found for this filter.</p>
        </div>
      ) : (
        <>
          {/* ðŸ—„ï¸ Desktop scrollable table (hidden on mobile) ðŸ—„ï¸ */}
          <div className={styles.denseTableCard}>
            <table className={styles.denseTable}>
              <thead>
                <tr>
                  <th className={styles.colAvatar}>#</th>
                  <th className={styles.colName}>Student</th>
                  <th className={styles.colClass}>Class</th>
                  <th className={styles.colType}>Class Type</th>
                  <th className={styles.colStatus}>Status</th>
                  <th className={styles.colAction}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageStudents.map((s, idx) => {
                  let clsName = s.classes?.name;
                  // Strip the internal bracket code like ( ADV01 ) if present
                  if (clsName) {
                    clsName = clsName.replace(/\s*\(.*?\)\s*/g, '').trim();
                  }

                  const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;

                  return (
                    <tr key={s.id}>
                      <td style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                        {rowNum}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--bg-light)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {s.avatar_url ? (
                              <img src={s.avatar_url} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontWeight: "bold", color: "var(--text-secondary)", fontSize: "0.8rem" }}>{s.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <div className={styles.denseName}>{s.name}</div>
                            <div className={styles.denseSub}>
                              {s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : "N/A"} â€¢ {s.date_of_birth || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{clsName ? <span style={{ fontWeight: 500, color: "var(--ka-black)" }}>{clsName}</span> : <span style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>Unassigned</span>}</td>
                      <td>
                        <span className={styles.typePill}>
                          {s.classes?.type === "ADV01" ? "Advance" : s.classes?.type === "standard" ? "Standard" : "N/A"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${s.status === 'active' ? styles.statusActive : s.status === 'on_hold' ? styles.statusHold : styles.statusInactive}`}
                        >
                          {String(s.status).replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button 
                          onClick={() => setEditingStudent(s)}
                          className={styles.actionBtn}
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

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button 
                className={styles.pageBtn} 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={safePage <= 1}
              >
                â† Previous
              </button>
              <span className={styles.pageInfo}>Page {safePage} of {totalPages}</span>
              <button 
                className={styles.pageBtn} 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={safePage >= totalPages}
              >
                Next â†’
              </button>
            </div>
          )}

          {/* ðŸ“± Mobile card list ðŸ“± */}
          <div className={styles.mobileList}>
            {filteredStudents.map((s) => {
              const clsName = s.classes?.name;
              return (
                <div key={s.id} className={styles.mobileCard}>
                  <div className={styles.mobileCardLeft}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--bg-light)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontWeight: "bold", color: "var(--text-secondary)", fontSize: "1rem" }}>{s.name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className={styles.mobileName}>{s.name}</p>
                      <p className={styles.mobileSub}>{clsName ?? "Unassigned"}</p>
                    </div>
                  </div>
                  <div className={styles.mobileCardRight}>
                    <button 
                      onClick={() => setEditingStudent(s)}
                      style={{ padding: "6px 12px", backgroundColor: "var(--bg-light)", color: "var(--ka-black)", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.8rem", marginBottom: "8px" }}
                    >
                      Edit
                    </button>
                      <span className={styles.sessionPip} style={{ backgroundColor: "var(--bg-light)", color: "var(--text-secondary)", fontWeight: "bold" }}>
                        {s.classes?.type === "ADV01" ? "Advance (ADV01)" : s.classes?.type === "standard" ? "Standard" : "N/A"}
                      </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Image Cropper Modal */}
      {mounted && imageToCrop && createPortal(
        <ImageCropperModal
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
        />,
        document.body
      )}

      {/* Edit Student Modal */}
      {mounted && editingStudent && createPortal(
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "20px" }}>Edit Profile: {editingStudent.name}</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* Avatar Upload */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "var(--bg-light)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {editingStudent.avatar_url ? (
                    <img src={editingStudent.avatar_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  )}
                </div>
                <div>
                  <label style={{ display: "inline-block", padding: "8px 12px", backgroundColor: "var(--bg-light)", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}>
                    {uploading ? "Uploading..." : "Upload Picture"}
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: "none" }} 
                      onChange={handleFileSelect} 
                      disabled={uploading} 
                      onClick={(e: any) => e.target.value = ''}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>Full Name</label>
                <input type="text" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-gray)" }} value={editingStudent.name} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>Date of Birth</label>
                <input type="date" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-gray)" }} value={editingStudent.date_of_birth || ""} onChange={e => setEditingStudent({...editingStudent, date_of_birth: e.target.value})} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>Gender</label>
                <select style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-gray)" }} value={editingStudent.gender || ""} onChange={e => setEditingStudent({...editingStudent, gender: e.target.value})}>
                  <option value="">-- Select --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>Class / Venue</label>
                <select style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-gray)" }} value={editingStudent.class_id || ""} onChange={e => setEditingStudent({...editingStudent, class_id: e.target.value || null})}>
                  <option value="">-- Unassigned --</option>
                  {Object.keys(groupedClasses).sort((a, b) => {
                    const order = ["UTHM", "Pura Kencana", "Pontian"];
                    const indexA = order.indexOf(a);
                    const indexB = order.indexOf(b);
                    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
                  }).map(loc => (
                    <optgroup key={loc} label={loc}>
                      {groupedClasses[loc].map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.type === 'ADV01' ? '(ADV01)' : ''}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px" }}>Pricing Tier</label>
                <select style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-gray)" }} value={editingStudent.pricing_tier || "Standard"} onChange={e => setEditingStudent({...editingStudent, pricing_tier: e.target.value})}>
                  <option value="Standard">Standard</option>
                  <option value="Staff/Students">Staff/Students Promo</option>
                  <option value="Mommy">Mommy Promo</option>
                  <option value="1 Person (Private)">1 Person (Private)</option>
                  <option value="2 People (Private)">2 People (Private)</option>
                  <option value="3-5 People (Private)">3-5 People (Private)</option>
                  <option value="Special Needs">Special Needs</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button 
                  onClick={saveStudentProfile}
                  disabled={isPending || uploading}
                  style={{ flex: 1, padding: "12px", backgroundColor: "var(--ka-blue)", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                >
                  {isPending ? "Saving..." : "Save Profile"}
                </button>
                <button 
                  onClick={() => setEditingStudent(null)}
                  disabled={isPending || uploading}
                  style={{ padding: "12px", backgroundColor: "var(--bg-light)", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
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



