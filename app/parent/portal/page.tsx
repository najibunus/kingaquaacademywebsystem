import { createClient, createAdminClient } from "@/lib/supabase/server";
import ParentPortalClient from "./ParentPortalClient";

export default async function ParentPortalPage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  const supabase = await createAdminClient();
  const { data: userRow } = await supabase.from("users").select("id").eq("auth_id", user?.id ?? "").single();
  const parentId = userRow?.id ?? "";

  const { data: children, error: childrenError } = await supabase
    .from("students")
    .select(`
      id, name, session_count, avatar_url, date_of_birth, gender, real_ic, school_name,
      classes(name, type),
      invoices(id, invoice_number, payment_status, created_at, type, payment_date),
      attendance(status, date, classes(name, type)),
      student_evaluations(star_rating, comments, skill_tag, created_at)
    `)
    .eq("parent_id", parentId)
    ;

  const { data: allInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, payment_status, created_at, type, payment_date, student_id")
    .eq("parent_id", parentId);

  console.log("Portal parentId:", parentId, "Children:", children, "Error:", childrenError?.message, childrenError?.details, childrenError?.hint); return (
    <ParentPortalClient 
      unpaidInvoices={(allInvoices as any) || []} 
      children={children || []} 
    />
  );
}




