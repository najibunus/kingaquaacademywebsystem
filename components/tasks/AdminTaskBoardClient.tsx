"use client";

import React, { useState, useTransition } from "react";
import AssignTaskModal, { TeamMember } from "./AssignTaskModal";
import { updateTaskStatusAction, deleteTaskAction } from "@/lib/actions/task";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "done";
  is_pinned: boolean;
  due_date: string | null;
  created_at: string;
  assigned_user: {
    id: string;
    display_name: string | null;
    role: string;
    avatar_url?: string | null;
  } | null;
  creator: {
    id: string;
    display_name: string | null;
  } | null;
}

interface AdminTaskBoardClientProps {
  tasks: TaskItem[];
  teamMembers: TeamMember[];
}

export default function AdminTaskBoardClient({
  tasks,
  teamMembers,
}: AdminTaskBoardClientProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleToggleStatus = (taskId: string, currentStatus: "pending" | "in_progress" | "done") => {
    const nextStatus = currentStatus === "done" ? "pending" : "done";
    startTransition(async () => {
      await updateTaskStatusAction(taskId, nextStatus);
    });
  };

  const handleDeleteTask = (taskId: string, title: string) => {
    if (!confirm(`Delete task "${title}"?`)) return;
    startTransition(async () => {
      await deleteTaskAction(taskId);
    });
  };

  const pendingCount = tasks.filter((t) => t.status !== "done").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const filteredTasks = tasks.filter((t) => {
    if (filter === "pending") return t.status !== "done";
    if (filter === "done") return t.status === "done";
    return true;
  });

  // Sort pinned tasks first, then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div
      className="card"
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        border: "1px solid #e2e8f0",
        padding: "20px 22px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
              Staff Tasks &amp; Assignments
            </h3>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                backgroundColor: pendingCount > 0 ? "#fee2e2" : "#dcfce7",
                color: pendingCount > 0 ? "#b91c1c" : "#15803d",
              }}
            >
              {pendingCount} Pending
            </span>
          </div>
          <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
            Assign duties to staff and coaches. Tasks sync to their dashboard in real time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "var(--ka-blue, #0284c7)",
            color: "#ffffff",
            fontSize: "0.84rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Assign Task
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "12px",
          marginBottom: "14px",
        }}
      >
        <button
          type="button"
          onClick={() => setFilter("pending")}
          style={{
            padding: "5px 12px",
            borderRadius: "6px",
            border: "none",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
            backgroundColor: filter === "pending" ? "#e0f2fe" : "transparent",
            color: filter === "pending" ? "#0284c7" : "#64748b",
          }}
        >
          Pending ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          style={{
            padding: "5px 12px",
            borderRadius: "6px",
            border: "none",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
            backgroundColor: filter === "all" ? "#e0f2fe" : "transparent",
            color: filter === "all" ? "#0284c7" : "#64748b",
          }}
        >
          All ({tasks.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("done")}
          style={{
            padding: "5px 12px",
            borderRadius: "6px",
            border: "none",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
            backgroundColor: filter === "done" ? "#e0f2fe" : "transparent",
            color: filter === "done" ? "#0284c7" : "#64748b",
          }}
        >
          Done ({doneCount})
        </button>
      </div>

      {/* Task List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {sortedTasks.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "#64748b",
              backgroundColor: "#f8fafc",
              borderRadius: "10px",
              border: "1px dashed #cbd5e1",
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              style={{ margin: "0 auto 8px auto", display: "block" }}
            >
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <p style={{ margin: "0 0 4px 0", fontWeight: 700, color: "#334155", fontSize: "0.9rem" }}>
              {filter === "pending"
                ? "No pending tasks."
                : filter === "done"
                ? "No completed tasks yet."
                : "No tasks created yet."}
            </p>
            <p style={{ margin: 0, fontSize: "0.8rem" }}>
              Click <strong>&quot;Assign Task&quot;</strong> to assign tasks to your coaches or staff members.
            </p>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const isDone = task.status === "done";
            const isOverdue =
              !isDone &&
              task.due_date &&
              new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

            return (
              <div
                key={task.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: isDone ? "1px solid #e2e8f0" : "1px solid #cbd5e1",
                  backgroundColor: isDone ? "#f8fafc" : "#ffffff",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  transition: "all 0.15s ease",
                  opacity: isDone ? 0.75 : 1,
                }}
              >
                {/* Checkbox / Toggle */}
                <button
                  type="button"
                  title={isDone ? "Mark as pending" : "Mark as done"}
                  onClick={() => handleToggleStatus(task.id, task.status)}
                  disabled={isPending}
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "6px",
                    border: isDone ? "2px solid #16a34a" : "2px solid #94a3b8",
                    backgroundColor: isDone ? "#16a34a" : "transparent",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    marginTop: "2px",
                    flexShrink: 0,
                    padding: 0,
                  }}
                >
                  {isDone && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    {task.is_pinned && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          backgroundColor: "#fef3c7",
                          color: "#b45309",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        📌 Pinned
                      </span>
                    )}
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.92rem",
                        fontWeight: 700,
                        color: isDone ? "#64748b" : "#0f172a",
                        textDecoration: isDone ? "line-through" : "none",
                        wordBreak: "break-word",
                      }}
                    >
                      {task.title}
                    </p>
                  </div>

                  {task.description && (
                    <p
                      style={{
                        margin: "4px 0 0 0",
                        fontSize: "0.8rem",
                        color: "#64748b",
                        lineHeight: 1.4,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {task.description}
                    </p>
                  )}

                  {/* Meta Chips */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginTop: "8px",
                      flexWrap: "wrap",
                      fontSize: "0.75rem",
                    }}
                  >
                    {/* Assignee */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        backgroundColor: "#f1f5f9",
                        color: "#334155",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        fontWeight: 600,
                      }}
                    >
                      {task.assigned_user ? (
                        <>
                          <span
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              backgroundColor: "#0284c7",
                              color: "#fff",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.6rem",
                              fontWeight: 800,
                            }}
                          >
                            {(task.assigned_user.display_name || "S").charAt(0).toUpperCase()}
                          </span>
                          <span>{task.assigned_user.display_name}</span>
                          <span style={{ fontSize: "0.68rem", color: "#64748b" }}>
                            ({task.assigned_user.role})
                          </span>
                        </>
                      ) : (
                        <span>👥 All Staff</span>
                      )}
                    </span>

                    {/* Due Date */}
                    {task.due_date && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          color: isOverdue ? "#dc2626" : "#64748b",
                          fontWeight: isOverdue ? 700 : 500,
                          backgroundColor: isOverdue ? "#fee2e2" : "transparent",
                          padding: isOverdue ? "2px 6px" : "0",
                          borderRadius: "4px",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {isOverdue ? "Overdue: " : "Due: "}
                        {new Date(task.due_date).toLocaleDateString("en-MY", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}

                    {/* Status Badge */}
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "4px",
                        backgroundColor:
                          task.status === "done"
                            ? "#dcfce7"
                            : task.status === "in_progress"
                            ? "#fef3c7"
                            : "#f1f5f9",
                        color:
                          task.status === "done"
                            ? "#15803d"
                            : task.status === "in_progress"
                            ? "#b45309"
                            : "#475569",
                      }}
                    >
                      {task.status === "done"
                        ? "Done"
                        : task.status === "in_progress"
                        ? "In Progress"
                        : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Delete Action */}
                <button
                  type="button"
                  title="Delete Task"
                  onClick={() => handleDeleteTask(task.id, task.title)}
                  disabled={isPending}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Assign Task Modal */}
      <AssignTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teamMembers={teamMembers}
      />
    </div>
  );
}
