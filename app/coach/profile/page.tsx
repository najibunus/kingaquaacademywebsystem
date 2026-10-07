import { createClient, createAdminClient } from "@/lib/supabase/server";
import ProfileClient from "./ProfileClient";

export default async function CoachProfilePage() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  const supabase = await createAdminClient();

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", user?.id ?? "")
    .single();

  const fullProfile = {
    ...userProfile,
    email: user?.email,
  };

  return <ProfileClient userProfile={fullProfile} />;
}
