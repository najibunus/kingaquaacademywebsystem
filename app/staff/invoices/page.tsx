import { createAdminClient } from "@/lib/supabase/server";
import InvoicesClient from "./InvoicesClient";

export default async function StaffInvoicesPage() {
  const supabase = await createAdminClient();

  const [
    { data: invoices },
    { data: activeStudents },
    { data: classes }
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select(`
        id, invoice_number, type, created_at, receipt_url, payment_status,
        students(name, class_id, classes(name)),
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
      .order("name", { ascending: true })
  ]);

  // Map and calculate amounts
  const formattedInvoices = (invoices ?? []).map((inv) => {
    const student = inv.students as any;
    const items = inv.invoice_items as { description?: string, quantity: number; unit_price: number }[] | null;
    const amount = (items ?? []).reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const title = items?.[0]?.description ?? (inv.type === "auto_4session" ? "4-Session Package" : inv.type === "auto_monthly" ? "Monthly Fee" : "Manual Fee");

    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      type: inv.type,
      created_at: inv.created_at,
      receipt_url: inv.receipt_url,
      payment_status: inv.payment_status,
      student_name: student?.name ?? "Unknown Student",
      class_id: student?.class_id ?? null,
      class_name: student?.classes?.name ?? "Unassigned",
      amount,
      title
    };
  });

  return (
    <InvoicesClient 
      invoices={formattedInvoices} 
      students={activeStudents ?? []} 
      classes={classes ?? []}
    />
  );
}
