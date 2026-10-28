"use client";

import React, { useState, useTransition } from "react";
import { updateTaskStatusAction, createTaskAction } from "@/lib/actions/task";

export interface StaffTask {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "done";
  is_pinned: boolean;
  due_date: string | null;
  created_at: string;
  assigned_to: string | null;
  created_by: string;
}

interface StaffTodoListClientProps {
  initialTasks: StaffTask[];
  currentUserId?: string | null;
}

export default function StaffTodoListClient({
  initialTasks,
  currentUserId,
}: StaffTodoListClientProps) {
  const [filter, setFilter] = useState<"todo" | "completed">("todo");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleToggleStatus = (taskId: string, currentStatus: "pending" | "in_progress" | "done") => {
    const nextStatus = currentStatus === "done" ? "pending" : "done";
    startTransition(async () => {
      await updateTaskStatusAction(taskId, nextStatus);
    });
  };

  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    startTransition(async () => {
      const res = await createTaskAction({
        title: newTitle.trim(),
        assignedTo: currentUserId || null,
        dueDate: newDueDate ? new Date(newDueDate).toISOString() : null,
      });

      if (!res.error) {
        setNewTitle("");
        setNewDueDate("");
        setShowAddForm(false);
      }
    });
  };

  const todoTasks = initialTasks.filter((t) => t.status !== "done");
  const completedTasks = initialTasks.filter((t) => t.status === "done");
  const displayTasks = filter === "todo" ? todoTasks : completedTasks;

  // Sort pinned tasks first, then by due date
  const sortedTasks = [...displayTasks].sort((a, b) => {
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
          marginBottom: "14px",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800, color: "#0f172a" }}>
            My To-Do List
          </h3>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "999px",
              backgroundColor: todoTasks.length > 0 ? "#fee2e2" : "#dcfce7",
              color: todoTasks.length > 0 ? "#b91c1c" : "#15803d",
            }}
          >
            {todoTasks.length} Pending
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          title="Add a quick task for yourself"
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            backgroundColor: showAddForm ? "#f1f5f9" : "#ffffff",
            color: "var(--ka-blue, #0284c7)",
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {showAddForm ? "Cancel" : "Add Task"}
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "10px",
          marginBottom: "12px",
        }}
      >
        <button
          type="button"
          onClick={() => setFilter("todo")}
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            border: "none",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
            backgroundColor: filter === "todo" ? "#e0f2fe" : "transparent",
            color: filter === "todo" ? "#0284c7" : "#64748b",
          }}
        >
          To-Do ({todoTasks.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("completed")}
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            border: "none",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
            backgroundColor: filter === "completed" ? "#e0f2fe" : "transparent",
            color: filter === "completed" ? "#0284c7" : "#64748b",
          }}
        >
          Completed ({completedTasks.length})
        </button>
      </div>

      {/* Inline Quick Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddQuickTask}
          style={{
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: "#f8fafc",
            border: "1px solid #cbd5e1",
            marginBottom: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <input
            type="text"
            required
            autoFocus
            placeholder="Type task title and press Enter..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.78rem",
                color: "#475569",
              }}
            />
            <button
              type="submit"
              disabled={isPending || !newTitle.trim()}
              style={{
                marginLeft: "auto",
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "var(--ka-blue, #0284c7)",
                color: "#fff",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isPending ? "Adding..." : "Add to List"}
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {sortedTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "26px 16px", color: "#64748b" }}>
            <p style={{ margin: "0 0 2px 0", fontWeight: 700, color: "#334155", fontSize: "0.88rem" }}>
              {filter === "todo" ? "You have no pending tasks. Great job!" : "No completed tasks yet."}
            </p>
            <p style={{ margin: 0, fontSize: "0.78rem" }}>
              {filter === "todo" ? "Tasks assigned by admin will appear here." : "Completed tasks will show here."}
            </p>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const isDone = task.status === "done";
            const isAssignedByAdmin = task.created_by !== currentUserId;
            const isOverdue =
              !isDone &&
              task.due_date &&
              new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

            return (
              <div
                key={task.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: isDone ? "1px solid #e2e8f0" : "1px solid #cbd5e1",
                  backgroundColor: isDone ? "#f8fafc" : "#ffffff",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  transition: "all 0.15s ease",
                  opacity: isDone ? 0.7 : 1,
                }}
              >
                {/* Circular toggle */}
                <button
                  type="button"
                  title={isDone ? "Mark as to-do" : "Mark as done"}
                  onClick={() => handleToggleStatus(task.id, task.status)}
                  disabled={isPending}
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
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
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    {task.is_pinned && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          backgroundColor: "#fef3c7",
                          color: "#b45309",
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        📌 Pinned
                      </span>
                    )}
                    {isAssignedByAdmin && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          backgroundColor: "#e0f2fe",
                          color: "#0369a1",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        🛡 Assigned by Admin
                      </span>
                    )}
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.88rem",
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
                        margin: "3px 0 0 0",
                        fontSize: "0.78rem",
                        color: "#64748b",
                        lineHeight: 1.35,
                      }}
                    >
                      {task.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "6px",
                      fontSize: "0.72rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {task.due_date && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          color: isOverdue ? "#dc2626" : "#64748b",
                          fontWeight: isOverdue ? 700 : 500,
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                  </div>
                </div>

                {/* Quick toggle button */}
                <button
                  type="button"
                  onClick={() => handleToggleStatus(task.id, task.status)}
                  disabled={isPending}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: isDone ? "#ffffff" : "#f1f5f9",
                    color: isDone ? "#64748b" : "#16a34a",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {isDone ? "Undo" : "Done"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
