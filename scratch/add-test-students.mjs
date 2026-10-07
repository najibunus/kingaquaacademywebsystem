import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addStudents() {
  // 1. Find Beginner Dolphin class
  const { data: classes, error: classErr } = await supabase
    .from("classes")
    .select("id")
    .ilike("name", "%Beginner Dolphin%")
    .limit(1);

  if (classErr) {
    console.error("Error finding class:", classErr);
    return;
  }

  if (!classes || classes.length === 0) {
    console.error("Could not find class 'Beginner Dolphin'");
    return;
  }

  const classId = classes[0].id;

  // 2. Prepare 10 test students
  const testStudents = [];
  for (let i = 1; i <= 10; i++) {
    testStudents.push({
      name: `Test Dolphin ${i}`,
      class_id: classId,
      status: "active",
      session_count: 0
    });
  }

  // 3. Insert
  const { data, error } = await supabase
    .from("students")
    .insert(testStudents)
    .select();

  if (error) {
    console.error("Error inserting students:", error);
  } else {
    console.log(`Successfully added ${data.length} test students to Beginner Dolphin!`);
  }
}

addStudents();
