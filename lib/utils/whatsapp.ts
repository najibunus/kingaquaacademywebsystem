/**
 * Formats a phone number for the WhatsApp API (wa.me).
 * Removes spaces, dashes, parentheses, and non-digit characters,
 * and ensures the Malaysian "60" country code is at the front.
 */
export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return "";

  // Strip everything except digits
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  // Handle "0060..." international prefix
  if (digits.startsWith("0060")) {
    digits = digits.slice(2);
  }

  // Handle Malaysian local format starting with "0" (e.g. 0123456789 -> 60123456789)
  if (digits.startsWith("0")) {
    digits = "60" + digits.slice(1);
  } else if (!digits.startsWith("60")) {
    // Handle numbers entered without leading 0 or 60 (e.g. 123456789 -> 60123456789)
    digits = "60" + digits;
  }

  return digits;
}

/**
 * Generates a deterministic Official Receipt ID from an invoice number or UUID.
 */
export function generateReceiptId(invoiceNumber?: string, invoiceId?: string): string {
  if (invoiceNumber) {
    const clean = invoiceNumber
      .replace(/^INV[-_]?/i, "")
      .replace(/[^A-Z0-9-]/gi, "")
      .toUpperCase();
    if (clean) {
      return `RCP-${clean}`;
    }
  }
  if (invoiceId) {
    return `RCP-KA-${invoiceId.slice(0, 8).toUpperCase()}`;
  }
  return `RCP-KA-${Date.now().toString().slice(-6)}`;
}

export interface ReceiptSummaryParams {
  phone?: string | null;
  receiptId: string;
  date: string;
  parentName: string;
  childName: string;
  packageDetails: string;
  className?: string;
  amountPaid: number;
  invoiceNumber?: string;
  pdfUrl?: string;
}

/**
 * Builds the plain text message content for a receipt.
 */
export function buildReceiptMessageText(params: ReceiptSummaryParams): string {
  const pkgLine =
    params.className && params.className !== "Unassigned"
      ? `${params.packageDetails} (${params.className})`
      : params.packageDetails;

  const lines = [
    `*KINGAQUA ACADEMY — OFFICIAL PAYMENT RECEIPT*`,
    `----------------------------------------`,
    `*Receipt ID:* ${params.receiptId}`,
    ...(params.invoiceNumber ? [`*Invoice No:* ${params.invoiceNumber}`] : []),
    `*Date:* ${params.date}`,
    `*Parent Name:* ${params.parentName}`,
    `*Child Name:* ${params.childName}`,
    `*Package Details:* ${pkgLine}`,
    `*Amount Paid:* RM ${params.amountPaid.toFixed(2)}`,
    `*Payment Status:* PAID ✅`,
    `----------------------------------------`,
    ...(params.pdfUrl
      ? [
          `📄 *Download Official PDF Receipt:*`,
          `${params.pdfUrl}`,
          `----------------------------------------`,
        ]
      : []),
    `Thank you for your payment! Your child's swimming class payment at Kingaqua Academy has been confirmed.`,
  ];

  return lines.join("\n");
}

/**
 * Builds a pre-written WhatsApp message and returns the full https://wa.me/... URL.
 */
export function buildWhatsAppReceiptUrl(params: ReceiptSummaryParams): string {
  const formattedPhone = formatPhoneNumber(params.phone);
  const text = buildReceiptMessageText(params);
  const encodedText = encodeURIComponent(text);

  return formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}
