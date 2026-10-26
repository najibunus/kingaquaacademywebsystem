"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(
  userId: string,
  data: {
    display_name?: string;
    phone?: string | null;
    auth_id?: string;
    password?: string;
    assignedStudentIds?: string[];
  },
  revalidatePaths: string[] = []
) {
  try {
    const supabase = await createAdminClient();

    // 1. Update basic user profile
    const { error } = await supabase
      .from("users")
      .update({
        display_name: data.display_name,
        phone: data.phone
      })
      .eq("id", userId);

    if (error) throw error;

    // 2. Update password if provided
    if (data.password && data.auth_id) {
      const { error: authError } = await supabase.auth.admin.updateUserById(data.auth_id, {
        password: data.password
      });
      if (authError) throw authError;
    }

    // 3. Update student assignments if provided
    if (data.assignedStudentIds !== undefined) {
      // Unassign all existing students for this parent
      await supabase
        .from("students")
        .update({ parent_id: null })
        .eq("parent_id", userId);
        
      // Assign selected students
      if (data.assignedStudentIds.length > 0) {
        await supabase
          .from("students")
          .update({ parent_id: userId })
          .in("id", data.assignedStudentIds);
      }
    }

    revalidatePaths.forEach(p => revalidatePath(p));

    return { success: true };
  } catch (error: any) {
    console.error("Update User Error:", error);
    return { success: false, error: error.message };
  }
}

export async function createParentUser(
  data: {
    display_name: string;
    email: string;
    password: string;
    phone?: string | null;
    assignedStudentIds?: string[];
  },
  revalidatePaths: string[] = []
) {
  try {
    const supabase = await createAdminClient();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.display_name.trim();
    const cleanPhone = data.phone?.trim() || null;

    if (!cleanName) throw new Error("Parent name is required.");
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error("Enter a valid email address.");
    }
    if (!data.password || data.password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        role: "parent",
        display_name: cleanName,
        phone: cleanPhone,
      },
    });

    if (authError || !authData?.user) {
      throw new Error(authError?.message || "Failed to create authentication user.");
    }

    // 2. Upsert into users table (handles DB trigger gracefully)
    let userRow: any = null;
    const { data: upsertedRow, error: userError } = await supabase
      .from("users")
      .upsert(
        {
          auth_id: authData.user.id,
          role: "parent",
          display_name: cleanName,
          phone: cleanPhone,
          is_active: true,
        },
        { onConflict: "auth_id" }
      )
      .select("id, auth_id, display_name, phone, is_active, created_at")
      .single();

    if (userError || !upsertedRow) {
      const { data: existingRow, error: fetchErr } = await supabase
        .from("users")
        .select("id, auth_id, display_name, phone, is_active, created_at")
        .eq("auth_id", authData.user.id)
        .single();

      if (fetchErr || !existingRow) {
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(userError?.message || "Failed to create parent profile.");
      }
      userRow = existingRow;
    } else {
      userRow = upsertedRow;
    }

    // 3. Assign students if provided
    let assignedStudents: { id: string; name: string }[] = [];
    if (data.assignedStudentIds && data.assignedStudentIds.length > 0) {
      const { data: updatedStudents } = await supabase
        .from("students")
        .update({ parent_id: userRow.id })
        .in("id", data.assignedStudentIds)
        .select("id, name");
      if (updatedStudents) {
        assignedStudents = updatedStudents;
      }
    }

    revalidatePaths.forEach((p) => revalidatePath(p));
    revalidatePath("/staff/parents");
    revalidatePath("/staff/students");
    revalidatePath("/superadmin/users");

    return {
      success: true,
      parent: {
        id: userRow.id,
        auth_id: userRow.auth_id,
        display_name: userRow.display_name,
        phone: userRow.phone,
        is_active: userRow.is_active,
        created_at: userRow.created_at,
        email: cleanEmail,
        students: assignedStudents,
      },
    };
  } catch (error: any) {
    console.error("Create Parent Error:", error);
    return { success: false, error: error.message };
  }
}
