"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { smartParseCSV } from "@/lib/utils/csvParser";

// ── Fetch Classes for the Dropdown ────────────────────────────────────────────
// Uses the service role client to bypass RLS so the admin dropdown always loads.
export async function getClassesForImport() {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, type")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("[getClassesForImport] Supabase error:", error.message);
      return { error: error.message, classes: [] as { id: string; name: string; type: string }[] };
    }

    console.log(`[getClassesForImport] Fetched ${data?.length ?? 0} classes.`);
    return { classes: data ?? [] };
  } catch (err: any) {
    console.error("[getClassesForImport] Unexpected error:", err);
    return { error: err.message ?? "Unknown error", classes: [] as { id: string; name: string; type: string }[] };
  }
}


// ── Main Import Server Action ─────────────────────────────────────────────────
export async function importStudentsAction(formData: FormData) {
  try {
    const file = formData.get("csvFile") as File;
    const classId = formData.get("classId") as string;

    if (!file) return { error: "No file provided." };
    if (!classId) return { error: "Please select a class before importing." };

    const csvText = await file.text();
    const result = smartParseCSV(csvText);

    if (result.error || !result.students) {
      return { error: result.error ?? "Parsing failed." };
    }

    const supabase = await createAdminClient();

    const rowsToInsert = result.students.map((s) => ({
      name: s.name,
      class_id: classId,
      session_count: s.sessionCount,
      real_ic: null as string | null,
      parent_id: null as string | null,
    }));

    const { data, error } = await supabase
      .from("students")
      .insert(rowsToInsert)
      .select("id");

    if (error) {
      console.error("Supabase insert error:", error);
      return { error: `Database error: ${error.message}` };
    }

    return { success: true, count: data?.length ?? 0 };
  } catch (err: any) {
    console.error("importStudentsAction error:", err);
    return { error: err.message ?? "Unexpected error during import." };
  }
}
