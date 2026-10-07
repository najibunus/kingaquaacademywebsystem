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
