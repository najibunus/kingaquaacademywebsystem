/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase/server";

/**
 * ═══════════════════════════════════════════════════════════════
 * BUCKET OVERFLOW ALGORITHM — Package Auto-Generation
 * ═══════════════════════════════════════════════════════════════
 * 
 * Rule: Every 4 present sessions = 1 package (invoice).
 *       The moment a 5th session arrives, a NEW package is created
 *       immediately — the student is never without an active package.
 * 
 * Formula: requiredPackages = ceil(totalPresent / 4)
 *          toCreate = requiredPackages - existingPackages
 *          session_count = totalPresent % 4 (0 means last pkg is full)
 * 
 * This function is IDEMPOTENT — calling it any number of times
 * produces the exact same result. It simply counts attendance
 * records vs invoice records and creates the difference.
 */

const MAX_SESSIONS = 4;

export async function generatePackagesAfterAttendance(studentId: string) {
  const supabase = await createAdminClient();
  const sb = supabase as any;

  // ── Fetch student ──
  const { data: student } = await sb
    .from("students")
    .select("id, name, parent_id, session_count, pricing_tier, class_id, classes(id, name, type, location_id)")
    .eq("id", studentId)
    .single();

  if (!student || !student.classes) return;

  const isAdv = student.classes.type === "ADV01";

  // ── Get pricing ──
  const classId = student.classes.id;
  const locationId = student.classes.location_id;
  const tier = student.pricing_tier ?? "Standard";

  let fee = isAdv ? 250 : 150;
  let tierLabel = "";
  let billingType = "per_student";

  if (classId && locationId) {
    const { data: pricing } = await sb
      .from("class_pricing")
      .select("price, billing_type, tier")
      .eq("class_id", classId)
      .eq("location_id", locationId)
      .eq("tier", tier)
      .single();

    if (pricing) {
      fee = Number(pricing.price);
      tierLabel = pricing.tier;
      billingType = pricing.billing_type;
    } else {
      // Fallback: any pricing for this class+location
      const { data: fallback } = await sb
        .from("class_pricing")
        .select("price, billing_type, tier")
        .eq("class_id", classId)
        .eq("location_id", locationId)
        .order("price", { ascending: true })
        .limit(1)
        .single();
      if (fallback) {
        fee = Number(fallback.price);
        tierLabel = fallback.tier;
        billingType = fallback.billing_type;
      }
    }
  }

  // ── Determine scope (individual vs group) ──
  let targetStudentIds: string[] = [student.id];
  let invoiceStudentId = student.id;

  if (billingType === "per_group") {
    // Find all siblings in same class, same parent — ordered deterministically
    const { data: siblings } = await sb
      .from("students")
      .select("id")
      .eq("parent_id", student.parent_id)
      .eq("class_id", student.class_id)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (siblings && siblings.length > 0) {
      targetStudentIds = siblings.map((s: any) => s.id);
      invoiceStudentId = siblings[0].id; // always the first-created
    }
  }

  // ── Count total present attendance ──
  let totalPresent = 0;

  if (billingType === "per_group") {
    // For groups: deduplicate by date (one session per date across all siblings)
    const allDates = new Set<string>();
    for (const sid of targetStudentIds) {
      const { data: atts } = await sb
        .from("attendance")
        .select("date")
        .eq("student_id", sid)
        .eq("status", "present");
      for (const a of (atts ?? [])) allDates.add(a.date);
    }
    totalPresent = allDates.size;
  } else {
    // For individuals: count this student's present records
    const { data: atts } = await sb
      .from("attendance")
      .select("id")
      .eq("student_id", student.id)
      .eq("status", "present");
    totalPresent = atts?.length ?? 0;
  }

  // ── Count existing auto-invoices ──
  const invoiceType = isAdv ? "auto_monthly" : "auto_4session";
  const { data: existingInvs } = await sb
    .from("invoices")
    .select("id")
    .eq("student_id", invoiceStudentId)
    .eq("type", invoiceType);
  const existingCount = existingInvs?.length ?? 0;

  // ── The Bucket Math ──
  // ceil(5/4) = 2 → student with 5 sessions needs 2 packages
  // floor would give 1, leaving the 5th session without a package
  const sessionsPerPkg = isAdv ? 6 : MAX_SESSIONS;
  const requiredPackages = totalPresent === 0 ? 0 : Math.ceil(totalPresent / sessionsPerPkg);
  const toCreate = requiredPackages - existingCount;

  // ── Create missing packages ──
  if (toCreate > 0) {
    for (let i = 0; i < toCreate; i++) {
      const pkgNumber = existingCount + i + 1;

      let description = `Package ${pkgNumber} Fee`;
      if (isAdv) {
        description = `Package ${pkgNumber} Fee (Advance Class)`;
      } else if (tierLabel) {
        description = `Package ${pkgNumber} Fee (${tierLabel}${billingType === "per_group" ? " - Group" : ""})`;
      }

      const invoiceNumber = `INV-${isAdv ? "ADV" : "STD"}-${Date.now().toString().slice(-6)}-${pkgNumber}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const { data: inv } = await sb
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          student_id: invoiceStudentId,
          parent_id: student.parent_id,
          type: invoiceType,
          status: "pending",
          due_date: dueDate.toISOString(),
          payment_status: "unpaid",
          wa_status: "unsent",
        })
        .select()
        .single();

      if (inv) {
        await sb.from("invoice_items").insert({
          invoice_id: inv.id,
          description,
          quantity: 1,
          unit_price: fee,
        });
      }
    }
  }

  // ── Update session_count for all students in scope ──
  // This shows position within the CURRENT (latest) package bucket
  const currentBucketUsed = totalPresent % sessionsPerPkg;
  for (const sid of targetStudentIds) {
    await sb.from("students").update({ session_count: currentBucketUsed }).eq("id", sid);
  }
}

/**
 * Backward-compatible wrapper.
 * Processes ALL active students under a parent.
 */
export async function ensureInvoicesGenerated(parentId: string) {
  const supabase = await createAdminClient();
  const sb = supabase as any;

  const { data: students } = await sb
    .from("students")
    .select("id")
    .eq("parent_id", parentId)
    .eq("status", "active");

  if (!students) return;

  for (const stu of students) {
    await generatePackagesAfterAttendance(stu.id);
  }
}
