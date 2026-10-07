/**
 * ToyyibPay Provider — STUB (Future Implementation)
 *
 * To activate:
 *   1. Set PAYMENT_PROVIDER=toyyibpay in .env.local
 *   2. Set TOYYIBPAY_USER_SECRET_KEY and TOYYIBPAY_CATEGORY_CODE
 *   3. Implement the methods below (docs: https://toyyibpay.com/apireference/)
 *
 * ToyyibPay pricing: Free setup + 1.1% per transaction (FPX)
 */
import type {
  IPaymentProvider,
  PaymentInfo,
  PaymentInvoiceInput,
  PaymentStatus,
  WebhookResult,
} from "./types";

export class ToyyibPayProvider implements IPaymentProvider {
  readonly name = "toyyibpay";
  readonly supportsAutoConfirmation = true;

  async getPaymentInfo(_invoice: PaymentInvoiceInput): Promise<PaymentInfo> {
    // TODO Phase 2+: Call ToyyibPay API to create a bill and return payment URL
    // API: POST https://toyyibpay.com/index.php/api/createBill
    throw new Error(
      "ToyyibPay provider is not yet configured. Set PAYMENT_PROVIDER=bank_transfer or implement this provider."
    );
  }

  async handleWebhook(_payload: unknown): Promise<WebhookResult | null> {
    // TODO Phase 2+: Validate ToyyibPay callback signature and parse status
    throw new Error("ToyyibPay webhook handler not yet implemented.");
  }

  async verifyPayment(_invoiceId: string): Promise<PaymentStatus> {
    // TODO Phase 2+: Poll ToyyibPay bill status API
    throw new Error("ToyyibPay payment verification not yet implemented.");
  }
}
