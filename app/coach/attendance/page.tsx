import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import AttendanceClient from "./AttendanceClient";

export default async function CoachAttendancePage() {
  // Get the logged-in coach's ID from their session
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const authId = user?.id ?? "";

  const supabase = await createAdminClient();

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authId)
    .single();

  const coachUsersId = userRow?.id ?? "";
  const today = new Date().toISOString().split("T")[0];

  // Get classes assigned to this coach
  const { data: myClasses } = await supabase
    .from("classes")
    .select("id, name, type")
    .eq("coach_id", authId)
    .eq("is_active", true)
    .order("name");

  // If no classes assigned to this coach, show all active classes (for admin testing)
  const classesToShow = myClasses && myClasses.length > 0
    ? myClasses
    : (await supabase.from("classes").select("id, name, type").eq("is_active", true).order("name")).data ?? [];

  // Get all students for these classes
  const classIds = classesToShow.map((c) => c.id);

  const { data: students } = classIds.length > 0
    ? await supabase
        .from("students")
        .select("id, name, session_count, class_id, classes(name)")
        .in("class_id", classIds)
        .eq("status", "active")
        .order("name")
    : { data: [] };

  // Get today's attendance records for these students
  const studentIds = (students ?? []).map((s) => s.id);
  const { data: todayAttendance } = studentIds.length > 0
    ? await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("date", today)
        .in("student_id", studentIds)
    : { data: [] };

  // Build a lookup map: studentId -> today's status
  const attendanceMap = Object.fromEntries(
    (todayAttendance ?? []).map((a) => [a.student_id, a.status])
  );

  return (
    <AttendanceClient
      coachId={coachUsersId}
      students={students ?? []}
      classes={classesToShow}
      attendanceMap={attendanceMap}
      today={today}
    />
  );
}
