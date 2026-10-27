"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTournamentAction(name: string, date: string, venue: string) {
  try {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from("tournaments" as any)
      .insert({ name: name.trim(), date, venue: venue?.trim() || null })
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

export async function updateTournamentAction(id: string, name: string, date: string, venue?: string) {
  try {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
      .from("tournaments" as any)
      .update({
        name: name.trim(),
        date,
        venue: venue?.trim() || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    revalidatePath("/staff/games");
    revalidatePath("/parent/games");
    return { success: true, data };
  } catch (error: any) {
    console.error("Update Tournament Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteTournamentAction(id: string) {
  try {
    const supabase = await createAdminClient();
    
    const { error } = await supabase
      .from("tournaments" as any)
      .delete()
      .eq("id", id);

    if (error) throw error;
    
    revalidatePath("/staff/games");
    revalidatePath("/parent/games");
    return { success: true };
  } catch (error: any) {
    console.error("Delete Tournament Error:", error);
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
        time_record: timeRecord.trim(),
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

export async function deleteTournamentResultAction(resultId: string) {
  try {
    const supabase = await createAdminClient();
    
    const { error } = await supabase
      .from("tournament_results" as any)
      .delete()
      .eq("id", resultId);

    if (error) throw error;
    
    revalidatePath("/staff/games");
    revalidatePath("/parent/games");
    return { success: true };
  } catch (error: any) {
    console.error("Delete Tournament Result Error:", error);
    return { success: false, error: error.message };
  }
}
