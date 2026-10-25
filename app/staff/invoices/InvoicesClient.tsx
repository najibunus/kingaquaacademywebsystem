"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  approvePaymentAction,
  undoPaymentApprovalAction,
  createCustomInvoiceAction,
  attachReceiptProofAction,
} from "@/lib/actions/invoices";
import {
  formatPhoneNumber,
  generateReceiptId,
  buildWhatsAppReceiptUrl,
  buildReceiptMessageText,
} from "@/lib/utils/whatsapp";
import SalesInvoiceForm from "./sales/SalesInvoiceForm";
import { deleteSalesInvoiceAction } from "@/lib/actions/salesInvoices";
import type {
  SalesCustomer,
  SalesInvoice,
  SalesProduct,
} from "@/lib/sales/types";
import styles from "./invoices.module.css";

interface Invoice {
  id: string;
  receipt_id?: string;
  invoice_number: string;
  type: string;
  created_at: string;
  payment_date?: string | null;
  receipt_url: string | null;
  payment_status: string;
  parent_name: string;
  parent_phone: string;
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

function WhatsAppIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M12.031 2c-5.516 0-9.999 4.486-9.999 10.003 0 1.766.461 3.489 1.338 5.008L2 22l5.118-1.341c1.472.803 3.128 1.227 4.913 1.227h.004c5.515 0 9.998-4.486 9.998-10.002C22.033 6.486 17.547 2 12.031 2zm5.822 14.142c-.246.693-1.432 1.326-1.988 1.409-.508.076-1.15.108-1.856-.116-.428-.136-.978-.317-1.682-.621-2.961-1.278-4.894-4.262-5.042-4.459-.148-.197-1.204-1.601-1.204-3.055 0-1.453.763-2.168 1.034-2.464.271-.296.592-.37.789-.37.197 0 .394.002.567.01.182.009.426-.069.666.508.246.591.838 2.045.912 2.193.074.148.123.32.025.517-.099.197-.148.32-.296.493-.148.172-.311.385-.444.517-.148.148-.302.309-.13.604.173.296.766 1.264 1.645 2.047 1.131 1.008 2.084 1.321 2.38 1.469.296.148.468.123.641-.074.173-.197.74-.862.937-1.158.197-.296.394-.246.665-.148.271.099 1.725.813 2.021.961.296.148.493.222.567.345.074.123.074.714-.172 1.407z" />
    </svg>
  );
}

/**
 * Renders the Official Payment Receipt in Landscape Letter format (11in x 8.5in -> 1650 x 1275 px)
 * onto an HTML5 Canvas and returns the canvas element.
 */
async function renderLandscapeReceiptCanvas(
  inv: Invoice
): Promise<{ canvas: HTMLCanvasElement; receiptId: string } | null> {
  const canvas = document.createElement("canvas");
  // US Letter Landscape at 150 DPI: 11in * 150 = 1650px width, 8.5in * 150 = 1275px height
  const W = 1650;
  const H = 1275;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const receiptId = inv.receipt_id || generateReceiptId(inv.invoice_number, inv.id);
  const dateFormatted = new Date(inv.payment_date || inv.created_at).toLocaleDateString(
    "en-MY",
    { day: "2-digit", month: "long", year: "numeric" }
  );
  const formattedPhone = formatPhoneNumber(inv.parent_phone);

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Outer Border
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, W - 96, H - 96);

  // Top Accent Bar
  ctx.fillStyle = "#0284C7";
  ctx.fillRect(50, 50, W - 100, 14);

  // Load Logo if possible
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = "/logo.png";
    });
    if (img.width > 0) {
      ctx.drawImage(img, 96, 96, 88, 88);
    }
  } catch {
    // ignore logo load error
  }

  // Academy Header
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 38px sans-serif";
  ctx.fillText("KINGAQUA ACADEMY", 204, 138);

  ctx.fillStyle = "#475569";
  ctx.font = "600 20px sans-serif";
  ctx.fillText("OFFICIAL PAYMENT RECEIPT  •  LANDSCAPE LETTER FORMAT", 204, 172);

  // Right Header: PAID Badge & Receipt ID
  ctx.fillStyle = "#DCFCE7";
  ctx.fillRect(W - 380, 96, 284, 52);
  ctx.strokeStyle = "#86EFAC";
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 380, 96, 284, 52);

  ctx.fillStyle = "#166534";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PAID & VERIFIED ✓", W - 238, 130);

  ctx.textAlign = "right";
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 24px monospace";
  ctx.fillText(receiptId, W - 96, 184);

  // Divider
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 224);
  ctx.lineTo(W - 96, 224);
  ctx.stroke();

  // Info Box Background
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(96, 256, W - 192, 220);
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 2;
  ctx.strokeRect(96, 256, W - 192, 220);

  ctx.textAlign = "left";
  // Column 1: Receipt ID & Date
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("RECEIPT NUMBER", 132, 304);
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(receiptId, 132, 338);

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("PAYMENT DATE", 132, 396);
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(dateFormatted, 132, 430);

  // Column 2: Parent Info
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("RECEIVED FROM (PARENT)", 640, 304);
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(inv.parent_name, 640, 338);

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("CONTACT NUMBER", 640, 396);
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(formattedPhone ? `+${formattedPhone}` : "—", 640, 430);

  // Column 3: Child & Class
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("STUDENT / CHILD NAME", 1140, 304);
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(inv.student_name, 1140, 338);

  ctx.fillStyle = "#64748B";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("ASSIGNED CLASS", 1140, 396);
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(inv.class_name, 1140, 430);

  // Package Table Header
  const tableTop = 520;
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(96, tableTop, W - 192, 56);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("NO.", 128, tableTop + 35);
  ctx.fillText("PACKAGE / DESCRIPTION", 220, tableTop + 35);
  ctx.fillText("INVOICE NO.", 920, tableTop + 35);
  ctx.fillText("CLASS", 1180, tableTop + 35);
  ctx.textAlign = "right";
  ctx.fillText("AMOUNT PAID (RM)", W - 128, tableTop + 35);

  // Package Row
  const rowTop = tableTop + 56;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(96, rowTop, W - 192, 92);
  ctx.strokeStyle = "#CBD5E1";
  ctx.strokeRect(96, rowTop, W - 192, 92);

  ctx.textAlign = "left";
  ctx.fillStyle = "#0F172A";
  ctx.font = "600 22px sans-serif";
  ctx.fillText("1", 128, rowTop + 54);
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(inv.title, 220, rowTop + 54);
  ctx.font = "600 20px monospace";
  ctx.fillStyle = "#475569";
  ctx.fillText(inv.invoice_number, 920, rowTop + 54);
  ctx.font = "600 20px sans-serif";
  ctx.fillText(inv.class_name, 1180, rowTop + 54);

  ctx.textAlign = "right";
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(`RM ${inv.amount.toFixed(2)}`, W - 128, rowTop + 54);

  // Total Paid Box
  const totalTop = rowTop + 130;
  ctx.fillStyle = "#F0FDF4";
  ctx.fillRect(W - 640, totalTop, 544, 88);
  ctx.strokeStyle = "#86EFAC";
  ctx.lineWidth = 2;
  ctx.strokeRect(W - 640, totalTop, 544, 88);

  ctx.textAlign = "left";
  ctx.fillStyle = "#166534";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("TOTAL AMOUNT PAID", W - 608, totalTop + 53);

  ctx.textAlign = "right";
  ctx.fillStyle = "#15803D";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText(`RM ${inv.amount.toFixed(2)}`, W - 128, totalTop + 56);

  // Footer
  ctx.textAlign = "left";
  ctx.fillStyle = "#64748B";
  ctx.font = "500 18px sans-serif";
  ctx.fillText(
    "Thank you for your payment! This is an official computer-generated receipt issued by Kingaqua Academy.",
    96,
    H - 110
  );

  return { canvas, receiptId };
}

