"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addSalesPaymentAction,
  deleteSalesInvoiceAction,
  saveSalesInvoiceAction,
} from "@/lib/actions/salesInvoices";
import {
  DEFAULT_TERMS,
  PAYMENT_TERM_OPTIONS,
  SHIP_BY_OPTIONS,
  computeLineAmount,
  computeTotals,
  round2,
  type SalesCustomer,
  type SalesInvoice,
  type SalesInvoiceLine,
  type SalesPayment,
  type SalesProduct,
} from "@/lib/sales/types";
import {
  AddItemModal,
  AddPaymentModal,
  EditInfoModal,
  NewCustomerModal,
  NewProductModal,
  type PickedItem,
} from "./SalesModals";
import styles from "./sales.module.css";

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ln-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
    </svg>
  );
}

export interface SalesInvoiceFormProps {
  initialCustomers: SalesCustomer[];
  initialProducts: SalesProduct[];
  initialCategories: string[];
  staffName: string;
  existingInvoice?: SalesInvoice | null;
  onSaved?: (invoice: SalesInvoice) => void;
  onCancel?: () => void;
  onDeleted?: (invoiceId: string) => void;
}

export default function SalesInvoiceForm({
  initialCustomers,
  initialProducts,
  initialCategories,
  staffName,
  existingInvoice,
  onSaved,
  onCancel,
  onDeleted,
}: SalesInvoiceFormProps) {
  const [customers, setCustomers] = useState<SalesCustomer[]>(initialCustomers);
  const [products, setProducts] = useState<SalesProduct[]>(initialProducts);
  const [categories, setCategories] = useState<string[]>(initialCategories);

  // Header fields
  const [customerId, setCustomerId] = useState(existingInvoice?.customerId ?? "");
  const [customerName, setCustomerName] = useState(existingInvoice?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(existingInvoice?.customerPhone ?? "");
  const [shipBy, setShipBy] = useState(existingInvoice?.shipBy ?? "-");
  const [date, setDate] = useState(
    existingInvoice?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [paymentTerm, setPaymentTerm] = useState(existingInvoice?.paymentTerm ?? "-");
  const [dueDate, setDueDate] = useState(existingInvoice?.dueDate ?? "");
  const [billingInfo, setBillingInfo] = useState(existingInvoice?.billingInfo ?? "");
  const [shippingInfo, setShippingInfo] = useState(existingInvoice?.shippingInfo ?? "");
  const [ref, setRef] = useState(existingInvoice?.ref ?? "");
  const byName = existingInvoice?.by || staffName || "Accountkingaqua";

  // Lines & bottom fields
  const [lines, setLines] = useState<SalesInvoiceLine[]>(existingInvoice?.lines ?? []);
  const [remarks, setRemarks] = useState(existingInvoice?.remarks ?? "");
  const [terms, setTerms] = useState(existingInvoice?.terms ?? DEFAULT_TERMS);
  const [delivery, setDelivery] = useState<string>(
    existingInvoice?.delivery ? existingInvoice.delivery.toFixed(2) : "0.00"
  );
  const [discount, setDiscount] = useState<string>(
    existingInvoice?.discount ? existingInvoice.discount.toFixed(2) : "0.00"
  );
  const [roundingEnabled, setRoundingEnabled] = useState<boolean>(
    existingInvoice?.roundingEnabled ?? false
  );
  const [payments, setPayments] = useState<SalesPayment[]>(existingInvoice?.payments ?? []);

  // Combobox dropdown for customer
  const [comboOpen, setComboOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Modals
  const [showAddItem, setShowAddItem] = useState(false);
  const [newProductModal, setNewProductModal] = useState<{ open: boolean; isPackage: boolean }>({
    open: false,
    isPackage: false,
  });
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [editingInfo, setEditingInfo] = useState<"billing" | "shipping" | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);

  // Status feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const matchingCustomers = useMemo(() => {
    const q = customerName.trim().toLowerCase();
    if (!q) return customers.slice(0, 25);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      )
      .slice(0, 25);
  }, [customers, customerName]);

  const selectCustomer = (c: SalesCustomer) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || "");
    setBillingInfo(c.billingInfo || c.name);
    setShippingInfo(c.shippingInfo || "");
    setComboOpen(false);
  };

  const handlePaymentTermChange = (termLabel: string) => {
    setPaymentTerm(termLabel);
    const found = PAYMENT_TERM_OPTIONS.find((t) => t.label === termLabel);
    if (found && found.days != null && date) {
      const base = new Date(date + "T00:00:00");
      base.setDate(base.getDate() + found.days);
      setDueDate(base.toISOString().slice(0, 10));
    }
  };

  // Line item helpers
  const addTitleLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: uid(),
        kind: "title",
        description: "Section Title",
        unit: 0,
        price: 0,
        discount: 0,
        amount: 0,
      },
    ]);
  };

  const addOpenItemLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: uid(),
        kind: "open",
        description: "",
        unit: 1,
        price: 0,
        discount: 0,
        amount: 0,
      },
    ]);
  };

  const handleAddProducts = (picked: PickedItem[]) => {
    setLines((prev) => {
      const next = [...prev];
      for (const { product, qty, priceType } of picked) {
        const unitPrice =
          priceType === "promo" && product.promoPrice != null
            ? product.promoPrice
            : product.sellingPrice;
        const fullDesc = product.code
          ? `${product.code} - ${product.description}`
          : product.description;
        next.push({
          id: uid(),
          kind: "product",
          productId: product.id,
          code: product.code,
          description: fullDesc,
          unit: qty,
          price: unitPrice,
          discount: 0,
          amount: computeLineAmount(qty, unitPrice, 0),
        });
      }
      return next;
    });
    setShowAddItem(false);
  };

  const updateLine = (id: string, patch: Partial<SalesInvoiceLine>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...patch };
        if (updated.kind !== "title") {
          updated.amount = computeLineAmount(
            Number(updated.unit) || 0,
            Number(updated.price) || 0,
            Number(updated.discount) || 0
          );
        }
        return updated;
      })
    );
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  // Totals calculation
  const totals = useMemo(
    () =>
      computeTotals({
        lines,
        delivery: parseFloat(delivery) || 0,
        discount: parseFloat(discount) || 0,
        roundingEnabled,
        payments,
      }),
    [lines, delivery, discount, roundingEnabled, payments]
  );

  const handleSaveInvoice = () => {
    setError(null);
    setSuccess(null);

    if (!customerName.trim()) {
      setError("Please select or enter a customer name.");
      return;
    }
    if (!date) {
      setError("Please select an invoice date.");
      return;
    }
    const billable = lines.filter((l) => l.kind !== "title");
    if (billable.length === 0) {
      setError("Please add at least one product or open item.");
      return;
    }

    startTransition(async () => {
      const res = await saveSalesInvoiceAction({
        id: existingInvoice?.id,
        customerId: customerId || `manual:${customerName.trim()}`,
        customerName: customerName.trim(),
        customerPhone,
        shipBy,
        date,
        paymentTerm,
        dueDate,
        billingInfo: billingInfo || customerName.trim(),
        shippingInfo,
        ref,
        lines,
        remarks,
        terms,
        delivery: round2(parseFloat(delivery) || 0),
        discount: round2(parseFloat(discount) || 0),
        roundingEnabled,
        payments,
      });

      if (res.error || !res.invoice) {
        setError(res.error || "Failed to save sales invoice.");
        return;
      }

      setSuccess(`Sales Invoice ${res.invoice.number} saved successfully!`);
      onSaved?.(res.invoice);
    });
  };

  const handleAddPayment = (p: Omit<SalesPayment, "id">) => {
    if (existingInvoice?.id) {
      startTransition(async () => {
        const res = await addSalesPaymentAction(existingInvoice.id, p);
        if (res.error || !res.invoice) {
          setError(res.error || "Failed to add payment.");
          return;
        }
        setPayments(res.invoice.payments);
        setShowAddPayment(false);
        setSuccess("Payment recorded.");
        onSaved?.(res.invoice);
      });
    } else {
      setPayments((prev) => [...prev, { ...p, id: uid() }]);
      setShowAddPayment(false);
    }
  };

  const handleDelete = () => {
    if (!existingInvoice?.id) return;
    if (!window.confirm(`Delete sales invoice ${existingInvoice.number}?`)) return;
    startTransition(async () => {
      const res = await deleteSalesInvoiceAction(existingInvoice.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      onDeleted?.(existingInvoice.id);
    });
  };

  return (
    <div className={styles.page}>
      <div className={`${styles.topBar} ${styles.noPrint}`}>
        <div>
          <h2 className={styles.title}>
            {existingInvoice ? `SALES INVOICE ${existingInvoice.number}` : "NEW SALES INVOICE"}
          </h2>
          <p className={styles.subtitle}>
            Create customer, pick date, add products/packages or open items, and manage billing terms.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnOutline}`}
            onClick={onCancel}
          >
            &larr; Back to Invoices
          </button>
        )}
      </div>

      {error && <div className={styles.alertError}>{error}</div>}
      {success && <div className={styles.alertSuccess}>{success}</div>}

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Customer:</h3>

        {/* Row 1: Name, Ship by, Date, Payment Term, Due date */}
        <div className={styles.grid5}>
          {/* Name with searchable combobox + create customer */}
          <div className={`${styles.field} ${styles.combo}`} ref={comboRef}>
            <label className={styles.label}>
              Name: <span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              placeholder="Select or type customer name..."
              value={customerName}
              onFocus={() => setComboOpen(true)}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setBillingInfo((prev) => (prev === customerName || !prev ? e.target.value : prev));
                setComboOpen(true);
              }}
            />
            {comboOpen && (
              <div className={styles.comboList}>
                <button
                  type="button"
                  className={`${styles.comboItem} ${styles.comboNew}`}
                  onClick={() => {
                    setComboOpen(false);
                    setShowNewCustomer(true);
                  }}
                >
                  + Create New Customer &ldquo;{customerName.trim() || "..."}&rdquo;
                </button>
                {matchingCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={styles.comboItem}
                    onClick={() => selectCustomer(c)}
                  >
                    <div>
                      <strong>{c.name}</strong>
                      <span className={styles.badge}>
                        {c.source === "parent" ? "Parent" : "Customer"}
                      </span>
                    </div>
                    {c.phone && <div className={styles.comboMeta}>{c.phone}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ship by */}
          <div className={styles.field}>
            <label className={styles.label}>Ship by:</label>
            <select
              className={styles.select}
              value={shipBy}
              onChange={(e) => setShipBy(e.target.value)}
            >
              {SHIP_BY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className={styles.field}>
            <label className={styles.label}>
              Date: <span className={styles.required}>*</span>
            </label>
            <input
              className={styles.input}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Payment Term */}
          <div className={styles.field}>
            <label className={styles.label}>Payment Term:</label>
            <select
              className={styles.select}
              value={paymentTerm}
              onChange={(e) => handlePaymentTermChange(e.target.value)}
            >
              {PAYMENT_TERM_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div className={styles.field}>
            <label className={styles.label}>Due date:</label>
            <input
              className={styles.input}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Row 2: Billing info, Shipping info, Ref, By */}
        <div className={styles.grid5} style={{ marginTop: 16 }}>
          <div className={styles.field}>
            <label className={styles.label}>
              Billing info:
              <button
                type="button"
                className={styles.iconBtn}
                title="Edit billing info"
                onClick={() => setEditingInfo("billing")}
              >
                <PencilIcon />
              </button>
            </label>
            <div className={styles.infoText}>
              {billingInfo || customerName || "-"}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Shipping info:
              <button
                type="button"
                className={styles.iconBtn}
                title="Edit shipping info"
                onClick={() => setEditingInfo("shipping")}
              >
                <PencilIcon />
              </button>
            </label>
            <div className={styles.infoText}>{shippingInfo || "-"}</div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Ref:</label>
            <input
              className={styles.input}
              value={ref}
              onChange={(e) => setRef(e.target.value)}
            />
          </div>

          <div className={`${styles.field} ${styles.span2}`}>
            <label className={styles.label}>By:</label>
            <div className={styles.infoText}>{byName}</div>
          </div>
        </div>

        {/* Action Links Row (+ Add title / + Add product | Add open item) */}
        <div className={`${styles.linkRow} ${styles.noPrint}`}>
          <button type="button" className={styles.linkBtn} onClick={addTitleLine}>
            + Add title
          </button>
          <div>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => setShowAddItem(true)}
            >
              + Add product
            </button>
            <span className={styles.sep}>|</span>
            <button type="button" className={styles.linkBtn} onClick={addOpenItemLine}>
              Add open item
            </button>
          </div>
        </div>

        {/* Line Items Table */}
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: "52%" }}>Description</th>
                <th className={styles.num} style={{ width: "10%" }}>
                  Unit
                </th>
                <th className={styles.num} style={{ width: "12%" }}>
                  Price
                </th>
                <th className={styles.num} style={{ width: "12%" }}>
                  Discount
                </th>
                <th className={styles.num} style={{ width: "12%" }}>
                  Amount
                </th>
                <th style={{ width: "2%" }} />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    No record found.
                  </td>
                </tr>
              ) : (
                lines.map((line) =>
                  line.kind === "title" ? (
                    <tr key={line.id} className={styles.titleRow}>
                      <td colSpan={5}>
                        <input
                          className={styles.cellInput}
                          style={{ fontWeight: 700 }}
                          value={line.description}
                          placeholder="Section title..."
                          onChange={(e) =>
                            updateLine(line.id, { description: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => removeLine(line.id)}
                          title="Remove row"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={line.id}>
                      <td>
                        <input
                          className={styles.cellInput}
                          value={line.description}
                          placeholder="Item description..."
                          onChange={(e) =>
                            updateLine(line.id, { description: e.target.value })
                          }
                        />
                      </td>
                      <td className={styles.num}>
                        <input
                          className={`${styles.cellInput} ${styles.cellNum}`}
                          type="number"
                          min={0}
                          step="1"
                          value={line.unit}
                          onChange={(e) =>
                            updateLine(line.id, { unit: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className={styles.num}>
                        <input
                          className={`${styles.cellInput} ${styles.cellNum}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.price}
                          onChange={(e) =>
                            updateLine(line.id, { price: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className={styles.num}>
                        <input
                          className={`${styles.cellInput} ${styles.cellNum}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.discount}
                          onChange={(e) =>
                            updateLine(line.id, {
                              discount: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td className={styles.num} style={{ fontWeight: 700 }}>
                        {line.amount.toFixed(2)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => removeLine(line.id)}
                          title="Remove item"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom 3-Column Section: Remarks | Terms & Conditions | Totals Box */}
        <div className={styles.bottomGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Remarks:</label>
            <textarea
              className={styles.textarea}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Terms &amp; Conditions:</label>
            <textarea
              className={styles.textarea}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </div>

          <div>
            <div className={styles.summary}>
              <div className={styles.sumRow}>
                <span className={styles.sumLabel}>Subtotal</span>
                <span>{totals.subtotal.toFixed(2)}</span>
              </div>

              <div className={styles.sumRow}>
                <span className={styles.sumLabel}>Delivery</span>
                <input
                  className={styles.sumInput}
                  type="number"
                  min={0}
                  step="0.01"
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                />
              </div>

              <div className={styles.sumRow}>
                <span className={styles.sumLabel}>Discount</span>
                <input
                  className={styles.sumInput}
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className={styles.sumRow}>
                <span className={styles.sumLabel}>
                  Rounding
                  <button
                    type="button"
                    aria-label="Toggle rounding"
                    className={`${styles.toggle} ${roundingEnabled ? styles.toggleOn : ""}`}
                    onClick={() => setRoundingEnabled((v) => !v)}
                  />
                </span>
                <input
                  className={styles.sumInput}
                  value={totals.rounding.toFixed(2)}
                  disabled
                />
              </div>

              <div className={`${styles.sumRow} ${styles.sumTotal}`} style={{ marginTop: 4 }}>
                <span>Total</span>
                <span>MYR {totals.total.toFixed(2)}</span>
              </div>

              <div className={styles.sumDivider} />

              {payments.map((p) => (
                <div key={p.id} className={styles.paymentRow}>
                  <span>
                    Paid ({p.method} • {p.date})
                  </span>
                  <span>- MYR {p.amount.toFixed(2)}</span>
                </div>
              ))}

              <div className={`${styles.sumRow} ${styles.sumTotal}`}>
                <span>Balance</span>
                <span>MYR {totals.balance.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ textAlign: "right", marginTop: 8 }} className={styles.noPrint}>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => setShowAddPayment(true)}
              >
                + Add payment
              </button>
            </div>
          </div>
        </div>

        {/* Footer Save / Print / Delete Bar */}
        <div className={`${styles.footerBar} ${styles.noPrint}`}>
          {existingInvoice && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDanger}`}
              onClick={handleDelete}
              disabled={isPending}
              style={{ marginRight: "auto" }}
            >
              Delete Invoice
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnOutline}`}
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnOutline}`}
            onClick={() => window.print()}
          >
            Print
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSaveInvoice}
            disabled={isPending}
          >
            {isPending ? "Saving..." : existingInvoice ? "Update Sales Invoice" : "Save Sales Invoice"}
          </button>
        </div>
      </div>

      {/* Add Item Modal (Product / Package tabs) */}
      {showAddItem && (
        <AddItemModal
          products={products}
          categories={categories}
          onClose={() => setShowAddItem(false)}
          onAdd={handleAddProducts}
          onNewProduct={(isPackage) => {
            setShowAddItem(false);
            setNewProductModal({ open: true, isPackage });
          }}
        />
      )}

      {/* New Product / Package Modal */}
      {newProductModal.open && (
        <NewProductModal
          categories={categories}
          products={products}
          isPackage={newProductModal.isPackage}
          onClose={() => {
            setNewProductModal({ open: false, isPackage: false });
            setShowAddItem(true);
          }}
          onCreated={(newProd, updatedCategories) => {
            setProducts((prev) => [...prev, newProd]);
            setCategories(updatedCategories);
            setNewProductModal({ open: false, isPackage: false });
            setShowAddItem(true);
          }}
        />
      )}

      {/* New Customer Modal */}
      {showNewCustomer && (
        <NewCustomerModal
          initialName={customerName}
          onClose={() => setShowNewCustomer(false)}
          onCreated={(c) => {
            setCustomers((prev) => [c, ...prev]);
            selectCustomer(c);
            setShowNewCustomer(false);
          }}
        />
      )}

      {/* Edit Billing / Shipping Info Modal */}
      {editingInfo && (
        <EditInfoModal
          title={editingInfo === "billing" ? "Edit Billing Info" : "Edit Shipping Info"}
          value={editingInfo === "billing" ? billingInfo : shippingInfo}
          onClose={() => setEditingInfo(null)}
          onSave={(v) => {
            if (editingInfo === "billing") setBillingInfo(v);
            else setShippingInfo(v);
            setEditingInfo(null);
          }}
        />
      )}

      {/* Add Payment Modal */}
      {showAddPayment && (
        <AddPaymentModal
          balance={totals.balance}
          onClose={() => setShowAddPayment(false)}
          onSave={handleAddPayment}
          isSaving={isPending}
        />
      )}
    </div>
  );
}
