import { createClient, createAdminClient } from "@/lib/supabase/server";
import ParentInvoicesClient from "./ParentInvoicesClient";
import { ensureInvoicesGenerated } from "@/lib/actions/autoInvoiceHelper";

export default async function ParentInvoicesPage() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const supabase = await createAdminClient();

  // Resolve the parent's users.id from their auth.id
  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user?.id ?? "")
    .single();

  const parentUserId = userRow?.id ?? "";

  // Auto-generate invoices for any unbilled packages on the fly
  if (parentUserId) {
    await ensureInvoicesGenerated(parentUserId);
  }

  // Fetch all invoices for this parent (with student name and line items)
  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, type, due_date, payment_status,
      students(name),
      invoice_items(description, quantity, unit_price)
    `)
    .eq("parent_id", parentUserId)
    .order("created_at", { ascending: false });

  // Fetch all students for this parent so we can merge names for group billing
  const { data: childrenData } = await supabase.from('students').select("id, name, classes(name, type), attendance(status, date, classes(name, type))").eq('parent_id', parentUserId);

  const { data: allInvoicesRaw } = await supabase.from('invoices').select('id, invoice_number, payment_status, created_at, type, payment_date, student_id').eq('parent_id', parentUserId);

  const { data: siblings } = await supabase
    .from("students")
    .select("id, name, class_id")
    .eq("parent_id", parentUserId);

  const siblingList = siblings || [];

  const formatted = (invoices ?? []).map((inv) => {
    const student = inv.students as { name: string } | null;
    const items = inv.invoice_items as { description?: string, quantity: number; unit_price: number }[] | null;
    const title = items?.[0]?.description ?? (inv.type === "auto_4session" ? "4-Session Package" : inv.type === "auto_monthly" ? "Monthly Fee" : "Manual Fee");
    
    // Default to the single student name
    let displayName = student?.name ?? "Unknown Student";
    
    // If this is a group bill, gather all siblings in the same class to show they are all covered
    if (title.includes("- Group")) {
      // Find the class_id of the student this invoice belongs to
      // (Since we didn't fetch class_id in the invoices query, we can find it in siblingList)
      const invStudent = siblingList.find(s => s.name === displayName);
      if (invStudent) {
        const groupSiblings = siblingList.filter(s => s.class_id === invStudent.class_id);
        if (groupSiblings.length > 1) {
          displayName = groupSiblings.map(s => s.name).join(" & ");
        }
      }
    }

    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      type: inv.type,
      due_date: inv.due_date,
      payment_status: inv.payment_status as
        | "unpaid"
        | "receipt_submitted"
        | "confirmed_paid"
        | "refunded",
      student_name: displayName,
      title,
      items: items ?? [],
    };
  });

  const unpaid = formatted.filter(
    (i) => i.payment_status === "unpaid"
  );
  const pending = formatted.filter(
    (i) => i.payment_status === "receipt_submitted"
  );
  const history = formatted.filter(
    (i) => i.payment_status === "confirmed_paid" || i.payment_status === "refunded"
  );

  return <ParentInvoicesClient unpaid={unpaid} pending={pending} history={history} children={childrenData || []} allInvoices={allInvoicesRaw || []} />;
}


