"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  getCategories,
  getInvoices,
  getManualCustomers,
  getProducts,
  newId,
  nextInvoiceNumber,
  saveCategories,
  saveInvoices,
  saveManualCustomers,
  saveProducts,
  uploadProductImage,
  withSignedImageUrls,
} from "@/lib/sales/store";
import {
  computeLineAmount,
  computeTotals,
  round2,
  type SalesCustomer,
  type SalesInvoice,
  type SalesInvoiceLine,
  type SalesPayment,
  type SalesProduct,
} from "@/lib/sales/types";

const STAFF_ROLES = ["staff", "admin", "superadmin"];

async function requireStaff(): Promise<{ displayName: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const admin = await createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, display_name")
    .eq("auth_id", user.id)
    .single();
  if (!profile || !STAFF_ROLES.includes(profile.role as string)) {
    return { error: "Only staff can manage sales invoices." };
  }
  return { displayName: profile.display_name || user.email || "Staff" };
}

function revalidateSales() {
  revalidatePath("/staff/invoices/sales");
  revalidatePath("/staff/invoices/sales/new");
}

// ── Customers ──────────────────────────────────────────────────────

export async function createSalesCustomerAction(input: {
  name: string;
  phone?: string;
  email?: string;
  billingInfo?: string;
  shippingInfo?: string;
}): Promise<{ customer?: SalesCustomer; error?: string }> {
  const auth = await requireStaff();
  if ("error" in auth) return { error: auth.error };

  const name = input.name?.trim();
  if (!name) return { error: "Customer name is required." };

  try {
    const rows = await getManualCustomers();
    if (rows.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return { error: "A customer with this name already exists." };
    }
    const customer: SalesCustomer = {
      id: newId(),
      name,
      phone: input.phone?.trim() || "",
      email: input.email?.trim() || "",
      billingInfo: input.billingInfo?.trim() || name,
      shippingInfo: input.shippingInfo?.trim() || "",
      source: "manual",
      createdAt: new Date().toISOString(),
    };
    await saveManualCustomers([...rows, customer]);
    revalidateSales();
    return { customer };
  } catch (e: any) {
    return { error: e?.message || "Failed to create customer." };
  }
}

// ── Products ───────────────────────────────────────────────────────

export async function createSalesProductAction(input: {
  description: string;
  sellingPrice: number;
  promoPrice?: number | null;
  costPerUnit?: number | null;
  category?: string;
  code?: string;
  openingStock?: number;
  barcode?: string;
  imageDataUrl?: string | null;
  isPackage?: boolean;
  packageItems?: { productId: string; qty: number }[];
}): Promise<{ product?: SalesProduct; categories?: string[]; error?: string }> {
  const auth = await requireStaff();
  if ("error" in auth) return { error: auth.error };

  const description = input.description?.trim();
  if (!description) return { error: "Description is required." };
  if (!Number.isFinite(input.sellingPrice) || input.sellingPrice < 0) {
    return { error: "Please enter a valid selling price." };
  }

  try {
    const products = await getProducts();
    const code = input.code?.trim() || "";
    if (code && products.some((p) => p.code.toLowerCase() === code.toLowerCase())) {
      return { error: `Product code "${code}" is already in use.` };
    }

    const id = newId();
    let imagePath: string | null = null;
    if (input.imageDataUrl) imagePath = await uploadProductImage(id, input.imageDataUrl);

    const category = input.category?.trim() || "";
    const product: SalesProduct = {
      id,
      description: description.toUpperCase(),
      code,
      sellingPrice: round2(input.sellingPrice),
      promoPrice: input.promoPrice != null && Number.isFinite(input.promoPrice) ? round2(input.promoPrice) : null,
      costPerUnit: input.costPerUnit != null && Number.isFinite(input.costPerUnit) ? round2(input.costPerUnit) : null,
      category,
      stock: Math.max(0, Math.floor(input.openingStock || 0)),
      barcode: input.barcode?.trim() || "",
      imagePath,
      isPackage: Boolean(input.isPackage),
      packageItems: (input.packageItems ?? []).filter((i) => i.qty > 0),
      createdAt: new Date().toISOString(),
    };
    await saveProducts([...products, product]);

    let categories = await getCategories();
    if (category && !categories.includes(category)) {
      categories = [...categories, category].sort();
      await saveCategories(categories);
    }

    const [withUrl] = await withSignedImageUrls([product]);
    revalidateSales();
    return { product: withUrl, categories };
  } catch (e: any) {
    return { error: e?.message || "Failed to create product." };
  }
}

// ── Invoices ───────────────────────────────────────────────────────

export interface SaveSalesInvoiceInput {
  id?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  shipBy: string;
  date: string;
  paymentTerm: string;
  dueDate: string;
  billingInfo: string;
  shippingInfo: string;
  ref: string;
  lines: SalesInvoiceLine[];
  remarks: string;
  terms: string;
  delivery: number;
  discount: number;
  roundingEnabled: boolean;
  payments: SalesPayment[];
}

