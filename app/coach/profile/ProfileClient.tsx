"use client";

import { useState, useTransition } from "react";
import { updateCoachProfileAction } from "@/lib/actions/profile";

export default function ProfileClient({ userProfile }: { userProfile: any }) {
  const [displayName, setDisplayName] = useState(userProfile.display_name || "");
  const [phone, setPhone] = useState(userProfile.phone || "");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const fd = new FormData();
    fd.append("auth_id", userProfile.auth_id);
    fd.append("display_name", displayName);
    fd.append("phone", phone);

    startTransition(async () => {
      const res = await updateCoachProfileAction(fd);
      setResult(res);
      if (res.success) {
        setTimeout(() => setResult(null), 3000);
      }
    });
  }

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.875rem", margin: "0 0 4px 0" }}>Coach Profile</h1>
        <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.875rem" }}>Update your personal information and contact details.</p>
      </div>

      <div className="card" style={{ padding: "32px", maxWidth: "600px" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
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
              disabled={isPending || !displayName}
              style={{ padding: "12px 32px" }}
            >
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
