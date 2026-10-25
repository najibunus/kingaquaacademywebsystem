"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  createUserAccount,
  deleteUserAccount,
  setUserAccess,
  updateUserEmail,
  updateUserName,
  updateUserPassword,
  updateUserPhone,
  updateUserRole,
  updateStudentField,
  createStudentAccount,
  deleteStudentAccount,
  type ManagedRole,
} from "@/lib/actions/superadminUsers";
import styles from "./users.module.css";

export interface SheetUser {
  id: string;
  role: ManagedRole;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  joined: string;
  lastSignIn: string | null;
  childrenNames?: string[];
}

export interface SheetStudent {
  id: string;
  name: string;
  gender: string | null;
  dateOfBirth: string | null;
  status: string;
  parentId: string | null;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  joined: string;
}

export interface ParentOption {
  id: string;
  name: string;
  phone?: string;
}

type TabKey = "all" | ManagedRole | "children";

type UserColKey =
  | "name"
  | "email"
  | "phone"
  | "password"
  | "role"
  | "active"
  | "children"
  | "joined"
  | "lastSignIn"
  | "actions";

type StudentColKey =
  | "studentName"
  | "parentName"
  | "parentContact"
  | "gender"
  | "studentStatus"
  | "studentJoined"
  | "actions";

interface ColDef {
  key: string;
  label: string;
  colCode: string;
  width: number;
  editable: boolean;
  sortable?: boolean;
}

const USER_COLS: ColDef[] = [
  { key: "name", label: "Full Name", colCode: "A", width: 210, editable: true, sortable: true },
  { key: "email", label: "Email Address", colCode: "B", width: 250, editable: true, sortable: true },
  { key: "phone", label: "Phone Number", colCode: "C", width: 140, editable: true, sortable: true },
  { key: "password", label: "Password", colCode: "D", width: 130, editable: true },
  { key: "role", label: "Role Section", colCode: "E", width: 120, editable: true, sortable: true },
  { key: "active", label: "Access Status", colCode: "F", width: 120, editable: true, sortable: true },
  { key: "children", label: "Children (Students)", colCode: "G", width: 180, editable: false },
  { key: "joined", label: "Joined Date", colCode: "H", width: 110, editable: false, sortable: true },
  { key: "lastSignIn", label: "Last Sign-In", colCode: "I", width: 150, editable: false, sortable: true },
  { key: "actions", label: "Actions", colCode: "J", width: 70, editable: false },
];

const STUDENT_COLS: ColDef[] = [
  { key: "studentName", label: "Child Name", colCode: "A", width: 220, editable: true, sortable: true },
  { key: "parentName", label: "Parent / Guardian", colCode: "B", width: 220, editable: true, sortable: true },
  { key: "parentContact", label: "Parent Contact", colCode: "C", width: 240, editable: false, sortable: true },
  { key: "gender", label: "Gender", colCode: "D", width: 120, editable: true, sortable: true },
  { key: "studentStatus", label: "Status", colCode: "E", width: 130, editable: true, sortable: true },
  { key: "studentJoined", label: "Registered Date", colCode: "F", width: 140, editable: false, sortable: true },
  { key: "actions", label: "Actions", colCode: "G", width: 80, editable: false },
];

const SECTIONS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All Users" },
  { key: "coach", label: "Coaches" },
  { key: "parent", label: "Parents" },
  { key: "children", label: "Children (Students)" },
  { key: "staff", label: "Staff" },
  { key: "admin", label: "Admins" },
];

