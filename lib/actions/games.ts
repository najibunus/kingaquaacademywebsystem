"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTournamentAction(name: string, date: string, venue: string) {
  try {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from("tournaments" as any)
      .insert({ name, date, venue })
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath("/staff/games");
    revalidatePath("/parent/games");
    return { success: true, data };
  } catch (error: any) {
    console.error("Create Tournament Error:", error);
    return { success: false, error: error.message };
  }
}

export async function addTournamentResultAction(
  tournamentId: string,
  studentId: string,
  stroke: string,
  distance: number,
  timeRecord: string
) {
  try {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from("tournament_results" as any)
      .insert({
        tournament_id: tournamentId,
        student_id: studentId,
        stroke,
        distance,
        time_record: timeRecord,
      })
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath("/staff/games");
    revalidatePath("/parent/games");
    return { success: true, data };
  } catch (error: any) {
    console.error("Add Result Error:", error);
    return { success: false, error: error.message };
  }
}
