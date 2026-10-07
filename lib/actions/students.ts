"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateStudentProfile(
  studentId: string, 
  data: {
    name?: string;
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

