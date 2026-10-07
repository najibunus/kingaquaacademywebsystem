import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const email = 'testparent@kingaqua.test';

async function queryClassPricing(supabase, classId, locationId, tier) {
  const { data } = await supabase
    .from("class_pricing")
    .select("price, billing_type")
    .eq("class_id", classId)
    .eq("location_id", locationId)
    .eq("tier", tier)
    .single();
  return data ?? null;
}

async function main() {
  // 1. Get user ID
  const { data: users } = await sb.auth.admin.listUsers();
  const authUser = users?.users?.find(u => u.email === email);
  
  const { data: publicUser } = await sb
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single();

  const parentId = publicUser.id;

  // 2. Find "Demo Student"
  const { data: demoStudent } = await sb
    .from('students')
    .select('id, name')
    .eq('parent_id', parentId)
    .ilike('name', '%Demo Student%')
    .single();

  if (!demoStudent) {
    console.error("❌ Could not find Demo Student");
    process.exit(1);
  }

  // 3. Update Demo Student's tier to 'Staff/Students'
  const targetTier = 'Staff/Students';
  await sb.from('students').update({ pricing_tier: targetTier }).eq('id', demoStudent.id);
  console.log(`✅ Updated Demo Student's tier to: ${targetTier}`);

  // 4. Delete existing invoices for Demo Student
  const { data: deleted } = await sb.from('invoices').delete().eq('student_id', demoStudent.id).select('id');
  console.log(`✅ Deleted ${deleted?.length ?? 0} existing invoices for Demo Student`);

  // 5. Generate fresh invoice for Demo Student
  const { data: students } = await sb
    .from("students")
    .select(`
      id, name, session_count, parent_id, pricing_tier,
      classes(id, name, type, location_id),
      invoices(id, payment_status, created_at, type),
      attendance(status, date, classes(type))
    `)
    .eq("id", demoStudent.id);

  const student = students[0];

  const atts = [...(student.attendance ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const blocks = [];
  let currentBlock = null;
  let standardPkgCounter = 1;
  let globalBlockCounter = 0;

  for (const att of atts) {
    const isAdv = att.classes?.type === "ADV01";
    const actualIsAdv = isAdv !== undefined ? isAdv : student.classes?.type === "ADV01";

    if (actualIsAdv) {
      const dateObj = new Date(att.date);
      const monthKey = dateObj.toLocaleDateString("en-MY", { month: "long", year: "numeric" });
      if (!currentBlock || currentBlock.type !== "ADV01" || currentBlock.monthKey !== monthKey) {
        if (currentBlock) blocks.push(currentBlock);
        globalBlockCounter++;
        currentBlock = { type: "ADV01", id: `adv-${monthKey}-${globalBlockCounter}`, monthKey, records: [], presentCount: 0 };
      }
      currentBlock.records.push(att);
      if (att.status === "present") currentBlock.presentCount++;
    } else {
      if (!currentBlock || currentBlock.type !== "standard") {
        if (currentBlock) blocks.push(currentBlock);
        globalBlockCounter++;
        currentBlock = { type: "standard", id: `std-${standardPkgCounter}`, pkgIndex: standardPkgCounter, records: [], presentCount: 0 };
        standardPkgCounter++;
      }
      currentBlock.records.push(att);
      if (att.status === "present") {
        currentBlock.presentCount++;
        if (currentBlock.presentCount === 4) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
      }
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  const autoInvoices = [...(student.invoices ?? [])]
    .filter((inv) => inv.type === "auto_4session" || inv.type === "auto_monthly")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  for (let idx = 0; idx < blocks.length; idx++) {
    if (autoInvoices[idx]) blocks[idx].invoice = autoInvoices[idx];
  }

  for (const block of blocks) {
    if (block.invoice) continue;

    const isStandard = block.type === "standard";
    const isComplete = isStandard ? block.presentCount === 4 : false;
    const isAdvComplete = !isStandard && block.presentCount >= 6;

    if (!((isStandard && isComplete) || isAdvComplete)) continue;

    let fee = 150;
    let description = "4-Session Package Fee";
    const classId = student.classes?.id;
    const locationId = student.classes?.location_id;
    const isPrivate = student.classes?.name?.toUpperCase().includes("PRIVATE") ?? false;

    if (isStandard && isPrivate && classId) {
      // (Skipping private logic for Demo Student, they are in Beginner)
    } else if (isStandard && classId && locationId) {
      const tier = student.pricing_tier ?? "Standard";
      let pricing = await queryClassPricing(sb, classId, locationId, tier);
      
      if (!pricing) {
        const { data: fallbackPricing } = await sb
          .from("class_pricing")
          .select("price, tier")
          .eq("class_id", classId)
          .eq("location_id", locationId)
          .order("price", { ascending: true })
          .limit(1)
          .single();
          
        if (fallbackPricing) {
          pricing = fallbackPricing;
          description = `4-Session Package Fee (${fallbackPricing.tier})`;
        }
      } else {
        description = `4-Session Package Fee (${tier})`;
      }

      if (pricing) fee = Number(pricing.price);
    } else if (!isStandard) {
      fee = 250;
    }

    const invoiceNumber = `INV-${isStandard ? "STD" : "ADV"}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const { data: inv } = await sb
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        student_id: student.id,
        parent_id: student.parent_id,
        type: isStandard ? "auto_4session" : "auto_monthly",
        status: "pending",
        due_date: dueDate.toISOString(),
        payment_status: "unpaid",
        wa_status: "unsent"
      })
      .select()
      .single();

    if (inv) {
      await sb.from("invoice_items").insert({
        invoice_id: inv.id,
        description,
        quantity: 1,
        unit_price: fee
      });
      
      console.log(`\n==============================================`);
      console.log(`🎉 INVOICE GENERATED FOR: ${student.name}`);
      console.log(`Class: ${student.classes?.name}`);
      console.log(`Tier Applied: ${student.pricing_tier}`);
      console.log(`Price Amount: RM ${fee}`);
      console.log(`Description: ${description}`);
      console.log(`==============================================\n`);
    }
  }
}
main();
