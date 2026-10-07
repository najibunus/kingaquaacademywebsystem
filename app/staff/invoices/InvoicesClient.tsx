"use client";

import { useState, useTransition, useMemo } from "react";
import { approvePaymentAction, createCustomInvoiceAction } from "@/lib/actions/invoices";
import styles from "./invoices.module.css";

interface Invoice {
  id: string;
  invoice_number: string;
  type: string;
  created_at: string;
  receipt_url: string | null;
  payment_status: string;
  student_name: string;
  class_id: string | null;
  class_name: string;
  amount: number;
  title: string;
}

interface Student {
  id: string;
  name: string;
  parent_id: string | null;
}

interface ClassOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 15;

function InvoiceTable({ 
  items, 
  listType, 
  isPending, 
  processingId, 
  handleApprove 
}: { 
  items: Invoice[]; 
  listType: "pending" | "unpaid" | "paid"; 
  isPending: boolean; 
  processingId: string | null;
  handleApprove: (id: string) => void;
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (items.length === 0) {
    return (
      <div className={styles.emptyCard}>
        <p className={styles.emptyText}>
          {listType === "pending" ? "No pending receipts to verify. You're all caught up!" 
           : listType === "unpaid" ? "No outstanding unpaid invoices." 
           : "No payment history found."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.denseTableCard}>
        <table className={styles.denseTable}>
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              <th>Student</th>
              <th>Invoice Details</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((inv, idx) => {
              const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
              return (
                <tr key={inv.id}>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{rowNum}</td>
                  <td>
                    <div className={styles.denseStudentName}>{inv.student_name}</div>
                    <div className={styles.denseInvNo} style={{ marginTop: "1px" }}>{inv.class_name}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--ka-black)" }}>{inv.title}</div>
                    <div className={styles.denseInvNo}>{inv.invoice_number}</div>
                  </td>
                  <td style={{ fontWeight: 600, color: "#059669" }}>RM {inv.amount.toFixed(2)}</td>
                  <td>
                    {listType === "pending" ? (
                      <span className="badge badge-warning" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>Receipt Uploaded</span>
                    ) : listType === "unpaid" ? (
                      <span className="badge badge-warning" style={{ fontSize: "0.7rem", padding: "2px 8px", background: "#fef2f2", color: "#991b1b" }}>Unpaid</span>
                    ) : (
                      <span className="badge badge-success" style={{ fontSize: "0.7rem", padding: "2px 8px", background: "#dcfce7", color: "#166534", borderRadius: "999px", display: "inline-block" }}>Paid</span>
                    )}
                  </td>
                  <td>
                    {listType === "pending" ? (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {inv.receipt_url ? (
                          <a href={inv.receipt_url} target="_blank" rel="noreferrer" className={styles.actionReceipt}>
                            View Receipt
                          </a>
                        ) : (
                          <span className={styles.actionReceipt} style={{ opacity: 0.5 }}>No Receipt</span>
                        )}
                        <button
                          className={`${styles.actionBtn} ${styles.actionApprove}`}
                          disabled={isPending && processingId === inv.id}
                          onClick={() => handleApprove(inv.id)}
                        >
                          {isPending && processingId === inv.id ? "Approving..." : "Approve"}
                        </button>
                      </div>
                    ) : listType === "paid" ? (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {inv.receipt_url && (
                          <a href={inv.receipt_url} target="_blank" rel="noreferrer" className={styles.actionReceipt}>
                            View Receipt
                          </a>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic" }}>Awaiting Payment</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button 
            className={styles.pageBtn} 
            onClick={() => setPage(p => Math.max(1, p - 1))} 
            disabled={safePage <= 1}
          >
            ← Previous
          </button>
          <span className={styles.pageInfo}>Page {safePage} of {totalPages}</span>
          <button 
            className={styles.pageBtn} 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
            disabled={safePage >= totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}

export default function InvoicesClient({ 
  invoices, 
  students,
  classes
}: { 
  invoices: Invoice[];
  students: Student[];
  classes: ClassOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchClass = selectedClass === "all" || inv.class_id === selectedClass;
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = inv.student_name.toLowerCase().includes(searchLower) || inv.invoice_number.toLowerCase().includes(searchLower);
      return matchClass && matchSearch;
    });
  }, [invoices, selectedClass, searchQuery]);

  const pendingVerification = filteredInvoices.filter(i => i.payment_status === "receipt_submitted");
  const unpaidInvoices = filteredInvoices.filter(i => i.payment_status === "unpaid");
  const paidInvoices = filteredInvoices.filter(i => i.payment_status === "confirmed_paid");

  const handleApprove = (invoiceId: string) => {
    setProcessingId(invoiceId);
    setError(null);
    startTransition(async () => {
      const res = await approvePaymentAction(invoiceId);
      if (res.error) {
        setError(res.error);
      }
      setProcessingId(null);
    });
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!selectedStudent || !description || !amount) {
      setError("Please fill in all fields.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    const studentRecord = students.find(s => s.id === selectedStudent);
    if (!studentRecord?.parent_id) {
      setError("Selected student does not have an assigned parent account.");
      return;
    }

    startTransition(async () => {
      const res = await createCustomInvoiceAction(
        selectedStudent,
        studentRecord.parent_id!,
        description,
        numericAmount
      );
      
      if (res.error) {
        setError(res.error);
      } else {
        setIsCreating(false);
        setSelectedStudent("");
        setDescription("");
        setAmount("");
      }
    });
  };

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Invoice Queue</h1>
          <p className={styles.subtitle}>
            Manage pending payments and manual invoices.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? "Cancel" : "Create Custom Invoice"}
        </button>
      </div>

      {/* Toolbar (Search & Filter) */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>Search</span>
        <input
          type="text"
          placeholder="Student or Inv No..."
          className={styles.toolbarInput}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: "200px" }}
        />
        <div className={styles.toolbarSep} />
        <span className={styles.toolbarLabel}>Class</span>
        <select
          className={styles.toolbarSelect}
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
        >
          <option value="all">All Classes</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && <div className={styles.errorAlert}>⚠ {error}</div>}

      {isCreating && (
        <form onSubmit={handleCreateInvoice} className={styles.formCard}>
          <h2 className={styles.formCardTitle}>New Custom Invoice</h2>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Select Student</label>
              <select 
                className={styles.formInput}
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
                required
                disabled={isPending}
              >
                <option value="">-- Choose Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Amount (RM)</label>
              <input 
                type="number"
                step="0.01"
                min="0.01"
                className={styles.formInput}
                placeholder="e.g. 150.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className={`${styles.formGroup} ${styles.formGridFull}`}>
              <label className={styles.formLabel}>Invoice Description</label>
              <input 
                type="text"
                className={styles.formInput}
                placeholder="e.g. Competition Fees, Swim Cap..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setIsCreating(false)}
              disabled={isPending}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      )}

      {/* SECTION 1: Requires Verification */}
      <h2 className={styles.sectionTitle}>Pending Verification ({pendingVerification.length})</h2>
      <InvoiceTable 
        items={pendingVerification} 
        listType="pending" 
        isPending={isPending} 
        processingId={processingId} 
        handleApprove={handleApprove} 
      />

      {/* SECTION 2: Awaiting Parent Payment */}
      <h2 className={styles.sectionTitle}>Awaiting Parent Payment ({unpaidInvoices.length})</h2>
      <InvoiceTable 
        items={unpaidInvoices} 
        listType="unpaid" 
        isPending={isPending} 
        processingId={processingId} 
        handleApprove={handleApprove} 
      />

      {/* SECTION 3: Paid Invoices (History) */}
      <h2 className={styles.sectionTitle}>Payment History ({paidInvoices.length})</h2>
      <InvoiceTable 
        items={paidInvoices} 
        listType="paid" 
        isPending={isPending} 
        processingId={processingId} 
        handleApprove={handleApprove} 
      />
    </div>
  );
}
