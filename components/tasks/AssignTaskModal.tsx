"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { createTaskAction, CreateTaskInput } from "@/lib/actions/task";

export interface TeamMember {
  id: string;
  display_name: string | null;
  role: string;
  avatar_url?: string | null;
}

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  defaultAssigneeId?: string | null;
  onTaskCreated?: () => void;
}

export default function AssignTaskModal({
  isOpen,
  onClose,
  teamMembers,
  defaultAssigneeId,
  onTaskCreated,
}: AssignTaskModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(defaultAssigneeId || "");
  const [dueDate, setDueDate] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (defaultAssigneeId) {
      setAssignedTo(defaultAssigneeId);
    }
  }, [defaultAssigneeId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!title.trim()) {
      setFeedback({ error: "Please enter a task title." });
      return;
    }

    startTransition(async () => {
      const input: CreateTaskInput = {
        title: title.trim(),
        description: description.trim() || null,
        assignedTo: assignedTo && assignedTo !== "unassigned" ? assignedTo : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        isPinned,
      };

      const res = await createTaskAction(input);
      if (res.error) {
        setFeedback({ error: res.error });
      } else {
        setFeedback({ success: "Task assigned successfully!" });
        setTimeout(() => {
          setTitle("");
          setDescription("");
          setDueDate("");
          setIsPinned(false);
          setFeedback(null);
          onTaskCreated?.();
          onClose();
        }, 650);
      }
    });
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "fadeInUp 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "linear-gradient(135deg, #0f172a, #1e293b)",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
                fontWeight: 900,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                Assign Task to Staff
              </h2>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                Task will immediately appear on the staff member&apos;s To-Do list.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "1.2rem",
              lineHeight: 1,
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {feedback?.error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              ⚠️ {feedback.error}
            </div>
          )}
          {feedback?.success && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#16a34a",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              ✅ {feedback.success}
            </div>
          )}

          {/* Task Title */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "6px",
              }}
            >
              Task Title <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Inspect water pH levels before Saturday class"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                color: "#0f172a",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Assignee Selection */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "6px",
              }}
            >
              Assign To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                color: "#0f172a",
                backgroundColor: "#ffffff",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              <option value="unassigned">👥 All Staff / General Pool (Unassigned)</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name || "Staff Member"} ({m.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Due Date & Pin Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "center" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: "6px",
                }}
              >
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ paddingTop: "22px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0284c7" }}
                />
                📌 Pin to top of list
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "6px",
              }}
            >
              Instructions / Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, steps, or reference links for this task..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                color: "#0f172a",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "8px",
              paddingTop: "14px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              style={{
                padding: "9px 16px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#f8fafc",
                color: "#475569",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: "9px 20px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #0284c7, #0369a1)",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(2, 132, 199, 0.35)",
              }}
            >
              {isPending ? "Assigning..." : "Assign Task"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
