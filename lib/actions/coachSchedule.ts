"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ScheduleNoteData {
  startTime: string;
  endTime: string;
  remarks?: string;
}

export interface ScheduleSessionSlot {
  subId: string;
  startTime: string;
  endTime: string;
  remarks: string;
  status: "present" | "absent" | "medical" | "leave";
}

export interface ClassSlotPayload {
  classId: string;
  startTime: string;
  endTime: string;
  remarks?: string;
}

function makeSubId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function parseSingleLegacyNotes(
  notes: string | null,
  createdAt?: string
): { startTime: string; endTime: string; remarks: string } {
  if (!notes) return { startTime: "", endTime: "", remarks: "" };

  if (notes.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(notes);
      return {
        startTime: parsed.startTime || "",
        endTime: parsed.endTime || "",
        remarks: parsed.remarks || "",
      };
    } catch {
      // fall through
    }
  }

  if (notes.startsWith("status:")) {
    let start = "";
    let end = "";
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) {
        start = `${String(d.getHours()).padStart(2, "0")}:${String(
          d.getMinutes()
        ).padStart(2, "0")}`;
      }
    }
    if (notes.includes("|")) {
      const part = notes.split("|")[1];
      const endD = new Date(part);
      if (!isNaN(endD.getTime())) {
        end = `${String(endD.getHours()).padStart(2, "0")}:${String(
          endD.getMinutes()
        ).padStart(2, "0")}`;
      }
    }
    return { startTime: start, endTime: end, remarks: "" };
  }

  if (notes.startsWith("Class Time:")) {
    return {
      startTime: notes.replace("Class Time:", "").trim(),
      endTime: "",
      remarks: "",
    };
  }

  return { startTime: "", endTime: "", remarks: notes };
}

function extractSessionsFromRow(row: {
  id?: string;
  status?: string;
  notes?: string | null;
  created_at?: string;
}): ScheduleSessionSlot[] {
  const defaultStatus = (row.status as any) || "present";
  const rawNotes = row.notes;

  if (rawNotes && rawNotes.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(rawNotes);
      if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
        return parsed.sessions.map((s: any, idx: number) => ({
          subId: s.subId || `s_${idx}`,
          startTime: s.startTime || "",
          endTime: s.endTime || "",
          remarks: s.remarks || "",
          status: s.status || defaultStatus,
        }));
      }
      return [
        {
          subId: parsed.subId || "s_0",
          startTime: parsed.startTime || "",
          endTime: parsed.endTime || "",
          remarks: parsed.remarks || "",
          status: parsed.status || defaultStatus,
        },
      ];
    } catch {
      // fall through
    }
  }

  const single = parseSingleLegacyNotes(rawNotes || null, row.created_at);
  return [
    {
      subId: "s_0",
      startTime: single.startTime,
      endTime: single.endTime,
      remarks: single.remarks,
      status: defaultStatus,
    },
  ];
}

function serializeSessionsToNotes(sessions: ScheduleSessionSlot[]): string {
  const sorted = [...sessions].sort((a, b) =>
    (a.startTime || "").localeCompare(b.startTime || "")
  );
  const first = sorted[0] || {
    subId: "s_0",
    startTime: "",
    endTime: "",
    remarks: "",
    status: "present",
  };

  return JSON.stringify({
    startTime: first.startTime || "",
    endTime: first.endTime || "",
    remarks: first.remarks || "",
    sessions: sorted,
  });
}

function computeRowStatus(
  sessions: ScheduleSessionSlot[]
): "present" | "absent" | "medical" | "leave" {
  if (sessions.some((s) => s.status === "present")) {
    return "present";
  }
  return sessions[0]?.status || "absent";
}

