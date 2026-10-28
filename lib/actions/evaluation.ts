"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  EVALUATION_LEVELS,
  encodeEvaluationSkillTag,
} from "@/lib/constants/evaluationCurriculum";

export async function submitStructuredEvaluationAction(payload: {
  id?: string;
  studentId: string;
  classId?: string | null;
  acquiredLevel: number;
  scores: Record<string, number>;
  notes: string;
}) {
  try {
    const { studentId, classId, acquiredLevel, scores, notes, id } = payload;

    if (!studentId) {
      return { error: "Please select a student to evaluate." };
    }
    if (!acquiredLevel || acquiredLevel < 1 || acquiredLevel > 6) {
      return { error: "Please select a valid badge level (Level 1 to Level 6)." };
    }

    const scoreValues = Object.values(scores).filter((v) => v >= 1 && v <= 5);
    if (scoreValues.length === 0) {
      return { error: "Please score at least one criterion on the 5–1 scale." };
    }

    // Calculate average star rating (1 to 5) from the criteria scores
    const avgScore = Math.round(
      scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length
    );
    const starRating = Math.min(5, Math.max(1, avgScore));

    const levelObj =
      EVALUATION_LEVELS.find((l) => l.level === acquiredLevel) ||
      EVALUATION_LEVELS[0];

    const cleanNotes =
      notes.trim() || `Evaluated for ${levelObj.title}.`;

    const encodedSkillTag = encodeEvaluationSkillTag({
      acquiredLevel,
      scores,
      notes: cleanNotes,
    });

    // Resolve the logged-in evaluator's users.id (works for coach, staff, admin, superadmin)
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return { error: "You must be logged in." };

    const supabase = await createAdminClient();

    let evaluatorUserId: string | null = null;
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (userRow?.id) {
      evaluatorUserId = userRow.id;
    } else {
      const { data: fallbackUser } = await supabase
        .from("users")
        .select("id")
        .limit(1)
        .maybeSingle();
      evaluatorUserId = fallbackUser?.id ?? null;
    }

    if (!evaluatorUserId) {
      return { error: "Evaluator user profile not found." };
    }

    if (id) {
      const { error: updateErr } = await supabase
        .from("student_evaluations")
        .update({
          student_id: studentId,
          class_id: classId || null,
          star_rating: starRating,
          comments: cleanNotes,
          skill_tag: encodedSkillTag,
        })
        .eq("id", id);

      if (updateErr) {
        console.error("[submitStructuredEvaluationAction update]", updateErr.message);
        return { error: "Failed to update evaluation: " + updateErr.message };
      }
    } else {
      const { error: insertErr } = await supabase
        .from("student_evaluations")
        .insert({
          student_id: studentId,
          coach_id: evaluatorUserId,
          class_id: classId || null,
          star_rating: starRating,
          comments: cleanNotes,
          skill_tag: encodedSkillTag,
        });

      if (insertErr) {
        console.error("[submitStructuredEvaluationAction insert]", insertErr.message);
        return { error: "Failed to save evaluation: " + insertErr.message };
      }
    }

    revalidatePath("/coach/evaluations");
    revalidatePath("/staff/evaluations");
    revalidatePath("/parent/evaluations");
    revalidatePath("/parent/portal");
    return { success: true };
  } catch (err: any) {
    console.error("[submitStructuredEvaluationAction]", err);
    return { error: err.message || "Unexpected error saving evaluation." };
  }
}

export async function deleteEvaluationAction(evalId: string) {
  try {
    if (!evalId) return { error: "Missing evaluation ID." };
    const supabase = await createAdminClient();

    const { error } = await supabase
      .from("student_evaluations")
      .delete()
      .eq("id", evalId);

    if (error) {
      console.error("[deleteEvaluationAction]", error.message);
      return { error: "Failed to delete evaluation: " + error.message };
    }

    revalidatePath("/coach/evaluations");
    revalidatePath("/staff/evaluations");
    revalidatePath("/parent/evaluations");
    revalidatePath("/parent/portal");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Unexpected error deleting evaluation." };
  }
}

export async function submitEvaluationAction(formData: FormData) {
  const studentId = formData.get("student_id") as string;
  const classId = (formData.get("class_id") as string | null) || null;
  const starRating = parseInt(formData.get("star_rating") as string, 10);
  const comments = (formData.get("comments") as string)?.trim();
  const skillTag = (formData.get("skill_tag") as string | null)?.trim() || null;

  if (!studentId || !comments) {
    return { error: "Student and comments are required." };
  }
  if (isNaN(starRating) || starRating < 1 || starRating > 5) {
    return { error: "Please select a star rating between 1 and 5." };
  }

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const supabase = await createAdminClient();

  const { data: coachRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!coachRow) return { error: "Account not found." };

  const { error: insertErr } = await supabase
    .from("student_evaluations")
    .insert({
      student_id: studentId,
      coach_id: coachRow.id,
      class_id: classId || null,
      star_rating: starRating,
      comments,
      skill_tag: skillTag || null,
    });

  if (insertErr) {
    console.error("[submitEvaluationAction]", insertErr.message);
    return { error: "Failed to save evaluation. Please try again." };
  }

  revalidatePath("/coach/evaluations");
  revalidatePath("/staff/evaluations");
  revalidatePath("/parent/evaluations");
  return { success: true };
}
