/**
 * Billplz Provider — STUB (Future Implementation)
 *
 * To activate:
 *   1. Set PAYMENT_PROVIDER=billplz in .env.local
 *   2. Set BILLPLZ_API_KEY, BILLPLZ_COLLECTION_ID, BILLPLZ_X_SIGNATURE
 *   3. Implement the methods below (docs: https://www.billplz.com/api)
 *
 * Billplz pricing: RM 29/month + 1% per transaction (FPX)
 */
import type {
  IPaymentProvider,
  PaymentInfo,
  PaymentInvoiceInput,
  PaymentStatus,
  WebhookResult,
} from "./types";

export class BillplzProvider implements IPaymentProvider {
  readonly name = "billplz";
  readonly supportsAutoConfirmation = true;

  async getPaymentInfo(_invoice: PaymentInvoiceInput): Promise<PaymentInfo> {
    // TODO Phase 2+: Call Billplz API to create a bill
    // API: POST https://www.billplz.com/api/v3/bills
    throw new Error(
      "Billplz provider is not yet configured. Set PAYMENT_PROVIDER=bank_transfer or implement this provider."
    );
  }

  async handleWebhook(_payload: unknown): Promise<WebhookResult | null> {
    // TODO Phase 2+: Validate X-Signature and parse Billplz callback
    throw new Error("Billplz webhook handler not yet implemented.");
  }

  async verifyPayment(_invoiceId: string): Promise<PaymentStatus> {
    // TODO Phase 2+: Call Billplz bill status API
    throw new Error("Billplz payment verification not yet implemented.");
  }
}