export async function saveSalesInvoiceAction(
  input: SaveSalesInvoiceInput
): Promise<{ invoice?: SalesInvoice; error?: string }> {
  const auth = await requireStaff();
  if ("error" in auth) return { error: auth.error };

  if (!input.customerName?.trim()) return { error: "Customer name is required." };
  if (!input.date) return { error: "Invoice date is required." };
  const billable = input.lines.filter((l) => l.kind !== "title");
  if (billable.length === 0) return { error: "Please add at least one product or open item." };
  if (billable.some((l) => !l.description?.trim())) return { error: "Every item needs a description." };

  try {
    const [invoices, products] = await Promise.all([getInvoices(), getProducts()]);
    const existing = input.id ? invoices.find((i) => i.id === input.id) : undefined;
    if (input.id && !existing) return { error: "Invoice not found." };

    const lines: SalesInvoiceLine[] = input.lines.map((l) => {
      const unit = l.kind === "title" ? 0 : Math.max(0, Number(l.unit) || 0);
      const price = l.kind === "title" ? 0 : round2(Number(l.price) || 0);
      const discount = l.kind === "title" ? 0 : round2(Math.max(0, Number(l.discount) || 0));
      return {
        id: l.id || newId(),
        kind: l.kind,
        productId: l.productId ?? null,
        code: l.code ?? "",
        description: l.description.trim(),
        unit,
        price,
        discount,
        amount: l.kind === "title" ? 0 : computeLineAmount(unit, price, discount),
      };
    });

    const payments = (input.payments ?? [])
      .filter((p) => Number(p.amount) > 0)
      .map((p) => ({ ...p, id: p.id || newId(), amount: round2(Number(p.amount)) }));

    const totals = computeTotals({
      lines,
      delivery: round2(Number(input.delivery) || 0),
      discount: round2(Number(input.discount) || 0),
      roundingEnabled: input.roundingEnabled,
      payments,
    });

    const now = new Date().toISOString();
    const invoice: SalesInvoice = {
      id: existing?.id ?? newId(),
      number: existing?.number ?? (await nextInvoiceNumber(invoices)),
      customerId: input.customerId,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone?.trim() || "",
      shipBy: input.shipBy || "-",
      date: input.date,
      paymentTerm: input.paymentTerm || "-",
      dueDate: input.dueDate || "",
      billingInfo: input.billingInfo || "",
      shippingInfo: input.shippingInfo || "",
      ref: input.ref || "",
      by: existing?.by ?? auth.displayName,
      lines,
      remarks: input.remarks || "",
      terms: input.terms || "",
      delivery: round2(Number(input.delivery) || 0),
      discount: round2(Number(input.discount) || 0),
      roundingEnabled: input.roundingEnabled,
      ...totals,
      payments,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    // Stock movement: restore previous quantities (on edit), then deduct new quantities.
    const delta = new Map<string, number>();
    const apply = (ls: SalesInvoiceLine[], sign: number) => {
      for (const l of ls) {
        if (l.kind !== "product" || !l.productId) continue;
        const p = products.find((x) => x.id === l.productId);
        if (!p) continue;
        if (p.isPackage) {
          for (const pi of p.packageItems) {
            delta.set(pi.productId, (delta.get(pi.productId) ?? 0) + sign * pi.qty * l.unit);
          }
        } else {
          delta.set(p.id, (delta.get(p.id) ?? 0) + sign * l.unit);
        }
      }
    };
    if (existing) apply(existing.lines, +1);
    apply(lines, -1);
    if (delta.size > 0) {
      const updated = products.map((p) =>
        delta.has(p.id) ? { ...p, stock: Math.max(0, p.stock + (delta.get(p.id) ?? 0)) } : p
      );
      await saveProducts(updated);
    }

    const nextRows = existing
      ? invoices.map((i) => (i.id === invoice.id ? invoice : i))
      : [invoice, ...invoices];
    await saveInvoices(nextRows);

    revalidateSales();
    revalidatePath(`/staff/invoices/sales/${invoice.id}`);
    return { invoice };
  } catch (e: any) {
    return { error: e?.message || "Failed to save invoice." };
  }
}

export async function addSalesPaymentAction(
  invoiceId: string,
  payment: Omit<SalesPayment, "id">
): Promise<{ invoice?: SalesInvoice; error?: string }> {
  const auth = await requireStaff();
  if ("error" in auth) return { error: auth.error };
  if (!(Number(payment.amount) > 0)) return { error: "Payment amount must be greater than 0." };

  try {
    const invoices = await getInvoices();
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return { error: "Invoice not found." };
    const payments = [...inv.payments, { ...payment, id: newId(), amount: round2(Number(payment.amount)) }];
    const totals = computeTotals({ ...inv, payments });
    const updated: SalesInvoice = { ...inv, payments, ...totals, updatedAt: new Date().toISOString() };
    await saveInvoices(invoices.map((i) => (i.id === invoiceId ? updated : i)));
    revalidateSales();
    revalidatePath(`/staff/invoices/sales/${invoiceId}`);
    return { invoice: updated };
  } catch (e: any) {
    return { error: e?.message || "Failed to record payment." };
  }
}

export async function deleteSalesInvoiceAction(invoiceId: string): Promise<{ success?: boolean; error?: string }> {
  const auth = await requireStaff();
  if ("error" in auth) return { error: auth.error };
  try {
    const [invoices, products] = await Promise.all([getInvoices(), getProducts()]);
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return { error: "Invoice not found." };

    // Restore stock
    const delta = new Map<string, number>();
    for (const l of inv.lines) {
      if (l.kind !== "product" || !l.productId) continue;
      const p = products.find((x) => x.id === l.productId);
      if (!p) continue;
      if (p.isPackage) p.packageItems.forEach((pi) => delta.set(pi.productId, (delta.get(pi.productId) ?? 0) + pi.qty * l.unit));
      else delta.set(p.id, (delta.get(p.id) ?? 0) + l.unit);
    }
    if (delta.size > 0) {
      await saveProducts(products.map((p) => (delta.has(p.id) ? { ...p, stock: p.stock + (delta.get(p.id) ?? 0) } : p)));
    }

    await saveInvoices(invoices.filter((i) => i.id !== invoiceId));
    revalidateSales();
    return { success: true };
  } catch (e: any) {
    return { error: e?.message || "Failed to delete invoice." };
  }
}

