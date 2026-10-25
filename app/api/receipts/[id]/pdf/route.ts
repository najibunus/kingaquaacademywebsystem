import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateReceiptId } from "@/lib/utils/whatsapp";
import { ReceiptPdfDocument } from "@/lib/pdf/ReceiptPdf";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Missing invoice ID." }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const { data: inv, error } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number, type, created_at, payment_date, payment_status, parent_id,
        users:parent_id(id, display_name, phone),
        students(name, class_id, parent_id, classes(name), users:parent_id(id, display_name, phone)),
        invoice_items(description, quantity, unit_price)
      `)
      .eq("id", id)
      .single();

    if (error || !inv) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const student = inv.students as any;
    const directParent = inv.users as { display_name?: string | null; phone?: string | null } | null;
    const studentParent = student?.users as { display_name?: string | null; phone?: string | null } | null;

    const parentName =
      directParent?.display_name ||
      studentParent?.display_name ||
      "Valued Parent";
    const parentPhone =
      directParent?.phone ||
      studentParent?.phone ||
      "";

    const items = (inv.invoice_items as
      | { description?: string; quantity: number; unit_price: number }[]
      | null) || [];

    const amount = items.reduce(
      (sum, item) => sum + (item.quantity || 1) * (item.unit_price || 0),
      0
    );

    const title =
      items?.[0]?.description ??
      (inv.type === "auto_4session"
        ? "4-Session Package"
        : inv.type === "auto_monthly"
        ? "Monthly Fee"
        : "Manual Fee");

    const receiptId = generateReceiptId(inv.invoice_number, inv.id);
    const dateFormatted = new Date(inv.payment_date || inv.created_at).toLocaleDateString(
      "en-MY",
      { day: "2-digit", month: "long", year: "numeric" }
    );

    const doc = React.createElement(ReceiptPdfDocument, {
      receiptId,
      invoiceNumber: inv.invoice_number,
      date: dateFormatted,
      parentName,
      parentPhone,
      studentName: student?.name ?? "Unknown Student",
      className: student?.classes?.name ?? "Swimming Class",
      title,
      amount,
      items: items.map((i) => ({
        description: i.description || title,
        quantity: i.quantity || 1,
        unit_price: i.unit_price || 0,
      })),
    });

    const pdfBuffer = await renderToBuffer(doc);
    const safeReceiptId = receiptId.replace(/[^A-Za-z0-9_-]/g, "_");
    const safeFilename = `Receipt-${safeReceiptId}.pdf`;

    // 1. Upload to Supabase Storage (public receipts bucket) so it has a permanent public HTTPS URL accessible on any phone
    const storagePath = `official_receipts/${safeReceiptId}.pdf`;
    let publicPdfUrl = "";

    try {
      const { error: uploadErr } = await supabase.storage
        .from("receipts")
        .upload(storagePath, pdfBuffer, {
          upsert: true,
          contentType: "application/pdf",
        });

      if (!uploadErr) {
        const { data: pubData } = supabase.storage
          .from("receipts")
          .getPublicUrl(storagePath);
        publicPdfUrl = pubData.publicUrl;
      }
    } catch (storageErr) {
      console.warn("Could not cache PDF in storage:", storageErr);
    }

    const url = new URL(request.url);
    const isJson =
      url.searchParams.get("json") === "1" ||
      request.headers.get("accept")?.includes("application/json");
    const forceDownload = url.searchParams.get("download") === "1";

    const resolvedPublicUrl =
      publicPdfUrl || `${url.origin}/api/receipts/${id}/pdf`;
    const resolvedDownloadUrl = publicPdfUrl
      ? `${publicPdfUrl}?download=${encodeURIComponent(safeFilename)}`
      : `${url.origin}/api/receipts/${id}/pdf?download=1`;

    if (isJson) {
      return NextResponse.json({
        success: true,
        receiptId,
        invoiceNumber: inv.invoice_number,
        date: dateFormatted,
        parentName,
        parentPhone,
        studentName: student?.name ?? "Unknown Student",
        className: student?.classes?.name ?? "Swimming Class",
        title,
        amount,
        publicPdfUrl: resolvedPublicUrl,
        downloadPdfUrl: resolvedDownloadUrl,
        filename: safeFilename,
        pdfBase64: Buffer.from(pdfBuffer).toString("base64"),
      });
    }

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${
          forceDownload ? "attachment" : "inline"
        }; filename="${safeFilename}"`,
        "Cache-Control": "no-store, max-age=0",
        ...(publicPdfUrl ? { "X-Public-Pdf-Url": publicPdfUrl } : {}),
      },
    });
  } catch (err: any) {
    console.error("Failed to generate PDF receipt:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
