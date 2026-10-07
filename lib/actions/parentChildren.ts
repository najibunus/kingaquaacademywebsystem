"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateChildDetailsAction(formData: FormData) {
  const studentId = formData.get("student_id") as string;
  const name = (formData.get("name") as string)?.trim();
  const age = formData.get("age") as string;
  const gender = formData.get("gender") as string;
  const file = formData.get("profile_picture") as File | null;

  if (!studentId || !name) {
    return { error: "Student ID and name are required." };
  }

  // Verify the parent owns this student
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const supabase = await createAdminClient();

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!userRow) return { error: "User not found." };

  // Confirm the student belongs to this parent
  const { data: student } = await supabase
    .from("students")
    .select("id, parent_id")
    .eq("id", studentId)
    .single();

  if (!student || student.parent_id !== userRow.id) {
    return { error: "Access denied: this child does not belong to your account." };
  }

  // Build the update payload
  const updates: { name: string; date_of_birth?: string; gender?: string; avatar_url?: string } = { name };
  if (age) updates.date_of_birth = age; // age is actually acting as date_of_birth string in UI
  if (gender) updates.gender = gender;

  // Handle profile picture upload
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop();
    const fileName = `student-${studentId}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("avatars") 
      .upload(fileName, file, { cacheControl: "3600", upsert: true });

    if (uploadErr) {
      return { error: `Failed to upload picture: ${uploadErr.message}` };
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName);
    updates.avatar_url = urlData.publicUrl;
  }

  const { error: updateErr } = await supabase
    .from("students")
    .update(updates as any)
    .eq("id", studentId);

  if (updateErr) {
    return { error: `Failed to update: ${updateErr.message}` };
  }

  revalidatePath("/parent/portal");
  return { success: true };
}
