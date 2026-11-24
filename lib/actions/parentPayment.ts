"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitPaymentProofAction(formData: FormData) {
  const singleId = formData.get("invoice_id") as string | null;
  const rawMulti = formData.get("invoice_ids") as string | null;
  const file = formData.get("receipt_file") as File | null;
  const method = (formData.get("payment_method") as string) || "bank_transfer";

  let invoiceIds: string[] = [];
  if (rawMulti) {
    try {
      const parsed = JSON.parse(rawMulti);
      if (Array.isArray(parsed)) {
        invoiceIds = parsed.filter((id) => typeof id === "string" && id.trim().length > 0);
      }
    } catch {
      return { error: "Invalid invoice selection." };
    }
  } else if (singleId) {
    invoiceIds = [singleId];
  }

  // Deduplicate IDs
  invoiceIds = Array.from(new Set(invoiceIds));

  if (invoiceIds.length === 0) {
    return { error: "Please select at least one invoice to pay." };
  }
  if (!file || file.size === 0) {
    return { error: "Please upload your receipt image or PDF." };
  }

  // Verify the parent owns all selected invoices (security check)
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const supabase = await createAdminClient();

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!userRow) {
    return { error: "Parent user profile not found." };
  }

  // Fetch all selected invoices to verify ownership & unpaid status
  const { data: invoices, error: fetchErr } = await supabase
    .from("invoices")
    .select("id, parent_id, payment_status, invoice_number")
    .in("id", invoiceIds);

  if (fetchErr || !invoices || invoices.length !== invoiceIds.length) {
    return { error: "One or more selected invoices could not be found." };
  }

  for (const inv of invoices) {
    if (inv.parent_id !== userRow.id) {
      return { error: "Access denied: one or more selected invoices do not belong to you." };
    }
    if (inv.payment_status !== "unpaid") {
      return { error: `Invoice ${inv.invoice_number} has already been submitted for review.` };
    }
  }

  // Upload combined receipt file once to Supabase Storage
  const ext = file.name.split(".").pop() || "png";
  const prefix = invoiceIds.length > 1 ? `multi-${userRow.id.slice(0, 8)}` : invoiceIds[0];
  const fileName = `${prefix}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("receipts")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

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
    .in("id", invoiceIds);

  if (updateErr) {
    return { error: "Failed to save your payment proof. Please try again." };
  }

  revalidatePath("/parent/invoices");
  revalidatePath("/staff/invoices");
  revalidatePath("/admin/finances");
  return { success: true, count: invoiceIds.length };
}
