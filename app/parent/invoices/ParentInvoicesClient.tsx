"use client";

import { useState, useTransition } from "react";
import { submitPaymentProofAction } from "@/lib/actions/parentPayment";
import styles from "./invoices.module.css";

type PaymentStatus = "unpaid" | "receipt_submitted" | "confirmed_paid" | "refunded";

interface InvoiceItem {
  quantity: number;
  unit_price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  type: string;
  due_date: string;
  payment_status: PaymentStatus;
  student_name: string;
  title: string;
  items: InvoiceItem[];
}

function statusLabel(s: PaymentStatus) {
  switch (s) {
    case "unpaid":            return { text: "Unpaid",           color: "#dc2626" };
    case "receipt_submitted": return { text: "Pending Review",   color: "#d97706" };
    case "confirmed_paid":    return { text: "Paid",             color: "#16a34a" };
    case "refunded":          return { text: "Refunded",         color: "#6b7280" };
  }
}

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<string>("duitnow");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null);

  const total = invoice.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const badge = statusLabel(invoice.payment_status);
  const submittable = invoice.payment_status === "unpaid";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const fd = new FormData();
    fd.append("invoice_id", invoice.id);
    fd.append("payment_method", method);
    if (file) {
      fd.append("receipt_file", file);
    }
    
    startTransition(async () => {
      const res = await submitPaymentProofAction(fd);
      if (res.success) {
        setOpen(false);
        setResult({ success: true });
      } else {
        setResult({ error: res.error });
      }
    });
  }

  return (
    <div className={`${styles.invoiceCard} ${invoice.payment_status === "confirmed_paid" ? styles.cardPaid : invoice.payment_status === "receipt_submitted" ? styles.cardPending : ""}`}>
      <div className={styles.cardTop}>
        <div className={styles.cardLeft}>
          <div className={styles.studentInitial}>
            {invoice.student_name.charAt(0)}
          </div>
          <div>
            <h3 className={styles.studentNameText}>{invoice.student_name}</h3>
            <p className={styles.invoiceMeta}>
              {invoice.invoice_number} &bull; {invoice.title}
            </p>
            <p className={styles.dueDateText}>Due: {new Date(invoice.due_date).toLocaleDateString("en-MY")}</p>
          </div>
        </div>

        <div className={styles.cardRight}>
          <p className={styles.amountText}>RM {total.toFixed(2)}</p>
          <span className={styles.statusBadge} style={{ backgroundColor: badge.color }}>
            {badge.text}
          </span>
        </div>
      </div>

      {submittable && (
        <div className={styles.cardFooter}>
          {!open ? (
            <button className="btn btn-primary" onClick={() => setOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: 6}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Submit Payment Proof
            </button>
          ) : (
            <form className={styles.uploadForm} onSubmit={handleSubmit}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Payment Method</label>
                <select
                  className={styles.formSelect}
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  required
                >
                  <option value="duitnow">DuitNow / QR</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Upload Receipt (Image / PDF)</label>
                <input
                  className={styles.formInput}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, application/pdf"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  required
                  style={{ padding: "10px" }}
                />
                <p className={styles.formHint}>Please attach the screenshot or PDF of your successful transaction.</p>
              </div>

              {result?.error && (
                <div className={styles.errorMsg}>{result.error}</div>
              )}

              <div className={styles.formActions}>
                <button type="button" className="btn btn-secondary" onClick={() => { setOpen(false); setResult(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending || !file}>
                  {isPending ? "Uploading..." : "Confirm Submission"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {invoice.payment_status === "receipt_submitted" && (
        <div className={styles.pendingNote}>
          Your payment proof has been submitted and is awaiting staff verification.
        </div>
      )}

      {invoice.payment_status === "confirmed_paid" && (
        <div className={styles.paidNote}>
          Payment confirmed. Thank you!
        </div>
      )}
    </div>
  );
}

interface Props {
  unpaid: Invoice[];
  pending: Invoice[];
  history: Invoice[];
  children?: any[];
  allInvoices?: any[];
}

export default function ParentInvoicesClient({ unpaid, pending, history, children = [], allInvoices = [] }: Props) {
  const totalActionable = unpaid.length + pending.length;
  
  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <div className={styles.header} style={{ marginBottom: 0 }}>
        <div>
          <h1 className={styles.title}>Tuition Payments</h1>
          <p className={styles.subtitle}>
            {totalActionable} payment{totalActionable !== 1 ? "s" : ""} {totalActionable !== 1 ? "require" : "requires"} your attention.
          </p>
        </div>
      </div>

      <div className={styles.bankDetails}>
        <h3 className={styles.bankTitle} style={{ borderBottom: "1px solid var(--border-gray)", paddingBottom: "12px", marginBottom: "16px" }}>Payment Instructions</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-start" }}>
          
          <div style={{ flex: "1 1 280px", backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-gray)", textAlign: "center" }}>
            <p style={{ fontWeight: "bold", fontSize: "1.1rem", marginBottom: "12px", color: "var(--ka-black)" }}>DuitNow QR</p>
            <div style={{ width: "200px", height: "200px", backgroundColor: "var(--bg-light)", border: "2px dashed var(--border-gray)", margin: "0 auto 16px auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: "bold", fontSize: "0.8rem" }}>[ COMPANY QR CODE ]</span>
            </div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Scan to pay Kingaqua Academy</p>
          </div>

          <div style={{ flex: "1 1 280px", backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-gray)" }}>
             <p style={{ fontWeight: "bold", fontSize: "1.1rem", marginBottom: "16px", color: "var(--ka-black)" }}>Bank Transfer</p>
             <div style={{ marginBottom: "16px" }}>
               <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Bank Name</p>
               <p style={{ fontWeight: 600, fontSize: "1rem", margin: 0 }}>Maybank</p>
             </div>
             <div style={{ marginBottom: "16px" }}>
               <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Account Name</p>
               <p style={{ fontWeight: 600, fontSize: "1rem", margin: 0 }}>Kingaqua Academy Sdn Bhd</p>
             </div>
             <div style={{ marginBottom: "16px" }}>
               <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Account Number</p>
               <p style={{ fontWeight: 600, fontSize: "1.2rem", letterSpacing: "1px", color: "var(--ka-blue)", margin: 0 }}>5123 4567 8900</p>
             </div>
             <div style={{ padding: "12px", backgroundColor: "var(--bg-tint)", borderRadius: "8px" }}>
               <p style={{ fontSize: "0.85rem", color: "var(--ka-blue)", margin: 0 }}><strong>Note:</strong> Please include your child's name in the transfer reference.</p>
             </div>
          </div>
        </div>
      </div>

      {children && children.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "24px" }}>
          {children.map(child => {
            const sortedAtt = [...(child.attendance || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let blocks = [];
            const isAdvance = child.classes?.type === "ADV01";

            if (isAdvance) {
              const monthsMap = new Map<string, any[]>();
              sortedAtt.forEach(a => {
                const d = new Date(a.date);
                const monthKey = d.getFullYear() + "-" + d.getMonth();
                if (!monthsMap.has(monthKey)) monthsMap.set(monthKey, []);
                monthsMap.get(monthKey).push(a);
              });
              blocks = Array.from(monthsMap.values()).map(records => ({ records, isAdvance: true }));
            } else {
              for (let i = 0; i < sortedAtt.length; i += 4) {
                blocks.push({ records: sortedAtt.slice(i, i + 4), isAdvance: false });
              }
            }
            blocks.reverse();

            return (
              <div key={child.id} className={styles.bankDetails}>
                <h3 className={styles.bankTitle} style={{ borderBottom: "1px solid var(--border-gray)", paddingBottom: "12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--ka-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.2rem", color: "white" }}>
                    {child.name.charAt(0)}
                  </div>
                  {child.name}'s Class Progress
                </h3>
                
                {blocks.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No classes attended yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {blocks.map((block, idx) => {
                      const targetIndex = blocks.length - 1 - idx;
                      const blockInvoices = allInvoices.filter(inv => {
                        if (!inv.invoice_number) return false;
                        const isOwner = inv.student_id === child.id;
                        const siblingInSameClass = children.find(c => c.id === inv.student_id && c.classes?.name === child.classes?.name);
                        if (!isOwner && !siblingInSameClass) return false;
                        const invNum = inv.invoice_number.split('-');
                        const idxPart = parseInt(invNum[invNum.length - 1]);
                        return !isNaN(idxPart) && idxPart === targetIndex + 1;
                      });
                      const exactMatch = blockInvoices.find(inv => inv.student_id === child.id);
                      const associatedInvoice = exactMatch || (blockInvoices.length > 0 ? blockInvoices[0] : null);
                      const isComplete = block.isAdvance ? false : block.records.length === 4;
                      
                      let progressText = "";
                      if (block.isAdvance) {
                        const mName = block.records.length > 0 ? new Date(block.records[0].date).toLocaleDateString("en-MY", { month: "long", year: "numeric" }) : "";
                        progressText = `${mName} (Advance Class - ${block.records.length} Sessions)`;
                      } else {
                        progressText = `Package ${targetIndex + 1} (${block.records.length}/4 Sessions)`;
                      }

                      return (
                        <div key={idx} style={{ border: "1px solid var(--border-gray)", borderRadius: "12px", overflow: "hidden", backgroundColor: "var(--ka-white)" }}>
                          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-gray)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", backgroundColor: isComplete ? "var(--bg-tint)" : "transparent" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: isComplete ? "var(--color-success)" : "var(--ka-blue)" }} />
                              <span style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--ka-black)" }}>{progressText}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
                              {associatedInvoice ? (
                                associatedInvoice.payment_status === "confirmed_paid" ? (
                                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-success)", fontWeight: 600, fontSize: "0.9rem" }}>
                                    Paid {associatedInvoice.payment_date && `on ${new Date(associatedInvoice.payment_date).toLocaleDateString('en-MY')}`}
                                  </span>
                                ) : associatedInvoice.payment_status === "receipt_submitted" ? (
                                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#d97706", fontWeight: 600, fontSize: "0.9rem" }}>
                                    Verification Pending
                                  </span>
                                ) : (
                                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#dc2626", fontWeight: 600, fontSize: "0.9rem" }}>
                                    Unpaid
                                  </span>
                                )
                              ) : (
                                !isComplete && (
                                  <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontStyle: "italic" }}>In Progress</span>
                                )
                              )}
                            </div>
                          </div>
                            <details className={`${styles.accordion} w-full max-w-full box-border`}>
                              <summary className={`${styles.accordionSummary} w-full max-w-full box-border`} style={{ padding: "12px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", outline: "none", userSelect: "none", backgroundColor: "var(--ka-white)" }}>
                                <span style={{ fontWeight: 600, color: "var(--ka-black)" }}>View Attendance History</span>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                  {!block.isAdvance && (
                                    <div style={{ display: "flex", gap: "4px" }}>
                                      {[1,2,3,4].map(pip => (
                                        <div key={pip} style={{ 
                                          width: "8px", height: "8px", borderRadius: "50%", 
                                          backgroundColor: pip <= block.records.length ? "var(--ka-blue)" : "var(--border-gray)" 
                                        }} />
                                      ))}
                                    </div>
                                  )}
                                  <div style={{
                                    width: "32px", height: "32px", 
                                    borderRadius: "50%", 
                                    backgroundColor: "var(--bg-light)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "var(--text-secondary)"
                                  }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                  </div>
                                </div>
                              </summary>
                              
                              <div style={{ padding: "16px 20px", backgroundColor: "var(--bg-light)" }}>
                                {block.records.length === 0 ? (
                                  <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>No records yet.</p>
                                ) : (
                                  <table style={{ width: "100%", borderCollapse: "collapse" }} className="w-full max-w-full box-border">
                                    <tbody>
                                      {block.records.map((r: any, rIdx: number) => (
                                        <tr key={rIdx} style={{ borderBottom: rIdx < block.records.length - 1 ? "1px solid var(--border-gray)" : "none" }}>
                                          <td style={{ padding: "12px 0", fontSize: "0.95rem" }}>
                                            <div>{new Date(r.date).toLocaleDateString("en-MY", { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            {r.classes?.name && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>{r.classes.name}</div>}
                                          </td>
                                          <td style={{ padding: "12px 0", textAlign: "right" }}>
                                            <span className="badge" style={{
                                              backgroundColor: 
                                                r.status === "present" ? "var(--color-success)" : 
                                                r.status === "absent" ? "#dc2626" : 
                                                r.status === "medical" ? "#f59e0b" : "#6b7280",
                                              color: "white",
                                              textTransform: "capitalize"
                                            }}>
                                              {r.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </details>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {unpaid.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Outstanding</h2>
          <div className={styles.list}>
            {unpaid.map(inv => <InvoiceCard key={inv.id} invoice={inv} />)}
          </div>
        </section>
      ) : pending.length === 0 ? (
        <div className={styles.emptyCard}>
          <h2 className={styles.emptyTitle}>All Paid Up!</h2>
          <p className={styles.emptyText}>You have no outstanding payments. Great work!</p>
        </div>
      ) : null}

      {pending.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Pending Verification</h2>
          <div className={styles.list}>
            {pending.map(inv => <InvoiceCard key={inv.id} invoice={inv} />)}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Payment History</h2>
          <div className={styles.list}>
            {history.map(inv => <InvoiceCard key={inv.id} invoice={inv} />)}
          </div>
        </section>
      )}
    </div>
  );
}


