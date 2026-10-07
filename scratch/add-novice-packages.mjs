import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addNoviceClassAndPackages() {
  // 1. Insert "Novice (test)" class
  let { data: newClass, error: clsErr } = await supabase
    .from("classes")
    .insert({
      name: "Novice (test)",
      type: "standard",
      description: "A test class for demonstration",
      is_active: true
    })
    .select("id")
    .single();

  if (clsErr && clsErr.code !== '23505') { // Ignore unique constraint if it exists
    console.error("Failed to create class:", clsErr);
    return;
  }

  if (!newClass) {
    const { data: existingClass } = await supabase.from("classes").select("id").eq("name", "Novice (test)").single();
    newClass = existingClass;
  }
  
  if (!newClass) {
    console.error("Could not find or create Novice class");
    return;
  }

  // 2. Get the test children
  const { data: children, error: cErr } = await supabase
    .from("students")
    .select("id, name")
    .in("name", ["Test Child One", "Test Child Two"]);

  if (cErr || !children || children.length === 0) {
    console.error("Failed to find children:", cErr);
    return;
  }

  const attendanceToInsert = [];

  // Helper to add days to current date (since we already did past dates, let's do future/recent)
  // Actually, we'll just do today and yesterday to make them the newest packages!
  const getRecentDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo); // We'll use 0, -1, -2 etc.
    return d.toISOString().split("T")[0];
  };

  for (const child of children) {
    const cId = child.id;
    
    // Add 8 present attendances (2 full packages) in the NEW Novice class.
    // They will be dated chronologically AFTER the ones inserted previously.
    // Previous script inserted dates: -40, -33, -26, -19, -12, -10, -8, -6, -4, -3, -2, -1.
    // So let's insert dates starting from today (+0) into the future, or just +1, +2 etc.
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getRecentDate(-1) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getRecentDate(-2) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getRecentDate(-3) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getRecentDate(-4) });
    
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "absent", date: getRecentDate(-5) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getRecentDate(-6) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getRecentDate(-7) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getRecentDate(-8) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getRecentDate(-9) });
  }

  // Insert records
  const { data, error } = await supabase
    .from("attendance")
    .insert(attendanceToInsert)
    .select();

  if (error) {
    console.error("Error inserting attendance:", error);
  } else {
    console.log(`Successfully generated ${data.length} attendance records in Novice (test) across ${children.length} children.`);
    
    // Update session_count for children to 18 (they had 10, now we added 8 present)
    for (const child of children) {
      await supabase
        .from("students")
        .update({ session_count: 18, class_id: newClass.id })
        .eq("id", child.id);
    }
    console.log("Updated session_counts to 18 and placed them in Novice (test).");
  }
}

addNoviceClassAndPackages();
