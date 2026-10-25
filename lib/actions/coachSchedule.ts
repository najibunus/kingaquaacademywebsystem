"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ScheduleNoteData {
  startTime: string;
  endTime: string;
  remarks?: string;
}

function serializeScheduleNotes(data: ScheduleNoteData): string {
  return JSON.stringify({
    startTime: data.startTime || "",
    endTime: data.endTime || "",
    remarks: data.remarks || "",
  });
}

export async function addCoachScheduleEntriesAction(payload: {
  coachId: string;
  classId: string;
  dates: string[];
  startTime: string;
  endTime: string;
  remarks?: string;
}) {
  const { coachId, classId, dates, startTime, endTime, remarks } = payload;

  if (!coachId || !classId || !dates || dates.length === 0) {
    return { error: "Please select a coach, a class, and at least one date." };
  }

  const supabase = await createAdminClient();
  const notesJson = serializeScheduleNotes({ startTime, endTime, remarks });

  const rows = dates.map((dateStr) => ({
    coach_id: coachId,
    class_id: classId,
    date: dateStr,
    status: "present" as const,
    notes: notesJson,
  }));

  const { error } = await supabase
    .from("coach_attendance")
    .upsert(rows as any, { onConflict: "coach_id,class_id,date" });

  if (error) {
    console.error("[addCoachScheduleEntriesAction]", error.message);
    return { error: error.message };
  }

  revalidatePath("/staff/coach-schedule");
  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  return { success: true, count: dates.length };
}

export async function updateCoachScheduleEntryAction(
  id: string,
  payload: {
    coachId: string;
    classId: string;
    date: string;
    startTime: string;
    endTime: string;
    remarks?: string;
  }
) {
  if (!id || !payload.coachId || !payload.classId || !payload.date) {
    return { error: "Missing required fields." };
  }

  const supabase = await createAdminClient();
  const notesJson = serializeScheduleNotes({
    startTime: payload.startTime,
    endTime: payload.endTime,
    remarks: payload.remarks,
  });

  const { error } = await (supabase.from("coach_attendance") as any)
    .update({
      coach_id: payload.coachId,
      class_id: payload.classId,
      date: payload.date,
      notes: notesJson,
    })
    .eq("id", id);

  if (error) {
    console.error("[updateCoachScheduleEntryAction]", error.message);
    return { error: error.message };
  }

  revalidatePath("/staff/coach-schedule");
  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  return { success: true };
}

export async function deleteCoachScheduleEntryAction(id: string) {
  if (!id) {
    return { error: "Missing schedule ID." };
  }

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("coach_attendance")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteCoachScheduleEntryAction]", error.message);
    return { error: error.message };
  }

  revalidatePath("/staff/coach-schedule");
  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  return { success: true };
}
