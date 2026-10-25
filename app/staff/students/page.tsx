import { createAdminClient } from "@/lib/supabase/server";
import styles from "./staff-students.module.css";
import StaffStudentsClient from "./StaffStudentsClient";

export default async function StaffStudentsPage() {
  const supabase = await createAdminClient();

  // Fetch all students with class_id
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, temp_id, name, parent_id, session_count, status, date_of_birth, gender, real_ic, school_name, avatar_url, class_id, pricing_tier, classes(name, type)")
    .order("name", { ascending: true });

  // Fetch all classes for the filter dropdown
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, type, locations(name)")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // Fetch parents for student creation & assignment
  const { data: parents } = await supabase
    .from("users")
    .select("id, display_name, phone")
    .eq("role", "parent")
    .order("display_name", { ascending: true });

  if (studentsError) {
    return (
      <div className="animate-fade-in-up">
        <div className={styles.errorBanner}>⚠️ Failed to load students: {studentsError.message}</div>
      </div>
    );
  }

  return (
    <StaffStudentsClient
      students={(students as any[]) || []}
      classes={(classes as any[]) || []}
      parents={(parents as any[]) || []}
    />
  );
}
