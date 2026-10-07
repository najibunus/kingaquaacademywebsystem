import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";

// Secure this endpoint with a Bearer token
export async function GET(request: Request) {
  try {
    // 1. Authorization check
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.CRON_SECRET;
    
    if (!secret) {
      return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
    }

    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = await createAdminClient();

    // 2. Find all students in 'ADV01' classes
    // This job is designed to run on the 1st of every month
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select(`
        id,
        name,
        parent_id,
        classes!inner(type)
      `)
      .eq("classes.type", "ADV01");

    if (studentsError) {
      throw new Error(`Failed to fetch ADV01 students: ${studentsError.message}`);
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ message: "No ADV01 students require invoicing." });
    }

    console.log(`[Cron: monthly-invoice] Found ${students.length} ADV01 students.`);

    // Determine the previous month's date range
    const now = new Date();
    const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0); // Day 0 is last day of previous month
    
    const prevMonthName = firstDayOfPrevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    // 3. Process each student
    let successCount = 0;
    
    for (const student of students) {
      if (!student.parent_id) continue;

      // Fetch attendances for the PREVIOUS month
      const { data: attendances, error: attErr } = await supabase
        .from("attendance")
        .select("id")
        .eq("student_id", student.id)
        .eq("status", "present")
        .gte("date", firstDayOfPrevMonth.toISOString().split("T")[0])
        .lte("date", lastDayOfPrevMonth.toISOString().split("T")[0]);

      if (attErr) {
        console.error(`Failed to fetch attendance for ${student.name}:`, attErr.message);
        continue;
      }

      const presentCount = attendances ? attendances.length : 0;
      if (presentCount === 0) {
        console.log(`Skipping ${student.name} - 0 sessions in ${prevMonthName}.`);
        continue;
      }

      // Calculate Fee
      let fee = 0;
      if (presentCount === 1) fee = 40;
      else if (presentCount === 2) fee = 80;
      else if (presentCount === 3) fee = 120;
      else if (presentCount === 4) fee = 160;
      else if (presentCount === 5) fee = 200;
      else fee = 250; // Cap at 250

      // Generate invoice
      const invoiceNumber = `INV-ADV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          student_id: student.id,
          parent_id: student.parent_id,
          type: "auto_monthly",
          status: "pending",
          due_date: dueDate.toISOString(),
          payment_status: "unpaid",
          wa_status: "unsent",
        })
        .select()
        .single();

      if (invoiceError) {
        console.error(`Failed to create monthly invoice for ${student.name}:`, invoiceError.message);
        continue;
      }

      // Create Invoice Item
      await supabase
        .from("invoice_items")
        .insert({
          invoice_id: invoice.id,
          description: `Advance Class Monthly Fee - ${prevMonthName} (${presentCount} Sessions)`,
          quantity: 1,
          unit_price: fee
        });

      // 4. Send WhatsApp Notification
      const waResult = await sendWhatsAppTemplate({
        toPhone: "60123456789", // Mock parent phone number
        templateName: "invoice_generated",
        components: [
          { type: "body", parameters: [{ type: "text", text: student.name }] },
          { type: "body", parameters: [{ type: "text", text: invoiceNumber }] }
        ]
      });

      if (waResult.success) {
        await supabase
          .from("invoices")
          .update({ wa_status: "sent", wa_message_id: waResult.messageId })
          .eq("id", invoice.id);
      }

      successCount++;
    }

    return NextResponse.json({
      message: `Successfully processed ${successCount} out of ${students.length} ADV01 students.`
    });

  } catch (err: any) {
    console.error("[Cron Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
