import { createAdminClient } from "@/lib/supabase/server";
import styles from "./finances.module.css";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminFinancesPage({ searchParams }: PageProps) {
  const { status = "all" } = await searchParams;
  const supabase = await createAdminClient();

  // ── Metrics: aggregate invoice totals ──────────────────────────────────────
  // Fetch all invoices with their line items to compute accurate revenue
  const { data: allInvoices } = await supabase
    .from("invoices")
    .select("id, payment_status, invoice_items(quantity, unit_price)");

  let totalRevenue = 0;
  let pendingRevenue = 0;

  (allInvoices ?? []).forEach((inv) => {
    const items = inv.invoice_items as { quantity: number; unit_price: number }[] | null;
    const amount = (items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    if (inv.payment_status === "confirmed_paid") totalRevenue += amount;
    if (inv.payment_status === "unpaid" || inv.payment_status === "receipt_submitted") pendingRevenue += amount;
  });

  const confirmedCount      = (allInvoices ?? []).filter(i => i.payment_status === "confirmed_paid").length;
  const pendingCount        = (allInvoices ?? []).filter(i => i.payment_status === "unpaid").length;
  const reviewCount         = (allInvoices ?? []).filter(i => i.payment_status === "receipt_submitted").length;

  // ── Filtered transaction list ────────────────────────────────────────────
  let listQuery = supabase
    .from("invoices")
    .select("id, invoice_number, type, payment_status, created_at, students(name), invoice_items(quantity, unit_price)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (status !== "all") {
    listQuery = listQuery.eq(
      "payment_status",
      status as "unpaid" | "receipt_submitted" | "confirmed_paid" | "refunded"
    );
  }

  const { data: invoices, error } = await listQuery;

  const invoicesWithAmount = (invoices ?? []).map((inv) => {
    const items = inv.invoice_items as { quantity: number; unit_price: number }[] | null;
    return {
      ...inv,
      amount: (items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0),
      student: inv.students as { name: string } | null,
    };
  });

  function statusColor(s: string) {
    if (s === "confirmed_paid")    return { bg: "var(--color-success)", fg: "white" };
    if (s === "receipt_submitted") return { bg: "#d97706", fg: "white" };
    if (s === "unpaid")            return { bg: "#dc2626", fg: "white" };
    return { bg: "#e5e7eb", fg: "var(--text-secondary)" };
  }

  function statusText(s: string) {
    if (s === "confirmed_paid")    return "Paid";
    if (s === "receipt_submitted") return "Pending Review";
    if (s === "unpaid")            return "Unpaid";
    if (s === "refunded")          return "Refunded";
    return s;
  }

  function typeText(t: string) {
    if (t === "auto_4session") return "4-Session";
    if (t === "auto_monthly")  return "Monthly";
    return "Manual";
  }

  return (
    <div className="animate-fade-in-up">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Finances &amp; Invoices</h1>
          <p className={styles.subtitle}>Real-time revenue overview from your Supabase invoices table.</p>
        </div>
      </div>

      {/* ── Metrics Row ── */}
      <div className={styles.metricsGrid}>
        <div className={`card ${styles.metricCard}`}>
          <p className={styles.metricLabel}>Total Revenue</p>
          <p className={styles.metricValue}>RM {totalRevenue.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</p>
          <p className={styles.metricSub}>{confirmedCount} confirmed payment{confirmedCount !== 1 ? "s" : ""}</p>
        </div>
        <div className={`card ${styles.metricCard}`}>
          <p className={styles.metricLabel}>Pending Revenue</p>
          <p className={`${styles.metricValue} ${pendingRevenue > 0 ? styles.metricDanger : ""}`}>
            RM {pendingRevenue.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
          </p>
          <p className={styles.metricSub}>{pendingCount} unpaid · {reviewCount} awaiting review</p>
        </div>
        <div className={`card ${styles.metricCard}`}>
          <p className={styles.metricLabel}>Total Invoices</p>
          <p className={styles.metricValue}>{(allInvoices ?? []).length}</p>
          <p className={styles.metricSub}>All time</p>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <form method="GET" className={styles.filterBar}>
        <select name="status" defaultValue={status} className={styles.filterSelect}>
          <option value="all">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="receipt_submitted">Pending Review</option>
          <option value="confirmed_paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
        <button type="submit" className="btn btn-secondary">Filter</button>
      </form>

      {error && <div className={styles.errorBanner}>⚠ Failed to load invoices: {error.message}</div>}

      {/* ── Desktop table ── */}
      {invoicesWithAmount.length > 0 ? (
        <>
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Student</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {invoicesWithAmount.map((inv) => {
                  const col = statusColor(inv.payment_status);
                  return (
                    <tr key={inv.id}>
                      <td className={styles.invoiceNumCell}>{inv.invoice_number}</td>
                      <td className={styles.nameCell}>{inv.student?.name ?? "—"}</td>
                      <td>{typeText(inv.type)}</td>
                      <td className={styles.amountCell}>RM {inv.amount.toFixed(2)}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: col.bg, color: col.fg, fontSize: "0.75rem" }}>
                          {statusText(inv.payment_status)}
                        </span>
                      </td>
                      <td className={styles.dateCell}>
                        {new Date(inv.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className={styles.mobileList}>
            {invoicesWithAmount.map((inv) => {
              const col = statusColor(inv.payment_status);
              return (
                <div key={inv.id} className={styles.mobileCard}>
                  <div className={styles.mobileTop}>
                    <div>
                      <p className={styles.nameCell}>{inv.student?.name ?? "Unknown"}</p>
                      <p className={styles.invoiceNumCell}>{inv.invoice_number} · {typeText(inv.type)}</p>
                    </div>
                    <p className={styles.amountCell}>RM {inv.amount.toFixed(2)}</p>
                  </div>
                  <div className={styles.mobileBottom}>
                    <span className="badge" style={{ backgroundColor: col.bg, color: col.fg, fontSize: "0.72rem" }}>
                      {statusText(inv.payment_status)}
                    </span>
                    <p className={styles.dateCell}>
                      {new Date(inv.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className={styles.emptyState}>
          <p>No invoices match this filter. Generate invoices by running the session-check cron job.</p>
        </div>
      )}
    </div>
  );
}
