"use client";

import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { createSalesCustomerAction, createSalesProductAction } from "@/lib/actions/salesInvoices";
import {
  PAYMENT_METHODS,
  type SalesCustomer,
  type SalesPayment,
  type SalesProduct,
} from "@/lib/sales/types";
import styles from "./sales.module.css";

function Modal({
  title,
  onClose,
  children,
  footer,
  size,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "wide" | "small";
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        className={`${styles.modal} ${size === "wide" ? styles.modalWide : ""} ${size === "small" ? styles.modalSmall : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer && <div className={styles.modalFooter}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════
// ADD ITEM MODAL (Product / Package tabs)
// ═══════════════════════════════════════════════════════════════════

const ITEMS_PER_PAGE = 25;

export interface PickedItem {
  product: SalesProduct;
  qty: number;
  priceType: "normal" | "promo";
}

export function AddItemModal({
  products,
  categories,
  onClose,
  onAdd,
  onNewProduct,
}: {
  products: SalesProduct[];
  categories: string[];
  onClose: () => void;
  onAdd: (items: PickedItem[]) => void;
  onNewProduct: (isPackage: boolean) => void;
}) {
  const [tab, setTab] = useState<"product" | "package">("product");
  const [category, setCategory] = useState("");
  const [priceType, setPriceType] = useState<"normal" | "promo">("normal");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [qty, setQty] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (tab === "package" ? !p.isPackage : p.isPackage) return false;
      if (category && p.category !== category) return false;
      if (priceType === "promo" && p.promoPrice == null) return false;
      if (!q) return true;
      return [p.description, p.code, p.barcode].some((v) => v?.toLowerCase().includes(q));
    });
  }, [products, tab, category, priceType, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const to = Math.min(safePage * ITEMS_PER_PAGE, filtered.length);

  const setQ = (id: string, v: number) => setQty((prev) => ({ ...prev, [id]: Math.max(0, Math.floor(v || 0)) }));
  const selectedCount = Object.values(qty).filter((v) => v > 0).length;

  const handleAdd = () => {
    const picked: PickedItem[] = products
      .filter((p) => (qty[p.id] ?? 0) > 0)
      .map((p) => ({ product: p, qty: qty[p.id], priceType: priceType === "promo" && p.promoPrice != null ? "promo" : "normal" }));
    onAdd(picked);
  };

  return (
    <Modal
      title="Add Item"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose}>
            Back
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAdd} disabled={selectedCount === 0}>
            Add{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
        </>
      }
    >
      <div className={styles.tabs}>
        {(["product", "package"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
          >
            {t === "product" ? "Product" : "Package"}
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <select className={styles.select} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className={styles.select} value={priceType} onChange={(e) => { setPriceType(e.target.value as any); setPage(1); }}>
          <option value="normal">Price Type: Normal</option>
          <option value="promo">Price Type: Promo</option>
        </select>
        <div className={styles.searchWrap}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className={styles.input}
            placeholder="Search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnOutline}`}
          style={{ marginLeft: "auto" }}
          onClick={() => onNewProduct(tab === "package")}
        >
          {tab === "package" ? "New Package" : "New Product"}
        </button>
      </div>

      <div className={styles.listHeader}>
        <span>{from} - {to} of {filtered.length} records</span>
        <span className={styles.pager}>
          <button type="button" className={styles.pagerBtn} disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</button>
          <span style={{ color: "#0ea5e9", fontSize: "0.8rem" }}>{safePage}</span>
          <button type="button" className={styles.pagerBtn} disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>›</button>
        </span>
      </div>

      {pageRows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "28px 0", color: "#64748b", fontSize: "0.85rem" }}>
          No {tab === "package" ? "packages" : "products"} found.
        </div>
      ) : (
        pageRows.map((p) => {
          const price = priceType === "promo" && p.promoPrice != null ? p.promoPrice : p.sellingPrice;
          return (
            <div key={p.id} className={styles.productRow}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                {p.imageUrl && <img src={p.imageUrl} alt="" className={styles.productThumb} />}
                <div style={{ minWidth: 0 }}>
                  <div className={styles.productName}>
                    {p.code && <span className={styles.codeTag}>{p.code} -</span>}
                    {p.description}
                  </div>
                  <div className={styles.productMeta}>
                    {p.isPackage ? (
                      <>Package of {p.packageItems.length} item(s)</>
                    ) : (
                      <>Stock: <span className={p.stock <= 0 ? styles.stockZero : ""}>{p.stock}</span></>
                    )}{" "}
                    | Price: {price.toFixed(2)}
                    {p.promoPrice != null && priceType === "normal" && (
                      <span style={{ color: "#16a34a" }}> (Promo {p.promoPrice.toFixed(2)})</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.stepper}>
                <button type="button" className={styles.stepBtn} onClick={() => setQ(p.id, (qty[p.id] ?? 0) - 1)} aria-label="Decrease">−</button>
                <input
                  className={styles.stepInput}
                  type="number"
                  min={0}
                  value={qty[p.id] ?? 0}
                  onChange={(e) => setQ(p.id, Number(e.target.value))}
                  aria-label={`Quantity for ${p.description}`}
                />
                <button type="button" className={styles.stepBtn} onClick={() => setQ(p.id, (qty[p.id] ?? 0) + 1)} aria-label="Increase">+</button>
              </div>
            </div>
          );
        })
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NEW PRODUCT MODAL
// ═══════════════════════════════════════════════════════════════════

async function fileToResizedDataUrl(file: File, maxDim = 900): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const isPng = file.type === "image/png";
  return canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.85);
}

