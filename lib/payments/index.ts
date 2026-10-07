/**
 * Payment Provider Factory
 *
 * Returns the correct payment provider based on the PAYMENT_PROVIDER
 * environment variable. Default is "bank_transfer".
 *
 * To switch providers, set PAYMENT_PROVIDER in .env.local — no other
 * code changes needed anywhere in the application.
 */
import type { IPaymentProvider } from "./types";
import { BankTransferProvider } from "./bank-transfer";
import { ToyyibPayProvider } from "./toyyibpay.stub";
import { BillplzProvider } from "./billplz.stub";

type ProviderName = "bank_transfer" | "toyyibpay" | "billplz";

const PROVIDERS: Record<ProviderName, () => IPaymentProvider> = {
  bank_transfer: () => new BankTransferProvider(),
  toyyibpay:     () => new ToyyibPayProvider(),
  billplz:       () => new BillplzProvider(),
};

/**
 * Get the active payment provider.
 * Call this in server-side code only (API routes, Server Actions).
 */
export function getPaymentProvider(): IPaymentProvider {
  const name = (process.env.PAYMENT_PROVIDER ?? "bank_transfer") as ProviderName;
  const factory = PROVIDERS[name];

  if (!factory) {
    console.warn(
      `[payments] Unknown PAYMENT_PROVIDER="${name}". Falling back to bank_transfer.`
    );
    return new BankTransferProvider();
  }

  return factory();
}

// Re-export types and providers for convenience
export * from "./types";
export { BankTransferProvider } from "./bank-transfer";
