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

export interface ReceiptPdfItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface ReceiptPdfProps {
  receiptId: string;
  invoiceNumber: string;
  date: string;
  parentName: string;
  parentPhone: string;
  studentName: string;
  className: string;
  title: string;
  amount: number;
  items: ReceiptPdfItem[];
  isPaid?: boolean;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0F172A",
  },
  outerBorder: {
    border: "2 solid #0F172A",
    borderRadius: 8,
    padding: 24,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  accentBar: {
    height: 6,
    backgroundColor: "#47a9da",
    borderRadius: 3,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottom: "1.5 solid #E2E8F0",
    marginBottom: 14,
  },
  logoAndBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  brandTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 8,
    color: "#64748B",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: "#DCFCE7",
    border: "1 solid #86EFAC",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    color: "#166534",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "center",
  },
  metaGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    border: "1 solid #E2E8F0",
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7.5,
    color: "#64748B",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  metaSub: {
    fontSize: 8.5,
    color: "#475569",
    marginTop: 1,
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
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  tableHeaderText: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTop: "1 solid #F1F5F9",
  },
  tableRowText: {
    fontSize: 9.5,
    color: "#1E293B",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    borderTop: "1.5 solid #E2E8F0",
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#64748B",
    marginRight: 14,
  },
  totalAmount: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
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

export function ReceiptPdfDocument(props: ReceiptPdfProps) {
  // Attempt to load base64 logo if available
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

  const items =
    props.items && props.items.length > 0
      ? props.items
      : [
          {
            description: props.title,
            quantity: 1,
            unit_price: props.amount,
          },
        ];

  return (
    <Document title={`Receipt - ${props.receiptId}`}>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.outerBorder}>
          <View>
            {/* Top Accent Strip */}
            <View style={styles.accentBar} />

            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={styles.logoAndBrand}>
                {logoBase64 && (
                  <Image src={logoBase64} style={styles.logo} />
                )}
                <View>
                  <Text style={styles.brandTitle}>KINGAQUA ACADEMY</Text>
                  <Text style={styles.brandSubtitle}>
                    {props.isPaid !== false ? "OFFICIAL PAYMENT RECEIPT • US LETTER LANDSCAPE FORMAT" : "OFFICIAL INVOICE • US LETTER LANDSCAPE FORMAT"}
                  </Text>
                </View>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={props.isPaid !== false ? styles.badge : [styles.badge, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5", color: "#991B1B" }]}>
                  {props.isPaid !== false ? "PAID & VERIFIED ✓" : "UNPAID INVOICE"}
                </Text>
                <Text
                  style={{
                    fontSize: 8,
                    color: "#64748B",
                    marginTop: 3,
                    fontFamily: "Helvetica-Bold",
                  }}
                >
                  {props.receiptId}
                </Text>
              </View>
            </View>

            {/* Meta Information Grid (4 Columns) */}
            <View style={styles.metaGrid}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>{props.isPaid !== false ? "Receipt ID" : "Invoice No"}</Text>
                <Text style={styles.metaValue}>{props.receiptId}</Text>
                <Text style={styles.metaSub}>Ref: {props.invoiceNumber}</Text>
              </View>

              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>{props.isPaid !== false ? "Payment Date" : "Date Issued"}</Text>
                <Text style={styles.metaValue}>{props.date}</Text>
                <Text style={styles.metaSub}>Method: Bank Transfer / Online</Text>
              </View>

              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Received From (Parent)</Text>
                <Text style={styles.metaValue}>{props.parentName}</Text>
                <Text style={styles.metaSub}>{props.parentPhone || "Verified Parent"}</Text>
              </View>

              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Student &amp; Class</Text>
                <Text style={styles.metaValue}>{props.studentName}</Text>
                <Text style={styles.metaSub}>{props.className}</Text>
              </View>
            </View>

            {/* Table of Items */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 4 }]}>
                  Description / Fee Details
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    { flex: 1, textAlign: "center" },
                  ]}
                >
                  Qty
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    { flex: 2, textAlign: "right" },
                  ]}
                >
                  Unit Price
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    { flex: 2, textAlign: "right" },
                  ]}
                >
                  Amount (RM)
                </Text>
              </View>

              {items.map((it, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text
                    style={[
                      styles.tableRowText,
                      { flex: 4, fontFamily: "Helvetica-Bold" },
                    ]}
                  >
                    {it.description}
                  </Text>
                  <Text
                    style={[
                      styles.tableRowText,
                      { flex: 1, textAlign: "center" },
                    ]}
                  >
                    {it.quantity}
                  </Text>
                  <Text
                    style={[
                      styles.tableRowText,
                      { flex: 2, textAlign: "right" },
                    ]}
                  >
                    RM {it.unit_price.toFixed(2)}
                  </Text>
                  <Text
                    style={[
                      styles.tableRowText,
                      {
                        flex: 2,
                        textAlign: "right",
                        fontFamily: "Helvetica-Bold",
                      },
                    ]}
                  >
                    RM {(it.quantity * it.unit_price).toFixed(2)}
                  </Text>
                </View>
              ))}

              {/* Total Row */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL AMOUNT PAID:</Text>
                <Text style={styles.totalAmount}>
                  RM {props.amount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text>
              Thank you for your payment! This is an official computer-generated
              receipt issued by Kingaqua Academy.
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#0F172A" }}>
              Verified by Kingaqua Academy Staff
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
