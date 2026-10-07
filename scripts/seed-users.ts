import { createClient } from "@supabase/supabase-js";

// Ensure script is run with Node's --env-file flag
// e.g. node --env-file=.env.local --experimental-strip-types scripts/seed-users.ts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_USERS = [
  {
    email: "superadmin@kingaqua.test",
    password: "Password123!",
    role: "superadmin",
    display_name: "Superadmin Demo",
  },
  {
    email: "admin@kingaqua.test",
    password: "Password123!",
    role: "admin",
    display_name: "Admin Demo",
  },
  {
    email: "staff@kingaqua.test",
    password: "Password123!",
    role: "staff",
    display_name: "Staff Demo",
  },
  {
    email: "coach@kingaqua.test",
    password: "Password123!",
    role: "coach",
    display_name: "Coach Demo",
  },
  {
    email: "parent@kingaqua.test",
    password: "Password123!",
    role: "parent",
    display_name: "Parent Demo",
  },
];

async function seedUsers() {
  console.log("🚀 Starting demo user seed process...");

  for (const userData of DEMO_USERS) {
    console.log(`\n⏳ Processing ${userData.email}...`);
    
    // 1. Check if user already exists to avoid throwing errors on re-runs
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
    
    if (searchError) {
      console.error(`❌ Error fetching users:`, searchError.message);
      continue;
    }

    const exists = existingUsers.users.find((u) => u.email === userData.email);
    
    if (exists) {
      console.log(`✅ User ${userData.email} already exists. Skipping.`);
      continue;
    }

    // 2. Create the user using the Admin API
    // Note: The `handle_new_user` SQL trigger will automatically catch this
    // insert and copy the user over to the `public.users` table with the correct role.
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm email so they can log in immediately
      user_metadata: {
        role: userData.role,
        display_name: userData.display_name,
      },
    });

    if (createError) {
      console.error(`❌ Failed to create ${userData.email}:`, createError.message);
    } else {
      console.log(`🎉 Successfully created ${userData.email} (${newUser.user.id})`);
    }
  }

  console.log("\n✅ Seed process complete.");
}

seedUsers();
