import { createAdminClient } from "@/lib/supabase/server";
import ParentGamesClient from "./ParentGamesClient";

export default async function ParentGamesPage() {
  const supabase = await createAdminClient();

  // Fetch all tournaments and all their results, joining the student names
  const { data: tournaments } = await (supabase.from("tournaments" as any)
    .select(`
      id, name, date,
      tournament_results (
        id, stroke, distance, time_record, created_at,
        students ( id, name )
      )
    ` as any)
    .order("date", { ascending: false }));

  return <ParentGamesClient tournaments={(tournaments as any[]) || []} />;
}
