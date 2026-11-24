"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
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

export async function updateParentProfileAction(payload: {
  display_name?: string;
  phone: string;
}) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const cleanPhone = (payload.phone || "").trim();
  const digitsOnly = cleanPhone.replace(/\D/g, "");
  if (!cleanPhone || digitsOnly.length < 7 || !/^[0-9+\-\s()]{7,20}$/.test(cleanPhone)) {
    return { error: "Please enter a valid WhatsApp / phone number (at least 7 digits)." };
  }

  const cleanName = payload.display_name?.trim();
  if (payload.display_name !== undefined && !cleanName) {
    return { error: "Full name is required." };
  }

  const supabase = await createAdminClient();

  const updateFields: { phone: string; display_name?: string } = {
    phone: cleanPhone,
  };
  if (cleanName) {
    updateFields.display_name = cleanName;
  }

  const { error } = await (supabase.from("users") as any)
    .update(updateFields)
    .eq("auth_id", user.id);

  if (error) {
    return { error: error.message };
  }

  // Keep auth user_metadata in sync
  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(user.user_metadata || {}),
      phone: cleanPhone,
      ...(cleanName ? { display_name: cleanName } : {}),
    },
  });

  revalidatePath("/parent", "layout");
  revalidatePath("/parent/portal");
  revalidatePath("/parent/settings");
  revalidatePath("/parent/invoices");
  revalidatePath("/staff/parents");
  return { success: true, phone: cleanPhone };
}
