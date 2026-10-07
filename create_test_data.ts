import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  // 1. Find the UTHM PRIVATE class
  const { data: classes } = await supabase.from('classes').select('id, name').ilike('name', '%UTHM PRIVATE%').limit(1);
  if (!classes || classes.length === 0) {
    console.error("No UTHM PRIVATE class found.");
    return;
  }
  const privateClassId = classes[0].id;
  console.log(`Found Private Class: ${classes[0].name} (${privateClassId})`);

  // Define test cases
  const testCases = [
    {
      parentName: "Parent One (1 Person)",
      parentEmail: "parent1@test.com",
      tier: "1 Person (Private)",
      phone: "0111111111",
      students: ["Child 1A"]
    },
    {
      parentName: "Parent Two (2 People)",
      parentEmail: "parent2@test.com",
      tier: "2 People (Private)",
      phone: "0122222222",
      students: ["Child 2A", "Child 2B"]
    },
    {
      parentName: "Parent Three (3 People)",
      parentEmail: "parent3@test.com",
      tier: "3-5 People (Private)",
      phone: "0133333333",
      students: ["Child 3A", "Child 3B", "Child 3C"]
    }
  ];

  for (const tc of testCases) {
    console.log(`Setting up parent ${tc.parentEmail}...`);
    
    // Check if auth user exists
    const { data: users } = await supabase.auth.admin.listUsers();
    let user = users.users.find(u => u.email === tc.parentEmail);
    
    if (!user) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: tc.parentEmail,
        password: "password123",
        email_confirm: true
      });
      if (authError) {
        console.error(`Error creating auth user ${tc.parentEmail}:`, authError.message);
        continue;
      }
      user = authData.user;
    }
    
    const authId = user.id;
    
    // 3. UPDATE Parent Profile (assuming a trigger created it, or upsert it)
    const { data: profileData, error: profileError } = await supabase.from('users').upsert({
      auth_id: authId,
      display_name: tc.parentName,
      phone: tc.phone,
      role: 'parent',
      is_active: true
    }, { onConflict: 'auth_id' }).select('id').single();
    
    if (profileError) {
      console.error(`Error updating profile for ${tc.parentEmail}:`, profileError.message);
      continue;
    }
    
    const parentId = profileData.id;
    
    // 4. Create Students
    for (const studentName of tc.students) {
      console.log(`  Creating student ${studentName}...`);
      const { error: studentError } = await supabase.from('students').insert({
        name: studentName,
        parent_id: parentId,
        class_id: privateClassId,
        pricing_tier: tc.tier,
        status: 'active',
        session_count: 0
      });
      
      if (studentError) {
        console.error(`  Error creating student ${studentName}:`, studentError.message);
      }
    }
    console.log(`Successfully created test case for ${tc.parentName}`);
  }
}

run();
