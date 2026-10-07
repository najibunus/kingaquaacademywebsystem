"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";

export async function approvePaymentAction(invoiceId: string) {
  const supabase = await createAdminClient();

  // 1. Get the invoice to find the parent phone
  const { data: invoice, error: fetchErr } = await supabase
    .from("invoices")
    .select("invoice_number, parent_id")
    .eq("id", invoiceId)
    .single();

  if (fetchErr || !invoice) {
    return { error: "Invoice not found or could not be loaded." };
  }

  // 2. Get the parent phone number
  const { data: parent } = await supabase
    .from("users")
    .select("phone")
    .eq("id", invoice.parent_id) // parent_id references users(id)
    .single();

  // 3. Update the invoice to confirmed_paid
  const { error: updateErr } = await supabase
    .from("invoices")
    .update({ payment_status: "confirmed_paid", payment_date: new Date().toISOString() })
    .eq("id", invoiceId);

  if (updateErr) {
    return { error: "Failed to update invoice status." };
  }

  // 4. Trigger WhatsApp Mock Notification
  let waResponse = null;
  if (parent?.phone) {
    waResponse = await sendWhatsAppTemplate({
      toPhone: parent.phone,
      templateName: "payment_approved",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: invoice.invoice_number }
          ]
        }
      ]
    });
  }

  revalidatePath("/staff/invoices");
  revalidatePath("/staff/dashboard");
  
  return { success: true, waMessageId: waResponse?.messageId };
}

export async function createCustomInvoiceAction(
  studentId: string,
  parentId: string,
  description: string,
  amount: number
) {
  const supabase = await createAdminClient();

  // Generate an invoice number
  const invoiceNumber = `INV-MANUAL-${Date.now()}`;
  
  // Due date: 14 days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  // 1. Create the invoice
  const { data: invData, error: invErr } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      parent_id: parentId,
      type: "manual",
      payment_status: "unpaid",
      due_date: dueDate.toISOString(),
      student_id: studentId, // Using the new student_id field or linking via items
    })
    .select("id")
    .single();

  if (invErr || !invData) {
    return { error: invErr?.message || "Failed to create invoice." };
  }

  // 2. Add the custom line item
  const { error: itemErr } = await supabase
    .from("invoice_items")
    .insert({
      invoice_id: invData.id,
      description: description,
      quantity: 1,
      unit_price: amount,
    });

  if (itemErr) {
    // Note: in a real production system we'd use a transaction or rollback
    return { error: "Invoice created, but failed to attach line item." };
  }

  revalidatePath("/staff/invoices");
  revalidatePath("/staff/dashboard");
  return { success: true };
}

export async function deleteInvoiceAction(invoiceId: string, attendanceIds: string[] = [], studentId?: string) {
  const supabase = await createAdminClient();
  
  // Clean up invoice_items first to avoid constraint errors
  await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
  
  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (error) return { error: error.message };

  // Delete associated attendances
  if (attendanceIds.length > 0) {
    await supabase.from("attendance").delete().in("id", attendanceIds);
  }

  // Recalculate session_count and ensure the bucket math is synchronized
  if (studentId) {
    const { generatePackagesAfterAttendance } = await import('./autoInvoiceHelper');
    await generatePackagesAfterAttendance(studentId);
  }

  revalidatePath("/staff/attendance");
  revalidatePath("/staff/invoices");
  return { success: true };
}
