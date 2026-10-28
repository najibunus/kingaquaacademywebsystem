import { createAdminClient } from "@/lib/supabase/server";
import styles from "./staff-roster.module.css";
import StaffRosterClient, { StaffMember } from "./StaffRosterClient";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const supabase = await createAdminClient();

  // Query users filtered strictly to staff and coach roles only
  const { data: members, error } = await supabase
    .from("users")
    .select("id, auth_id, display_name, phone, role, is_active, created_at, avatar_url")
    .in("role", ["staff", "coach"])
    .order("role", { ascending: true })
    .order("display_name", { ascending: true });

  const allMembers = ((members as unknown) as StaffMember[]) ?? [];
  const coaches = allMembers.filter((m) => m.role === "coach");
  const staff = allMembers.filter((m) => m.role === "staff");

  return (
    <div className="animate-fade-in-up">
      {error && (
        <div className={styles.errorBanner}>⚠ Failed to load team: {error.message}</div>
      )}

      {!error && allMembers.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No staff or coach accounts found. Create accounts in Supabase Auth and assign the appropriate role in the users table.</p>
        </div>
      ) : (
        <StaffRosterClient coaches={coaches} staff={staff} />
      )}
    </div>
  );
}
