"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateCoachProfileAction(formData: FormData) {
  const authId = formData.get("auth_id") as string;
  const displayName = formData.get("display_name") as string;
  const phone = formData.get("phone") as string;

  if (!authId || !displayName) {
    return { error: "Display Name is required." };
  }

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({
      display_name: displayName,
      phone: phone || null,
    })
    .eq("auth_id", authId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/coach/profile");
  revalidatePath("/coach/layout"); // To refresh avatar / name in topbar if we use it
  return { success: true };
}
