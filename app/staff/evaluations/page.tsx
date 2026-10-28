import { createAdminClient } from "@/lib/supabase/server";
import EvaluationsClient from "@/app/coach/evaluations/EvaluationsClient";

export const dynamic = "force-dynamic";

export default async function StaffEvaluationsPage() {
  const supabase = await createAdminClient();

  // Fetch all active classes
  const { data: rawClasses } = await supabase
    .from("classes")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const classes = rawClasses ?? [];
  const classNameMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));

  // Fetch all active students
  const { data: rawStudents } = await supabase
    .from("students")
    .select("id, name, class_id")
    .eq("status", "active")
    .order("name");

  const students = (rawStudents ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    class_id: s.class_id,
    class_name: s.class_id ? (classNameMap[s.class_id] ?? null) : null,
  }));

  // Fetch recent evaluations across all students
  const { data: rawEvals } = await supabase
    .from("student_evaluations")
    .select(
      "id, student_id, class_id, star_rating, comments, skill_tag, created_at, students(name)"
    )
    .order("created_at", { ascending: false })
    .limit(80);

  const pastEvals = (rawEvals ?? []).map((ev: any) => ({
    id: ev.id,
    student_id: ev.student_id,
    class_id: ev.class_id,
    student_name: ev.students?.name ?? "Unknown",
    star_rating: ev.star_rating,
    comments: ev.comments,
    skill_tag: ev.skill_tag,
    created_at: ev.created_at,
  }));

  return (
    <EvaluationsClient
      students={students}
      classes={classes}
      pastEvals={pastEvals}
      isStaffMode={true}
    />
  );
}
