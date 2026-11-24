import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import type { SalesInvoice } from "@/lib/sales/types";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#0F172A",
  },
  outerBorder: {
    border: "1.5 solid #0F172A",
    borderRadius: 8,
    padding: 20,
    display: "flex",
    flexDirection: "column",
  },
  accentBarPaid: {
    height: 6,
    backgroundColor: "#47a9da",
    borderRadius: 3,
    marginBottom: 12,
  },
  accentBarUnpaid: {
    height: 6,
    backgroundColor: "#DC2626",
    borderRadius: 3,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottom: "1.5 solid #E2E8F0",
    marginBottom: 12,
  },
  logoAndBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 42,
    height: 42,
    objectFit: "contain",
  },
  brandTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    letterSpacing: 0.4,
  },
  brandSubtitle: {
    fontSize: 8,
    color: "#64748B",
    marginTop: 2,
    letterSpacing: 0.4,
  },
  badgePaid: {
    backgroundColor: "#DCFCE7",
    border: "1 solid #86EFAC",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    color: "#166534",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textAlign: "center",
  },
  badgePartial: {
    backgroundColor: "#FEF9C3",
    border: "1 solid #FDE047",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    color: "#854D0E",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textAlign: "center",
  },
  badgeUnpaid: {
    backgroundColor: "#FEF2F2",
    border: "1 solid #FCA5A5",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    color: "#DC2626",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textAlign: "center",
  },
  metaGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    border: "1 solid #E2E8F0",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    gap: 10,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    color: "#64748B",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  metaSub: {
    fontSize: 8,
    color: "#475569",
    marginTop: 2,
  },
  table: {
    border: "1 solid #E2E8F0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTop: "1 solid #F1F5F9",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTop: "1 solid #E2E8F0",
    backgroundColor: "#F1F5F9",
  },
  tableRowText: {
    fontSize: 8.5,
    color: "#1E293B",
  },
  bottomGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  notesBox: {
    flex: 1.3,
    border: "1 solid #E2E8F0",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#F8FAFC",
  },
  totalsBox: {
    flex: 1,
    border: "1 solid #E2E8F0",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#F8FAFC",
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 8.5,
    color: "#475569",
  },
  grandTotalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 6,
    borderTop: "1.5 solid #CBD5E1",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTop: "1 solid #E2E8F0",
    fontSize: 7.5,
    color: "#64748B",
  },
});

