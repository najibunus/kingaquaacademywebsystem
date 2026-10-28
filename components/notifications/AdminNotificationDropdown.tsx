"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "@/app/admin/layout.module.css";

export interface ReceiptNotificationItem {
  id: string;
  invoice_number: string;
  created_at: string;
  students?: { name: string } | null;
}

export interface TaskNotificationItem {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  created_at: string;
  assigned_user?: { display_name: string | null } | null;
}

export interface StudentNotificationItem {
  id: string;
  name: string;
  created_at: string;
}

interface AdminNotificationDropdownProps {
  receiptInvoices: ReceiptNotificationItem[];
  pendingTasks: TaskNotificationItem[];
  unpaidCount: number;
  recentStudents: StudentNotificationItem[];
}

interface NotificationEntry {
  id: string;
  title: string;
  detail: string;
  link: string;
  time: string;
  category: "receipt" | "task" | "unpaid" | "student";
  isUrgent?: boolean;
}

const STORAGE_KEY = "ka_admin_read_notifications";

export default function AdminNotificationDropdown({
  receiptInvoices = [],
  pendingTasks = [],
  unpaidCount = 0,
  recentStudents = [],
}: AdminNotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Load read notifications from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Build list of notification entries
  const notifications: NotificationEntry[] = [];

  // 1. Receipts pending verification (Urgent)
  receiptInvoices.forEach((inv) => {
    const studentName = inv.students?.name || "Student";
    notifications.push({
      id: `receipt-${inv.id}`,
      title: "Receipt Verification Needed",
      detail: `${studentName.toUpperCase()} — ${inv.invoice_number} submitted proof of payment.`,
      link: "/admin/finances",
      time: inv.created_at,
      category: "receipt",
      isUrgent: true,
    });
  });

  // 2. Pending or overdue tasks
  pendingTasks.forEach((task) => {
    const isOverdue =
      task.due_date &&
      new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

    const assignee = task.assigned_user?.display_name
      ? `Assigned to ${task.assigned_user.display_name}`
      : "Assigned to All Staff";

    const dueText = task.due_date
      ? ` • Due ${new Date(task.due_date).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}`
      : "";

    notifications.push({
      id: `task-${task.id}`,
      title: isOverdue ? `Overdue Task: ${task.title}` : `Pending Task: ${task.title}`,
      detail: `${assignee}${dueText}`,
      link: "/admin/dashboard",
      time: task.created_at,
      category: "task",
      isUrgent: Boolean(isOverdue),
    });
  });

  // 3. Unpaid invoices notice
  if (unpaidCount > 0) {
    notifications.push({
      id: "unpaid-invoices-summary",
      title: `${unpaidCount} Invoices Awaiting Payment`,
      detail: "Parents have active unpaid tuition invoices pending payment.",
      link: "/admin/finances",
      time: new Date().toISOString(),
      category: "unpaid",
      isUrgent: false,
    });
  }

  // 4. Recently enrolled students (past 7 days)
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  recentStudents.forEach((st) => {
    if (new Date(st.created_at).getTime() > oneWeekAgo) {
      notifications.push({
        id: `student-${st.id}`,
        title: "New Student Enrolled",
        detail: `${st.name.toUpperCase()} joined KingAqua Academy.`,
        link: "/admin/students/list",
        time: st.created_at,
        category: "student",
        isUrgent: false,
      });
    }
  });

  const unreadNotifications = notifications.filter((n) => !readIds.includes(n.id));
  const unreadCount = unreadNotifications.length;

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    const combined = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(combined);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
    } catch {}
  };

  const handleDismissItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = [...readIds, id];
    setReadIds(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const handleItemClick = (id: string) => {
    if (!readIds.includes(id)) {
      const next = [...readIds, id];
      setReadIds(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Bell Button */}
      <button
        type="button"
        className={styles.notificationBtn}
        onClick={() => setIsOpen((prev) => !prev)}
        title="Admin Notifications"
        aria-label="Admin Notifications"
        aria-expanded={isOpen}
        style={{
          outline: "none",
          padding: "6px",
          borderRadius: "8px",
          backgroundColor: isOpen ? "var(--bg-tint, #e0f2fe)" : "transparent",
          cursor: "pointer",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: isOpen ? "var(--ka-blue, #0284c7)" : "var(--text-secondary, #64748b)" }}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Red Badge Indicator */}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              minWidth: "16px",
              height: "16px",
              padding: "0 4px",
              backgroundColor: "#ef4444",
              color: "#ffffff",
              borderRadius: "999px",
              fontSize: "0.65rem",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 0 2px #ffffff",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "360px",
            maxWidth: "calc(100vw - 32px)",
            backgroundColor: "#ffffff",
            borderRadius: "14px",
            boxShadow: "0 15px 40px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(0,0,0,0.06)",
            border: "1px solid #e2e8f0",
            zIndex: 9999,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "fadeInUp 0.18s ease-out",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 800 }}>Notifications</span>
              {unreadCount > 0 ? (
                <span
                  style={{
                    backgroundColor: "#ef4444",
                    color: "#ffffff",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: "999px",
                  }}
                >
                  {unreadCount} New
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: "rgba(255,255,255,0.15)",
                    color: "#cbd5e1",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: "999px",
                  }}
                >
                  All caught up
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#38bdf8",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "2px 4px",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List of items */}
          <div
            style={{
              maxHeight: "360px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "#64748b" }}>
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  style={{ margin: "0 auto 10px auto", display: "block" }}
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p style={{ margin: "0 0 2px 0", fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>
                  All Caught Up!
                </p>
                <p style={{ margin: 0, fontSize: "0.78rem" }}>
                  No pending receipts, tasks, or urgent notifications.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isRead = readIds.includes(item.id);

                return (
                  <Link
                    key={item.id}
                    href={item.link}
                    onClick={() => handleItemClick(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "12px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      textDecoration: "none",
                      backgroundColor: isRead ? "#ffffff" : "#f0f9ff",
                      transition: "background-color 0.12s ease",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isRead ? "#ffffff" : "#f0f9ff";
                    }}
                  >
                    {/* Category Icon */}
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        backgroundColor:
                          item.category === "receipt"
                            ? "#fef3c7"
                            : item.category === "task"
                            ? item.isUrgent
                              ? "#fee2e2"
                              : "#e0f2fe"
                            : item.category === "unpaid"
                            ? "#ede9fe"
                            : "#dcfce7",
                        color:
                          item.category === "receipt"
                            ? "#b45309"
                            : item.category === "task"
                            ? item.isUrgent
                              ? "#dc2626"
                              : "#0284c7"
                            : item.category === "unpaid"
                            ? "#7c3aed"
                            : "#15803d",
                      }}
                    >
                      {item.category === "receipt" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      )}
                      {item.category === "task" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 11 12 14 22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                      )}
                      {item.category === "unpaid" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="1" x2="12" y2="23" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      )}
                      {item.category === "student" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <polyline points="16 11 18 13 22 9" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "space-between" }}>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: isRead ? 600 : 800,
                            color: item.isUrgent ? "#b91c1c" : "#0f172a",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.title}
                        </span>
                        {!isRead && (
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              backgroundColor: "#0284c7",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>

                      <p
                        style={{
                          margin: "2px 0 0 0",
                          fontSize: "0.76rem",
                          color: "#475569",
                          lineHeight: 1.35,
                          wordBreak: "break-word",
                        }}
                      >
                        {item.detail}
                      </p>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      type="button"
                      title="Dismiss"
                      onClick={(e) => handleDismissItem(item.id, e)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        padding: "2px",
                        lineHeight: 1,
                        opacity: 0.6,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                    >
                      ✕
                    </button>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer Quick Links */}
          <div
            style={{
              padding: "10px 16px",
              backgroundColor: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.78rem",
            }}
          >
            <Link
              href="/admin/finances"
              onClick={() => setIsOpen(false)}
              style={{ color: "var(--ka-blue, #0284c7)", fontWeight: 700, textDecoration: "none" }}
            >
              Finances &amp; Receipts →
            </Link>
            <Link
              href="/admin/dashboard"
              onClick={() => setIsOpen(false)}
              style={{ color: "#64748b", fontWeight: 600, textDecoration: "none" }}
            >
              Staff Tasks →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
