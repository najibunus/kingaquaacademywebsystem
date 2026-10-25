import { createAdminClient } from "@/lib/supabase/server";
import StaffCoachScheduleClient from "./StaffCoachScheduleClient";

export default async function StaffCoachSchedulePage() {
  const supabase = await createAdminClient();

  // 1. Fetch all coaches
  const { data: coaches, error: coachesError } = await supabase
    .from("users")
    .select("id, display_name, phone, is_active, avatar_url")
    .eq("role", "coach")
    .order("display_name", { ascending: true });

  // 2. Fetch all active classes
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name, type, locations(name)")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // 3. Fetch all scheduled coach classes from coach_attendance
  const { data: scheduleRecords, error: scheduleError } = await supabase
    .from("coach_attendance")
    .select(`
      id,
      coach_id,
      class_id,
      date,
      status,
      notes,
      created_at,
      users:coach_id(id, display_name, avatar_url),
      classes:class_id(id, name, type, locations(name))
    `)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  const anyError = coachesError || classesError || scheduleError;

  return (
    <div className="animate-fade-in-up">
      {anyError && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fca5a5",
            borderRadius: "var(--radius-md)",
            padding: "16px",
            marginBottom: "16px",
          }}
        >
          Failed to load schedule data: {anyError.message}
        </div>
      )}
      <StaffCoachScheduleClient
        coaches={(coaches as any[]) || []}
        classes={(classes as any[]) || []}
        initialRecords={(scheduleRecords as any[]) || []}
      />
    </div>
  );
}
