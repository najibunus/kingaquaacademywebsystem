/**
 * IPaymentProvider — Payment Provider Interface
 *
 * All payment providers (bank transfer, ToyyibPay, Billplz, etc.) must
 * implement this interface. This lets us swap providers by changing a single
 * environment variable: PAYMENT_PROVIDER
 *
 * Current providers:
 *   "bank_transfer" → BankTransferProvider (default, Phase 1)
 *   "toyyibpay"     → ToyyibPayProvider    (future)
 *   "billplz"       → BillplzProvider      (future)
 */
export interface IPaymentProvider {
  /** Unique identifier for this provider */
  readonly name: string;

  /** Whether this provider supports real-time payment confirmation */
  readonly supportsAutoConfirmation: boolean;

  /**
   * Generate payment information to display on the invoice.
   * For bank transfer: returns bank details + DuitNow QR data.
   * For online providers: returns a payment URL.
   */
  getPaymentInfo(invoice: PaymentInvoiceInput): Promise<PaymentInfo>;

  /**
   * Handle a payment webhook callback from the provider.
   * For bank transfer: not applicable (returns null).
   * For online providers: validates signature and returns result.
   */
  handleWebhook(payload: unknown): Promise<WebhookResult | null>;

  /**
   * Verify if an invoice has been paid (polling fallback).
   * For bank transfer: not applicable (manual confirmation by staff).
   */
  verifyPayment(invoiceId: string): Promise<PaymentStatus>;
}

export interface PaymentInvoiceInput {
  invoiceId: string;
  studentName: string;
  amount: number; // in MYR
  description: string;
  dueDate: string; // ISO date string
  parentPhone: string;
}

export interface PaymentInfo {
  /** Human-readable payment method label */
  methodLabel: string;

  /** For bank transfer: bank details to display. For FPX: payment URL. */
  paymentUrl?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  duitnowId?: string;

  /** QR code data string (for DuitNow or online QR) */
  qrData?: string;

  /**
   * URL where parent can upload their payment receipt.
   * Always provided — even for online providers as a fallback.
   */
  receiptUploadUrl: string;
}

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

export interface WebhookResult {
  invoiceId: string;
  status: PaymentStatus;
  transactionId?: string;
  amount?: number;
}
