"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generatePackagesAfterAttendance, ensureInvoicesGenerated } from "./autoInvoiceHelper";

export async function markAttendanceAction(formData: FormData) {
  const studentId = formData.get("student_id") as string;
  const classId = formData.get("class_id") as string;
  const status = formData.get("status") as "present" | "absent" | "medical" | "leave";
  const coachId = formData.get("coach_id") as string;
  const customDate = formData.get("target_date") as string;

  if (!studentId || !classId || !status) {
    return { error: "Missing required fields." };
  }

  const today = customDate || new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const supabase = await createAdminClient();

  // Manually check for existing record since we dropped the unique constraint
  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("student_id", studentId)
    .eq("class_id", classId)
    .eq("date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let error = null;
  if (existing) {
    const res = await supabase
      .from("attendance")
      .update({ status, recorded_by: coachId || null })
      .eq("id", existing.id);
    error = res.error;
  } else {
    const res = await supabase
      .from("attendance")
      .insert({
        student_id: studentId,
        class_id: classId,
        date: today,
        status,
        recorded_by: coachId || null,
      });
    error = res.error;
  }

  if (error) {
    console.error("[markAttendanceAction]", error.message);
    return { error: error.message };
  }

  // If present, increment session_count
  if (status === "present") {
    const { error: rpcError } = await supabase.rpc("increment_session_count" as any, { p_student_id: studentId });
    if (rpcError) {
      // If the RPC doesn't exist, do it manually
      const { data } = await supabase
        .from("students")
        .select("session_count")
        .eq("id", studentId)
        .single();

      if (data) {
        await supabase
          .from("students")
          .update({ session_count: (data.session_count ?? 0) + 1 })
          .eq("id", studentId);
      }
    }
  }

  revalidatePath("/coach/attendance");
  return { success: true };
}

export async function logCoachAttendanceAction(formData: FormData) {
  const classId = formData.get("class_id") as string;
  const coachId = formData.get("coach_id") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;

  if (!classId || !coachId || !date || !time) {
    return { error: "Missing required fields." };
  }

  const supabase = await createAdminClient();

  const notes = `Class Time: ${time}`;

  // Upsert the coach's attendance record
  const { error } = await supabase
    .from("coach_attendance")
    .upsert(
      {
        coach_id: coachId,
        class_id: classId,
        date,
        status: "present",
        notes,
      },
      { onConflict: "coach_id,class_id,date" }
    );

  if (error) {
    console.error("[logCoachAttendanceAction]", error.message);
    return { error: error.message };
  }

  revalidatePath("/coach/portal");
  return { success: true };
}

export async function startClassAction(formData: FormData) {
  const classId = formData.get("class_id") as string;
  const coachId = formData.get("coach_id") as string;
  const customDate = formData.get("target_date") as string; // E.g., 'YYYY-MM-DDTHH:mm'
  const customEndDate = formData.get("target_end_date") as string;
  
  // dateOnly is required for the date column (DATE type)
  const targetDate = customDate ? customDate.split("T")[0] : new Date().toISOString().split("T")[0];
  
  // Parse full timestamp for created_at so the time is preserved accurately
  let fullTimestamp = new Date().toISOString();
  if (customDate) {
    const parsed = new Date(customDate);
    if (!isNaN(parsed.getTime())) {
      fullTimestamp = parsed.toISOString();
    }
  }
  
  let notesStr = "status:ongoing";
  if (customEndDate) {
    notesStr += `|${customEndDate}`;
  }

  if (!classId || !coachId) return { error: "Missing fields" };

  const supabase = await createAdminClient();

  const { error } = await supabase.from("coach_attendance").upsert({
    coach_id: coachId,
    class_id: classId,
    date: targetDate,
    created_at: fullTimestamp,
    status: "present",
    notes: notesStr
  }, { onConflict: "coach_id,class_id,date" });

  if (error) return { error: error.message };

  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  return { success: true };
}

export async function endClassAction(formData: FormData) {
  const classId = formData.get("class_id") as string;
  const coachId = formData.get("coach_id") as string;

  if (!classId || !coachId) return { error: "Missing fields" };

  const supabase = await createAdminClient();

  // First fetch to check if there is a manual end time in notes
  const { data: existing } = await supabase.from("coach_attendance")
    .select("notes")
    .eq("coach_id", coachId).eq("class_id", classId).ilike("notes", "%status:ongoing%")
    .single();

  let finalNotes = "status:ended";
  if (existing?.notes?.includes("|")) {
    const parts = existing.notes.split("|");
    if (parts.length > 1) {
      finalNotes = `status:ended|${parts[1]}`;
    }
  }

  const { error } = await supabase.from("coach_attendance").update({
    notes: finalNotes
  }).eq("coach_id", coachId).eq("class_id", classId).ilike("notes", "%status:ongoing%");

  if (error) return { error: error.message };

  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  return { success: true };
}

export async function reopenClassSessionAction(formData: FormData) {
  const recordId = formData.get("record_id") as string;
  if (!recordId) return { error: "Missing record ID" };

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("coach_attendance")
    .update({ notes: "status:ongoing" })
    .eq("id", recordId);

  if (error) return { error: error.message };

  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  return { success: true };
}

export async function deleteClassSessionAction(formData: FormData) {
  const recordId = formData.get("record_id") as string;
  if (!recordId) return { error: "Missing record ID" };

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("coach_attendance")
    .delete()
    .eq("id", recordId);

  if (error) return { error: error.message };

  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  return { success: true };
}


export async function logStaffAttendanceAction(studentId: string, classId: string, status: any, dateStr: string, sessionsDeducted: number) {
  const supabase = await createAdminClient();
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  let staffId = null;
  if (user) {
    const { data: userRow } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
    staffId = userRow?.id;
  }
  const { error } = await supabase.from('attendance').insert({ student_id: studentId, class_id: classId, date: dateStr, timestamp: null, status: status, sessions_deducted: sessionsDeducted, recorded_by: staffId } as any);
  if (error) return { error: error.message };

  // After insert, let the package generator handle everything
  if (status === 'present' && sessionsDeducted > 0) {
    await generatePackagesAfterAttendance(studentId);
  }

  revalidatePath('/staff/attendance');
  return { success: true };
}

export async function deleteAttendanceAction(id: string, studentId: string, status: string, sessionsDeducted: number) {
  const supabase = await createAdminClient();
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) return { error: error.message };
  if (status === 'present' && sessionsDeducted > 0) {
    const { data } = await supabase.from('students').select('session_count').eq('id', studentId).single();
    if (data && data.session_count >= sessionsDeducted) {
      await supabase.from('students').update({ session_count: data.session_count - sessionsDeducted }).eq('id', studentId);
    }
  }
  revalidatePath('/staff/attendance');
  return { success: true };
}

export async function bulkLogAttendanceAction(
  studentId: string,
  classId: string,
  status: string,
  dates: string[],
  sessionsDeducted: number
) {
  if (!dates.length) return { error: "No dates selected." };
  const supabase = await createAdminClient();
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  let staffId = null;
  if (user) {
    const { data: userRow } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
    staffId = userRow?.id;
  }

  // Single batch insert — one round-trip regardless of how many dates
  const rows = dates.map(dateStr => ({
    student_id: studentId,
    class_id: classId,
    date: dateStr,
    timestamp: null,
    status,
    sessions_deducted: sessionsDeducted,
    recorded_by: staffId,
  }));

  const { error } = await supabase.from('attendance').insert(rows as any);
  if (error) return { error: error.message };

  // After insert, let the invoice helper figure out everything.
  // It counts total presents vs total invoices — fully idempotent.
  if (status === 'present' && sessionsDeducted > 0) {
    const { data: stu } = await supabase.from('students').select('parent_id').eq('id', studentId).single();
    if (stu?.parent_id) {
      await ensureInvoicesGenerated(stu.parent_id);
    }
  }

  revalidatePath('/staff/attendance');
  return { success: true };
}