"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateStudentProfile(
  studentId: string, 
  data: {
    name?: string;
    parent_id?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    real_ic?: string | null;
    school_name?: string | null;
    avatar_url?: string | null;
    pricing_tier?: string;
    class_id?: string | null;
    status?: string;
  },
  revalidatePaths: string[] = []
) {
  try {
    const supabase = await createAdminClient();
    
    const { error } = await (supabase
      .from("students" as any)
      .update(data)
      .eq("id", studentId));

    if (error) throw error;
    
    // Revalidate requested paths
    revalidatePaths.forEach(p => revalidatePath(p));
    
    return { success: true };
  } catch (error: any) {
    console.error("Update Student Error:", error);
    return { success: false, error: error.message };
  }
}

export async function createStudentProfile(
  data: {
    name: string;
    parent_id?: string | null;
    class_id?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    real_ic?: string | null;
    school_name?: string | null;
    avatar_url?: string | null;
    pricing_tier?: string;
    status?: string;
  },
  revalidatePaths: string[] = []
) {
  try {
    const cleanName = data.name.trim();
    if (!cleanName) throw new Error("Student name cannot be empty.");

    const supabase = await createAdminClient();

    const { data: newStudent, error } = await supabase
      .from("students")
      .insert({
        name: cleanName,
        parent_id: data.parent_id || null,
        class_id: data.class_id || null,
        gender: data.gender || null,
        date_of_birth: data.date_of_birth || null,
        real_ic: data.real_ic || null,
        school_name: data.school_name || null,
        avatar_url: data.avatar_url || null,
        pricing_tier: data.pricing_tier || "Standard",
        status: data.status || "active",
        session_count: 0,
      })
      .select("*, classes(name, type)")
      .single();

    if (error || !newStudent) {
      throw error || new Error("Failed to create student.");
    }

    revalidatePaths.forEach((p) => revalidatePath(p));
    revalidatePath("/staff/students");
    revalidatePath("/superadmin/users");

    return { success: true, student: newStudent };
  } catch (error: any) {
    console.error("Create Student Error:", error);
    return { success: false, error: error.message };
  }
}