export function NewProductModal({
  categories,
  products,
  isPackage,
  onClose,
  onCreated,
}: {
  categories: string[];
  products: SalesProduct[];
  isPackage: boolean;
  onClose: () => void;
  onCreated: (product: SalesProduct, categories: string[]) => void;
}) {
  const [description, setDescription] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [promo, setPromo] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [code, setCode] = useState("");
  const [openingStock, setOpeningStock] = useState("0");
  const [barcode, setBarcode] = useState("");
  const [fileName, setFileName] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [packageItems, setPackageItems] = useState<{ productId: string; qty: number }[]>([]);
  const [pkgPick, setPkgPick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const baseProducts = products.filter((p) => !p.isPackage);

  const handleFile = async (file?: File | null) => {
    setError(null);
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Supported file type: PNG, JPG.");
      return;
    }
    try {
      setFileName(file.name);
      setImageDataUrl(await fileToResizedDataUrl(file));
    } catch {
      setError("Could not read the selected image.");
    }
  };

  const handleSave = () => {
    setError(null);
    const price = parseFloat(sellingPrice);
    if (!description.trim()) return setError("Description is required.");
    if (!Number.isFinite(price) || price < 0) return setError("Please enter a valid selling price.");
    if (isPackage && packageItems.length === 0) return setError("Add at least one product to the package.");
    const finalCategory = category === "__new__" ? newCategory.trim() : category;

    startTransition(async () => {
      const res = await createSalesProductAction({
        description,
        sellingPrice: price,
        promoPrice: promo.trim() ? parseFloat(promo) : null,
        costPerUnit: cost.trim() ? parseFloat(cost) : null,
        category: finalCategory,
        code,
        openingStock: parseInt(openingStock || "0", 10),
        barcode,
        imageDataUrl,
        isPackage,
        packageItems,
      });
      if (res.error || !res.product) return setError(res.error || "Failed to save product.");
      onCreated(res.product, res.categories ?? categories);
    });
  };

  return (
    <Modal
      title={isPackage ? "New Package" : "New Product"}
      size="wide"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose} disabled={isPending}>
            Back
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      {error && <div className={styles.alertError}>{error}</div>}
      <div className={styles.productForm}>
        <div className={styles.stack}>
          <div className={styles.field}>
            <label className={styles.label}>Description: <span className={styles.required}>*</span></label>
            <textarea className={styles.textarea} style={{ minHeight: 60 }} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className={styles.row3}>
            <div className={styles.field}>
              <label className={styles.label}>Selling price: <span className={styles.required}>*</span></label>
              <input className={styles.input} type="number" min={0} step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Promo:</label>
              <input className={styles.input} type="number" min={0} step="0.01" value={promo} onChange={(e) => setPromo(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Cost / unit:</label>
              <input className={styles.input} type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Category:</label>
            <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">No Category</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__new__">+ Create new category…</option>
            </select>
            {category === "__new__" && (
              <input className={styles.input} placeholder="New category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} autoFocus />
            )}
          </div>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Product code:</label>
              <input className={styles.input} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Opening stock:</label>
              <input className={styles.input} type="number" min={0} value={openingStock} onChange={(e) => setOpeningStock(e.target.value)} disabled={isPackage} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Barcode:</label>
            <input className={styles.input} value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </div>

          {isPackage && (
            <div className={styles.field}>
              <label className={styles.label}>Package contents: <span className={styles.required}>*</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                <select className={styles.select} value={pkgPick} onChange={(e) => setPkgPick(e.target.value)}>
                  <option value="">Select product…</option>
                  {baseProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.code ? `${p.code} - ` : ""}{p.description}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnOutline}`}
                  disabled={!pkgPick}
                  onClick={() => {
                    setPackageItems((prev) =>
                      prev.some((i) => i.productId === pkgPick)
                        ? prev.map((i) => (i.productId === pkgPick ? { ...i, qty: i.qty + 1 } : i))
                        : [...prev, { productId: pkgPick, qty: 1 }]
                    );
                    setPkgPick("");
                  }}
                >
                  Add
                </button>
              </div>
              {packageItems.map((it) => {
                const p = baseProducts.find((x) => x.id === it.productId);
                return (
                  <div key={it.productId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem", padding: "4px 0" }}>
                    <span>{p?.description ?? "Unknown"}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <input
                        className={styles.input}
                        style={{ width: 64, padding: "4px 8px" }}
                        type="number"
                        min={1}
                        value={it.qty}
                        onChange={(e) =>
                          setPackageItems((prev) => prev.map((i) => (i.productId === it.productId ? { ...i, qty: Math.max(1, parseInt(e.target.value || "1", 10)) } : i)))
                        }
                      />
                      <button type="button" className={styles.removeBtn} onClick={() => setPackageItems((prev) => prev.filter((i) => i.productId !== it.productId))}>×</button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.stack}>
          <div className={styles.field}>
            <label className={styles.label}>Attachment:</label>
            <label className={styles.fileBox}>
              <span className={styles.fileIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" /></svg>
              </span>
              <span className={styles.fileName}>{fileName || "No file chosen"}</span>
              <input type="file" accept="image/png,image/jpeg" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            <span className={styles.hint}>Supported file type: PNG, JPG.</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Preview:</label>
            {imageDataUrl ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                <img src={imageDataUrl} alt="Product preview" className={styles.preview} />
                <button type="button" className={styles.linkBtn} onClick={() => { setImageDataUrl(null); setFileName(""); }}>Remove image</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// NEW CUSTOMER MODAL
// ═══════════════════════════════════════════════════════════════════

export function NewCustomerModal({
  initialName,
  onClose,
  onCreated,
}: {
  initialName: string;
  onClose: () => void;
  onCreated: (c: SalesCustomer) => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billing, setBilling] = useState("");
  const [shipping, setShipping] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    if (!name.trim()) return setError("Customer name is required.");
    startTransition(async () => {
      const res = await createSalesCustomerAction({
        name,
        phone,
        email,
        billingInfo: billing || [name, phone, email].filter(Boolean).join("\n"),
        shippingInfo: shipping,
      });
      if (res.error || !res.customer) return setError(res.error || "Failed to create customer.");
      onCreated(res.customer);
    });
  };

  return (
    <Modal
      title="New Customer"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose} disabled={isPending}>Back</button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
        </>
      }
    >
      {error && <div className={styles.alertError}>{error}</div>}
      <div className={styles.stack}>
        <div className={styles.field}>
          <label className={styles.label}>Name: <span className={styles.required}>*</span></label>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Phone:</label>
            <input className={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="012-345 6789" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email:</label>
            <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Billing address:</label>
            <textarea className={styles.textarea} style={{ minHeight: 80 }} value={billing} onChange={(e) => setBilling(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Shipping address:</label>
            <textarea className={styles.textarea} style={{ minHeight: 80 }} value={shipping} onChange={(e) => setShipping(e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// EDIT INFO MODAL (billing / shipping)
// ═══════════════════════════════════════════════════════════════════

export function EditInfoModal({
  title,
  value,
  onClose,
  onSave,
}: {
  title: string;
  value: string;
  onClose: () => void;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <Modal
      title={title}
      size="small"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose}>Back</button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => onSave(v)}>Save</button>
        </>
      }
    >
      <textarea className={styles.textarea} style={{ minHeight: 140 }} value={v} onChange={(e) => setV(e.target.value)} autoFocus />
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ADD PAYMENT MODAL
// ═══════════════════════════════════════════════════════════════════

export function AddPaymentModal({
  balance,
  onClose,
  onSave,
  isSaving,
}: {
  balance: number;
  onClose: () => void;
  onSave: (p: Omit<SalesPayment, "id">) => void;
  isSaving?: boolean;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(balance > 0 ? balance.toFixed(2) : "");
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const n = parseFloat(amount);
    if (!(n > 0)) return setError("Please enter a valid amount.");
    onSave({ date, method, reference, amount: n });
  };

  return (
    <Modal
      title="Add Payment"
      size="small"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose} disabled={isSaving}>Back</button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={save} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</button>
        </>
      }
    >
      {error && <div className={styles.alertError}>{error}</div>}
      <div className={styles.stack}>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Date: <span className={styles.required}>*</span></label>
            <input className={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Method:</label>
            <select className={styles.select} value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label}>Amount (MYR): <span className={styles.required}>*</span></label>
            <input className={styles.input} type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Reference:</label>
            <input className={styles.input} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn ID / cheque no." />
          </div>
        </div>
      </div>
    </Modal>
  );
}
