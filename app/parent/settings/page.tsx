import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ParentSettingsClient from "./ParentSettingsClient";

export default async function ParentSettingsPage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Use admin client securely by strictly filtering by the authenticated user's auth_id
  const supabase = await createAdminClient();
  
  const { data: userProfile } = await supabase
    .from("users")
    .select("id, display_name, phone")
    .eq("auth_id", user.id)
    .single();

  const parentId = userProfile?.id ?? "";

  const { data: children } = await supabase
    .from("students")
    .select("id, name, date_of_birth, gender, avatar_url, class_id, classes(name)")
    .eq("parent_id", parentId)
    .eq("status", "active")
    .order("name");

  const profile = {
    email: user.email ?? "",
    displayName: userProfile?.display_name ?? "",
    phone: userProfile?.phone ?? "",
  };

  return <ParentSettingsClient profile={profile} childrenData={(children as any[]) || []} />;
}
