/**
 * King Aqua Academy — Test Data Seed Script
 * Run with:  node scripts/seed-test-data.mjs
 *
 * What this creates:
 *  1. A test parent Auth user  (testparent@kingaqua.test / TestParent123!)
 *  2. A row in public.users    (role = parent)
 *  3. A test class             (Beginner Dolphins, type = standard)
 *  4. A test student           (Demo Student, linked to the parent)
 *  5. An unpaid invoice + 1 invoice_item (RM 150 / 4-session fee)
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://eenfutjlpwumqhfbtwxn.supabase.co";
const SERVICE_ROLE_KEY = "sb_secret_K1h9Cmp7pRNoYq5EK3LQqg_95fGx6it";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ok(label, data) {
  console.log(`✅  ${label}`, JSON.stringify(data, null, 2));
  return data;
}
function fail(label, error) {
  console.error(`❌  ${label}`, error?.message ?? error);
  process.exit(1);
}

// ─── 1. Create Auth User ───────────────────────────────────────────────────────
console.log("\n🚀  Seeding King Aqua Academy test data...\n");

const EMAIL    = "testparent@kingaqua.test";
const PASSWORD = "TestParent123!";

// Check if user already exists first
const { data: existingList } = await supabase.auth.admin.listUsers();
const existing = existingList?.users?.find(u => u.email === EMAIL);

let authUserId;
if (existing) {
  console.log(`ℹ️   Auth user already exists (${existing.id}), reusing.`);
  authUserId = existing.id;
} else {
  const { data: newUser, error: authErr } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "Test Parent" },
  });
  if (authErr) fail("Creating auth user", authErr);
  authUserId = newUser.user.id;
  ok("Auth user created", { id: authUserId, email: EMAIL });
}

// ─── 2. Upsert public.users row ───────────────────────────────────────────────
const { data: userRow, error: userErr } = await supabase
  .from("users")
  .upsert(
    {
      auth_id: authUserId,
      role: "parent",
      display_name: "Test Parent",
      phone: "+60123456789",
      is_active: true,
    },
    { onConflict: "auth_id" }
  )
  .select("id")
  .single();

if (userErr) fail("Upserting public.users", userErr);
const parentUsersId = userRow.id;
ok("public.users row", { id: parentUsersId, role: "parent" });

// ─── 3. Create class ──────────────────────────────────────────────────────────
const { data: cls, error: clsErr } = await supabase
  .from("classes")
  .insert({
    name: "Beginner Dolphins (Test)",
    type: "standard",
    is_active: true,
  })
  .select("id, name")
  .single();

if (clsErr) fail("Creating class", clsErr);
ok("Class created", cls);

// ─── 4. Create student ────────────────────────────────────────────────────────
const { data: student, error: stuErr } = await supabase
  .from("students")
  .insert({
    name: "Demo Student",
    class_id: cls.id,
    parent_id: parentUsersId,
    session_count: 4,
    status: "active",
  })
  .select("id, name")
  .single();

if (stuErr) fail("Creating student", stuErr);
ok("Student created", student);

// ─── 5. Create invoice ────────────────────────────────────────────────────────
const invoiceNumber = `INV-TEST-${Date.now()}`;

const { data: invoice, error: invErr } = await supabase
  .from("invoices")
  .insert({
    invoice_number: invoiceNumber,
    student_id: student.id,
    parent_id: parentUsersId,
    type: "auto_4session",
    status: "pending",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 7 days from now
    payment_status: "unpaid",
    wa_status: "unsent",
  })
  .select("id, invoice_number")
  .single();

if (invErr) fail("Creating invoice", invErr);
ok("Invoice created", invoice);

// ─── 6. Create invoice line item ──────────────────────────────────────────────
const { data: item, error: itemErr } = await supabase
  .from("invoice_items")
  .insert({
    invoice_id: invoice.id,
    description: "4-Session Swimming Fee — Beginner Dolphins",
    quantity: 4,
    unit_price: 37.5, // RM 37.50 × 4 = RM 150.00
  })
  .select("id")
  .single();

if (itemErr) fail("Creating invoice item", itemErr);
ok("Invoice item created", item);

// ─── Done ─────────────────────────────────────────────────────────────────────
console.log(`
══════════════════════════════════════════════════
✅  SEED COMPLETE — Test Data Summary
══════════════════════════════════════════════════
  Parent Login:
    Email   : ${EMAIL}
    Password: ${PASSWORD}

  Student  : Demo Student  (session_count = 4)
  Class    : Beginner Dolphins (Test)
  Invoice  : ${invoiceNumber}  →  RM 150.00  (UNPAID)

  Log in at:  http://localhost:3000/auth/login
══════════════════════════════════════════════════
`);
