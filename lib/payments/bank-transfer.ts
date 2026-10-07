import type {
  IPaymentProvider,
  PaymentInfo,
  PaymentInvoiceInput,
  PaymentStatus,
  WebhookResult,
} from "./types";

/**
 * BankTransferProvider (Default Phase 1 Provider)
 *
 * Displays academy bank details and DuitNow QR on the invoice.
 * Payment confirmation is manual — staff marks invoice as paid
 * after verifying the parent's uploaded receipt.
 */
export class BankTransferProvider implements IPaymentProvider {
  readonly name = "bank_transfer";
  readonly supportsAutoConfirmation = false;

  async getPaymentInfo(invoice: PaymentInvoiceInput): Promise<PaymentInfo> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    return {
      methodLabel: "Bank Transfer / DuitNow",
      bankName: process.env.NEXT_PUBLIC_BANK_NAME ?? "Maybank",
      accountName:
        process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? "Kingaqua Academy",
      accountNumber:
        process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? "XXXX-XXXX-XXXX",
      duitnowId: process.env.NEXT_PUBLIC_DUITNOW_ID ?? "",
      // QR data is the DuitNow ID — the parent's banking app generates the QR
      qrData: process.env.NEXT_PUBLIC_DUITNOW_ID ?? "",
      receiptUploadUrl: `${appUrl}/parent/portal/receipts/upload?invoice=${invoice.invoiceId}`,
    };
  }

  /**
   * Bank transfer has no webhook — always returns null.
   */
  async handleWebhook(_payload: unknown): Promise<WebhookResult | null> {
    return null;
  }

  /**
   * Bank transfer cannot be verified automatically.
   * Staff manually confirms payment by checking uploaded receipt.
   */
  async verifyPayment(_invoiceId: string): Promise<PaymentStatus> {
    return "unpaid";
  }
}
