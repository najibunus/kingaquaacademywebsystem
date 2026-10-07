import { createAdminClient } from "@/lib/supabase/server";
import styles from "./staff-attendance.module.css";
import StaffAttendanceClient from "./StaffAttendanceClient";

export default async function StaffAttendancePage() {
  const supabase = await createAdminClient();

  const { data: students, error } = await supabase
    .from("students")
    .select(`
      id, name, class_id, status, parent_id, pricing_tier,
      classes(name, type, locations(name)),
      invoices(id, invoice_number, type, status, payment_status, created_at, due_date, invoice_items(description, unit_price, quantity)),
      attendance(id, date, timestamp, status, sessions_deducted, created_at)
    `)
    .order("name", { ascending: true });

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, type, locations(name)")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="animate-fade-in-up">
        <div className={styles.errorBanner}>🚨 Failed to load students: {error.message}</div>
      </div>
    );
  }

  return (
    <StaffAttendanceClient students={students || []} classes={classes || []} />
  );
}
