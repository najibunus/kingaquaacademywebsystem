"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateParentProfileAction } from "@/lib/actions/profile";

interface Props {
  parentName: string;
  initialPhone?: string | null;
}

export default function ParentPhonePromptModal({ parentName, initialPhone }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone || "");
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (dismissed) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = phone.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (!trimmed || digits.length < 7 || !/^[0-9+\-\s()]{7,20}$/.test(trimmed)) {
      setError("Please enter a valid WhatsApp / phone number (e.g. 012-345 6789).");
      return;
    }

    startTransition(async () => {
      const res = await updateParentProfileAction({ phone: trimmed });
      if (res.error) {
        setError(res.error);
      } else {
        setDismissed(true);
        router.refresh();
      }
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mandatory-phone-title"
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #0f172a, #1e293b)",
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(56, 189, 248, 0.2)",
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
              }}
            >
              📱
            </div>
            <div>
              <h2
                id="mandatory-phone-title"
                style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800, color: "#ffffff" }}
              >
                Phone Number Required
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                Hello {parentName}, please add your WhatsApp phone number to continue.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>
            Your phone number is required so KingAqua Academy staff can send official class receipts, payment reminders, and urgent pool updates via WhatsApp.
          </p>

          {error && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "0.84rem",
                fontWeight: 600,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div>
            <label
              htmlFor="parent-mandatory-phone"
              style={{
                display: "block",
                fontSize: "0.84rem",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "6px",
              }}
            >
              Phone Number (WhatsApp) <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="parent-mandatory-phone"
              type="tel"
              required
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 012-345 6789"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.95rem",
                color: "#0f172a",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #0284c7, #0369a1)",
              color: "#ffffff",
              fontSize: "0.92rem",
              fontWeight: 800,
              cursor: isPending ? "wait" : "pointer",
              marginTop: "4px",
            }}
          >
            {isPending ? "Saving..." : "Save Phone Number & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