/**
 * Renders the Official Payment Receipt in Landscape Letter format and triggers a direct PNG file download.
 */
async function downloadLandscapeReceiptPng(inv: Invoice) {
  const rendered = await renderLandscapeReceiptCanvas(inv);
  if (!rendered) return;
  const { canvas, receiptId } = rendered;
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${receiptId}-${inv.student_name.replace(/\s+/g, "_")}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Copies the rendered Landscape Receipt PNG directly to the system clipboard so staff can press Ctrl+V in WhatsApp Web.
 */
async function copyLandscapeReceiptToClipboard(inv: Invoice): Promise<boolean> {
  try {
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof ClipboardItem === "undefined"
    ) {
      return false;
    }
    const rendered = await renderLandscapeReceiptCanvas(inv);
    if (!rendered) return false;
    const blob = await new Promise<Blob | null>((resolve) =>
      rendered.canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (!blob) return false;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Downloads the Official Landscape Letter PDF directly from the API endpoint.
 */
async function downloadLandscapePdf(inv: Invoice) {
  try {
    const res = await fetch(`/api/receipts/${inv.id}/pdf?download=1`);
    if (!res.ok) throw new Error("Failed to generate PDF");
    const blob = await res.blob();
    const receiptId =
      inv.receipt_id || generateReceiptId(inv.invoice_number, inv.id);
    const filename = `Receipt-${receiptId.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("PDF download failed:", err);
  }
}

function InvoiceTable({
  items,
  listType,
  isPending,
  processingId,
  generatedIds,
  handleApprove,
  onViewUploadedReceipt,
  onGenerateReceipt,
  onUndoApprove,
  isPreparingPdf,
  onSendWhatsApp,
}: {
  items: Invoice[];
  listType: "pending" | "unpaid" | "paid";
  isPending: boolean;
  processingId: string | null;
  generatedIds: Record<string, boolean>;
  handleApprove: (inv: Invoice) => void;
  onViewUploadedReceipt: (inv: Invoice) => void;
  onGenerateReceipt: (inv: Invoice) => void;
  onUndoApprove?: (inv: Invoice) => void;
  isPreparingPdf?: string | null;
  onSendWhatsApp?: (inv: Invoice) => void;
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (items.length === 0) {
    return (
      <div className={styles.emptyCard}>
        <p className={styles.emptyText}>
          {listType === "pending"
            ? "No pending receipts to verify. You're all caught up!"
            : listType === "unpaid"
            ? "No outstanding unpaid invoices."
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
              <th>Student &amp; Parent</th>
              <th>Invoice Details</th>
              <th>Amount</th>
              <th>Status</th>
              <th style={{ minWidth: "330px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((inv, idx) => {
              const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
              const receiptId =
                inv.receipt_id || generateReceiptId(inv.invoice_number, inv.id);
              const dateFormatted = new Date(
                inv.payment_date || inv.created_at
              ).toLocaleDateString("en-MY", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });

              const whatsappUrl = buildWhatsAppReceiptUrl({
                phone: inv.parent_phone,
                receiptId,
                date: dateFormatted,
                parentName: inv.parent_name,
                childName: inv.student_name,
                packageDetails: inv.title,
                className: inv.class_name,
                amountPaid: inv.amount,
                invoiceNumber: inv.invoice_number,
              });

              const isGenerated = Boolean(generatedIds[inv.id]);

              return (
                <tr key={inv.id}>
                  <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                    {rowNum}
                  </td>
                  <td>
                    <div className={styles.denseStudentName}>{inv.student_name}</div>
                    <div className={styles.denseInvNo} style={{ marginTop: "1px" }}>
                      {inv.parent_name} • {inv.class_name}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{inv.title}</div>
                    <div className={styles.denseInvNo}>{inv.invoice_number}</div>
                  </td>
                  <td style={{ fontWeight: 600, color: "#059669" }}>
                    RM {inv.amount.toFixed(2)}
                  </td>
                  <td>
                    {listType === "pending" ? (
                      <span
                        className="badge badge-warning"
                        style={{ fontSize: "0.7rem", padding: "2px 8px" }}
                      >
                        Receipt Uploaded
                      </span>
                    ) : listType === "unpaid" ? (
                      <span
                        className="badge badge-warning"
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 8px",
                          background: "#fef2f2",
                          color: "#991b1b",
                        }}
                      >
                        Unpaid
                      </span>
                    ) : (
                      <span
                        className="badge badge-success"
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 8px",
                          background: "#dcfce7",
                          color: "#166534",
                          borderRadius: "999px",
                          display: "inline-block",
                        }}
                      >
                        Paid
                      </span>
                    )}
                  </td>
                  <td>
                    {listType === "pending" || listType === "unpaid" ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* RED MARKING: Approve Payment Button */}
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionApprove}`}
                          disabled={isPending && processingId === inv.id}
                          onClick={() => handleApprove(inv)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            borderRadius: "6px",
                            backgroundColor: "var(--ka-blue)",
                            color: "#ffffff",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          {isPending && processingId === inv.id
                            ? "Approving..."
                            : "Approve Payment"}
                        </button>

                        {/* BROWN MARKING: View Uploaded Receipt Button */}
                        <button
                          type="button"
                          onClick={() => onViewUploadedReceipt(inv)}
                          title={
                            inv.receipt_url
                              ? "Click to view parent's uploaded payment proof"
                              : "No receipt file uploaded by parent yet (Click to attach or inspect)"
                          }
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "5px 11px",
                            fontSize: "0.75rem",
                            fontWeight: inv.receipt_url ? 700 : 500,
                            borderRadius: "6px",
                            border: inv.receipt_url
                              ? "1px solid #b45309"
                              : "1px dashed #cbd5e1",
                            backgroundColor: inv.receipt_url ? "#fffbeb" : "#f8fafc",
                            color: inv.receipt_url ? "#92400e" : "#94a3b8",
                            cursor: "pointer",
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          {inv.receipt_url ? "View Uploaded Receipt" : "No Receipt Uploaded"}
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* ORANGE MARKING: Generate Receipt Button (Landscape Letter Format) */}
                        <button
                          type="button"
                          onClick={() => onGenerateReceipt(inv)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "6px 12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            borderRadius: "6px",
                            border: isGenerated
                              ? "1px solid #ea580c"
                              : "1px solid #cbd5e1",
                            backgroundColor: isGenerated ? "#fff7ed" : "#f8fafc",
                            color: isGenerated ? "#c2410c" : "#0f172a",
                            cursor: "pointer",
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          {isGenerated ? "Receipt Generated ✓" : "Generate Receipt"}
                        </button>

                        {/* GREEN MARKING: Send Generated Receipt to Parent WhatsApp (with PDF) */}
                        <button
                          type="button"
                          onClick={() => onSendWhatsApp?.(inv)}
                          disabled={isPreparingPdf === inv.id}
                          title={`Send Landscape PDF Receipt to ${inv.parent_name} via WhatsApp`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "6px 12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            borderRadius: "6px",
                            backgroundColor: "#25D366",
                            color: "#ffffff",
                            border: "none",
                            cursor: isPreparingPdf === inv.id ? "wait" : "pointer",
                            boxShadow: "0 1px 4px rgba(37, 211, 102, 0.25)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <WhatsAppIcon size={14} />
                          {isPreparingPdf === inv.id ? "Preparing PDF..." : "Send WhatsApp (PDF)"}
                        </button>

                        {/* UNDO BUTTON: For accidental approved payment */}
                        {onUndoApprove && (
                          <button
                            type="button"
                            onClick={() => onUndoApprove(inv)}
                            disabled={isPending && processingId === inv.id}
                            title={`Undo payment approval for ${inv.student_name}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 11px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              borderRadius: "6px",
                              border: "1px solid #fca5a5",
                              backgroundColor: "#fff1f2",
                              color: "#dc2626",
                              cursor:
                                isPending && processingId === inv.id
                                  ? "not-allowed"
                                  : "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 7v6h6" />
                              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                            </svg>
                            {isPending && processingId === inv.id
                              ? "Undoing..."
                              : "Undo"}
                          </button>
                        )}
                      </div>
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            ← Previous
          </button>
          <span className={styles.pageInfo}>
            Page {safePage} of {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
  classes,
  salesCustomers = [],
  salesProducts = [],
  salesCategories = [],
  staffName = "Accountkingaqua",
  initialSalesInvoices = [],
}: {
  invoices: Invoice[];
  students: Student[];
  classes: ClassOption[];
  salesCustomers?: SalesCustomer[];
  salesProducts?: SalesProduct[];
  salesCategories?: string[];
  staffName?: string;
  initialSalesInvoices?: SalesInvoice[];
}) {
  const [localInvoices, setLocalInvoices] = useState<Invoice[]>(invoices);
  const [salesInvoices, setSalesInvoices] =
    useState<SalesInvoice[]>(initialSalesInvoices);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [editingSalesInvoice, setEditingSalesInvoice] =
    useState<SalesInvoice | null>(null);
  const [deletingSalesId, setDeletingSalesId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastApprovedInvoice, setLastApprovedInvoice] = useState<Invoice | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track which invoices have had their receipt generated in this session
  const [generatedIds, setGeneratedIds] = useState<Record<string, boolean>>({});

  // Modal 1: View Parent's Uploaded Receipt (Brown Button)
  const [viewingUploadedInvoice, setViewingUploadedInvoice] = useState<Invoice | null>(
    null
  );

  // Modal 2: Generated Official Receipt in Landscape Letter Size (Orange Button)
  const [generatedReceiptInvoice, setGeneratedReceiptInvoice] =
    useState<Invoice | null>(null);

  // Modal 3: WhatsApp Sent & PDF Guidance Dialog
  interface WhatsAppModalData {
    inv: Invoice;
    parentName: string;
    parentPhone: string;
    formattedPhone: string;
    receiptId: string;
    pdfUrl: string;
    downloadPdfUrl: string;
    filename: string;
    waUrl: string;
    pdfFile: File | null;
    clipboardCopied: boolean;
  }
  const [whatsAppModalInfo, setWhatsAppModalInfo] =
    useState<WhatsAppModalData | null>(null);

  useEffect(() => {
    if (viewingUploadedInvoice || generatedReceiptInvoice || whatsAppModalInfo) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [viewingUploadedInvoice, generatedReceiptInvoice, whatsAppModalInfo]);

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");

  useMemo(() => {
    setLocalInvoices(invoices);
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return localInvoices.filter((inv) => {
      const matchClass = selectedClass === "all" || inv.class_id === selectedClass;
      const searchLower = searchQuery.toLowerCase();
      const matchSearch =
        inv.student_name.toLowerCase().includes(searchLower) ||
        inv.invoice_number.toLowerCase().includes(searchLower) ||
        inv.parent_name.toLowerCase().includes(searchLower);
      return matchClass && matchSearch;
    });
  }, [localInvoices, selectedClass, searchQuery]);

  const pendingVerification = filteredInvoices.filter(
    (i) => i.payment_status === "receipt_submitted"
  );
  const unpaidInvoices = filteredInvoices.filter(
    (i) => i.payment_status === "unpaid"
  );
  const paidInvoices = filteredInvoices.filter(
    (i) => i.payment_status === "confirmed_paid"
  );

  // Step: Approve Payment (Red Button) -> moves invoice to Payment History (Paid)
  const handleApprove = (inv: Invoice) => {
    setProcessingId(inv.id);
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await approvePaymentAction(inv.id);
      if (res.error) {
        setError(res.error);
      } else {
        const nowIso = new Date().toISOString();
        setLocalInvoices((prev) =>
          prev.map((item) =>
            item.id === inv.id
              ? { ...item, payment_status: "confirmed_paid", payment_date: nowIso }
              : item
          )
        );
        setViewingUploadedInvoice(null);
        setLastApprovedInvoice(inv);
        setSuccessMessage(
          `Payment approved for ${inv.student_name} (${inv.invoice_number}) - RM ${inv.amount.toFixed(2)}.`
        );
      }
      setProcessingId(null);
    });
  };

  // Step: Undo Accidental Payment Approval -> reverts invoice to Pending Verification or Unpaid
  const handleUndoApprove = (inv: Invoice) => {
    setProcessingId(inv.id);
    setError(null);
    startTransition(async () => {
      const res = await undoPaymentApprovalAction(inv.id);
      if (res.error) {
        setError(res.error);
      } else {
        const revertedStatus =
          res.revertedStatus || (inv.receipt_url ? "receipt_submitted" : "unpaid");
        setLocalInvoices((prev) =>
          prev.map((item) =>
            item.id === inv.id
              ? { ...item, payment_status: revertedStatus, payment_date: null }
              : item
          )
        );
        setGeneratedIds((prev) => {
          const next = { ...prev };
          delete next[inv.id];
          return next;
        });
        if (viewingUploadedInvoice?.id === inv.id) {
          setViewingUploadedInvoice(null);
        }
        if (generatedReceiptInvoice?.id === inv.id) {
          setGeneratedReceiptInvoice(null);
        }
        if (lastApprovedInvoice?.id === inv.id) {
          setLastApprovedInvoice(null);
        }
        setSuccessMessage(
          `Approval undone for ${inv.student_name} (${inv.invoice_number}). Reverted to ${
            revertedStatus === "receipt_submitted"
              ? "Pending Verification"
              : "Awaiting Parent Payment"
          }.`
        );
      }
      setProcessingId(null);
    });
  };

  // Step: View Uploaded Receipt (Brown Button)
  const handleViewUploadedReceipt = (inv: Invoice) => {
    setViewingUploadedInvoice(inv);
  };

  // Step: Generate Receipt (Orange Button) -> opens Landscape Letter Receipt Modal
  const handleGenerateReceipt = (inv: Invoice) => {
    setGeneratedIds((prev) => ({ ...prev, [inv.id]: true }));
    setGeneratedReceiptInvoice(inv);
  };

  // Step: Staff attaches/uploads payment proof for an invoice
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleStaffAttachReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingUploadedInvoice || !uploadFile) return;
    setIsUploadingProof(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append("invoice_id", viewingUploadedInvoice.id);
    fd.append("receipt_file", uploadFile);

    const res = await attachReceiptProofAction(fd);
    setIsUploadingProof(false);

    if (res.error) {
      setUploadError(res.error);
    } else if (res.receiptUrl) {
      const newUrl = res.receiptUrl;
      setLocalInvoices((prev) =>
        prev.map((item) =>
          item.id === viewingUploadedInvoice.id
            ? { ...item, receipt_url: newUrl, payment_status: "receipt_submitted" }
            : item
        )
      );
      setViewingUploadedInvoice((prev) =>
        prev
          ? {
              ...prev,
              receipt_url: newUrl,
              payment_status: "receipt_submitted",
            }
          : null
      );
      setUploadFile(null);
      setSuccessMessage(
        `Payment proof successfully attached for ${viewingUploadedInvoice.student_name}. Moved to Pending Verification.`
      );
    }
  };

  // Step: Send Receipt to Parent via WhatsApp with Real Landscape PDF
  const [isPreparingPdf, setIsPreparingPdf] = useState<string | null>(null);

  const handleSendWhatsAppWithPdf = async (inv: Invoice) => {
    setIsPreparingPdf(inv.id);
    const receiptId =
      inv.receipt_id || generateReceiptId(inv.invoice_number, inv.id);
    const dateFormatted = new Date(
      inv.payment_date || inv.created_at
    ).toLocaleDateString("en-MY", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const formattedPhone = formatPhoneNumber(inv.parent_phone);

    try {
      // 1. Request official PDF with cloud upload to Supabase Storage + base64 bytes in a single call
      let publicPdfUrl = "";
      let downloadPdfUrl = "";
      let pdfFilename = `Receipt-${receiptId.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`;
      let pdfFile: File | null = null;

      // Copy landscape receipt image to clipboard in parallel so staff can also Ctrl+V in WhatsApp Web
      const clipboardPromise = copyLandscapeReceiptToClipboard(inv);

      try {
        const res = await fetch(`/api/receipts/${inv.id}/pdf?json=1`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.publicPdfUrl) publicPdfUrl = data.publicPdfUrl;
          if (data.downloadPdfUrl) downloadPdfUrl = data.downloadPdfUrl;
          if (data.filename) pdfFilename = data.filename;

          if (data.pdfBase64) {
            const binaryStr = window.atob(data.pdfBase64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: "application/pdf" });
            pdfFile = new File([blob], pdfFilename, { type: "application/pdf" });

            // Trigger direct local PDF download
            const localObjUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = localObjUrl;
            a.download = pdfFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(localObjUrl);
          }
        }
      } catch (jsonErr) {
        console.warn("Could not retrieve JSON receipt metadata:", jsonErr);
      }

      // 2. Fallback if pdfBase64 wasn't returned
      if (!pdfFile) {
        try {
          const pdfRes = await fetch(`/api/receipts/${inv.id}/pdf?download=1`, {
            cache: "no-store",
          });
          if (pdfRes.ok) {
            const blob = await pdfRes.blob();
            pdfFile = new File([blob], pdfFilename, { type: "application/pdf" });
            const localObjUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = localObjUrl;
            a.download = pdfFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(localObjUrl);
          }
        } catch (dlErr) {
          console.warn("Could not download local copy of PDF:", dlErr);
        }
      }

      // 3. Fallback to origin link if cloud storage upload wasn't available
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      if (!publicPdfUrl) {
        publicPdfUrl = `${origin}/api/receipts/${inv.id}/pdf`;
      }
      if (!downloadPdfUrl) {
        downloadPdfUrl = `${origin}/api/receipts/${inv.id}/pdf?download=1`;
      }

      const clipboardCopied = await clipboardPromise;

      // 4. Build WhatsApp message with the REAL public Supabase Cloud PDF download URL
      const messageText = buildReceiptMessageText({
        phone: inv.parent_phone,
        receiptId,
        date: dateFormatted,
        parentName: inv.parent_name,
        childName: inv.student_name,
        packageDetails: inv.title,
        className: inv.class_name,
        amountPaid: inv.amount,
        invoiceNumber: inv.invoice_number,
        pdfUrl: downloadPdfUrl,
      });

      // 5. Open WhatsApp directly to the registered parent's number
      const waUrl = formattedPhone
        ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
        : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

      window.open(waUrl, "_blank", "noopener,noreferrer");

      // 6. Show the WhatsApp confirmation modal with instructions & direct actions
      setWhatsAppModalInfo({
        inv,
        parentName: inv.parent_name,
        parentPhone: inv.parent_phone || "",
        formattedPhone,
        receiptId,
        pdfUrl: publicPdfUrl,
        downloadPdfUrl,
        filename: pdfFilename,
        waUrl,
        pdfFile,
        clipboardCopied,
      });

      setSuccessMessage(
        `Official PDF generated & downloaded (${pdfFilename})! WhatsApp opened for ${inv.parent_name} (+${formattedPhone || "phone missing"}).`
      );
    } catch (err: any) {
      console.error("WhatsApp PDF Send error:", err);
      // Fallback: direct WhatsApp link
      const messageText = buildReceiptMessageText({
        phone: inv.parent_phone,
        receiptId,
        date: dateFormatted,
        parentName: inv.parent_name,
        childName: inv.student_name,
        packageDetails: inv.title,
        className: inv.class_name,
        amountPaid: inv.amount,
        invoiceNumber: inv.invoice_number,
      });
      const waUrl = formattedPhone
        ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
        : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsPreparingPdf(null);
    }
  };

  const handlePrintLandscapeReceipt = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
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

    const studentRecord = students.find((s) => s.id === selectedStudent);
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

  // Computed values for the active Landscape Letter Receipt Modal
  const modalReceiptId = generatedReceiptInvoice
    ? generatedReceiptInvoice.receipt_id ||
      generateReceiptId(
        generatedReceiptInvoice.invoice_number,
        generatedReceiptInvoice.id
      )
    : "";

  const modalReceiptDate = generatedReceiptInvoice
    ? new Date(
        generatedReceiptInvoice.payment_date || generatedReceiptInvoice.created_at
      ).toLocaleDateString("en-MY", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  const modalWhatsappUrl = generatedReceiptInvoice
    ? buildWhatsAppReceiptUrl({
        phone: generatedReceiptInvoice.parent_phone,
        receiptId: modalReceiptId,
        date: modalReceiptDate,
        parentName: generatedReceiptInvoice.parent_name,
        childName: generatedReceiptInvoice.student_name,
        packageDetails: generatedReceiptInvoice.title,
        className: generatedReceiptInvoice.class_name,
        amountPaid: generatedReceiptInvoice.amount,
        invoiceNumber: generatedReceiptInvoice.invoice_number,
      })
    : "#";

  const modalFormattedPhone = generatedReceiptInvoice
    ? formatPhoneNumber(generatedReceiptInvoice.parent_phone)
    : "";

  const handleOpenNewSalesInvoice = () => {
    setEditingSalesInvoice(null);
    setShowSalesForm(true);
    setIsCreating(false);
  };

  const handleEditSalesInvoice = (inv: SalesInvoice) => {
    setEditingSalesInvoice(inv);
    setShowSalesForm(true);
    setIsCreating(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleDeleteSalesInvoice = async (invoiceId: string, invoiceNo: string) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Delete sales invoice ${invoiceNo}? This cannot be undone.`
      );
      if (!ok) return;
    }
    setDeletingSalesId(invoiceId);
    const res = await deleteSalesInvoiceAction(invoiceId);
    setDeletingSalesId(null);
    if (res.error) {
      setError(res.error);
    } else {
      setSalesInvoices((prev) => prev.filter((item) => item.id !== invoiceId));
      setSuccessMessage(`Sales Invoice ${invoiceNo} deleted.`);
    }
  };

  const filteredSalesInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return salesInvoices;
    return salesInvoices.filter(
      (s) =>
        s.number.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.ref && s.ref.toLowerCase().includes(q))
    );
  }, [salesInvoices, searchQuery]);

  return (
    <div className="animate-fade-in-up text-slate-900">
      <div className={`${styles.header} no-print`}>
        <div>
          <h1 className={styles.title}>
            {showSalesForm
              ? editingSalesInvoice
                ? `Sales Invoice • ${editingSalesInvoice.number}`
                : "New Sales Invoice"
              : "Invoice Queue"}
          </h1>
          <p className={styles.subtitle}>
            {showSalesForm
              ? "Create customers, pick dates & terms, add swimming classes or products, and record payments."
              : "Verify parent payment proofs, approve payments, create sales invoices, and send receipts via WhatsApp."}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              backgroundColor: showSalesForm ? "#475569" : "#2596be",
              borderColor: showSalesForm ? "#475569" : "#2596be",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
            }}
            onClick={() => {
              if (showSalesForm) {
                setShowSalesForm(false);
                setEditingSalesInvoice(null);
              } else {
                handleOpenNewSalesInvoice();
              }
            }}
          >
            {showSalesForm ? "← Back to Invoice Queue" : "+ New Sales Invoice"}
          </button>

          {!showSalesForm && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreating(!isCreating)}
            >
              {isCreating ? "Cancel" : "Quick Student Fee"}
            </button>
          )}
        </div>
      </div>

      {showSalesForm && (
        <div className="no-print" style={{ marginBottom: "28px" }}>
          <SalesInvoiceForm
            key={editingSalesInvoice?.id || "new-sales-invoice"}
            initialCustomers={salesCustomers}
            initialProducts={salesProducts}
            initialCategories={salesCategories}
            staffName={staffName}
            existingInvoice={editingSalesInvoice}
            onSaved={(saved) => {
              setSalesInvoices((prev) => {
                const idx = prev.findIndex((i) => i.id === saved.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = saved;
                  return next;
                }
                return [saved, ...prev];
              });
              setEditingSalesInvoice(saved);
              setSuccessMessage(
                `Sales Invoice ${saved.number} (${saved.customerName}) saved — Total MYR ${saved.total.toFixed(
                  2
                )}, Balance MYR ${saved.balance.toFixed(2)}.`
              );
            }}
            onCancel={() => {
              setShowSalesForm(false);
              setEditingSalesInvoice(null);
            }}
            onDeleted={(deletedId) => {
              setSalesInvoices((prev) => prev.filter((i) => i.id !== deletedId));
              setShowSalesForm(false);
              setEditingSalesInvoice(null);
              setSuccessMessage("Sales Invoice deleted.");
            }}
          />
        </div>
      )}

      {/* Toolbar (Search & Filter) */}
      <div className={`${styles.toolbar} no-print`}>
        <span className={styles.toolbarLabel}>Search</span>
        <input
          type="text"
          placeholder="Student, Parent, or Inv No..."
          className={styles.toolbarInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: "220px" }}
        />
        <div className={styles.toolbarSep} />
        <span className={styles.toolbarLabel}>Class</span>
        <select
          className={styles.toolbarSelect}
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="all">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className={`${styles.errorAlert} no-print`}>⚠ {error}</div>}

      {successMessage && (
        <div
          className="no-print"
          style={{
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "8px",
            padding: "10px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            fontSize: "0.85rem",
            color: "#065f46",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.1rem" }}>✓</span>
            <span style={{ fontWeight: 600 }}>{successMessage}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {lastApprovedInvoice && (
              <button
                type="button"
                onClick={() => handleUndoApprove(lastApprovedInvoice)}
                disabled={isPending && processingId === lastApprovedInvoice.id}
                style={{
                  padding: "5px 12px",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: "1px solid #fca5a5",
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  cursor:
                    isPending && processingId === lastApprovedInvoice.id
                      ? "not-allowed"
                      : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
                {isPending && processingId === lastApprovedInvoice.id
                  ? "Undoing..."
                  : "Undo Approval"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSuccessMessage(null);
                setLastApprovedInvoice(null);
              }}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "1rem",
                color: "#065f46",
                cursor: "pointer",
                padding: "2px 6px",
                lineHeight: 1,
              }}
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {isCreating && (
        <form onSubmit={handleCreateInvoice} className={`${styles.formCard} no-print`}>
          <h2 className={styles.formCardTitle}>New Custom Invoice</h2>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Select Student</label>
              <select
                className={styles.formInput}
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                required
                disabled={isPending}
              >
                <option value="">-- Choose Student --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
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
                onChange={(e) => setAmount(e.target.value)}
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
                onChange={(e) => setDescription(e.target.value)}
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
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      )}

      <div className="no-print">
        {/* SECTION 0: Sales Invoices */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginTop: "8px",
            marginBottom: "8px",
          }}
        >
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
            Sales Invoices ({filteredSalesInvoices.length})
          </h2>
          {!showSalesForm && (
            <button
              type="button"
              onClick={handleOpenNewSalesInvoice}
              style={{
                padding: "5px 12px",
                fontSize: "0.78rem",
                fontWeight: 700,
                borderRadius: "6px",
                border: "1px solid #2596be",
                backgroundColor: "#f0f9ff",
                color: "#0284c7",
                cursor: "pointer",
              }}
            >
              + New Sales Invoice
            </button>
          )}
        </div>

        <div className={styles.tableWrap} style={{ marginBottom: "28px" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total (MYR)</th>
                <th>Paid (MYR)</th>
                <th>Balance (MYR)</th>
                <th>Status</th>
                <th>By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalesInvoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className={styles.empty}>
                    No sales invoices yet. Click{" "}
                    <button
                      type="button"
                      onClick={handleOpenNewSalesInvoice}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2596be",
                        fontWeight: 700,
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: 0,
                      }}
                    >
                      + New Sales Invoice
                    </button>{" "}
                    to create one.
                  </td>
                </tr>
              ) : (
                filteredSalesInvoices.map((sInv) => {
                  const itemCount = sInv.lines.filter((l) => l.kind !== "title").length;
                  const statusColor =
                    sInv.status === "paid"
                      ? { bg: "#dcfce7", text: "#166534", border: "#86efac", label: "PAID" }
                      : sInv.status === "partial"
                      ? { bg: "#fef9c3", text: "#854d0e", border: "#fde047", label: "PARTIAL" }
                      : { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5", label: "UNPAID" };

                  return (
                    <tr key={sInv.id}>
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>
                        {sInv.number}
                        {sInv.ref ? (
                          <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 400 }}>
                            Ref: {sInv.ref}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {sInv.date
                          ? new Date(sInv.date).toLocaleDateString("en-GB")
                          : "-"}
                      </td>
                      <td>
                        {sInv.dueDate
                          ? new Date(sInv.dueDate).toLocaleDateString("en-GB")
                          : "-"}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{sInv.customerName}</div>
                        {sInv.customerPhone ? (
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                            {sInv.customerPhone}
                          </div>
                        ) : null}
                      </td>
                      <td>{itemCount} item{itemCount === 1 ? "" : "s"}</td>
                      <td style={{ fontWeight: 700 }}>
                        RM {sInv.total.toFixed(2)}
                      </td>
                      <td style={{ color: "#15803d", fontWeight: 600 }}>
                        RM {sInv.paid.toFixed(2)}
                      </td>
                      <td
                        style={{
                          fontWeight: 700,
                          color: sInv.balance > 0 ? "#b91c1c" : "#15803d",
                        }}
                      >
                        RM {sInv.balance.toFixed(2)}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            backgroundColor: statusColor.bg,
                            color: statusColor.text,
                            border: `1px solid ${statusColor.border}`,
                          }}
                        >
                          {statusColor.label}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "#475569" }}>
                        {sInv.by}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleEditSalesInvoice(sInv)}
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              backgroundColor: "#ffffff",
                              color: "#0f172a",
                              cursor: "pointer",
                            }}
                          >
                            View / Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteSalesInvoice(sInv.id, sInv.number)
                            }
                            disabled={deletingSalesId === sInv.id}
                            style={{
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                              backgroundColor: "#fef2f2",
                              color: "#dc2626",
                              cursor:
                                deletingSalesId === sInv.id
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            {deletingSalesId === sInv.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* SECTION 1: Requires Verification */}
        <h2 className={styles.sectionTitle}>
          Pending Verification ({pendingVerification.length})
        </h2>
        <InvoiceTable
          items={pendingVerification}
          listType="pending"
          isPending={isPending}
          processingId={processingId}
          generatedIds={generatedIds}
          handleApprove={handleApprove}
          onViewUploadedReceipt={handleViewUploadedReceipt}
          onGenerateReceipt={handleGenerateReceipt}
        />

        {/* SECTION 2: Awaiting Parent Payment */}
        <h2 className={styles.sectionTitle}>
          Awaiting Parent Payment ({unpaidInvoices.length})
        </h2>
        <InvoiceTable
          items={unpaidInvoices}
          listType="unpaid"
          isPending={isPending}
          processingId={processingId}
          generatedIds={generatedIds}
          handleApprove={handleApprove}
          onViewUploadedReceipt={handleViewUploadedReceipt}
          onGenerateReceipt={handleGenerateReceipt}
        />

        {/* SECTION 3: Paid Invoices (History) */}
        <h2 className={styles.sectionTitle}>Payment History ({paidInvoices.length})</h2>
        <InvoiceTable
          items={paidInvoices}
          listType="paid"
          isPending={isPending}
          processingId={processingId}
          generatedIds={generatedIds}
          handleApprove={handleApprove}
          onViewUploadedReceipt={handleViewUploadedReceipt}
          onGenerateReceipt={handleGenerateReceipt}
          onUndoApprove={handleUndoApprove}
          isPreparingPdf={isPreparingPdf}
          onSendWhatsApp={handleSendWhatsAppWithPdf}
        />
      </div>

      {/* ── MODAL 1: VIEW PARENT'S UPLOADED RECEIPT (Brown Button) ── */}
      {mounted && viewingUploadedInvoice && createPortal(
        <div
          className="no-print"
          onClick={() => setViewingUploadedInvoice(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "20px",
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "560px",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
              color: "#0f172a",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "14px",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                  Parent Uploaded Payment Proof
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  {viewingUploadedInvoice.student_name} •{" "}
                  {viewingUploadedInvoice.invoice_number} (RM{" "}
                  {viewingUploadedInvoice.amount.toFixed(2)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingUploadedInvoice(null)}
                style={{
                  background: "none",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ✕
              </button>
            </div>

            {viewingUploadedInvoice.receipt_url ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    overflow: "hidden",
                    backgroundColor: "#f8fafc",
                    maxHeight: "420px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={viewingUploadedInvoice.receipt_url}
                    alt="Uploaded Payment Receipt"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "400px",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <a
                    href={viewingUploadedInvoice.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "var(--ka-blue)",
                      textDecoration: "underline",
                    }}
                  >
                    Open Original File in New Tab ↗
                  </a>

                  {viewingUploadedInvoice.payment_status === "confirmed_paid" ? (
                    <button
                      type="button"
                      onClick={() => handleUndoApprove(viewingUploadedInvoice)}
                      disabled={
                        isPending && processingId === viewingUploadedInvoice.id
                      }
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        backgroundColor: "#fff1f2",
                        color: "#dc2626",
                        border: "1px solid #fca5a5",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor:
                          isPending && processingId === viewingUploadedInvoice.id
                            ? "not-allowed"
                            : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 7v6h6" />
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                      </svg>
                      {isPending && processingId === viewingUploadedInvoice.id
                        ? "Undoing..."
                        : "Undo Payment Approval"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApprove(viewingUploadedInvoice)}
                      disabled={
                        isPending && processingId === viewingUploadedInvoice.id
                      }
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        backgroundColor: "var(--ka-blue)",
                        color: "#ffffff",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor:
                          isPending && processingId === viewingUploadedInvoice.id
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {isPending && processingId === viewingUploadedInvoice.id
                        ? "Approving..."
                        : "Verify & Approve Payment"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "24px 20px",
                  textAlign: "center",
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px dashed #cbd5e1",
                  color: "#64748b",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "6px" }}>📄</div>
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  No Receipt Uploaded by Parent Yet
                </div>
                <div style={{ fontSize: "0.82rem", marginBottom: "16px", color: "#64748b" }}>
                  The parent ({viewingUploadedInvoice.parent_name}) has not uploaded a payment
                  receipt for {viewingUploadedInvoice.invoice_number} yet.
                </div>

                {/* Staff Upload Section */}
                <form
                  onSubmit={handleStaffAttachReceipt}
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "14px",
                    marginBottom: "16px",
                    textAlign: "left",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#334155",
                      marginBottom: "6px",
                    }}
                  >
                    Attach Payment Proof (if received via WhatsApp/Email):
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        setUploadFile(e.target.files?.[0] || null);
                        setUploadError(null);
                      }}
                      disabled={isUploadingProof}
                      style={{
                        fontSize: "0.78rem",
                        flex: 1,
                        padding: "6px 8px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!uploadFile || isUploadingProof}
                      style={{
                        padding: "7px 14px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        backgroundColor: uploadFile ? "var(--ka-blue)" : "#94a3b8",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: uploadFile && !isUploadingProof ? "pointer" : "not-allowed",
                      }}
                    >
                      {isUploadingProof ? "Uploading..." : "Upload & Attach"}
                    </button>
                  </div>
                  {uploadError && (
                    <div style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "6px" }}>
                      ⚠ {uploadError}
                    </div>
                  )}
                </form>

                <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                  {viewingUploadedInvoice.payment_status === "confirmed_paid" ? (
                    <button
                      type="button"
                      onClick={() => handleUndoApprove(viewingUploadedInvoice)}
                      disabled={
                        isPending && processingId === viewingUploadedInvoice.id
                      }
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        backgroundColor: "#fff1f2",
                        color: "#dc2626",
                        border: "1px solid #fca5a5",
                        fontWeight: 700,
                        fontSize: "0.84rem",
                        cursor:
                          isPending && processingId === viewingUploadedInvoice.id
                            ? "not-allowed"
                            : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 7v6h6" />
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                      </svg>
                      {isPending && processingId === viewingUploadedInvoice.id
                        ? "Undoing..."
                        : "Undo Payment Approval"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApprove(viewingUploadedInvoice)}
                      disabled={
                        isPending && processingId === viewingUploadedInvoice.id
                      }
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        backgroundColor: "var(--ka-blue)",
                        color: "#ffffff",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "0.84rem",
                        cursor:
                          isPending && processingId === viewingUploadedInvoice.id
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {isPending && processingId === viewingUploadedInvoice.id
                        ? "Approving..."
                        : "Approve Payment Without Receipt"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 2: GENERATED RECEIPT IN LANDSCAPE LETTER FORMAT (11" x 8.5") (Orange Button) ── */}
      {mounted && generatedReceiptInvoice && createPortal(
        <div
          id="receipt-modal-backdrop"
          onClick={() => setGeneratedReceiptInvoice(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "20px",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "980px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* Landscape Letter Size (11in x 8.5in ratio) Receipt Card */}
            <div
              id="printable-receipt-card"
              style={{
                width: "100%",
                aspectRatio: "11 / 8.5",
                backgroundColor: "#ffffff",
                border: "2px solid #0f172a",
                borderRadius: "12px",
                padding: "32px 40px",
                color: "#0f172a",
                boxShadow: "0 20px 35px rgba(0, 0, 0, 0.3)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Top Accent Strip */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "8px",
                  backgroundColor: "var(--ka-blue)",
                }}
              />

              {/* Top Section: Header + Logo + Info Grid + Table */}
              <div>
                {/* Header Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "16px",
                    paddingBottom: "18px",
                    borderBottom: "2px solid #e2e8f0",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <img
                      src="/logo.png"
                      alt="Kingaqua Academy Logo"
                      width={56}
                      height={56}
                      style={{
                        width: "56px",
                        height: "56px",
                        objectFit: "contain",
                        borderRadius: "10px",
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 800,
                          fontSize: "1.45rem",
                          color: "#0f172a",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        KINGAQUA ACADEMY
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#64748b",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                        }}
                      >
                        OFFICIAL PAYMENT RECEIPT • US LETTER LANDSCAPE
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        display: "inline-block",
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                        border: "1px solid #86efac",
                        fontWeight: 800,
                        fontSize: "0.8rem",
                        padding: "5px 14px",
                        borderRadius: "999px",
                        letterSpacing: "0.04em",
                      }}
                    >
                      PAID &amp; VERIFIED ✓
                    </span>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        color: "#0f172a",
                        fontWeight: 800,
                        marginTop: "6px",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {modalReceiptId}
                    </div>
                  </div>
                </div>

                {/* 3-Column Landscape Info Bar */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "20px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "16px 22px",
                    marginBottom: "22px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      Receipt ID / Date
                    </div>
                    <div
                      style={{
                        fontSize: "0.98rem",
                        fontWeight: 800,
                        color: "#0f172a",
                        marginTop: "4px",
                      }}
                    >
                      {modalReceiptId}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "2px" }}>
                      Date: {modalReceiptDate}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      Received From (Parent)
                    </div>
                    <div
                      style={{
                        fontSize: "0.98rem",
                        fontWeight: 800,
                        color: "#0f172a",
                        marginTop: "4px",
                      }}
                    >
                      {generatedReceiptInvoice.parent_name}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "2px" }}>
                      {modalFormattedPhone ? `+${modalFormattedPhone}` : "—"}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      Student / Child Details
                    </div>
                    <div
                      style={{
                        fontSize: "0.98rem",
                        fontWeight: 800,
                        color: "#0f172a",
                        marginTop: "4px",
                      }}
                    >
                      {generatedReceiptInvoice.student_name}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "2px" }}>
                      Class: {generatedReceiptInvoice.class_name}
                    </div>
                  </div>
                </div>

                {/* Landscape Line Item Table */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: "20px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "#0f172a",
                        color: "#ffffff",
                        fontSize: "0.76rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <th style={{ padding: "10px 14px", textAlign: "left", width: "50px" }}>
                        No.
                      </th>
                      <th style={{ padding: "10px 14px", textAlign: "left" }}>
                        Package Details / Description
                      </th>
                      <th style={{ padding: "10px 14px", textAlign: "left" }}>
                        Invoice No.
                      </th>
                      <th style={{ padding: "10px 14px", textAlign: "left" }}>
                        Class
                      </th>
                      <th style={{ padding: "10px 14px", textAlign: "right" }}>
                        Amount Paid (RM)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                      <td style={{ padding: "14px", fontWeight: 600 }}>1</td>
                      <td style={{ padding: "14px", fontWeight: 700, fontSize: "0.96rem" }}>
                        {generatedReceiptInvoice.title}
                      </td>
                      <td
                        style={{
                          padding: "14px",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.85rem",
                          color: "#475569",
                        }}
                      >
                        {generatedReceiptInvoice.invoice_number}
                      </td>
                      <td style={{ padding: "14px", fontSize: "0.88rem" }}>
                        {generatedReceiptInvoice.class_name}
                      </td>
                      <td
                        style={{
                          padding: "14px",
                          textAlign: "right",
                          fontWeight: 800,
                          fontSize: "1rem",
                        }}
                      >
                        RM {generatedReceiptInvoice.amount.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Section: Total Paid & Footer */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      minWidth: "320px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "24px",
                      padding: "12px 20px",
                      borderRadius: "10px",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #86efac",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 800,
                        color: "#166534",
                      }}
                    >
                      TOTAL AMOUNT PAID
                    </span>
                    <span
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 800,
                        color: "#15803d",
                      }}
                    >
                      RM {generatedReceiptInvoice.amount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    paddingTop: "12px",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.76rem",
                    color: "#64748b",
                  }}
                >
                  <span>
                    Thank you for your payment! This is an official computer-generated receipt
                    issued by Kingaqua Academy.
                  </span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>
                    Verified by Kingaqua Academy Staff
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar Below Landscape Receipt (Hidden when printing) */}
            <div
              className="no-print"
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setGeneratedReceiptInvoice(null)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#f8fafc",
                    color: "#0f172a",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  ← Back to Invoices
                </button>

                <button
                  type="button"
                  onClick={() => handleUndoApprove(generatedReceiptInvoice)}
                  disabled={isPending && processingId === generatedReceiptInvoice.id}
                  title={`Undo payment approval for ${generatedReceiptInvoice.student_name}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 14px",
                    borderRadius: "8px",
                    border: "1px solid #fca5a5",
                    backgroundColor: "#fff1f2",
                    color: "#dc2626",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor:
                      isPending && processingId === generatedReceiptInvoice.id
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                  {isPending && processingId === generatedReceiptInvoice.id
                    ? "Undoing..."
                    : "Undo Approval"}
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {/* Download Landscape PNG */}
                <button
                  type="button"
                  onClick={() => downloadLandscapeReceiptPng(generatedReceiptInvoice)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Landscape Image (PNG)
                </button>

                {/* Download Official Landscape PDF */}
                <button
                  type="button"
                  onClick={() => downloadLandscapePdf(generatedReceiptInvoice)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid #0284c7",
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="12" y2="18" />
                    <line x1="15" y1="15" x2="12" y2="18" />
                  </svg>
                  Download Landscape PDF
                </button>

                {/* Print Dialog */}
                <button
                  type="button"
                  onClick={handlePrintLandscapeReceipt}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Print Dialog
                </button>

                {/* Send via WhatsApp (with Real PDF) */}
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppWithPdf(generatedReceiptInvoice)}
                  disabled={isPreparingPdf === generatedReceiptInvoice.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "9px 16px",
                    borderRadius: "8px",
                    backgroundColor: "#25D366",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    border: "none",
                    cursor: isPreparingPdf === generatedReceiptInvoice.id ? "wait" : "pointer",
                  }}
                >
                  <WhatsAppIcon size={16} />
                  {isPreparingPdf === generatedReceiptInvoice.id
                    ? "Preparing PDF..."
                    : "Send via WhatsApp (PDF)"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL 3: WHATSAPP SENT & PDF GUIDANCE ── */}
      {mounted && whatsAppModalInfo && createPortal(
        <div
          id="whatsapp-guidance-backdrop"
          onClick={() => setWhatsAppModalInfo(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              maxWidth: "540px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#25D366",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)",
                  }}
                >
                  <WhatsAppIcon size={22} />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    WhatsApp Receipt Dispatched
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                    Official landscape PDF receipt generated &amp; sent
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppModalInfo(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  color: "#94a3b8",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "4px 8px",
                }}
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "24px" }}>
              {/* Recipient Details Card */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "18px",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                      Registered Parent
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                      {whatsAppModalInfo.parentName}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                      WhatsApp Number
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#25D366", marginTop: "2px" }}>
                      {whatsAppModalInfo.formattedPhone ? `+${whatsAppModalInfo.formattedPhone}` : "No phone registered"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                      Student / Child
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                      {whatsAppModalInfo.inv.student_name}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                      Receipt ID / Amount
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
                      {whatsAppModalInfo.receiptId} • RM {whatsAppModalInfo.inv.amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ color: "#22c55e", fontSize: "1rem", lineHeight: 1.2 }}>✓</span>
                  <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                    <strong>WhatsApp chat opened</strong> with +{whatsAppModalInfo.formattedPhone} containing official payment details.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ color: "#22c55e", fontSize: "1rem", lineHeight: 1.2 }}>✓</span>
                  <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                    <strong>Direct Cloud PDF Download Link included</strong> in the message — parent can tap the link on their phone to immediately download <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{whatsAppModalInfo.filename}</span>.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ color: "#22c55e", fontSize: "1rem", lineHeight: 1.2 }}>✓</span>
                  <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                    <strong>PDF downloaded to your PC:</strong>{" "}
                    <a
                      href={whatsAppModalInfo.downloadPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.8rem",
                        backgroundColor: "#f1f5f9",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        color: "#0284c7",
                        fontWeight: 700,
                        textDecoration: "underline",
                      }}
                    >
                      {whatsAppModalInfo.filename}
                    </a>
                  </div>
                </div>
                {whatsAppModalInfo.clipboardCopied && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span style={{ color: "#22c55e", fontSize: "1rem", lineHeight: 1.2 }}>✓</span>
                    <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                      <strong>Official Receipt copied to Clipboard:</strong> Press <strong>Ctrl + V</strong> inside WhatsApp Web to paste the visual receipt directly!
                    </div>
                  </div>
                )}
              </div>

              {/* Helpful Tip Box */}
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>💡</span>
                <div style={{ fontSize: "0.8rem", color: "#1e40af", lineHeight: 1.45 }}>
                  <strong>Quick ways to send in WhatsApp:</strong>
                  <div style={{ marginTop: "4px" }}>
                    1. <strong>Send the message as-is:</strong> The cloud link in the message now downloads the official PDF directly when tapped.<br />
                    2. <strong>Paste directly (Ctrl + V):</strong> Press <strong>Ctrl + V</strong> in the WhatsApp chat box to attach the copied receipt image.<br />
                    3. <strong>Attach PDF document:</strong> Drag &amp; drop <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{whatsAppModalInfo.filename}</span> from your browser downloads bar into the WhatsApp chat.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <a
                href={whatsAppModalInfo.downloadPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={whatsAppModalInfo.filename}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 13px",
                  borderRadius: "8px",
                  border: "1px solid #0284c7",
                  backgroundColor: "#f0f9ff",
                  color: "#0369a1",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  textDecoration: "none",
                }}
              >
                ⬇ Download PDF
              </a>
              <a
                href={whatsAppModalInfo.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 13px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  textDecoration: "none",
                }}
              >
                📄 View Cloud PDF
              </a>
              {typeof navigator !== "undefined" &&
                "share" in navigator &&
                whatsAppModalInfo.pdfFile && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (
                          whatsAppModalInfo.pdfFile &&
                          navigator.canShare &&
                          navigator.canShare({ files: [whatsAppModalInfo.pdfFile] })
                        ) {
                          await navigator.share({
                            files: [whatsAppModalInfo.pdfFile],
                            title: whatsAppModalInfo.filename,
                            text: `Official Payment Receipt ${whatsAppModalInfo.receiptId} for ${whatsAppModalInfo.inv.student_name}`,
                          });
                        }
                      } catch {
                        // user cancelled share sheet
                      }
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 13px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#0f172a",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    📤 Share PDF File
                  </button>
                )}
              <a
                href={whatsAppModalInfo.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 15px",
                  borderRadius: "8px",
                  backgroundColor: "#25D366",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(37, 211, 102, 0.3)",
                }}
              >
                <WhatsAppIcon size={14} /> Open WhatsApp Chat Again
              </a>
              <button
                type="button"
                onClick={() => setWhatsAppModalInfo(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
