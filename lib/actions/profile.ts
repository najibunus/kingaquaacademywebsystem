"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateCoachProfileAction(formData: FormData) {
  const authId = formData.get("auth_id") as string;
  const displayName = formData.get("display_name") as string;
  const phone = formData.get("phone") as string;
  const avatarUrl = formData.get("avatar_url");

  if (!authId || !displayName) {
    return { error: "Display Name is required." };
  }

  const supabase = await createAdminClient();

  const updateData: { display_name: string; phone: string | null; avatar_url?: string | null } = {
    display_name: displayName,
    phone: phone || null,
  };

  if (avatarUrl !== null && avatarUrl !== undefined) {
    updateData.avatar_url = (avatarUrl as string).trim() || null;
  }

  const { error } = await (supabase.from("users") as any)
    .update(updateData)
    .eq("auth_id", authId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/coach/profile");
  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  revalidatePath("/coach/evaluations");
  revalidatePath("/coach", "layout");
  return { success: true };
}
