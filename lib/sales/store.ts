import "server-only";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { SalesCustomer, SalesInvoice, SalesProduct } from "./types";

/**
 * Lightweight JSON document store for the Sales Invoice module.
 * Data lives in a PRIVATE Supabase Storage bucket so no schema migration is required.
 */
const BUCKET = "sales-data";

type Collection = "customers" | "products" | "categories" | "invoices";

let bucketReady: Promise<void> | null = null;

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const supabase = await createAdminClient();
      const { data } = await supabase.storage.getBucket(BUCKET);
      if (!data) {
        const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
        if (error && !/already exists/i.test(error.message)) {
          bucketReady = null;
          throw new Error("Could not create sales storage bucket: " + error.message);
        }
      }
    })();
  }
  return bucketReady;
}

async function readCollection<T>(name: Collection): Promise<T[] | null> {
  await ensureBucket();
  const supabase = await createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(`${name}.json`);
  if (error || !data) return null;
  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

async function writeCollection<T>(name: Collection, rows: T[]) {
  await ensureBucket();
  const supabase = await createAdminClient();
  const body = new Blob([JSON.stringify(rows)], { type: "application/json" });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(`${name}.json`, body, { upsert: true, contentType: "application/json", cacheControl: "0" });
  if (error) throw new Error(`Failed to save ${name}: ${error.message}`);
}

export function newId(): string {
  return crypto.randomUUID();
}

// ── Seeding helpers ────────────────────────────────────────────────

async function seedProductsFromClasses(): Promise<SalesProduct[]> {
  const supabase = await createAdminClient();
  const [{ data: classes }, { data: pricing }, { data: locations }] = await Promise.all([
    supabase.from("classes").select("id, name, type, location_id, is_active").eq("is_active", true),
    supabase.from("class_pricing").select("class_id, price, tier"),
    supabase.from("locations").select("id, name"),
  ]);

  const locName = new Map((locations ?? []).map((l: any) => [l.id, l.name as string]));
  const now = new Date().toISOString();

  return (classes ?? []).map((c: any) => {
    const tiers = (pricing ?? []).filter((p: any) => p.class_id === c.id);
    const standard = tiers.find((t: any) => /standard/i.test(t.tier ?? "")) ?? tiers[0];
    const promo = tiers.find((t: any) => t !== standard && Number(t.price) < Number(standard?.price ?? 0));
    const codeMatch = String(c.name).match(/\(([^)]+)\)/);
    const location = locName.get(c.location_id) ?? "";
    return {
      id: newId(),
      description: String(c.name).replace(/\s*\([^)]*\)\s*/g, " ").trim().toUpperCase(),
      code: [codeMatch?.[1]?.trim(), location.toUpperCase()].filter(Boolean).join(" "),
      sellingPrice: Number(standard?.price ?? 0),
      promoPrice: promo ? Number(promo.price) : null,
      costPerUnit: null,
      category: location || "Swimming Class",
      stock: 0,
      barcode: "",
      imagePath: null,
      isPackage: false,
      packageItems: [],
      createdAt: now,
    } satisfies SalesProduct;
  });
}

// ── Public API ─────────────────────────────────────────────────────

export async function getProducts(): Promise<SalesProduct[]> {
  let rows = await readCollection<SalesProduct>("products");
  if (rows === null) {
    rows = await seedProductsFromClasses();
    await writeCollection("products", rows);
  }
  return rows;
}

export async function saveProducts(rows: SalesProduct[]) {
  await writeCollection("products", rows.map(({ imageUrl, ...r }) => r));
}

export async function getCategories(): Promise<string[]> {
  let rows = await readCollection<string>("categories");
  if (rows === null) {
    const products = await getProducts();
    rows = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
    await writeCollection("categories", rows);
  }
  return rows;
}

export async function saveCategories(rows: string[]) {
  await writeCollection("categories", rows);
}

export async function getManualCustomers(): Promise<SalesCustomer[]> {
  return (await readCollection<SalesCustomer>("customers")) ?? [];
}

export async function saveManualCustomers(rows: SalesCustomer[]) {
  await writeCollection("customers", rows);
}

/** Manual customers + all registered parents (as selectable customers). */
export async function getAllCustomers(): Promise<SalesCustomer[]> {
  const supabase = await createAdminClient();
  const [manual, { data: parents }] = await Promise.all([
    getManualCustomers(),
    supabase
      .from("users")
      .select("id, display_name, phone, created_at")
      .eq("role", "parent")
      .eq("is_active", true)
      .order("display_name", { ascending: true }),
  ]);

  const parentCustomers: SalesCustomer[] = (parents ?? []).map((p: any) => ({
    id: `parent:${p.id}`,
    name: p.display_name || "Unnamed Parent",
    phone: p.phone || "",
    email: "",
    billingInfo: [p.display_name, p.phone].filter(Boolean).join("\n"),
    shippingInfo: "",
    source: "parent",
    createdAt: p.created_at,
  }));

  return [...manual.sort((a, b) => a.name.localeCompare(b.name)), ...parentCustomers];
}

export async function getInvoices(): Promise<SalesInvoice[]> {
  const rows = (await readCollection<SalesInvoice>("invoices")) ?? [];
  return rows.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function saveInvoices(rows: SalesInvoice[]) {
  await writeCollection("invoices", rows);
}

export async function nextInvoiceNumber(existing: SalesInvoice[]): Promise<string> {
  const max = existing.reduce((m, inv) => {
    const n = parseInt(String(inv.number).replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `SI-${String(max + 1).padStart(6, "0")}`;
}

export async function uploadProductImage(productId: string, dataUrl: string): Promise<string> {
  await ensureBucket();
  const match = dataUrl.match(/^data:(image\/(png|jpe?g));base64,(.+)$/);
  if (!match) throw new Error("Only PNG or JPG images are supported.");
  const ext = match[2] === "png" ? "png" : "jpg";
  const buffer = Buffer.from(match[3], "base64");
  const path = `products/${productId}.${ext}`;
  const supabase = await createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { upsert: true, contentType: match[1] });
  if (error) throw new Error("Failed to upload image: " + error.message);
  return path;
}

export async function loadSalesFormData() {
  const [customers, products, categories] = await Promise.all([
    getAllCustomers(),
    getProducts().then(withSignedImageUrls),
    getCategories(),
  ]);
  return { customers, products, categories };
}

export async function getCurrentStaffName(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Staff";
  const admin = await createAdminClient();
  const { data } = await admin.from("users").select("display_name").eq("auth_id", user.id).single();
  return data?.display_name || user.email || "Staff";
}

export async function withSignedImageUrls(products: SalesProduct[]): Promise<SalesProduct[]> {
  const paths = products.map((p) => p.imagePath).filter(Boolean) as string[];
  if (paths.length === 0) return products;
  const supabase = await createAdminClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return products.map((p) => ({ ...p, imageUrl: p.imagePath ? map.get(p.imagePath) ?? null : null }));
}