function formatDate(d?: string): string {
  if (!d) return "-";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SalesInvoicePdfDocument({ invoice }: { invoice: SalesInvoice }) {
  let logoBase64: string | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      const buf = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${buf.toString("base64")}`;
    }
  } catch {
    logoBase64 = null;
  }

  const isPaid = invoice.status === "paid";
  const isPartial = invoice.status === "partial";
  const badgeStyle = isPaid
    ? styles.badgePaid
    : isPartial
    ? styles.badgePartial
    : styles.badgeUnpaid;
  const badgeText = isPaid
    ? "PAID ✓"
    : isPartial
    ? "PARTIAL PAYMENT"
    : "UNPAID INVOICE";

  const lines = invoice.lines || [];
  let itemCounter = 0;

  return (
    <Document title={`Sales Invoice - ${invoice.number}`}>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.outerBorder}>
          {/* Top Accent Strip */}
          <View style={isPaid ? styles.accentBarPaid : styles.accentBarUnpaid} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.logoAndBrand}>
              {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
              <View>
                <Text style={styles.brandTitle}>KINGAQUA ACADEMY</Text>
                <Text style={styles.brandSubtitle}>
                  {isPaid
                    ? "OFFICIAL SALES RECEIPT • KINGAQUA ACADEMY"
                    : "OFFICIAL SALES INVOICE • KINGAQUA ACADEMY"}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={badgeStyle}>{badgeText}</Text>
              <Text
                style={{
                  fontSize: 8.5,
                  color: "#0F172A",
                  marginTop: 4,
                  fontFamily: "Helvetica-Bold",
                }}
              >
                {invoice.number}
              </Text>
            </View>
          </View>

          {/* Meta Info Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Customer / Billed To</Text>
              <Text style={styles.metaValue}>{invoice.customerName || "Customer"}</Text>
              {invoice.customerPhone ? (
                <Text style={styles.metaSub}>Tel: {invoice.customerPhone}</Text>
              ) : null}
              {invoice.billingInfo ? (
                <Text style={styles.metaSub}>{invoice.billingInfo}</Text>
              ) : null}
            </View>

            {invoice.shippingInfo ? (
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Shipping Info</Text>
                <Text style={styles.metaValue}>{invoice.shipBy && invoice.shipBy !== "-" ? invoice.shipBy : "Standard"}</Text>
                <Text style={styles.metaSub}>{invoice.shippingInfo}</Text>
              </View>
            ) : null}

            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Invoice Details</Text>
              <Text style={styles.metaValue}>Date: {formatDate(invoice.date)}</Text>
              <Text style={styles.metaSub}>Due: {formatDate(invoice.dueDate)}</Text>
              {invoice.paymentTerm && invoice.paymentTerm !== "-" ? (
                <Text style={styles.metaSub}>Term: {invoice.paymentTerm}</Text>
              ) : null}
              {invoice.ref ? (
                <Text style={styles.metaSub}>Ref: {invoice.ref}</Text>
              ) : null}
              {invoice.by ? (
                <Text style={styles.metaSub}>Issued By: {invoice.by}</Text>
              ) : null}
            </View>
          </View>

          {/* Line Items Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 22 }]}>#</Text>
              <Text style={[styles.tableHeaderText, { flex: 3.4 }]}>
                Item / Description
              </Text>
              <Text
                style={[styles.tableHeaderText, { flex: 0.9, textAlign: "center" }]}
              >
                Qty
              </Text>
              <Text
                style={[styles.tableHeaderText, { flex: 1.3, textAlign: "right" }]}
              >
                Price (RM)
              </Text>
              <Text
                style={[styles.tableHeaderText, { flex: 1.1, textAlign: "right" }]}
              >
                Disc (RM)
              </Text>
              <Text
                style={[styles.tableHeaderText, { flex: 1.4, textAlign: "right" }]}
              >
                Amount (RM)
              </Text>
            </View>

            {lines.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableRowText, { flex: 1, color: "#64748B" }]}>
                  No line items recorded.
                </Text>
              </View>
            ) : (
              lines.map((line, idx) => {
                if (line.kind === "title") {
                  return (
                    <View key={line.id || idx} style={styles.titleRow}>
                      <Text
                        style={{
                          fontSize: 8.5,
                          fontFamily: "Helvetica-Bold",
                          color: "#0F172A",
                        }}
                      >
                        {line.description}
                      </Text>
                    </View>
                  );
                }

                itemCounter++;
                return (
                  <View key={line.id || idx} style={styles.tableRow} wrap={false}>
                    <Text
                      style={[styles.tableRowText, { width: 22, color: "#64748B" }]}
                    >
                      {itemCounter}
                    </Text>
                    <View style={{ flex: 3.4 }}>
                      <Text
                        style={[
                          styles.tableRowText,
                          { fontFamily: "Helvetica-Bold" },
                        ]}
                      >
                        {line.description}
                      </Text>
                      {line.code ? (
                        <Text style={{ fontSize: 7.5, color: "#64748B", marginTop: 1 }}>
                          Code: {line.code}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.tableRowText,
                        { flex: 0.9, textAlign: "center" },
                      ]}
                    >
                      {line.unit ?? 1}
                    </Text>
                    <Text
                      style={[
                        styles.tableRowText,
                        { flex: 1.3, textAlign: "right" },
                      ]}
                    >
                      RM {Number(line.price || 0).toFixed(2)}
                    </Text>
                    <Text
                      style={[
                        styles.tableRowText,
                        { flex: 1.1, textAlign: "right", color: "#64748B" },
                      ]}
                    >
                      {Number(line.discount || 0) > 0
                        ? `-RM ${Number(line.discount).toFixed(2)}`
                        : "—"}
                    </Text>
                    <Text
                      style={[
                        styles.tableRowText,
                        {
                          flex: 1.4,
                          textAlign: "right",
                          fontFamily: "Helvetica-Bold",
                        },
                      ]}
                    >
                      RM {Number(line.amount || 0).toFixed(2)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          {/* Bottom Summary & Notes */}
          <View style={styles.bottomGrid}>
            <View style={styles.notesBox}>
              <Text style={styles.metaLabel}>Remarks &amp; Terms</Text>
              <Text style={{ fontSize: 8, color: "#334155", marginBottom: 4 }}>
                {invoice.remarks || "Thank you for your business with KingAqua Academy."}
              </Text>
              {invoice.terms ? (
                <Text style={{ fontSize: 7.5, color: "#64748B" }}>
                  Terms: {invoice.terms}
                </Text>
              ) : null}
              {!isPaid && (
                <Text
                  style={{
                    fontSize: 7.5,
                    color: "#991B1B",
                    fontFamily: "Helvetica-Bold",
                    marginTop: 4,
                  }}
                >
                  Payment Bank: Maybank • 5515 8406 8475 (KENCANA AQUA ACADEMY)
                </Text>
              )}
              {invoice.payments && invoice.payments.length > 0 && (
                <View style={{ marginTop: 6, paddingTop: 4, borderTop: "1 solid #E2E8F0" }}>
                  <Text style={styles.metaLabel}>Payments Recorded</Text>
                  {invoice.payments.map((p, i) => (
                    <Text key={p.id || i} style={{ fontSize: 7.5, color: "#15803D" }}>
                      {formatDate(p.date)} • {p.method} {p.reference ? `(${p.reference})` : ""}: RM {Number(p.amount || 0).toFixed(2)}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.totalsBox}>
              <View style={styles.totalLine}>
                <Text>Subtotal</Text>
                <Text>RM {Number(invoice.subtotal || 0).toFixed(2)}</Text>
              </View>
              {Number(invoice.delivery || 0) !== 0 && (
                <View style={styles.totalLine}>
                  <Text>Delivery</Text>
                  <Text>RM {Number(invoice.delivery).toFixed(2)}</Text>
                </View>
              )}
              {Number(invoice.discount || 0) !== 0 && (
                <View style={styles.totalLine}>
                  <Text>Discount</Text>
                  <Text>-RM {Number(invoice.discount).toFixed(2)}</Text>
                </View>
              )}
              {invoice.roundingEnabled && Number(invoice.rounding || 0) !== 0 && (
                <View style={styles.totalLine}>
                  <Text>Rounding</Text>
                  <Text>RM {Number(invoice.rounding).toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.grandTotalLine}>
                <Text>TOTAL</Text>
                <Text>RM {Number(invoice.total || 0).toFixed(2)}</Text>
              </View>
              <View style={[styles.totalLine, { marginTop: 6, color: "#059669" }]}>
                <Text>Amount Paid</Text>
                <Text>RM {Number(invoice.paid || 0).toFixed(2)}</Text>
              </View>
              <View
                style={[
                  styles.totalLine,
                  {
                    marginBottom: 0,
                    fontFamily: "Helvetica-Bold",
                    color: Number(invoice.balance || 0) > 0 ? "#DC2626" : "#059669",
                  },
                ]}
              >
                <Text>Balance Due</Text>
                <Text>RM {Number(invoice.balance || 0).toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text>
              Computer-generated Sales Invoice • Issued by KingAqua Academy
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#0F172A" }}>
              KingAqua Academy Management System
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
