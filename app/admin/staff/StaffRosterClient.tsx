"use client";

import React, { useState } from "react";
import styles from "./staff-roster.module.css";
import AssignTaskModal, { TeamMember } from "@/components/tasks/AssignTaskModal";

export interface StaffMember {
  id: string;
  auth_id: string;
  display_name: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  avatar_url?: string | null;
}

interface StaffRosterClientProps {
  coaches: StaffMember[];
  staff: StaffMember[];
}

export default function StaffRosterClient({
  coaches,
  staff,
}: StaffRosterClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);

  const allMembers = [...coaches, ...staff];
  const teamMembers: TeamMember[] = allMembers.map((m) => ({
    id: m.id,
    display_name: m.display_name,
    role: m.role,
    avatar_url: m.avatar_url,
  }));

  const handleOpenAssign = (memberId?: string) => {
    setSelectedAssigneeId(memberId || null);
    setIsModalOpen(true);
  };

  function RoleSection({ title, people }: { title: string; people: StaffMember[] }) {
    if (!people || people.length === 0) return null;
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionLabel}>
          {title} — {people.length}
        </h2>

        {/* Desktop table */}
        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: "right" }}>Task Action</th>
              </tr>
            </thead>
            <tbody>
              {people.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className={styles.nameGroup}>
                      <div className={styles.avatar} style={{ overflow: "hidden" }}>
                        {m.avatar_url ? (
                          <img
                            src={m.avatar_url}
                            alt={m.display_name ?? "User"}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          (m.display_name ?? "?").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className={styles.nameText}>{m.display_name ?? "—"}</p>
                        <p className={styles.roleChip}>{m.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className={styles.phoneCell}>
                    {m.phone ?? <span className={styles.empty}>—</span>}
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: m.is_active ? "var(--color-success)" : "#e5e7eb",
                        color: m.is_active ? "white" : "var(--text-secondary)",
                      }}
                    >
                      {m.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(m.created_at).toLocaleDateString("en-MY", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenAssign(m.id)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#ffffff",
                        color: "var(--ka-blue, #0284c7)",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Assign Task
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className={styles.mobileList}>
          {people.map((m) => (
            <div key={m.id} className={styles.mobileCard}>
              <div className={styles.mobileLeft}>
                <div className={styles.avatar} style={{ overflow: "hidden" }}>
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={m.display_name ?? "User"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    (m.display_name ?? "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className={styles.nameText}>{m.display_name ?? "—"}</p>
                  <p className={styles.phoneCell}>{m.phone ?? "No phone"}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: m.is_active ? "var(--color-success)" : "#e5e7eb",
                    color: m.is_active ? "white" : "var(--text-secondary)",
                    fontSize: "0.75rem",
                  }}
                >
                  {m.is_active ? "Active" : "Inactive"}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenAssign(m.id)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "var(--ka-blue, #0284c7)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Assign Task
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Staff &amp; Coaches</h1>
          <p className={styles.subtitle}>
            {allMembers.length} team member{allMembers.length !== 1 ? "s" : ""} — {coaches.length} coach{coaches.length !== 1 ? "es" : ""}, {staff.length} staff
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAssign()}
          style={{
            padding: "9px 18px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "var(--ka-blue, #0284c7)",
            color: "#ffffff",
            fontSize: "0.86rem",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(2, 132, 199, 0.35)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Assign Task to Staff
        </button>
      </div>

      <RoleSection title="Coaches" people={coaches} />
      <RoleSection title="Staff" people={staff} />

      <AssignTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teamMembers={teamMembers}
        defaultAssigneeId={selectedAssigneeId}
      />
    </>
  );
}
