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

export interface CoachClassSessionPdfItem {
  dateFormatted: string;
  dayName: string;
  timeRange: string;
  className: string;
  locationName?: string;
  classType: string;
  status: string;
  remarks?: string;
}

export interface CoachClassGroupSummary {
  className: string;
  locationName?: string;
  classType: string;
  attendedCount: number;
  ratePerClass: number;
  subtotal: number;
}

export interface CoachPaymentPdfProps {
  statementId: string;
  issueDate: string;
  monthLabel: string;
  year: number;
  coachName: string;
  coachPhone: string;
  ratePerClass: number;
  totalScheduledCount: number;
  attendedClassesCount: number;
  absentClassesCount: number;
  totalPaymentAmount: number;
  classSummaries: CoachClassGroupSummary[];
  sessions: CoachClassSessionPdfItem[];
}

const styles = StyleSheet.create({
  page: {
    padding: 28,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#0F172A",
  },
  outerContainer: {
    border: "1.5 solid #0F172A",
    borderRadius: 8,
    padding: 20,
    display: "flex",
    flexDirection: "column",
  },
  accentBar: {
    height: 6,
    backgroundColor: "#47a9da",
    borderRadius: 3,
    marginBottom: 12,
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
  badge: {
    backgroundColor: "#EFF6FF",
    border: "1 solid #93C5FD",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    color: "#1D4ED8",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    textAlign: "center",
  },
  metaGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    border: "1 solid #E2E8F0",
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
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
    fontSize: 8,
    color: "#475569",
    marginTop: 2,
  },
  highlightBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    border: "1.5 solid #6EE7B7",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  highlightMetric: {
    flexDirection: "column",
  },
  highlightLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#065F46",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  highlightValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#047857",
  },
  highlightTotalValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#065F46",
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  table: {
    border: "1 solid #E2E8F0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 14,
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
  tableRowText: {
    fontSize: 8.5,
    color: "#1E293B",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    borderTop: "1.5 solid #CBD5E1",
  },
  totalLabel: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
  },
  totalAmount: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#059669",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    marginTop: 6,
    borderTop: "1 solid #E2E8F0",
    fontSize: 7.5,
    color: "#64748B",
  },
});

