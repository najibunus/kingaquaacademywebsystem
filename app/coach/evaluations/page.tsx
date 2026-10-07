import { createClient, createAdminClient } from "@/lib/supabase/server";
import EvaluationsClient from "./EvaluationsClient";

export default async function CoachEvaluationsPage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  const supabase = await createAdminClient();

  // Resolve coach's users.id from auth.id
  const { data: coachRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user?.id ?? "")
    .single();

  const coachUsersId = coachRow?.id ?? "";

  // Get classes assigned to this coach
  const { data: myClasses } = await supabase
    .from("classes")
    .select("id, name")
    .eq("coach_id", user?.id ?? "") // coach_id on classes stores auth_id
    .eq("is_active", true);

  // Fallback: if no classes assigned, use all active classes (admin testing)
  const classesToUse =
    myClasses && myClasses.length > 0
      ? myClasses
      : (
          await supabase
            .from("classes")
            .select("id, name")
            .eq("is_active", true)
        ).data ?? [];

  const classIds = classesToUse.map((c) => c.id);
  const classNameMap = Object.fromEntries(classesToUse.map((c) => [c.id, c.name]));

  // Fetch active students in those classes
  const { data: rawStudents } = classIds.length > 0
    ? await supabase
        .from("students")
        .select("id, name, class_id")
        .in("class_id", classIds)
        .eq("status", "active")
        .order("name")
    : { data: [] };

  const students = (rawStudents ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    class_id: s.class_id,
    class_name: s.class_id ? (classNameMap[s.class_id] ?? null) : null,
  }));

  // Fetch this coach's last 20 evaluations with student names
  const { data: rawEvals } = coachUsersId
    ? await supabase
        .from("student_evaluations")
        .select("id, star_rating, comments, skill_tag, created_at, students(name)")
        .eq("coach_id", coachUsersId)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const pastEvals = (rawEvals ?? []).map((ev) => ({
    id: ev.id,
    student_name: (ev.students as { name: string } | null)?.name ?? "Unknown",
    star_rating: ev.star_rating,
    comments: ev.comments,
    skill_tag: ev.skill_tag,
    created_at: ev.created_at,
  }));

  return <EvaluationsClient students={students} pastEvals={pastEvals} />;
}
