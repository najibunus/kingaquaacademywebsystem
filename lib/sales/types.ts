// Shared types for the Sales Invoice module (staff/invoices/sales)

export interface SalesCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  billingInfo: string;
  shippingInfo: string;
  source: "manual" | "parent";
  createdAt: string;
}

export interface SalesPackageItem {
  productId: string;
  qty: number;
}

export interface SalesProduct {
  id: string;
  description: string;
  code: string;
  sellingPrice: number;
  promoPrice: number | null;
  costPerUnit: number | null;
  category: string;
  stock: number;
  barcode: string;
  imagePath: string | null;
  imageUrl?: string | null; // signed URL, resolved at read time
  isPackage: boolean;
  packageItems: SalesPackageItem[];
  createdAt: string;
}

export type SalesLineKind = "title" | "product" | "open";

export interface SalesInvoiceLine {
  id: string;
  kind: SalesLineKind;
  productId?: string | null;
  code?: string;
  description: string;
  unit: number;
  price: number;
  discount: number;
  amount: number;
}

export interface SalesPayment {
  id: string;
  date: string;
  method: string;
  reference: string;
  amount: number;
}

export type SalesInvoiceStatus = "unpaid" | "partial" | "paid";

export interface SalesInvoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  shipBy: string;
  date: string;
  paymentTerm: string;
  dueDate: string;
  billingInfo: string;
  shippingInfo: string;
  ref: string;
  by: string;
  lines: SalesInvoiceLine[];
  remarks: string;
  terms: string;
  subtotal: number;
  delivery: number;
  discount: number;
  roundingEnabled: boolean;
  rounding: number;
  total: number;
  payments: SalesPayment[];
  paid: number;
  balance: number;
  status: SalesInvoiceStatus;
  createdAt: string;
  updatedAt: string;
}

export const SHIP_BY_OPTIONS = ["-", "Self Pickup", "Hand Delivery", "Courier", "Pos Laju", "J&T Express", "Grab / Lalamove"];

export const PAYMENT_TERM_OPTIONS: { label: string; days: number | null }[] = [
  { label: "-", days: null },
  { label: "Cash on Delivery (COD)", days: 0 },
  { label: "Due on Receipt", days: 0 },
  { label: "Net 7 Days", days: 7 },
  { label: "Net 14 Days", days: 14 },
  { label: "Net 30 Days", days: 30 },
  { label: "Net 60 Days", days: 60 },
];

export const DEFAULT_TERMS =
  "- Online bank transfer only is accepted as the method of payment.\n- Kencana Aqua Academy (Maybank) 551584068475\n- Please provide proof of payment after the transfer is completed.";

export const PAYMENT_METHODS = ["Online Transfer", "Cash", "DuitNow QR", "Cheque", "Card"];

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Malaysian cash rounding to nearest 5 sen. Returns the adjustment (can be negative). */
export function cashRoundingAdjustment(amount: number): number {
  const rounded = Math.round(amount * 20) / 20;
  return round2(rounded - amount);
}

export function computeLineAmount(unit: number, price: number, discount: number): number {
  return round2(Math.max(0, unit * price - discount));
}

export function computeTotals(input: {
  lines: SalesInvoiceLine[];
  delivery: number;
  discount: number;
  roundingEnabled: boolean;
  payments: SalesPayment[];
}) {
  const subtotal = round2(
    input.lines
      .filter((l) => l.kind !== "title")
      .reduce((s, l) => s + computeLineAmount(l.unit, l.price, l.discount), 0)
  );
  const beforeRounding = round2(subtotal + (input.delivery || 0) - (input.discount || 0));
  const rounding = input.roundingEnabled ? cashRoundingAdjustment(beforeRounding) : 0;
  const total = round2(Math.max(0, beforeRounding + rounding));
  const paid = round2(input.payments.reduce((s, p) => s + (p.amount || 0), 0));
  const balance = round2(total - paid);
  const status: SalesInvoiceStatus = paid <= 0 ? "unpaid" : balance <= 0 ? "paid" : "partial";
  return { subtotal, rounding, total, paid, balance, status };
}
