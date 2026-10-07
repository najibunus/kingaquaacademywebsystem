"use client";

import { useState, useTransition } from "react";
import styles from "./settings.module.css";
import { createClient } from "@/lib/supabase/client";
import { updateStudentProfile } from "@/lib/actions/students";
import ImageCropperModal from "@/components/ui/ImageCropperModal";

interface ProfileData {
  email: string;
  displayName: string;
  phone: string;
}

interface ChildData {
  id: string;
  name: string;
  date_of_birth: string | null;
  gender: string | null;
  avatar_url: string | null;
  classes?: { name: string } | null;
}

export default function ParentSettingsClient({ profile, childrenData }: { profile: ProfileData, childrenData?: ChildData[] }) {
  const [showToast, setShowToast] = useState(false);
  const [name, setName] = useState(profile.displayName);
  const [phone, setPhone] = useState(profile.phone);

  const [children, setChildren] = useState<ChildData[]>(childrenData || []);
  const [editingChild, setEditingChild] = useState<ChildData | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  
  const supabase = createClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

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
      if (!editingChild) return;

      const fileExt = "jpg"; // the canvas produces image/jpeg
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
      setUploading(false);
    }
  };

  const saveChildProfile = async () => {
    if (!editingChild) return;
    startTransition(async () => {
      const res = await updateStudentProfile(editingChild.id, {
        name: editingChild.name,
        date_of_birth: editingChild.date_of_birth,
        gender: editingChild.gender,
        avatar_url: editingChild.avatar_url
      }, ["/parent/settings", "/parent/portal"]);

      if (res.success) {
        setChildren(children.map(c => c.id === editingChild.id ? editingChild : c));
        setEditingChild(null);
      } else {
        alert("Failed to update profile: " + res.error);
      }
    });
  };

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.subtitle}>Manage your profile and children's details.</p>
      </div>

      <div className={styles.settingsCard} style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "16px", borderBottom: "1px solid var(--border-gray)", paddingBottom: "8px" }}>Parent Profile</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input type="email" value={profile.email} disabled className={styles.input} />
            <p className={styles.hint}>Email cannot be changed directly.</p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={styles.input} required />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Phone Number (WhatsApp)</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={styles.input} />
          </div>

          <button type="submit" className={styles.saveBtn}>Save Changes</button>
        </form>
      </div>

      {/* Children Section */}
      <div className={styles.settingsCard}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "16px", borderBottom: "1px solid var(--border-gray)", paddingBottom: "8px" }}>My Children</h2>
        <div style={{ display: "grid", gap: "16px" }}>
          {children.map(child => (
            <div key={child.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", border: "1px solid var(--border-gray)", borderRadius: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--bg-light)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {child.avatar_url ? (
                    <img src={child.avatar_url} alt={child.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{child.name}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {child.classes?.name || "No Class"} • {child.gender ? child.gender.charAt(0).toUpperCase() + child.gender.slice(1) : "Gender N/A"} • {child.date_of_birth || "DOB N/A"}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setEditingChild(child)}
                style={{ padding: "8px 16px", backgroundColor: "var(--bg-light)", color: "var(--ka-black)", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

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
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "20px" }}>Edit Profile: {editingChild.name}</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* Avatar Upload */}
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
                    {uploading ? "Uploading..." : "Upload Picture"}
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: "none" }} 
                      onChange={handleFileSelect} 
                      disabled={uploading} 
                      // Reset value so picking the same file again works
                      onClick={(e: any) => e.target.value = ''}
                    />
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Full Name</label>
                <input type="text" className={styles.input} value={editingChild.name} onChange={e => setEditingChild({...editingChild, name: e.target.value})} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Date of Birth</label>
                <input type="date" className={styles.input} value={editingChild.date_of_birth || ""} onChange={e => setEditingChild({...editingChild, date_of_birth: e.target.value})} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Gender</label>
                <select className={styles.input} value={editingChild.gender || ""} onChange={e => setEditingChild({...editingChild, gender: e.target.value})}>
                  <option value="">-- Select --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                <button 
                  onClick={saveChildProfile}
                  disabled={isPending || uploading}
                  style={{ flex: 1, padding: "12px", backgroundColor: "var(--ka-blue)", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                >
                  {isPending ? "Saving..." : "Save Child"}
                </button>
                <button 
                  onClick={() => setEditingChild(null)}
                  disabled={isPending || uploading}
                  style={{ padding: "12px", backgroundColor: "var(--bg-light)", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className={styles.toast}>
          Settings saved successfully!
        </div>
      )}
    </div>
  );
}