export async function addCoachScheduleEntriesAction(payload: {
  coachId: string;
  dates: string[];
  slots?: ClassSlotPayload[];
  classId?: string;
  startTime?: string;
  endTime?: string;
  remarks?: string;
}) {
  const { coachId, dates } = payload;

  const slots: ClassSlotPayload[] =
    payload.slots && payload.slots.length > 0
      ? payload.slots
      : payload.classId
      ? [
          {
            classId: payload.classId,
            startTime: payload.startTime || "09:00",
            endTime: payload.endTime || "10:00",
            remarks: payload.remarks || "",
          },
        ]
      : [];

  if (!coachId || !dates || dates.length === 0 || slots.length === 0) {
    return {
      error: "Please select a coach, at least one class slot, and at least one date.",
    };
  }

  if (slots.some((s) => !s.classId)) {
    return { error: "Please select a class for every daily slot." };
  }

  const supabase = await createAdminClient();

  // Fetch existing rows for this coach on the selected dates so we append sessions instead of overwriting
  const { data: existingRows, error: fetchErr } = await supabase
    .from("coach_attendance")
    .select("id, coach_id, class_id, date, status, notes, created_at")
    .eq("coach_id", coachId)
    .in("date", dates);

  if (fetchErr) {
    console.error("[addCoachScheduleEntriesAction fetch]", fetchErr.message);
    return { error: fetchErr.message };
  }

  const existingMap = new Map<string, any>();
  for (const row of existingRows || []) {
    existingMap.set(`${row.class_id}__${row.date}`, row);
  }

  // Group new slots by (classId, date)
  const groupedAdditions = new Map<
    string,
    { classId: string; date: string; newSlots: ClassSlotPayload[] }
  >();

  for (const dateStr of dates) {
    for (const slot of slots) {
      const key = `${slot.classId}__${dateStr}`;
      const current = groupedAdditions.get(key);
      if (current) {
        current.newSlots.push(slot);
      } else {
        groupedAdditions.set(key, {
          classId: slot.classId,
          date: dateStr,
          newSlots: [slot],
        });
      }
    }
  }

  const rowsToUpsert: any[] = [];
  let totalAddedSessions = 0;

  for (const [key, group] of groupedAdditions.entries()) {
    const existingRow = existingMap.get(key);
    const currentSessions: ScheduleSessionSlot[] = existingRow
      ? extractSessionsFromRow(existingRow)
      : [];

    for (const slot of group.newSlots) {
      currentSessions.push({
        subId: makeSubId(),
        startTime: slot.startTime || "09:00",
        endTime: slot.endTime || "10:00",
        remarks: (slot.remarks || "").trim(),
        status: "present",
      });
      totalAddedSessions++;
    }

    rowsToUpsert.push({
      coach_id: coachId,
      class_id: group.classId,
      date: group.date,
      status: computeRowStatus(currentSessions),
      notes: serializeSessionsToNotes(currentSessions),
    });
  }

  const { error } = await supabase
    .from("coach_attendance")
    .upsert(rowsToUpsert as any, { onConflict: "coach_id,class_id,date" });

  if (error) {
    console.error("[addCoachScheduleEntriesAction upsert]", error.message);
    return { error: error.message };
  }

  revalidatePath("/staff/coach-schedule");
  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  return { success: true, count: totalAddedSessions };
}

export async function updateCoachScheduleEntryAction(
  compositeId: string,
  payload: {
    coachId: string;
    classId: string;
    date: string;
    startTime: string;
    endTime: string;
    remarks?: string;
    status?: "present" | "absent" | "medical" | "leave";
  }
) {
  if (!compositeId || !payload.coachId || !payload.classId || !payload.date) {
    return { error: "Missing required fields." };
  }

  const [rowId, subId] = compositeId.split("::");
  const supabase = await createAdminClient();

  const { data: sourceRow, error: sourceErr } = await supabase
    .from("coach_attendance")
    .select("id, coach_id, class_id, date, status, notes, created_at")
    .eq("id", rowId)
    .single();

  if (sourceErr || !sourceRow) {
    return { error: sourceErr?.message || "Schedule record not found." };
  }

  const sourceSessions = extractSessionsFromRow(sourceRow);
  const targetIdx = subId
    ? sourceSessions.findIndex((s) => s.subId === subId)
    : 0;
  const sessionIdx = targetIdx >= 0 ? targetIdx : 0;
  const existingSession = sourceSessions[sessionIdx];

  const updatedSession: ScheduleSessionSlot = {
    subId: existingSession?.subId || makeSubId(),
    startTime: payload.startTime || "09:00",
    endTime: payload.endTime || "10:00",
    remarks: (payload.remarks || "").trim(),
    status: payload.status || existingSession?.status || "present",
  };

  const isSameRowTarget =
    sourceRow.coach_id === payload.coachId &&
    sourceRow.class_id === payload.classId &&
    sourceRow.date === payload.date;

  if (isSameRowTarget) {
    sourceSessions[sessionIdx] = updatedSession;
    const { error } = await (supabase.from("coach_attendance") as any)
      .update({
        status: computeRowStatus(sourceSessions),
        notes: serializeSessionsToNotes(sourceSessions),
      })
      .eq("id", rowId);

    if (error) {
      console.error("[updateCoachScheduleEntryAction]", error.message);
      return { error: error.message };
    }
  } else {
    // 1. Remove session from source row (or delete source row if it was the only session)
    const remainingSource = sourceSessions.filter((_, idx) => idx !== sessionIdx);
    if (remainingSource.length === 0) {
      await supabase.from("coach_attendance").delete().eq("id", rowId);
    } else {
      await (supabase.from("coach_attendance") as any)
        .update({
          status: computeRowStatus(remainingSource),
          notes: serializeSessionsToNotes(remainingSource),
        })
        .eq("id", rowId);
    }

    // 2. Check if target (coachId, classId, date) already has a row
    const { data: targetRow } = await supabase
      .from("coach_attendance")
      .select("id, coach_id, class_id, date, status, notes, created_at")
      .eq("coach_id", payload.coachId)
      .eq("class_id", payload.classId)
      .eq("date", payload.date)
      .maybeSingle();

    const targetSessions = targetRow ? extractSessionsFromRow(targetRow) : [];
    targetSessions.push({
      ...updatedSession,
      subId: makeSubId(),
    });

    const { error: upsertErr } = await supabase
      .from("coach_attendance")
      .upsert(
        {
          coach_id: payload.coachId,
          class_id: payload.classId,
          date: payload.date,
          status: computeRowStatus(targetSessions),
          notes: serializeSessionsToNotes(targetSessions),
        } as any,
        { onConflict: "coach_id,class_id,date" }
      );

    if (upsertErr) {
      console.error("[updateCoachScheduleEntryAction move]", upsertErr.message);
      return { error: upsertErr.message };
    }
  }

  revalidatePath("/staff/coach-schedule");
  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  return { success: true };
}

