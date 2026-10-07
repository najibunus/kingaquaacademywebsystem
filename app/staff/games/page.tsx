import { createAdminClient } from "@/lib/supabase/server";
import StaffGamesClient from "./StaffGamesClient";

export default async function StaffGamesPage() {
  const supabase = await createAdminClient();

  // Fetch all tournaments
  const { data: tournaments } = await (supabase.from("tournaments" as any)
    .select("*")
    .order("date", { ascending: false }));

  // Fetch all classes
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  // Fetch all students (active only)
  const { data: students } = await supabase
    .from("students")
    .select("id, name, class_id, classes(name)")
    .eq("status", "active")
    .order("name");

  // Fetch recent results just to show a feed/log
  const { data: recentResults } = await (supabase.from("tournament_results" as any)
    .select(`
      id, stroke, distance, time_record, created_at,
      students(name),
      tournaments(name)
    ` as any)
    .order("created_at", { ascending: false })
    .limit(50));

  return (
    <StaffGamesClient 
      tournaments={(tournaments as any[]) || []} 
      classes={(classes as any[]) || []}
      students={(students as any[]) || []} 
      recentResults={(recentResults as any[]) || []}
    />
  );
}
