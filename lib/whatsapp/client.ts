// ── Meta WhatsApp Cloud API Client (Mock Mode) ────────────────────────────────

export type TemplateName = "invoice_generated" | "payment_approved";

export interface SendTemplateParams {
  toPhone: string;
  templateName: TemplateName;
  language?: string;
  components?: any[]; // Array of Meta API template components (parameters)
}

/**
 * Sends a WhatsApp template message using the Meta Cloud API.
 * Currently defaults to MOCK MODE per user request.
 */
export async function sendWhatsAppTemplate({
  toPhone,
  templateName,
  language = "en",
  components = [],
}: SendTemplateParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // ── MOCK MODE ─────────────────────────────────────────────────────────────
  // We simulate the API call and log the payload instead of hitting the real API.
  
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: language,
      },
      components,
    },
  };

  console.log("==================================================");
  console.log(`💬 [MOCK WHATSAPP] Sending '${templateName}' to ${toPhone}`);
  console.log(JSON.stringify(payload, null, 2));
  console.log("==================================================");

  // Return a mock message ID representing a successful sent status
  return { success: true, messageId: `mock_wa_id_${Date.now()}` };

  // ── REAL MODE (Commented out for future use) ──────────────────────────────
  /*
  const API_URL = `https://graph.facebook.com/v17.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`;
  const ACCESS_TOKEN = process.env.META_WA_ACCESS_TOKEN;

  if (!ACCESS_TOKEN || !process.env.META_WA_PHONE_NUMBER_ID) {
    return { success: false, error: "Missing WhatsApp API credentials in .env.local" };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[WhatsApp API Error]", data);
      return { success: false, error: data.error?.message || "WhatsApp API Error" };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err: any) {
    console.error("[WhatsApp Client Error]", err);
    return { success: false, error: err.message || "Unknown error" };
  }
  */
}
