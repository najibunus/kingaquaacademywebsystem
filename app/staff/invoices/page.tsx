import { createAdminClient } from "@/lib/supabase/server";
import InvoicesClient from "./InvoicesClient";
import { generateReceiptId } from "@/lib/utils/whatsapp";
import {
  getCurrentStaffName,
  getInvoices as getSalesInvoices,
  loadSalesFormData,
} from "@/lib/sales/store";

export default async function StaffInvoicesPage() {
  const supabase = await createAdminClient();

  const [
    { data: invoices },
    { data: activeStudents },
    { data: classes },
    salesFormData,
    staffName,
    salesInvoices,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select(`
        id, invoice_number, type, created_at, payment_date, receipt_url, payment_status, parent_id,
        users:parent_id(id, display_name, phone),
        students(name, class_id, parent_id, classes(name), users:parent_id(id, display_name, phone)),
        invoice_items(description, quantity, unit_price)
      `)
      .in("payment_status", ["receipt_submitted", "unpaid", "confirmed_paid"])
      .order("created_at", { ascending: false })
      .limit(300),

    supabase
      .from("students")
      .select("id, name, parent_id")
      .eq("status", "active")
      .order("name", { ascending: true }),

    supabase
      .from("classes")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true }),

    loadSalesFormData(),
    getCurrentStaffName(),
    getSalesInvoices(),
  ]);

  // Map and calculate amounts + parent details + receipt ID
  const formattedInvoices = (invoices ?? []).map((inv: any) => {
    const student = inv.students as any;
    const directParent = inv.users as { display_name?: string | null; phone?: string | null } | null;
    const studentParent = student?.users as { display_name?: string | null; phone?: string | null } | null;

    const parentName =
      directParent?.display_name ||
      studentParent?.display_name ||
      "Valued Parent";
    const parentPhone =
      directParent?.phone ||
      studentParent?.phone ||
      "";

    const items = inv.invoice_items as
      | { description?: string; quantity: number; unit_price: number }[]
      | null;
    const amount = (items ?? []).reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
    const title =
      items?.[0]?.description ??
      (inv.type === "auto_4session"
        ? "4-Session Package"
        : inv.type === "auto_monthly"
        ? "Monthly Fee"
        : "Manual Fee");

    return {
      id: inv.id,
      receipt_id: generateReceiptId(inv.invoice_number, inv.id),
      invoice_number: inv.invoice_number,
      type: inv.type,
      created_at: inv.created_at,
      payment_date: inv.payment_date || inv.created_at,
      receipt_url: inv.receipt_url,
      payment_status: inv.payment_status,
      parent_name: parentName,
      parent_phone: parentPhone,
      student_name: student?.name ?? "Unknown Student",
      class_id: student?.class_id ?? null,
      class_name: student?.classes?.name ?? "Unassigned",
      amount,
      title,
    };
  });

  return (
    <InvoicesClient
      invoices={formattedInvoices}
      students={activeStudents ?? []}
      classes={classes ?? []}
      salesCustomers={salesFormData.customers}
      salesProducts={salesFormData.products}
      salesCategories={salesFormData.categories}
      staffName={staffName}
      initialSalesInvoices={salesInvoices}
    />
  );
}
