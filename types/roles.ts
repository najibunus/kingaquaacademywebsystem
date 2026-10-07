/**
 * All user roles in the Kingaqua Academy system.
 * This is the single source of truth for role names.
 */
export type UserRole =
  | "superadmin"
  | "admin"
  | "staff"
  | "coach"
  | "parent";

/** Display-friendly role labels */
export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Super Admin",
  admin:      "Admin / Boss",
  staff:      "Staff",
  coach:      "Coach",
  parent:     "Parent",
};

/** Role badge colors (maps to CSS classes) */
export const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  superadmin: "badge-danger",
  admin:      "badge-primary",
  staff:      "badge-info",
  coach:      "badge-success",
  parent:     "badge-neutral",
};
