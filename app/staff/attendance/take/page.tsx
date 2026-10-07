import { createClient, createAdminClient } from "@/lib/supabase/server";
import TakeAttendanceClient from "./TakeAttendanceClient";

export default async function TakeAttendancePage({
  searchParams
}: {
  searchParams: Promise<{ classId?: string; date?: string }>;
}) {
  const { classId, date } = await searchParams;
  const targetDate = date || new Date().toISOString().split("T")[0];

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const authId = user?.id ?? "";

  const supabase = await createAdminClient();

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .single();

  const staffUserId = userRow?.id ?? "";

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, type, locations(name)")
    .eq("is_active", true)
    .order("name");

  let query = supabase.from("students").select("id, name, session_count, class_id, classes(name)").eq("status", "active");
  if (classId) {
    query = query.eq("class_id", classId);
  }
  const { data: students } = await query.order("name");

  let attendanceMap: Record<string, string> = {};
  if (classId && targetDate && students && students.length > 0) {
    const studentIds = students.map((s) => s.id);
    const { data: att } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("date", targetDate)
      .in("student_id", studentIds);

    attendanceMap = Object.fromEntries((att ?? []).map((a) => [a.student_id, a.status]));
  }

  return (
    <TakeAttendanceClient 
      classes={classes ?? []} 
      students={students ?? []} 
      staffUserId={staffUserId} 
      initialClassId={classId ?? ""}
      initialDate={targetDate}
      attendanceMap={attendanceMap}
    />
  );
}
