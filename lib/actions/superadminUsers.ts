"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ManagedRole = "admin" | "staff" | "coach" | "parent";
export const MANAGED_ROLES: ManagedRole[] = ["admin", "staff", "coach", "parent"];

export type SheetUserDTO = {
  id: string;
  role: ManagedRole;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  joined: string;
  lastSignIn: string | null;
  childrenNames?: string[];
};

export type SheetStudentDTO = {
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
};

type ActionResult = { success: true } | { success: false; error: string };
type CreateUserResult = { success: true; user: SheetUserDTO } | { success: false; error: string };

/**
 * Verifies the caller is a signed-in superadmin.
 * Every action in this file MUST call this first — the admin (service role)
 * client bypasses RLS, so authorization has to be enforced here.
 */
async function requireSuperadmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in.");
  if (user.user_metadata?.role !== "superadmin") {
    throw new Error("Only a superadmin can manage users.");
  }
  return user;
}

/** Loads a managed (non-superadmin) user row, rejecting protected accounts. */
async function loadTarget(userId: string, callerAuthId: string) {
  const admin = await createAdminClient();
  const { data: target, error } = await admin
    .from("users")
    .select("id, auth_id, role, display_name")
    .eq("id", userId)
    .single();

  if (error || !target) throw new Error("User not found.");
  if (target.auth_id === callerAuthId) {
    throw new Error("You cannot change your own account from this sheet.");
  }
  if (target.role === "superadmin") {
    throw new Error("Superadmin accounts are protected and cannot be edited here.");
  }
  return { admin, target };
}

/** Best-effort audit trail — never blocks the real operation. */
async function audit(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  action: string,
  entityId: string
) {
  try {
    await (admin.from("audit_logs") as any).insert({
      actor_role: "superadmin",
      action,
      entity_type: "user",
      entity_id: entityId,
    });
  } catch {
    /* ignore */
  }
}

function fail(e: unknown): { success: false; error: string } {
  const message = e instanceof Error ? e.message : "Something went wrong.";
  return { success: false, error: message };
}

function done(): ActionResult {
  revalidatePath("/superadmin/users");
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/admins");
  return { success: true };
}

/* ────────────────────────────────────────────────────────────────── */

