import { createAdminClient } from "@/lib/supabase/server";
import styles from "./staff-parents.module.css";
import StaffParentsClient from "./StaffParentsClient";

export default async function StaffParentsPage() {
  const supabase = await createAdminClient();

  // 1. Fetch all parents from `users` table
  const { data: parents, error: parentsError } = await supabase
    .from("users")
    .select("id, auth_id, display_name, phone, is_active, created_at, students(id, name)")
    .eq("role", "parent")
    .order("display_name", { ascending: true });

  if (parentsError) {
    return (
      <div className="animate-fade-in-up">
        <div className={styles.errorBanner}>
          Failed to load parents: {parentsError.message}
        </div>
      </div>
    );
  }

  // 2. Fetch all students for the assignment dropdown
  const { data: allStudents } = await supabase
    .from("students")
    .select("id, name, parent_id")
    .order("name", { ascending: true });

  // 3. Fetch all auth users to get emails (requires admin client)
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    return (
      <div className="animate-fade-in-up">
        <div className={styles.errorBanner}>
          Failed to load auth data: {authError.message}
        </div>
      </div>
    );
  }

  // Create lookup for emails
  const emailMap = new Map();
  authData.users.forEach((u) => {
    emailMap.set(u.id, u.email);
  });

  // 4. Merge data
  const mergedParents = (parents || []).map((p: any) => ({
    id: p.id,
    auth_id: p.auth_id,
    display_name: p.display_name,
    phone: p.phone,
    is_active: p.is_active,
    created_at: p.created_at,
    email: emailMap.get(p.auth_id) || "No email",
    students: p.students || [],
  }));

  return (
    <StaffParentsClient 
      initialParents={mergedParents} 
      allStudents={allStudents || []} 
    />
  );
}
