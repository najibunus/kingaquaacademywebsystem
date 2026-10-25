"use client";

import { useState, useTransition, useRef } from "react";
import { updateCoachProfileAction } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";
import ImageCropperModal from "@/components/ui/ImageCropperModal";

export default function ProfileClient({ userProfile }: { userProfile: any }) {
  const [displayName, setDisplayName] = useState(userProfile.display_name || "");
  const [phone, setPhone] = useState(userProfile.phone || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userProfile.avatar_url || null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setResult({ error: "Please select a valid image file." });
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageToCrop(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
    }
  }

  async function handleCropComplete(croppedBlob: Blob) {
    setImageToCrop(null);
    setIsUploading(true);
    setResult(null);

    try {
      const fileExt = "jpg";
      const filePath = `coach-${userProfile.auth_id || userProfile.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newAvatarUrl = publicUrlData.publicUrl;
      setAvatarUrl(newAvatarUrl);

      // Persist immediately to the coach profile
      const fd = new FormData();
      fd.append("auth_id", userProfile.auth_id);
      fd.append("display_name", displayName);
      fd.append("phone", phone);
      fd.append("avatar_url", newAvatarUrl);

      startTransition(async () => {
        const res = await updateCoachProfileAction(fd);
        if (res.success) {
          setResult({ success: true });
          setTimeout(() => setResult(null), 3000);
        } else {
          setResult({ error: res.error || "Failed to update profile photo." });
        }
      });
    } catch (err: any) {
      console.error("Error uploading avatar:", err);
      setResult({ error: err.message || "Failed to upload avatar image." });
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemovePhoto() {
    setAvatarUrl(null);
    setResult(null);

    const fd = new FormData();
    fd.append("auth_id", userProfile.auth_id);
    fd.append("display_name", displayName);
    fd.append("phone", phone);
    fd.append("avatar_url", "");

    startTransition(async () => {
      const res = await updateCoachProfileAction(fd);
      if (res.success) {
        setResult({ success: true });
        setTimeout(() => setResult(null), 3000);
      } else {
        setResult({ error: res.error || "Failed to remove profile photo." });
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const fd = new FormData();
    fd.append("auth_id", userProfile.auth_id);
    fd.append("display_name", displayName);
    fd.append("phone", phone);
    if (avatarUrl !== null) {
      fd.append("avatar_url", avatarUrl);
    }

    startTransition(async () => {
      const res = await updateCoachProfileAction(fd);
      setResult(res);
      if (res.success) {
        setTimeout(() => setResult(null), 3000);
      }
    });
  }

  const initials = (displayName || "Coach").substring(0, 2).toUpperCase();

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.875rem", margin: "0 0 4px 0" }}>Coach Profile</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem" }}>Update your personal information and profile photo.</p>
      </div>

      <div className="card" style={{ padding: "32px", maxWidth: "600px" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Profile Photo Section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              paddingBottom: "24px",
              borderBottom: "1px solid var(--border-gray)",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "88px",
                height: "88px",
                borderRadius: "50%",
                backgroundColor: "var(--bg-tint)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "3px solid var(--ka-blue)",
                boxShadow: "var(--shadow-sm)",
                flexShrink: 0,
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || "Coach"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 700,
                    color: "var(--ka-blue)",
                  }}
                >
                  {initials}
                </span>
              )}

              {isUploading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.55)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                  }}
                >
                  Uploading...
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--ka-black)" }}>
                Profile Photo
              </span>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Upload a clear front-facing photo. JPG, PNG or WEBP.
              </p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={isUploading || isPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  {avatarUrl ? "Change Photo" : "Upload Photo"}
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    disabled={isUploading || isPending}
                    onClick={handleRemovePhoto}
                    style={{
                      background: "none",
                      border: "1px solid var(--border-gray)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--color-danger)",
                      padding: "7px 12px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Remove
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                  onClick={(e: any) => {
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Email Address</label>
            <input 
              type="text" 
              value={userProfile.email || "coach@kingaqua.test"} 
              disabled
              style={{
                padding: "12px", 
                borderRadius: "8px", 
                border: "1px solid var(--border-gray)", 
                backgroundColor: "var(--bg-light)",
                color: "var(--text-secondary)",
                fontFamily: "inherit"
              }}
            />
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>Your email address cannot be changed here.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Full Name <span style={{color: "var(--color-danger)"}}>*</span></label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              style={{
                padding: "12px", 
                borderRadius: "8px", 
                border: "1px solid var(--border-gray)", 
                fontFamily: "inherit"
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Phone Number</label>
            <input 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +60123456789"
              style={{
                padding: "12px", 
                borderRadius: "8px", 
                border: "1px solid var(--border-gray)", 
                fontFamily: "inherit"
              }}
            />
          </div>

          {result?.error && <div style={{ color: "var(--color-danger)", fontSize: "0.85rem", padding: "12px", backgroundColor: "#fef2f2", borderRadius: "8px" }}>⚠ {result.error}</div>}
          {result?.success && <div style={{ color: "var(--color-success)", fontSize: "0.85rem", padding: "12px", backgroundColor: "#ecfdf5", borderRadius: "8px" }}>✅ Profile updated successfully!</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isPending || isUploading || !displayName}
              style={{ padding: "12px 32px" }}
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Image Cropper Modal */}
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
