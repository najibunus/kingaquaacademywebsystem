"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitPaymentProofAction(formData: FormData) {
  const invoiceId = formData.get("invoice_id") as string;
  const file = formData.get("receipt_file") as File | null;
  const method = (formData.get("payment_method") as string) || "bank_transfer";

  if (!invoiceId) {
    return { error: "Missing invoice ID." };
  }
  if (!file || file.size === 0) {
    return { error: "Please upload your receipt image or PDF." };
  }

  // Verify the parent owns this invoice (security check)
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const supabase = await createAdminClient();

  // Fetch invoice to confirm it belongs to this parent
  const { data: invoice, error: fetchErr } = await supabase
    .from("invoices")
    .select("id, parent_id, payment_status")
    .eq("id", invoiceId)
    .single();

  if (fetchErr || !invoice) return { error: "Invoice not found." };

  // parent_id in invoices references users(id)
  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!userRow || invoice.parent_id !== userRow.id) {
    return { error: "Access denied: this invoice does not belong to you." };
  }

  if (invoice.payment_status !== "unpaid") {
    return { error: "This invoice has already been submitted for review." };
  }

  // Upload file to Supabase Storage
  const ext = file.name.split('.').pop();
  const fileName = `${invoiceId}-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("receipts")
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (uploadErr) {
    return { error: `Failed to upload receipt: ${uploadErr.message}` };
  }

  const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(fileName);
  const receiptUrl = publicUrlData.publicUrl;

  const { error: updateErr } = await supabase
    .from("invoices")
    .update({
      payment_status: "receipt_submitted",
      payment_method: method as "bank_transfer" | "duitnow" | "fpx" | "other",
      receipt_url: receiptUrl,
    })
    .eq("id", invoiceId);

  if (updateErr) {
    return { error: "Failed to save your payment proof. Please try again." };
  }

  revalidatePath("/parent/invoices");
  return { success: true };
}