const ROLE_LABELS: Record<ManagedRole, string> = {
  admin: "Admin",
  staff: "Staff",
  coach: "Coach",
  parent: "Parent",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-MY", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

type CellStatus = "saving" | "saved" | "error";

export default function UsersSheetClient({
  initialUsers,
  initialStudents,
  parentOptions,
  loadError,
}: {
  initialUsers: SheetUser[];
  initialStudents: SheetStudent[];
  parentOptions: ParentOption[];
  loadError: string | null;
}) {
  const [users, setUsers] = useState<SheetUser[]>(initialUsers);
  const [students, setStudents] = useState<SheetStudent[]>(initialStudents);
  const [parents, setParents] = useState<ParentOption[]>(parentOptions);
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  // Active cell selection
  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // Cell save statuses & global feedback
  const [status, setStatus] = useState<Record<string, CellStatus>>({});
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Modals
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<SheetUser | null>(null);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState<SheetStudent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [passwordModalUser, setPasswordModalUser] = useState<SheetUser | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState<{
    role: ManagedRole;
    displayName: string;
    email: string;
    password: string;
    phone: string;
  }>({
    role: "coach",
    displayName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [creatingUser, setCreatingUser] = useState(false);

  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [newChild, setNewChild] = useState<{
    name: string;
    parentId: string;
    gender: string;
    status: string;
  }>({
    name: "",
    parentId: "",
    gender: "",
    status: "active",
  });
  const [creatingChild, setCreatingChild] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAnyModalOpen = Boolean(
    passwordModalUser ||
    showAddUserModal ||
    showAddChildModal ||
    confirmDeleteUser ||
    confirmDeleteStudent
  );

  useEffect(() => {
    if (!isAnyModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isAnyModalOpen]);

  const gridRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isChildrenTab = tab === "children";
  const activeCols = isChildrenTab ? STUDENT_COLS : USER_COLS;

  /* ── Derived counts ───────────────────────────────────────── */
  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: users.length,
      coach: 0,
      parent: 0,
      children: students.length,
      staff: 0,
      admin: 0,
    };
    users.forEach((u) => {
      if (c[u.role] !== undefined) c[u.role] += 1;
    });
    return c;
  }, [users, students]);

  /* ── Filtered & Sorted Rows ──────────────────────────────── */
  const userRows = useMemo(() => {
    if (isChildrenTab) return [];
    const q = query.trim().toLowerCase();
    let list = tab === "all" ? users : users.filter((u) => u.role === tab);

    if (q) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          ROLE_LABELS[u.role]?.toLowerCase().includes(q) ||
          (u.childrenNames && u.childrenNames.some((cn) => cn.toLowerCase().includes(q)))
      );
    }

    if (sort) {
      const { key, dir } = sort;
      list = [...list].sort((a, b) => {
        let av: any = (a as any)[key];
        let bv: any = (b as any)[key];
        if (key === "active") {
          av = a.active ? 1 : 0;
          bv = b.active ? 1 : 0;
        } else if (key === "children") {
          av = (a.childrenNames || []).join(", ").toLowerCase();
          bv = (b.childrenNames || []).join(", ").toLowerCase();
        } else {
          av = String(av ?? "").toLowerCase();
          bv = String(bv ?? "").toLowerCase();
        }
        return av < bv ? -dir : av > bv ? dir : 0;
      });
    }

    return list;
  }, [users, tab, query, sort, isChildrenTab]);

  const studentRows = useMemo(() => {
    if (!isChildrenTab) return [];
    const q = query.trim().toLowerCase();
    let list = students;

    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.parentName.toLowerCase().includes(q) ||
          s.parentEmail.toLowerCase().includes(q) ||
          s.parentPhone.toLowerCase().includes(q) ||
          (s.gender && s.gender.toLowerCase().includes(q)) ||
          s.status.toLowerCase().includes(q)
      );
    }

    if (sort) {
      const { key, dir } = sort;
      list = [...list].sort((a, b) => {
        let av: any = "";
        let bv: any = "";
        if (key === "studentName") {
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
        } else if (key === "parentName") {
          av = a.parentName.toLowerCase();
          bv = b.parentName.toLowerCase();
        } else if (key === "gender") {
          av = (a.gender || "").toLowerCase();
          bv = (b.gender || "").toLowerCase();
        } else if (key === "studentStatus") {
          av = a.status.toLowerCase();
          bv = b.status.toLowerCase();
        } else if (key === "studentJoined") {
          av = a.joined;
          bv = b.joined;
        }
        return av < bv ? -dir : av > bv ? dir : 0;
      });
    }

    return list;
  }, [students, query, sort, isChildrenTab]);

  const totalRowCount = isChildrenTab ? studentRows.length : userRows.length;
  const selR = Math.max(0, Math.min(sel.r, Math.max(0, totalRowCount - 1)));
  const selCol = activeCols[sel.c] || activeCols[0];
  const selUser: SheetUser | undefined = !isChildrenTab ? userRows[selR] : undefined;
  const selStudent: SheetStudent | undefined = isChildrenTab ? studentRows[selR] : undefined;

  /* ── Status & Feedback Helpers ───────────────────────────── */
  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const markStatus = (cellKey: string, s: CellStatus | null) => {
    setStatus((prev) => {
      const next = { ...prev };
      if (s) next[cellKey] = s;
      else delete next[cellKey];
      return next;
    });
  };

  const focusGrid = () => {
    gridRef.current?.focus({ preventScroll: true });
  };

  const moveTo = (r: number, c: number) => {
    const nr = Math.max(0, Math.min(r, totalRowCount - 1));
    const nc = Math.max(0, Math.min(c, activeCols.length - 1));
    setSel({ r: nr, c: nc });
  };

  const patchUser = (id: string, patch: Partial<SheetUser>) => {
    setUsers((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const patchStudent = (id: string, patch: Partial<SheetStudent>) => {
    setStudents((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  /* ── Inspector Bar Display Text ──────────────────────────── */
  const inspectorValue = (): string => {
    if (isChildrenTab) {
      if (!selStudent) return "";
      switch (selCol.key) {
        case "studentName":
          return selStudent.name;
        case "parentName":
          return selStudent.parentName;
        case "parentContact":
          return `${selStudent.parentPhone} • ${selStudent.parentEmail}`;
        case "gender":
          return selStudent.gender || "—";
        case "studentStatus":
          return selStudent.status;
        case "studentJoined":
          return fmtDate(selStudent.joined);
        default:
          return "";
      }
    } else {
      if (!selUser) return "";
      switch (selCol.key) {
        case "password":
          return "••••••••";
        case "role":
          return ROLE_LABELS[selUser.role] || selUser.role;
        case "active":
          return selUser.active ? "Active" : "Disabled";
        case "children":
          return (selUser.childrenNames || []).join(", ") || "None";
        case "joined":
          return fmtDate(selUser.joined);
        case "lastSignIn":
          return fmtDateTime(selUser.lastSignIn);
        case "actions":
          return "";
        default:
          return String((selUser as any)[selCol.key] ?? "");
      }
    }
  };

  /* ── Editing Logic ────────────────────────────────────────── */
  const startEdit = (initialChar?: string) => {
    if (!selCol.editable) return;

    if (!isChildrenTab) {
      if (!selUser) return;
      if (selCol.key === "active") return void toggleUserAccess(selUser);
      if (selCol.key === "password") {
        setPasswordModalUser(selUser);
        setNewPasswordVal("");
        return;
      }

      editingRef.current = true;
      setEditing(true);
      if (selCol.key === "role") {
        setDraft(selUser.role);
      } else {
        setDraft(initialChar !== undefined ? initialChar : String((selUser as any)[selCol.key] ?? ""));
      }
    } else {
      if (!selStudent) return;
      if (selCol.key === "studentStatus") {
        const nextStatus = selStudent.status === "active" ? "inactive" : "active";
        return void saveStudentField(selStudent, "status", nextStatus);
      }

      editingRef.current = true;
      setEditing(true);
      if (selCol.key === "studentName") {
        setDraft(initialChar !== undefined ? initialChar : selStudent.name);
      } else if (selCol.key === "parentName") {
        setDraft(selStudent.parentId || "");
      } else if (selCol.key === "gender") {
        setDraft(selStudent.gender || "");
      } else if (selCol.key === "studentStatus") {
        setDraft(selStudent.status || "active");
      }
    }
  };

  const finishEdit = async (doSave: boolean, move: "down" | "right" | "none" = "none", overrideVal?: string) => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setEditing(false);

    const val = (overrideVal ?? draft).trim();

    if (doSave) {
      if (!isChildrenTab && selUser) {
        const colKey = selCol.key;
        if (["name", "email", "phone", "role"].includes(colKey)) {
          const current = colKey === "role" ? selUser.role : String((selUser as any)[colKey] ?? "");
          if (val !== current) {
            await saveUserField(selUser, colKey as any, val);
          }
        }
      } else if (isChildrenTab && selStudent) {
        const colKey = selCol.key;
        if (colKey === "studentName" && val !== selStudent.name) {
          await saveStudentField(selStudent, "name", val);
        } else if (colKey === "parentName" && val !== (selStudent.parentId || "")) {
          await saveStudentField(selStudent, "parent_id", val || null);
        } else if (colKey === "gender" && val !== (selStudent.gender || "")) {
          await saveStudentField(selStudent, "gender", val || null);
        } else if (colKey === "studentStatus" && val !== selStudent.status) {
          await saveStudentField(selStudent, "status", val);
        }
      }
    }

    if (move === "down") moveTo(selR + 1, sel.c);
    if (move === "right") moveTo(selR, sel.c + 1);
    setTimeout(focusGrid, 0);
  };

  /* ── User Actions ─────────────────────────────────────────── */
  const saveUserField = async (
    u: SheetUser,
    key: "name" | "email" | "phone" | "role" | "password",
    value: string
  ) => {
    const cellKey = `user:${u.id}:${key}`;
    markStatus(cellKey, "saving");
    const previous = (u as any)[key];

    if (key !== "password") {
      patchUser(u.id, { [key]: value } as Partial<SheetUser>);
    }

    let res: { success: boolean; error?: string };
    switch (key) {
      case "name":
        res = await updateUserName(u.id, value);
        break;
      case "email":
        res = await updateUserEmail(u.id, value);
        break;
      case "phone":
        res = await updateUserPhone(u.id, value);
        break;
      case "role":
        res = await updateUserRole(u.id, value);
        break;
      case "password":
        res = await updateUserPassword(u.id, value);
        break;
      default:
        res = { success: false, error: "Unknown column" };
    }

    if (!res.success) {
      if (key !== "password") patchUser(u.id, { [key]: previous } as Partial<SheetUser>);
      markStatus(cellKey, "error");
      showToast("err", res.error || "Save failed.");
      setTimeout(() => markStatus(cellKey, null), 3000);
      return;
    }

    markStatus(cellKey, "saved");
    setTimeout(() => markStatus(cellKey, null), 1500);

    if (key === "role") {
      showToast("ok", `${u.name || u.email} role changed to ${ROLE_LABELS[value as ManagedRole]}.`);
    } else {
      showToast("ok", `${USER_COLS.find((c) => c.key === key)?.label} updated.`);
    }
  };

  const toggleUserAccess = async (u: SheetUser) => {
    const next = !u.active;
    const cellKey = `user:${u.id}:active`;
    markStatus(cellKey, "saving");
    patchUser(u.id, { active: next });

    const res = await setUserAccess(u.id, next);
    if (!res.success) {
      patchUser(u.id, { active: !next });
      markStatus(cellKey, "error");
      showToast("err", res.error);
      setTimeout(() => markStatus(cellKey, null), 3000);
      return;
    }

    markStatus(cellKey, "saved");
    setTimeout(() => markStatus(cellKey, null), 1500);
    showToast("ok", `${u.name || u.email} is now ${next ? "active" : "disabled"}.`);
  };

  const submitNewPassword = async () => {
    if (!passwordModalUser) return;
    if (newPasswordVal.length < 6) {
      showToast("err", "Password must be at least 6 characters.");
      return;
    }
    setSavingPassword(true);
    const res = await updateUserPassword(passwordModalUser.id, newPasswordVal);
    setSavingPassword(false);

    if (!res.success) {
      showToast("err", res.error);
      return;
    }

    const u = passwordModalUser;
    setPasswordModalUser(null);
    setNewPasswordVal("");
    markStatus(`user:${u.id}:password`, "saved");
    setTimeout(() => markStatus(`user:${u.id}:password`, null), 1500);
    showToast("ok", `Password changed for ${u.name || u.email}.`);
    focusGrid();
  };

  const runDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    setDeleting(true);
    const res = await deleteUserAccount(confirmDeleteUser.id);
    setDeleting(false);

    if (!res.success) {
      showToast("err", res.error);
      return;
    }

    const target = confirmDeleteUser;
    setUsers((list) => list.filter((x) => x.id !== target.id));
    setConfirmDeleteUser(null);
    showToast("ok", `User ${target.name || target.email} permanently deleted.`);
    focusGrid();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.displayName || !newUser.password) {
      showToast("err", "Please fill in all required fields.");
      return;
    }
    if (newUser.password.length < 6) {
      showToast("err", "Password must be at least 6 characters.");
      return;
    }

    setCreatingUser(true);
    const res = await createUserAccount({
      role: newUser.role,
      displayName: newUser.displayName,
      email: newUser.email,
      password: newUser.password,
      phone: newUser.phone,
    });
    setCreatingUser(false);

    if (!res.success) {
      showToast("err", res.error);
      return;
    }

    const created = res.user;
    setUsers((prev) => [created, ...prev]);
    if (created.role === "parent") {
      setParents((prev) => [{ id: created.id, name: created.name, phone: created.phone }, ...prev]);
    }
    setShowAddUserModal(false);
    setNewUser({
      role: tab === "children" || tab === "all" ? "coach" : tab,
      displayName: "",
      email: "",
      password: "",
      phone: "",
    });
    showToast("ok", `User ${created.name} (${ROLE_LABELS[created.role]}) created.`);
    focusGrid();
  };

  /* ── Student / Child Actions ──────────────────────────────── */
  const saveStudentField = async (
    s: SheetStudent,
    field: "name" | "gender" | "status" | "parent_id",
    value: string | null
  ) => {
    const cellKey = `student:${s.id}:${field}`;
    markStatus(cellKey, "saving");

    let patch: Partial<SheetStudent> = {};
    if (field === "name") patch.name = value || "";
    if (field === "gender") patch.gender = value || null;
    if (field === "status") patch.status = value || "active";
    if (field === "parent_id") {
      patch.parentId = value || null;
      const matchedParent = parents.find((p) => p.id === value);
      patch.parentName = matchedParent?.name || (value ? "Parent" : "Unassigned");
      const matchedUser = users.find((u) => u.id === value);
      patch.parentPhone = matchedUser?.phone || "—";
      patch.parentEmail = matchedUser?.email || "—";
    }

    patchStudent(s.id, patch);

    const res = await updateStudentField(s.id, field, value);
    if (!res.success) {
      markStatus(cellKey, "error");
      showToast("err", res.error);
      setTimeout(() => markStatus(cellKey, null), 3000);
      return;
    }

    markStatus(cellKey, "saved");
    setTimeout(() => markStatus(cellKey, null), 1500);
    showToast("ok", `Child ${s.name} updated.`);
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChild.name.trim()) {
      showToast("err", "Child name is required.");
      return;
    }

    setCreatingChild(true);
    const res = await createStudentAccount({
      name: newChild.name.trim(),
      parentId: newChild.parentId || null,
      gender: newChild.gender || null,
      status: newChild.status || "active",
    });
    setCreatingChild(false);

    if (!res.success) {
      showToast("err", res.error);
      return;
    }

    const created = res.student;
    setStudents((prev) => [created, ...prev]);
    setShowAddChildModal(false);
    setNewChild({ name: "", parentId: "", gender: "", status: "active" });
    showToast("ok", `Child ${created.name} added under parent "${created.parentName}".`);
    focusGrid();
  };

  const runDeleteStudent = async () => {
    if (!confirmDeleteStudent) return;
    setDeleting(true);
    const res = await deleteStudentAccount(confirmDeleteStudent.id);
    setDeleting(false);

    if (!res.success) {
      showToast("err", res.error);
      return;
    }

    const target = confirmDeleteStudent;
    setStudents((list) => list.filter((x) => x.id !== target.id));
    setConfirmDeleteStudent(null);
    showToast("ok", `Child record for ${target.name} was removed.`);
    focusGrid();
  };

  /* ── Keyboard Navigation ──────────────────────────────────── */
  const onGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing || confirmDeleteUser || confirmDeleteStudent || passwordModalUser || showAddUserModal || showAddChildModal)
      return;
    if (totalRowCount === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        return moveTo(selR + 1, sel.c);
      case "ArrowUp":
        e.preventDefault();
        return moveTo(selR - 1, sel.c);
      case "ArrowRight":
        e.preventDefault();
        return moveTo(selR, sel.c + 1);
      case "ArrowLeft":
        e.preventDefault();
        return moveTo(selR, sel.c - 1);
      case "Tab":
        e.preventDefault();
        return moveTo(selR, sel.c + (e.shiftKey ? -1 : 1));
      case "Enter":
      case "F2":
        e.preventDefault();
        if (isChildrenTab && selStudent) {
          if (selCol.key === "actions") return setConfirmDeleteStudent(selStudent);
          return startEdit();
        } else if (!isChildrenTab && selUser) {
          if (selCol.key === "active") return void toggleUserAccess(selUser);
          if (selCol.key === "actions") return setConfirmDeleteUser(selUser);
          if (selCol.key === "password") {
            setPasswordModalUser(selUser);
            setNewPasswordVal("");
            return;
          }
          return startEdit();
        }
        return;
      case " ":
        if (!isChildrenTab && selCol.key === "active" && selUser) {
          e.preventDefault();
          void toggleUserAccess(selUser);
        } else if (isChildrenTab && selCol.key === "studentStatus" && selStudent) {
          e.preventDefault();
          const next = selStudent.status === "active" ? "inactive" : "active";
          void saveStudentField(selStudent, "status", next);
        }
        return;
      case "Delete":
      case "Backspace":
        if (!isChildrenTab && selCol.key === "phone" && selUser?.phone) {
          e.preventDefault();
          void saveUserField(selUser, "phone", "");
        }
        return;
      default:
        if (
          e.key.length === 1 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          selCol.editable &&
          selCol.key !== "active" &&
          selCol.key !== "password" &&
          selCol.key !== "studentStatus"
        ) {
          e.preventDefault();
          startEdit(e.key);
        }
    }
  };

  /* ── Export CSV ───────────────────────────────────────────── */
  const exportCsv = () => {
    const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;

    if (isChildrenTab) {
      const headers = ["Child Name", "Parent / Guardian", "Parent Email", "Parent Phone", "Gender", "Status", "Joined Date"];
      const lines = studentRows.map((s) =>
        [
          s.name,
          s.parentName,
          s.parentEmail,
          s.parentPhone,
          s.gender || "—",
          s.status,
          fmtDate(s.joined),
        ]
          .map(esc)
          .join(",")
      );
      const csvContent = "\uFEFF" + [headers.map(esc).join(","), ...lines].join("\r\n");
      downloadBlob(csvContent, `kingaqua_children_${new Date().toISOString().slice(0, 10)}.csv`);
    } else {
      const headers = ["Name", "Email", "Phone", "Role", "Status", "Children", "Joined Date", "Last Sign-In"];
      const lines = userRows.map((u) =>
        [
          u.name,
          u.email,
          u.phone,
          ROLE_LABELS[u.role] || u.role,
          u.active ? "Active" : "Disabled",
          (u.childrenNames || []).join("; "),
          fmtDate(u.joined),
          fmtDateTime(u.lastSignIn),
        ]
          .map(esc)
          .join(",")
      );
      const csvContent = "\uFEFF" + [headers.map(esc).join(","), ...lines].join("\r\n");
      downloadBlob(csvContent, `kingaqua_users_${tab}_${new Date().toISOString().slice(0, 10)}.csv`);
    }
  };

  const downloadBlob = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: string) => {
    setSort((prev) => (prev?.key === key ? (prev.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));
  };

  const switchSection = (sectionKey: TabKey) => {
    if (editing) finishEdit(false);
    setTab(sectionKey);
    setSel({ r: 0, c: 0 });
    setQuery("");
    setSort(null);
    setTimeout(focusGrid, 0);
  };

  const isSavingAny = Object.values(status).includes("saving");

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className={`animate-fade-in-up ${styles.pageWrap}`}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>User Management</h1>
          <p className={styles.pageSubtitle}>
            Full spreadsheet control for coaches, parents, children (with parent linkage), staff, and admins.
            Click any cell to select, double-click or type to edit instantly.
          </p>
        </div>

        <div className={styles.headerActions}>
          {isChildrenTab ? (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                setNewChild({ name: "", parentId: parents[0]?.id || "", gender: "", status: "active" });
                setShowAddChildModal(true);
              }}
            >
              <span className={styles.btnIcon}>+</span> Add Child
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                setNewUser({
                  role: tab === "all" ? "coach" : tab,
                  displayName: "",
                  email: "",
                  password: "",
                  phone: "",
                });
                setShowAddUserModal(true);
              }}
            >
              <span className={styles.btnIcon}>+</span> Add New User
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.alertIcon}>⚠</span>
          <div>
            <strong>Error loading data:</strong> {loadError}
          </div>
        </div>
      )}

      {/* Spreadsheet Container */}
      <div className={styles.sheetContainer}>
        {/* Section Tabs */}
        <div className={styles.sectionTabs} role="tablist" aria-label="User & Student sections">
          {SECTIONS.map((sec) => {
            const count = counts[sec.key];
            const isActive = tab === sec.key;
            return (
              <button
                key={sec.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.sectionTab} ${isActive ? styles.sectionTabActive : ""}`}
                onClick={() => switchSection(sec.key)}
              >
                <span>{sec.label}</span>
                <span className={`${styles.badge} ${isActive ? styles.badgeActive : ""}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          {/* Search Box */}
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={
                isChildrenTab
                  ? "Search child name, parent name, phone, or email…"
                  : "Search name, email, phone, or children…"
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSel({ r: 0, c: sel.c });
              }}
            />
            {query && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  setQuery("");
                  setSel({ r: 0, c: sel.c });
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status & Export */}
          <div className={styles.toolbarRight}>
            <div className={styles.saveStatus}>
              {isSavingAny ? (
                <span className={styles.statusSaving}>
                  <span className={styles.spinnerDot} /> Saving changes…
                </span>
              ) : (
                <span className={styles.statusSaved}>
                  <span className={styles.checkDot}>✓</span> All changes saved
                </span>
              )}
            </div>

            <button
              type="button"
              className={styles.btnSecondary}
              onClick={exportCsv}
              disabled={totalRowCount === 0}
              title="Download current view as CSV"
            >
              <span>⬇</span> Export CSV
            </button>
          </div>
        </div>

        {/* Inspector Bar */}
        <div className={styles.inspectorBar}>
          <div className={styles.cellCoordinate} title="Active cell position">
            <span className={styles.coordLabel}>CELL:</span>
            <strong>{totalRowCount > 0 ? `${selCol.colCode}${selR + 1}` : "—"}</strong>
          </div>
          <div className={styles.cellColName}>{selCol.label}</div>
          <div className={styles.cellValueDisplay}>
            {editing ? (
              <span className={styles.editingNote}>Editing: &quot;{draft}&quot;</span>
            ) : totalRowCount > 0 ? (
              inspectorValue() || <span className={styles.emptyNote}>[Empty]</span>
            ) : (
              <span className={styles.emptyNote}>No cell selected</span>
            )}
          </div>
        </div>

        {/* Grid Viewport */}
        <div
          className={styles.gridViewport}
          ref={gridRef}
          tabIndex={0}
          onKeyDown={onGridKeyDown}
          role="grid"
          aria-label={isChildrenTab ? "Children spreadsheet grid" : "Users spreadsheet grid"}
        >
          <table className={styles.gridTable}>
            <thead>
              <tr className={styles.headRow}>
                <th className={`${styles.cornerTh} ${styles.stickyCol}`}>#</th>
                {activeCols.map((col, cIdx) => (
                  <th
                    key={col.key}
                    style={{ width: col.width, minWidth: col.width }}
                    className={`${styles.colTh} ${col.sortable ? styles.sortableTh : ""} ${
                      cIdx === sel.c ? styles.colThActive : ""
                    }`}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <div className={styles.thContent}>
                      <span className={styles.colCodeBadge}>{col.colCode}</span>
                      <span className={styles.colTitle}>{col.label}</span>
                      {col.sortable && (
                        <span className={styles.sortIndicator}>
                          {sort?.key === col.key ? (sort.dir === 1 ? "▲" : "▼") : "⇅"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* CHILDREN TAB RENDERING */}
              {isChildrenTab ? (
                studentRows.length === 0 ? (
                  <tr>
                    <td className={`${styles.rowNumTd} ${styles.stickyCol}`}>1</td>
                    <td colSpan={STUDENT_COLS.length} className={styles.emptyStateTd}>
                      <div className={styles.emptyBox}>
                        <p>{query ? `No children match "${query}".` : "No children registered yet."}</p>
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          onClick={() => {
                            setNewChild({ name: "", parentId: parents[0]?.id || "", gender: "", status: "active" });
                            setShowAddChildModal(true);
                          }}
                        >
                          + Add First Child
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  studentRows.map((s, r) => {
                    const isCurrentRow = r === selR;
                    const isInactive = s.status !== "active";

                    return (
                      <tr
                        key={s.id}
                        className={`${styles.gridRow} ${isInactive ? styles.rowDisabled : ""} ${
                          isCurrentRow ? styles.rowFocused : ""
                        }`}
                      >
                        <td
                          className={`${styles.rowNumTd} ${styles.stickyCol} ${
                            isCurrentRow ? styles.rowNumActive : ""
                          }`}
                          onClick={() => {
                            setSel({ r, c: sel.c });
                            setTimeout(focusGrid, 0);
                          }}
                        >
                          {r + 1}
                        </td>

                        {STUDENT_COLS.map((col, c) => {
                          const isSelected = r === selR && c === sel.c;
                          const isCellEditing = isSelected && editing;
                          const cellKey = `student:${s.id}:${col.key}`;
                          const st = status[cellKey];

                          let cellClass = styles.cellTd;
                          if (isSelected) cellClass += ` ${styles.cellSelected}`;
                          if (st === "saving") cellClass += ` ${styles.cellSaving}`;
                          if (st === "saved") cellClass += ` ${styles.cellSaved}`;
                          if (st === "error") cellClass += ` ${styles.cellError}`;

                          return (
                            <td
                              key={col.key}
                              className={cellClass}
                              style={{ width: col.width, minWidth: col.width }}
                              onClick={() => {
                                if (editing && !isSelected) finishEdit(true);
                                setSel({ r, c });
                                if (!editing || !isSelected) setTimeout(focusGrid, 0);
                              }}
                              onDoubleClick={() => {
                                setSel({ r, c });
                                if (col.editable) {
                                  if (col.key === "studentStatus") {
                                    const nextStatus = s.status === "active" ? "inactive" : "active";
                                    void saveStudentField(s, "status", nextStatus);
                                  } else {
                                    setTimeout(() => {
                                      editingRef.current = true;
                                      setEditing(true);
                                      if (col.key === "studentName") setDraft(s.name);
                                      else if (col.key === "parentName") setDraft(s.parentId || "");
                                      else if (col.key === "gender") setDraft(s.gender || "");
                                    }, 0);
                                  }
                                }
                              }}
                            >
                              {renderStudentCell(s, col, isCellEditing)}
                              {isSelected && !isCellEditing && <div className={styles.cellCornerHandle} />}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )
              ) : (
                /* USER ROWS RENDERING */
                userRows.length === 0 ? (
                  <tr>
                    <td className={`${styles.rowNumTd} ${styles.stickyCol}`}>1</td>
                    <td colSpan={USER_COLS.length} className={styles.emptyStateTd}>
                      <div className={styles.emptyBox}>
                        <p>{query ? `No users match "${query}".` : `No ${tab} users found.`}</p>
                        <button
                          type="button"
                          className={styles.btnPrimary}
                          onClick={() => {
                            setNewUser({
                              role: tab === "all" ? "coach" : tab,
                              displayName: "",
                              email: "",
                              password: "",
                              phone: "",
                            });
                            setShowAddUserModal(true);
                          }}
                        >
                          + Add First User
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  userRows.map((u, r) => {
                    const isCurrentRow = r === selR;
                    const rowDisabled = !u.active;

                    return (
                      <tr
                        key={u.id}
                        className={`${styles.gridRow} ${rowDisabled ? styles.rowDisabled : ""} ${
                          isCurrentRow ? styles.rowFocused : ""
                        }`}
                      >
                        <td
                          className={`${styles.rowNumTd} ${styles.stickyCol} ${
                            isCurrentRow ? styles.rowNumActive : ""
                          }`}
                          onClick={() => {
                            setSel({ r, c: sel.c });
                            setTimeout(focusGrid, 0);
                          }}
                        >
                          {r + 1}
                        </td>

                        {USER_COLS.map((col, c) => {
                          const isSelected = r === selR && c === sel.c;
                          const isCellEditing = isSelected && editing;
                          const cellKey = `user:${u.id}:${col.key}`;
                          const st = status[cellKey];

                          let cellClass = styles.cellTd;
                          if (isSelected) cellClass += ` ${styles.cellSelected}`;
                          if (st === "saving") cellClass += ` ${styles.cellSaving}`;
                          if (st === "saved") cellClass += ` ${styles.cellSaved}`;
                          if (st === "error") cellClass += ` ${styles.cellError}`;

                          return (
                            <td
                              key={col.key}
                              className={cellClass}
                              style={{ width: col.width, minWidth: col.width }}
                              onClick={() => {
                                if (editing && !isSelected) finishEdit(true);
                                setSel({ r, c });
                                if (!editing || !isSelected) setTimeout(focusGrid, 0);
                              }}
                              onDoubleClick={() => {
                                setSel({ r, c });
                                if (col.editable) {
                                  if (col.key === "active") {
                                    void toggleUserAccess(u);
                                  } else if (col.key === "password") {
                                    setPasswordModalUser(u);
                                    setNewPasswordVal("");
                                  } else {
                                    setTimeout(() => {
                                      editingRef.current = true;
                                      setEditing(true);
                                      if (col.key === "role") setDraft(u.role);
                                      else setDraft(String((u as any)[col.key] ?? ""));
                                    }, 0);
                                  }
                                }
                              }}
                            >
                              {renderUserCell(u, col, isCellEditing)}
                              {isSelected && !isCellEditing && <div className={styles.cellCornerHandle} />}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & shortcuts */}
        <div className={styles.sheetFooter}>
          <div className={styles.footerLeft}>
            <span className={styles.shortcutItem}>
              <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> Navigate
            </span>
            <span className={styles.shortcutDivider}>•</span>
            <span className={styles.shortcutItem}>
              <kbd>Enter</kbd> / <kbd>2× Click</kbd> Edit
            </span>
            <span className={styles.shortcutDivider}>•</span>
            <span className={styles.shortcutItem}>
              <kbd>Tab</kbd> Next Cell
            </span>
            <span className={styles.shortcutDivider}>•</span>
            <span className={styles.shortcutItem}>
              <kbd>Space</kbd> Toggle Status
            </span>
            <span className={styles.shortcutDivider}>•</span>
            <span className={styles.shortcutItem}>
              <kbd>Esc</kbd> Cancel
            </span>
          </div>

          <div className={styles.footerRight}>
            <span>
              Showing <strong>{totalRowCount}</strong> {isChildrenTab ? "children" : "users"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Modals & Toast (Portal to document.body for full viewport dark blur overlay) ── */}
      {mounted &&
        createPortal(
          <>
            {/* ── Modal: Change User Password ─────────────────────── */}
            {passwordModalUser && (
              <div className={styles.modalOverlay} onClick={() => !savingPassword && setPasswordModalUser(null)}>
                <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                  <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Update Password</h3>
                    <button
                      type="button"
                      className={styles.modalCloseBtn}
                      onClick={() => setPasswordModalUser(null)}
                      disabled={savingPassword}
                    >
                      ✕
                    </button>
                  </div>

                  <p className={styles.modalDesc}>
                    Set a new login password for <strong>{passwordModalUser.name || passwordModalUser.email}</strong>.
                  </p>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>New Password (minimum 6 characters)</label>
                    <input
                      autoFocus
                      type="text"
                      className={styles.formInput}
                      placeholder="Enter new password…"
                      value={newPasswordVal}
                      onChange={(e) => setNewPasswordVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void submitNewPassword();
                        }
                      }}
                    />
                  </div>

                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => setPasswordModalUser(null)}
                      disabled={savingPassword}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={submitNewPassword}
                      disabled={savingPassword || newPasswordVal.length < 6}
                    >
                      {savingPassword ? "Updating…" : "Update Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Modal: Add New User ─────────────────────────────── */}
            {showAddUserModal && (
              <div className={styles.modalOverlay} onClick={() => !creatingUser && setShowAddUserModal(false)}>
                <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                  <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Add New User</h3>
                    <button
                      type="button"
                      className={styles.modalCloseBtn}
                      onClick={() => setShowAddUserModal(false)}
                      disabled={creatingUser}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreateUser} className={styles.formStack}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Role / Section *</label>
                      <select
                        className={styles.formSelect}
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value as ManagedRole })}
                      >
                        <option value="coach">Coach</option>
                        <option value="parent">Parent</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Full Name *</label>
                      <input
                        type="text"
                        required
                        className={styles.formInput}
                        placeholder="e.g. Ahmad bin Razak"
                        value={newUser.displayName}
                        onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Email Address *</label>
                      <input
                        type="email"
                        required
                        className={styles.formInput}
                        placeholder="e.g. coach.ahmad@example.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Password * (min 6 characters)</label>
                      <input
                        type="text"
                        required
                        minLength={6}
                        className={styles.formInput}
                        placeholder="Initial login password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Phone Number (Optional)</label>
                      <input
                        type="tel"
                        className={styles.formInput}
                        placeholder="e.g. +60123456789"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      />
                    </div>

                    <div className={styles.modalActions}>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => setShowAddUserModal(false)}
                        disabled={creatingUser}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={styles.btnPrimary}
                        disabled={creatingUser || !newUser.email || !newUser.displayName || newUser.password.length < 6}
                      >
                        {creatingUser ? "Creating User…" : "Create User"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── Modal: Add Child / Student ──────────────────────── */}
            {showAddChildModal && (
              <div className={styles.modalOverlay} onClick={() => !creatingChild && setShowAddChildModal(false)}>
                <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                  <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Add Child (Student)</h3>
                    <button
                      type="button"
                      className={styles.modalCloseBtn}
                      onClick={() => setShowAddChildModal(false)}
                      disabled={creatingChild}
                    >
                      ✕
                    </button>
                  </div>

                  <p className={styles.modalDesc}>
                    Register a child and link them to their parent. If the parent doesn&apos;t exist yet, you can create the parent
                    first or assign later.
                  </p>

                  <form onSubmit={handleCreateChild} className={styles.formStack}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Child Full Name *</label>
                      <input
                        type="text"
                        required
                        className={styles.formInput}
                        placeholder="e.g. Adam bin Ahmad"
                        value={newChild.name}
                        onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Assigned Parent / Guardian</label>
                      <select
                        className={styles.formSelect}
                        value={newChild.parentId}
                        onChange={(e) => setNewChild({ ...newChild, parentId: e.target.value })}
                      >
                        <option value="">-- Unassigned (Assign later) --</option>
                        {parents.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.phone ? `(${p.phone})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Gender</label>
                      <select
                        className={styles.formSelect}
                        value={newChild.gender}
                        onChange={(e) => setNewChild({ ...newChild, gender: e.target.value })}
                      >
                        <option value="">-- Not specified --</option>
                        <option value="male">Male (Boy)</option>
                        <option value="female">Female (Girl)</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Status</label>
                      <select
                        className={styles.formSelect}
                        value={newChild.status}
                        onChange={(e) => setNewChild({ ...newChild, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="on_hold">On Hold</option>
                      </select>
                    </div>

                    <div className={styles.modalActions}>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => setShowAddChildModal(false)}
                        disabled={creatingChild}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className={styles.btnPrimary}
                        disabled={creatingChild || !newChild.name.trim()}
                      >
                        {creatingChild ? "Adding Child…" : "Add Child"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── Modal: Delete User ──────────────────────────────── */}
            {confirmDeleteUser && (
              <div className={styles.modalOverlay} onClick={() => !deleting && setConfirmDeleteUser(null)}>
                <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
                  <div className={styles.modalHeader}>
                    <h3 className={`${styles.modalTitle} ${styles.dangerTitle}`}>Delete User Account?</h3>
                    <button
                      type="button"
                      className={styles.modalCloseBtn}
                      onClick={() => setConfirmDeleteUser(null)}
                      disabled={deleting}
                    >
                      ✕
                    </button>
                  </div>

                  <div className={styles.deleteUserCard}>
                    <div className={styles.deleteUserName}>{confirmDeleteUser.name || "(No display name)"}</div>
                    <div className={styles.deleteUserMeta}>
                      <span>{confirmDeleteUser.email}</span>
                      <span className={styles.bullet}>•</span>
                      <span className={`${styles.roleTag} ${styles[`role_${confirmDeleteUser.role}`]}`}>
                        {ROLE_LABELS[confirmDeleteUser.role]}
                      </span>
                    </div>
                  </div>

                  <p className={styles.deleteWarning}>
                    This will permanently delete this account.
                    {confirmDeleteUser.role === "parent" && (
                      <span> Any children will be kept safely in the system as unassigned.</span>
                    )}
                  </p>

                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => setConfirmDeleteUser(null)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.btnDanger}
                      onClick={runDeleteUser}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting…" : "Delete Permanently"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Modal: Delete Child / Student ──────────────────── */}
            {confirmDeleteStudent && (
              <div className={styles.modalOverlay} onClick={() => !deleting && setConfirmDeleteStudent(null)}>
                <div className={styles.modalBox} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
                  <div className={styles.modalHeader}>
                    <h3 className={`${styles.modalTitle} ${styles.dangerTitle}`}>Delete Child Record?</h3>
                    <button
                      type="button"
                      className={styles.modalCloseBtn}
                      onClick={() => setConfirmDeleteStudent(null)}
                      disabled={deleting}
                    >
                      ✕
                    </button>
                  </div>

                  <div className={styles.deleteUserCard}>
                    <div className={styles.deleteUserName}>{confirmDeleteStudent.name}</div>
                    <div className={styles.deleteUserMeta}>
                      <span>Parent: {confirmDeleteStudent.parentName}</span>
                      {confirmDeleteStudent.parentPhone !== "—" && (
                        <>
                          <span className={styles.bullet}>•</span>
                          <span>{confirmDeleteStudent.parentPhone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <p className={styles.deleteWarning}>
                    Are you sure you want to permanently remove this child record? If the child has active classes or
                    invoices, you should change their status to <strong>Inactive</strong> instead.
                  </p>

                  <div className={styles.modalActions}>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => setConfirmDeleteStudent(null)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.btnDanger}
                      onClick={runDeleteStudent}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting…" : "Delete Child"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Toast Alert ─────────────────────────────────────── */}
            {toast && (
              <div className={`${styles.toast} ${toast.type === "err" ? styles.toastErr : styles.toastOk}`} role="status">
                <span className={styles.toastIcon}>{toast.type === "err" ? "⚠" : "✓"}</span>
                <span>{toast.msg}</span>
              </div>
            )}
          </>,
          document.body
        )}
    </div>
  );

  /* ── User Cell Content Renderer ───────────────────────────── */
  function renderUserCell(u: SheetUser, col: ColDef, isCellEditing: boolean) {
    if (isCellEditing && ["name", "email", "phone"].includes(col.key)) {
      return (
        <input
          autoFocus
          className={styles.cellInlineInput}
          type={col.key === "email" ? "email" : "text"}
          value={draft}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => {
            const len = e.target.value.length;
            e.target.setSelectionRange(len, len);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              finishEdit(true, "down");
            } else if (e.key === "Tab") {
              e.preventDefault();
              e.stopPropagation();
              finishEdit(true, "right");
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              finishEdit(false);
            }
          }}
          onBlur={() => finishEdit(true)}
        />
      );
    }

    if (isCellEditing && col.key === "role") {
      return (
        <select
          autoFocus
          className={styles.cellInlineSelect}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value !== u.role) {
              finishEdit(true, "none", e.target.value);
            } else {
              finishEdit(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              finishEdit(false);
            }
          }}
          onBlur={() => finishEdit(false)}
        >
          <option value="coach">Coach</option>
          <option value="parent">Parent</option>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
      );
    }

    switch (col.key) {
      case "name":
        return (
          <div className={styles.nameCell}>
            <span className={styles.cellTextPrimary}>{u.name || <em className={styles.mutedText}>No Name</em>}</span>
          </div>
        );

      case "email":
        return (
          <div className={styles.emailCell}>
            <span className={styles.cellTextRegular}>{u.email || <em className={styles.mutedText}>No Email</em>}</span>
          </div>
        );

      case "phone":
        return (
          <div className={styles.phoneCell}>
            {u.phone ? <span className={styles.cellTextMono}>{u.phone}</span> : <span className={styles.mutedText}>—</span>}
          </div>
        );

      case "password":
        return (
          <div className={styles.passwordCell}>
            <span className={styles.passwordDots}>••••••••</span>
            <button
              type="button"
              className={styles.pwdChangeBtn}
              onClick={(e) => {
                e.stopPropagation();
                setPasswordModalUser(u);
                setNewPasswordVal("");
              }}
              title="Change Password"
            >
              Reset
            </button>
          </div>
        );

      case "role":
        return (
          <div className={styles.roleCell}>
            <span className={`${styles.rolePill} ${styles[`role_${u.role}`]}`}>{ROLE_LABELS[u.role] || u.role}</span>
          </div>
        );

      case "active":
        return (
          <div className={styles.accessCell}>
            <button
              type="button"
              className={`${styles.accessBtn} ${u.active ? styles.accessBtnActive : styles.accessBtnDisabled}`}
              onClick={(e) => {
                e.stopPropagation();
                void toggleUserAccess(u);
              }}
              title={u.active ? "Account active. Click to disable." : "Account disabled. Click to enable."}
            >
              <span className={styles.statusDot} />
              <span>{u.active ? "Active" : "Disabled"}</span>
            </button>
          </div>
        );

      case "children":
        if (u.role === "parent") {
          const names = u.childrenNames || [];
          return names.length > 0 ? (
            <div className={styles.childrenCell}>
              <span className={styles.childPill} title={names.join(", ")}>
                👶 {names.join(", ")}
              </span>
            </div>
          ) : (
            <span className={styles.mutedText}>No children linked</span>
          );
        }
        return <span className={styles.mutedText}>—</span>;

      case "joined":
        return <span className={styles.dateCellText}>{fmtDate(u.joined)}</span>;

      case "lastSignIn":
        return <span className={styles.dateCellText}>{fmtDateTime(u.lastSignIn)}</span>;

      case "actions":
        return (
          <div className={styles.actionsCell}>
            <button
              type="button"
              className={styles.deleteRowBtn}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteUser(u);
              }}
              title={`Delete user ${u.name || u.email}`}
              aria-label={`Delete user ${u.name || u.email}`}
            >
              🗑
            </button>
          </div>
        );

      default:
        return <span>{(u as any)[col.key]}</span>;
    }
  }

  /* ── Student / Child Cell Content Renderer ────────────────── */
  function renderStudentCell(s: SheetStudent, col: ColDef, isCellEditing: boolean) {
    if (isCellEditing && col.key === "studentName") {
      return (
        <input
          autoFocus
          className={styles.cellInlineInput}
          type="text"
          value={draft}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => {
            const len = e.target.value.length;
            e.target.setSelectionRange(len, len);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              finishEdit(true, "down");
            } else if (e.key === "Tab") {
              e.preventDefault();
              e.stopPropagation();
              finishEdit(true, "right");
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              finishEdit(false);
            }
          }}
          onBlur={() => finishEdit(true)}
        />
      );
    }

    if (isCellEditing && col.key === "parentName") {
      return (
        <select
          autoFocus
          className={styles.cellInlineSelect}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            finishEdit(true, "none", e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              finishEdit(false);
            }
          }}
          onBlur={() => finishEdit(false)}
        >
          <option value="">-- Unassigned --</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.phone ? `(${p.phone})` : ""}
            </option>
          ))}
        </select>
      );
    }

    if (isCellEditing && col.key === "gender") {
      return (
        <select
          autoFocus
          className={styles.cellInlineSelect}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            finishEdit(true, "none", e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              finishEdit(false);
            }
          }}
          onBlur={() => finishEdit(false)}
        >
          <option value="">-- None --</option>
          <option value="male">Male (Boy)</option>
          <option value="female">Female (Girl)</option>
        </select>
      );
    }

    switch (col.key) {
      case "studentName":
        return (
          <div className={styles.nameCell}>
            <span className={styles.cellTextPrimary}>
              👶 {s.name || <em className={styles.mutedText}>Unnamed</em>}
            </span>
          </div>
        );

      case "parentName":
        return (
          <div className={styles.parentCell}>
            {s.parentId ? (
              <span className={styles.parentNameBadge}>
                👤 {s.parentName}
              </span>
            ) : (
              <span className={styles.unassignedBadge}>⚠️ Unassigned</span>
            )}
          </div>
        );

      case "parentContact":
        return (
          <div className={styles.parentContactCell}>
            {s.parentId ? (
              <>
                <span className={styles.cellTextMono}>{s.parentPhone}</span>
                {s.parentEmail !== "—" && (
                  <span className={styles.parentEmailText}>({s.parentEmail})</span>
                )}
              </>
            ) : (
              <span className={styles.mutedText}>—</span>
            )}
          </div>
        );

      case "gender":
        if (!s.gender) return <span className={styles.mutedText}>—</span>;
        const isBoy = s.gender.toLowerCase().startsWith("m");
        return (
          <span className={`${styles.genderBadge} ${isBoy ? styles.genderBoy : styles.genderGirl}`}>
            {isBoy ? "Boy" : "Girl"}
          </span>
        );

      case "studentStatus":
        const isActive = s.status === "active";
        return (
          <div className={styles.accessCell}>
            <button
              type="button"
              className={`${styles.accessBtn} ${isActive ? styles.accessBtnActive : styles.accessBtnDisabled}`}
              onClick={(e) => {
                e.stopPropagation();
                const nextStatus = isActive ? "inactive" : "active";
                void saveStudentField(s, "status", nextStatus);
              }}
              title={isActive ? "Status: Active. Click to mark inactive." : "Status: Inactive. Click to mark active."}
            >
              <span className={styles.statusDot} />
              <span>{isActive ? "Active" : s.status || "Inactive"}</span>
            </button>
          </div>
        );

      case "studentJoined":
        return <span className={styles.dateCellText}>{fmtDate(s.joined)}</span>;

      case "actions":
        return (
          <div className={styles.actionsCell}>
            <button
              type="button"
              className={styles.deleteRowBtn}
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteStudent(s);
              }}
              title={`Delete child record ${s.name}`}
              aria-label={`Delete child record ${s.name}`}
            >
              🗑
            </button>
          </div>
        );

      default:
        return <span>{(s as any)[col.key]}</span>;
    }
  }
}