export async function updateUserName(userId: string, name: string): Promise<ActionResult> {
  try {
    const caller = await requireSuperadmin();
    const clean = name.trim();
    if (!clean) throw new Error("Name cannot be empty.");
    if (clean.length > 120) throw new Error("Name is too long.");

    const { admin, target } = await loadTarget(userId, caller.id);

    const { error } = await admin.from("users").update({ display_name: clean }).eq("id", userId);
    if (error) throw error;

    // Keep the auth metadata in sync (non-fatal).
    const { data: authUser } = await admin.auth.admin.getUserById(target.auth_id);
    if (authUser?.user) {
      await admin.auth.admin.updateUserById(target.auth_id, {
        user_metadata: { ...authUser.user.user_metadata, display_name: clean },
      });
    }

    await audit(admin, "user.update_name", userId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function updateUserEmail(userId: string, email: string): Promise<ActionResult> {
  try {
    const caller = await requireSuperadmin();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("Enter a valid email address.");

    const { admin, target } = await loadTarget(userId, caller.id);

    const { error } = await admin.auth.admin.updateUserById(target.auth_id, {
      email: clean,
      email_confirm: true,
    });
    if (error) throw error;

    await audit(admin, "user.update_email", userId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function updateUserPhone(userId: string, phone: string): Promise<ActionResult> {
  try {
    const caller = await requireSuperadmin();
    const clean = phone.trim();
    if (clean && !/^[0-9+\-\s()]{6,20}$/.test(clean)) throw new Error("Enter a valid phone number.");

    const { admin } = await loadTarget(userId, caller.id);

    const { error } = await admin
      .from("users")
      .update({ phone: clean || null })
      .eq("id", userId);
    if (error) throw error;

    await audit(admin, "user.update_phone", userId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function updateUserPassword(userId: string, password: string): Promise<ActionResult> {
  try {
    const caller = await requireSuperadmin();
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    const { admin, target } = await loadTarget(userId, caller.id);

    const { error } = await admin.auth.admin.updateUserById(target.auth_id, { password });
    if (error) throw error;

    await audit(admin, "user.reset_password", userId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function updateUserRole(userId: string, role: string): Promise<ActionResult> {
  try {
    const caller = await requireSuperadmin();
    if (!MANAGED_ROLES.includes(role as ManagedRole)) throw new Error("Invalid role.");

    const { admin, target } = await loadTarget(userId, caller.id);

    const { error } = await admin.from("users").update({ role: role as ManagedRole }).eq("id", userId);
    if (error) throw error;

    // The route guard reads the role from auth metadata, so it must match.
    const { data: authUser } = await admin.auth.admin.getUserById(target.auth_id);
    const { error: metaError } = await admin.auth.admin.updateUserById(target.auth_id, {
      user_metadata: { ...(authUser?.user?.user_metadata ?? {}), role },
    });
    if (metaError) {
      // Roll back the table change so the two never disagree.
      await admin.from("users").update({ role: target.role }).eq("id", userId);
      throw metaError;
    }

    await audit(admin, `user.change_role:${target.role}->${role}`, userId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

/**
 * Grants / revokes access. Disabling blocks sign-in at the auth layer
 * (long ban) and flags the profile row inactive.
 */
export async function setUserAccess(userId: string, active: boolean): Promise<ActionResult> {
  try {
    const caller = await requireSuperadmin();
    const { admin, target } = await loadTarget(userId, caller.id);

    const { error: authError } = await admin.auth.admin.updateUserById(target.auth_id, {
      ban_duration: active ? "none" : "876000h",
    });
    if (authError) throw authError;

    const { error } = await admin.from("users").update({ is_active: active }).eq("id", userId);
    if (error) throw error;

    await audit(admin, active ? "user.enable_access" : "user.disable_access", userId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function deleteUserAccount(userId: string): Promise<ActionResult> {
  try {
    const caller = await requireSuperadmin();
    const { admin, target } = await loadTarget(userId, caller.id);

    // Parents own children — detach them first so students are never lost.
    if (target.role === "parent") {
      const { error: detachError } = await admin
        .from("students")
        .update({ parent_id: null })
        .eq("parent_id", userId);
      if (detachError) throw detachError;
    }

    const { error } = await admin.from("users").delete().eq("id", userId);
    if (error) {
      throw new Error(
        /foreign key|violates/i.test(error.message)
          ? "This user still has linked records (invoices, classes, attendance…). Disable their access instead of deleting."
          : error.message
      );
    }

    const { error: authError } = await admin.auth.admin.deleteUser(target.auth_id);
    if (authError && !/not found/i.test(authError.message)) throw authError;

    await audit(admin, "user.delete", userId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function createUserAccount(payload: {
  role: ManagedRole;
  displayName: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<CreateUserResult> {
  try {
    await requireSuperadmin();
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanName = payload.displayName.trim();
    const cleanPhone = payload.phone?.trim() || "";
    const password = payload.password;

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error("Enter a valid email address.");
    }
    if (!cleanName) {
      throw new Error("Name is required.");
    }
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    if (!MANAGED_ROLES.includes(payload.role)) {
      throw new Error("Invalid role selected.");
    }
    if (cleanPhone && !/^[0-9+\-\s()]{6,20}$/.test(cleanPhone)) {
      throw new Error("Enter a valid phone number.");
    }

    const admin = await createAdminClient();

    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: payload.role,
        display_name: cleanName,
      },
    });

    if (authErr || !authData?.user) {
      throw new Error(authErr?.message || "Failed to create user in authentication system.");
    }

    const { data: profile, error: profErr } = await admin
      .from("users")
      .insert({
        auth_id: authData.user.id,
        role: payload.role,
        display_name: cleanName,
        phone: cleanPhone || null,
        is_active: true,
      })
      .select("id, auth_id, role, display_name, phone, is_active, created_at")
      .single();

    if (profErr || !profile) {
      await admin.auth.admin.deleteUser(authData.user.id);
      throw new Error(profErr?.message || "Failed to create user database profile.");
    }

    await audit(admin, `user.create:${payload.role}`, profile.id);
    revalidatePath("/superadmin/users");
    revalidatePath("/superadmin");
    revalidatePath("/superadmin/admins");

    return {
      success: true,
      user: {
        id: profile.id,
        role: profile.role as ManagedRole,
        name: profile.display_name ?? cleanName,
        email: cleanEmail,
        phone: profile.phone ?? "",
        active: profile.is_active !== false,
        joined: profile.created_at,
        lastSignIn: null,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create user account.",
    };
  }
}

export async function updateStudentField(
  studentId: string,
  field: "name" | "gender" | "status" | "parent_id",
  value: string | null
): Promise<ActionResult> {
  try {
    await requireSuperadmin();
    const admin = await createAdminClient();

    const patch: Record<string, any> = {};
    if (field === "name") {
      const clean = (value ?? "").trim();
      if (!clean) throw new Error("Child name cannot be empty.");
      patch.name = clean;
    } else if (field === "gender") {
      patch.gender = value || null;
    } else if (field === "status") {
      patch.status = value || "active";
    } else if (field === "parent_id") {
      patch.parent_id = value || null;
    }

    const { error } = await admin.from("students").update(patch).eq("id", studentId);
    if (error) throw error;

    await audit(admin, `student.update_${field}`, studentId);
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function createStudentAccount(payload: {
  name: string;
  parentId?: string | null;
  gender?: string | null;
  status?: string;
}): Promise<{ success: true; student: SheetStudentDTO } | { success: false; error: string }> {
  try {
    await requireSuperadmin();
    const cleanName = (payload.name ?? "").trim();
    if (!cleanName) throw new Error("Child name is required.");

    const admin = await createAdminClient();

    const { data: student, error } = await admin
      .from("students")
      .insert({
        name: cleanName,
        parent_id: payload.parentId || null,
        gender: payload.gender || null,
        status: payload.status || "active",
      })
      .select("id, name, gender, date_of_birth, status, parent_id, created_at")
      .single();

    if (error || !student) throw error || new Error("Failed to create child record.");

    let parentName = "Unassigned";
    let parentPhone = "—";
    let parentEmail = "—";

    if (student.parent_id) {
      const { data: parentUser } = await admin
        .from("users")
        .select("id, auth_id, display_name, phone")
        .eq("id", student.parent_id)
        .single();
      if (parentUser) {
        parentName = parentUser.display_name || "Parent";
        parentPhone = parentUser.phone || "—";
        const { data: authUser } = await admin.auth.admin.getUserById(parentUser.auth_id);
        parentEmail = authUser?.user?.email || "—";
      }
    }

    await audit(admin, "student.create", student.id);
    revalidatePath("/superadmin/users");

    return {
      success: true,
      student: {
        id: student.id,
        name: student.name,
        gender: student.gender,
        dateOfBirth: student.date_of_birth,
        status: student.status || "active",
        parentId: student.parent_id,
        parentName,
        parentEmail,
        parentPhone,
        joined: student.created_at,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create child record.",
    };
  }
}

export async function deleteStudentAccount(studentId: string): Promise<ActionResult> {
  try {
    await requireSuperadmin();
    const admin = await createAdminClient();

    const { error } = await admin.from("students").delete().eq("id", studentId);
    if (error) {
      throw new Error(
        /foreign key|violates/i.test(error.message)
          ? "This child has linked records (classes, attendance, or invoices). You can mark them inactive instead."
          : error.message
      );
    }

    await audit(admin, "student.delete", studentId);
    return done();
  } catch (e) {
    return fail(e);
  }
}