export async function updateCoachAttendanceStatusAction(
  compositeId: string,
  status: "present" | "absent" | "medical" | "leave"
) {
  if (!compositeId || !status) {
    return { error: "Missing schedule ID or status." };
  }

  const [rowId, subId] = compositeId.split("::");
  const supabase = await createAdminClient();

  const { data: row, error: fetchErr } = await supabase
    .from("coach_attendance")
    .select("id, status, notes, created_at")
    .eq("id", rowId)
    .single();

  if (fetchErr || !row) {
    return { error: fetchErr?.message || "Schedule record not found." };
  }

  const sessions = extractSessionsFromRow(row);
  const idx = subId ? sessions.findIndex((s) => s.subId === subId) : 0;
  const targetIdx = idx >= 0 ? idx : 0;

  if (sessions[targetIdx]) {
    sessions[targetIdx].status = status;
  }

  const { error } = await (supabase.from("coach_attendance") as any)
    .update({
      status: computeRowStatus(sessions),
      notes: serializeSessionsToNotes(sessions),
    })
    .eq("id", rowId);

  if (error) {
    console.error("[updateCoachAttendanceStatusAction]", error.message);
    return { error: error.message };
  }

  revalidatePath("/staff/coach-schedule");
  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  return { success: true };
}

export async function deleteCoachScheduleEntryAction(compositeId: string) {
  if (!compositeId) {
    return { error: "Missing schedule ID." };
  }

  const [rowId, subId] = compositeId.split("::");
  const supabase = await createAdminClient();

  const { data: row, error: fetchErr } = await supabase
    .from("coach_attendance")
    .select("id, status, notes, created_at")
    .eq("id", rowId)
    .single();

  if (fetchErr || !row) {
    return { error: fetchErr?.message || "Schedule record not found." };
  }

  const sessions = extractSessionsFromRow(row);

  if (!subId || sessions.length <= 1) {
    const { error } = await supabase
      .from("coach_attendance")
      .delete()
      .eq("id", rowId);

    if (error) {
      console.error("[deleteCoachScheduleEntryAction]", error.message);
      return { error: error.message };
    }
  } else {
    const remaining = sessions.filter((s) => s.subId !== subId);
    if (remaining.length === 0) {
      const { error } = await supabase
        .from("coach_attendance")
        .delete()
        .eq("id", rowId);
      if (error) return { error: error.message };
    } else {
      const { error } = await (supabase.from("coach_attendance") as any)
        .update({
          status: computeRowStatus(remaining),
          notes: serializeSessionsToNotes(remaining),
        })
        .eq("id", rowId);
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/staff/coach-schedule");
  revalidatePath("/coach/portal");
  revalidatePath("/coach/students");
  return { success: true };
}

export async function updateCoachRatePerClassAction(
  coachUserId: string,
  ratePerClass: number
) {
  if (!coachUserId || isNaN(ratePerClass) || ratePerClass < 0) {
    return { error: "Invalid coach or rate amount." };
  }

  const supabase = await createAdminClient();

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("id, auth_id")
    .eq("id", coachUserId)
    .single();

  if (userErr || !userRow?.auth_id) {
    return { error: userErr?.message || "Coach user record not found." };
  }

  const { data: authUserData, error: getAuthErr } =
    await supabase.auth.admin.getUserById(userRow.auth_id);

  if (getAuthErr || !authUserData?.user) {
    return { error: getAuthErr?.message || "Coach auth user not found." };
  }

  const existingMeta = authUserData.user.user_metadata || {};
  const { error: updateErr } = await supabase.auth.admin.updateUserById(
    userRow.auth_id,
    {
      user_metadata: {
        ...existingMeta,
        rate_per_class: Number(ratePerClass),
      },
    }
  );

  if (updateErr) {
    console.error("[updateCoachRatePerClassAction]", updateErr.message);
    return { error: updateErr.message };
  }

  revalidatePath("/staff/coach-schedule");
  return { success: true, ratePerClass: Number(ratePerClass) };
}