export function CoachPaymentPdfDocument(props: CoachPaymentPdfProps) {
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

  return (
    <Document
      title={`Coach Payment Statement - ${props.coachName} - ${props.monthLabel} ${props.year}`}
    >
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.outerContainer}>
          {/* Top Brand Accent Bar */}
          <View style={styles.accentBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.logoAndBrand}>
              {logoBase64 && <Image src={logoBase64} style={styles.logo} />}
              <View>
                <Text style={styles.brandTitle}>KINGAQUA ACADEMY</Text>
                <Text style={styles.brandSubtitle}>
                  COACH MONTHLY CLASS ATTENDANCE &amp; PAYMENT STATEMENT
                </Text>
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.badge}>
                {props.monthLabel.toUpperCase()} {props.year}
              </Text>
              <Text
                style={{
                  fontSize: 7.5,
                  color: "#64748B",
                  marginTop: 3,
                  fontFamily: "Helvetica-Bold",
                }}
              >
                Ref: {props.statementId}
              </Text>
            </View>
          </View>

          {/* Meta Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Coach Name</Text>
              <Text style={styles.metaValue}>{props.coachName}</Text>
              <Text style={styles.metaSub}>
                {props.coachPhone ? `Tel: ${props.coachPhone}` : "Swimming Coach"}
              </Text>
            </View>

            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Billing Period</Text>
              <Text style={styles.metaValue}>
                {props.monthLabel} {props.year}
              </Text>
              <Text style={styles.metaSub}>Issued: {props.issueDate}</Text>
            </View>

            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Attendance Summary</Text>
              <Text style={styles.metaValue}>
                {props.attendedClassesCount} Class(es) Attended
              </Text>
              <Text style={styles.metaSub}>
                {props.totalScheduledCount} Scheduled
                {props.absentClassesCount > 0
                  ? ` • ${props.absentClassesCount} Absent`
                  : ""}
              </Text>
            </View>

            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Coach Rate / Class</Text>
              <Text style={styles.metaValue}>
                RM {props.ratePerClass.toFixed(2)}
              </Text>
              <Text style={styles.metaSub}>Per Attended Class</Text>
            </View>
          </View>

          {/* Payment Calculation Highlight Banner */}
          <View style={styles.highlightBox}>
            <View style={styles.highlightMetric}>
              <Text style={styles.highlightLabel}>Total Classes Attended</Text>
              <Text style={styles.highlightValue}>
                {props.attendedClassesCount} Class
                {props.attendedClassesCount === 1 ? "" : "es"}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 14,
                fontFamily: "Helvetica-Bold",
                color: "#047857",
              }}
            >
              ×
            </Text>

            <View style={styles.highlightMetric}>
              <Text style={styles.highlightLabel}>Price Per Class</Text>
              <Text style={styles.highlightValue}>
                RM {props.ratePerClass.toFixed(2)}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 14,
                fontFamily: "Helvetica-Bold",
                color: "#047857",
              }}
            >
              =
            </Text>

            <View style={[styles.highlightMetric, { alignItems: "flex-end" }]}>
              <Text style={styles.highlightLabel}>
                Total Monthly Payment ({props.monthLabel} {props.year})
              </Text>
              <Text style={styles.highlightTotalValue}>
                RM {props.totalPaymentAmount.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Table 1: Breakdown by Class */}
          <Text style={styles.sectionTitle}>
            1. Monthly Summary by Class ({props.monthLabel} {props.year})
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 4 }]}>
                Class Name &amp; Location
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1.5, textAlign: "center" },
                ]}
              >
                Attended Classes
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1.5, textAlign: "right" },
                ]}
              >
                Price / Class (RM)
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1.5, textAlign: "right" },
                ]}
              >
                Subtotal (RM)
              </Text>
            </View>

            {props.classSummaries.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableRowText, { flex: 1, color: "#64748B" }]}>
                  No attended classes recorded for {props.monthLabel} {props.year}.
                </Text>
              </View>
            ) : (
              props.classSummaries.map((cs, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <View style={{ flex: 4 }}>
                    <Text
                      style={[
                        styles.tableRowText,
                        { fontFamily: "Helvetica-Bold" },
                      ]}
                    >
                      {cs.className} ({cs.classType})
                    </Text>
                    {cs.locationName ? (
                      <Text style={{ fontSize: 7.5, color: "#64748B", marginTop: 1 }}>
                        Location: {cs.locationName}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.tableRowText,
                      {
                        flex: 1.5,
                        textAlign: "center",
                        fontFamily: "Helvetica-Bold",
                      },
                    ]}
                  >
                    {cs.attendedCount}
                  </Text>
                  <Text
                    style={[
                      styles.tableRowText,
                      { flex: 1.5, textAlign: "right" },
                    ]}
                  >
                    RM {cs.ratePerClass.toFixed(2)}
                  </Text>
                  <Text
                    style={[
                      styles.tableRowText,
                      {
                        flex: 1.5,
                        textAlign: "right",
                        fontFamily: "Helvetica-Bold",
                      },
                    ]}
                  >
                    RM {cs.subtotal.toFixed(2)}
                  </Text>
                </View>
              ))
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Total Attended Classes: {props.attendedClassesCount} × RM{" "}
                {props.ratePerClass.toFixed(2)} / class
              </Text>
              <Text style={styles.totalAmount}>
                RM {props.totalPaymentAmount.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Table 2: Chronological Class Session Log */}
          <Text style={styles.sectionTitle}>
            2. Detailed Class Attendance Schedule ({props.sessions.length}{" "}
            Session{props.sessions.length === 1 ? "" : "s"})
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { width: 24 }]}>#</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.6 }]}>
                Date &amp; Day
              </Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>
                Time Slot
              </Text>
              <Text style={[styles.tableHeaderText, { flex: 2.5 }]}>
                Class &amp; Remarks
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1, textAlign: "center" },
                ]}
              >
                Status
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1.2, textAlign: "right" },
                ]}
              >
                Amount (RM)
              </Text>
            </View>

            {props.sessions.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableRowText, { flex: 1, color: "#64748B" }]}>
                  No class sessions scheduled in {props.monthLabel} {props.year}.
                </Text>
              </View>
            ) : (
              props.sessions.map((s, idx) => {
                const isPresent = s.status === "present";
                const rowAmount = isPresent ? props.ratePerClass : 0;
                return (
                  <View key={idx} style={styles.tableRow} wrap={false}>
                    <Text
                      style={[
                        styles.tableRowText,
                        { width: 24, color: "#64748B" },
                      ]}
                    >
                      {idx + 1}
                    </Text>
                    <Text
                      style={[
                        styles.tableRowText,
                        { flex: 1.6, fontFamily: "Helvetica-Bold" },
                      ]}
                    >
                      {s.dateFormatted} ({s.dayName})
                    </Text>
                    <Text
                      style={[
                        styles.tableRowText,
                        { flex: 1.5, color: "#0369A1" },
                      ]}
                    >
                      {s.timeRange}
                    </Text>
                    <View style={{ flex: 2.5 }}>
                      <Text
                        style={[
                          styles.tableRowText,
                          { fontFamily: "Helvetica-Bold" },
                        ]}
                      >
                        {s.className}
                      </Text>
                      {(s.locationName || s.remarks) && (
                        <Text
                          style={{
                            fontSize: 7.5,
                            color: "#64748B",
                            marginTop: 1,
                          }}
                        >
                          {[s.locationName, s.remarks]
                            .filter(Boolean)
                            .join(" • ")}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.tableRowText,
                        {
                          flex: 1,
                          textAlign: "center",
                          fontFamily: "Helvetica-Bold",
                          color: isPresent ? "#15803D" : "#DC2626",
                        },
                      ]}
                    >
                      {isPresent ? "ATTENDED" : s.status.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.tableRowText,
                        {
                          flex: 1.2,
                          textAlign: "right",
                          fontFamily: "Helvetica-Bold",
                          color: isPresent ? "#0F172A" : "#94A3B8",
                        },
                      ]}
                    >
                      RM {rowAmount.toFixed(2)}
                    </Text>
                  </View>
                );
              })
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                TOTAL PAYABLE ({props.attendedClassesCount} Attended Class
                {props.attendedClassesCount === 1 ? "" : "es"} @ RM{" "}
                {props.ratePerClass.toFixed(2)} / class):
              </Text>
              <Text style={styles.totalAmount}>
                RM {props.totalPaymentAmount.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text>
              Computer-generated Coach Monthly Attendance &amp; Payment Statement
              • KingAqua Academy
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#0F172A" }}>
              Verified by KingAqua Academy Administration
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
