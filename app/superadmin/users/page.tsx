import { createAdminClient } from "@/lib/supabase/server";
import UsersSheetClient, {
  type SheetUser,
  type SheetStudent,
  type ParentOption,
} from "./UsersSheetClient";

export const dynamic = "force-dynamic";

export default async function SuperadminUsersPage() {
  const admin = await createAdminClient();

  // 1. Fetch user profiles
  const { data: profiles, error: usersError } = await admin
    .from("users")
    .select("id, auth_id, role, display_name, phone, is_active, created_at")
    .in("role", ["admin", "staff", "coach", "parent"])
    .order("created_at", { ascending: true });

  // 2. Fetch children / students
  const { data: studentsData, error: studentsError } = await admin
    .from("students")
    .select("id, name, gender, date_of_birth, status, parent_id, created_at")
    .order("name", { ascending: true });

  // 3. Paginate Auth users defensively for email & last sign-in
  const authMap = new Map<string, { email: string | null; last: string | null }>();
  let page = 1;
  for (;;) {
    const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listError || !data?.users?.length) break;
    data.users.forEach((u) =>
      authMap.set(u.id, { email: u.email ?? null, last: u.last_sign_in_at ?? null })
    );
    if (data.users.length < 1000) break;
    page += 1;
  }

  // 4. Map parent-to-children names
  const parentChildrenMap = new Map<string, string[]>();
  (studentsData ?? []).forEach((s: any) => {
    if (s.parent_id) {
      const list = parentChildrenMap.get(s.parent_id) || [];
      list.push(s.name ?? "Unnamed Child");
      parentChildrenMap.set(s.parent_id, list);
    }
  });

  // 5. Construct SheetUser objects
  const users: SheetUser[] = (profiles ?? []).map((p: any) => ({
    id: p.id,
    role: p.role,
    name: p.display_name ?? "",
    email: authMap.get(p.auth_id)?.email ?? "",
    phone: p.phone ?? "",
    active: p.is_active !== false,
    joined: p.created_at,
    lastSignIn: authMap.get(p.auth_id)?.last ?? null,
    childrenNames: parentChildrenMap.get(p.id) || [],
  }));

  // 6. Construct SheetStudent objects with parent linkage
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const students: SheetStudent[] = (studentsData ?? []).map((s: any) => {
    const p = s.parent_id ? profileMap.get(s.parent_id) : null;
    return {
      id: s.id,
      name: s.name ?? "",
      gender: s.gender ?? null,
      dateOfBirth: s.date_of_birth ?? null,
      status: s.status ?? "active",
      parentId: s.parent_id ?? null,
      parentName: p?.display_name || "Unassigned",
      parentEmail: p ? authMap.get(p.auth_id)?.email ?? "—" : "—",
      parentPhone: p?.phone ?? "—",
      joined: s.created_at,
    };
  });

  // 7. Extract parent options for re-assignment & creation
  const parentOptions: ParentOption[] = (profiles ?? [])
    .filter((p: any) => p.role === "parent")
    .map((p: any) => ({
      id: p.id,
      name: p.display_name || "Parent without name",
      phone: p.phone || undefined,
    }));

  const combinedError = usersError?.message || studentsError?.message || null;

  return (
    <UsersSheetClient
      initialUsers={users}
      initialStudents={students}
      parentOptions={parentOptions}
      loadError={combinedError}
    />
  );
}
