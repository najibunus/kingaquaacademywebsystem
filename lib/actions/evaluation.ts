"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitEvaluationAction(formData: FormData) {
  const studentId  = formData.get("student_id") as string;
  const classId    = (formData.get("class_id") as string | null) || null;
  const starRating = parseInt(formData.get("star_rating") as string, 10);
  const comments   = (formData.get("comments") as string)?.trim();
  const skillTag   = (formData.get("skill_tag") as string | null)?.trim() || null;

  if (!studentId || !comments) {
    return { error: "Student and comments are required." };
  }
  if (isNaN(starRating) || starRating < 1 || starRating > 5) {
    return { error: "Please select a star rating between 1 and 5." };
  }

  // Resolve the coach's users.id from their session auth_id
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const supabase = await createAdminClient();

  const { data: coachRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!coachRow) return { error: "Coach account not found." };

  const { error: insertErr } = await supabase
    .from("student_evaluations")
    .insert({
      student_id: studentId,
      coach_id:   coachRow.id,
      class_id:   classId || null,
      star_rating: starRating,
      comments,
      skill_tag:  skillTag || null,
    });

  if (insertErr) {
    console.error("[submitEvaluationAction]", insertErr.message);
    return { error: "Failed to save evaluation. Please try again." };
  }

  revalidatePath("/coach/evaluations");
  return { success: true };
}
