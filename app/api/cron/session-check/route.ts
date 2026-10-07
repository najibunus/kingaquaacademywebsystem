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

    // 2. Find students in 'standard' classes who have 4 or more sessions
    // Uses an inner join on classes to filter by class type
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select(`
        id,
        name,
        parent_id,
        session_count,
        classes!inner(type)
      `)
      .eq("classes.type", "standard")
      .gte("session_count", 4);

    if (studentsError) {
      throw new Error(`Failed to fetch students: ${studentsError.message}`);
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ message: "No standard students require invoicing." });
    }

    console.log(`[Cron: session-check] Found ${students.length} students to invoice.`);

    // 3. Process each student
    let successCount = 0;
    
    for (const student of students) {
      if (!student.parent_id) continue; // Can't bill a student without a parent assigned

      // Generate invoice
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          student_id: student.id,
          parent_id: student.parent_id,
          type: "auto_4session",
          status: "pending",
          due_date: dueDate.toISOString(),
          payment_status: "unpaid",
          wa_status: "unsent",
        })
        .select()
        .single();

      if (invoiceError) {
        console.error(`Failed to create invoice for ${student.name}:`, invoiceError.message);
        continue;
      }

      // Reset session count to 0
      const { error: updateError } = await supabase
        .from("students")
        .update({ session_count: 0 })
        .eq("id", student.id);

      if (updateError) {
        console.error(`Failed to reset session_count for ${student.name}:`, updateError.message);
      }

      // 4. Send WhatsApp Notification
      // Note: In production you would lookup the parent's phone number here
      // For now we use a hardcoded test number since parent_id is just a foreign key
      const waResult = await sendWhatsAppTemplate({
        toPhone: "60123456789", // Mock parent phone number
        templateName: "invoice_generated",
        components: [
          { type: "body", parameters: [{ type: "text", text: student.name }] },
          { type: "body", parameters: [{ type: "text", text: invoiceNumber }] }
        ]
      });

      if (waResult.success) {
        // Update invoice WA status
        await supabase
          .from("invoices")
          .update({ wa_status: "sent", wa_message_id: waResult.messageId })
          .eq("id", invoice.id);
      }

      successCount++;
    }

    return NextResponse.json({
      message: `Successfully processed ${successCount} out of ${students.length} eligible students.`
    });

  } catch (err: any) {
    console.error("[Cron Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
