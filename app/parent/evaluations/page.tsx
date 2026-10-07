import { createClient, createAdminClient } from "@/lib/supabase/server";
import ParentEvaluationsClient from "./ParentEvaluationsClient";

export default async function ParentEvaluationsPage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  const supabase = await createAdminClient();

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user?.id ?? "")
    .single();

  const parentId = userRow?.id ?? "";

  const { data: children } = await supabase
    .from("students")
    .select(`
      id, name,
      student_evaluations(id, star_rating, comments, skill_tag, created_at)
    `)
    .eq("parent_id", parentId)
    .eq("status", "active");

  return <ParentEvaluationsClient children={children || []} />;
}
