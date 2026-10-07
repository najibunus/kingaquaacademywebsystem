import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
  
  if (authErr) {
    console.error("Auth list error:", authErr);
    return;
  }

  const authUser = users.find(u => u.email === "testparent@kingaqua.test");
  if (!authUser) {
    console.error("Could not find auth user for testparent@kingaqua.test");
    return;
  }

  const { data: parent, error: pErr } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUser.id)
    .single();

  if (pErr || !parent) {
    console.error("Could not find public.users record for testparent:", pErr);
    return;
  }

  const parentId = parent.id;
  console.log("Found parent ID:", parentId);

  // We can either update existing test students or insert new ones.
  // Let's insert 2 specific children for this parent.
  const children = [
    { name: "Test Child One", status: "active", session_count: 0, parent_id: parentId },
    { name: "Test Child Two", status: "active", session_count: 0, parent_id: parentId }
  ];

  const { data, error } = await supabase
    .from("students")
    .insert(children)
    .select();

  if (error) {
    console.error("Error inserting children:", error);
  } else {
    console.log("Successfully inserted children:", data.map(d => d.name));
  }
}

run();
