import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generatePackages() {
  // 1. Get test children
  const { data: children, error: cErr } = await supabase
    .from("students")
    .select("id, name")
    .in("name", ["Test Child One", "Test Child Two"]);

  if (cErr || !children || children.length === 0) {
    console.error("Failed to find children:", cErr);
    return;
  }

  // 2. Get some classes
  const { data: classes, error: clsErr } = await supabase
    .from("classes")
    .select("id, name")
    .limit(2);

  if (clsErr || !classes || classes.length < 2) {
    console.error("Failed to find enough classes:", clsErr);
    return;
  }

  const class1 = classes[0]; // e.g. Beginner Dolphin
  const class2 = classes[1]; // e.g. Intermediate Shark

  const attendanceToInsert = [];

  // Helper to subtract days
  const getPastDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
  };

  // We want to generate roughly 10 sessions (2 full packages, 1 partial) for each child
  for (const child of children) {
    const cId = child.id;
    
    // Package 1: 4 Present (Class 1)
    attendanceToInsert.push({ student_id: cId, class_id: class1.id, status: "present", date: getPastDate(40) });
    attendanceToInsert.push({ student_id: cId, class_id: class1.id, status: "present", date: getPastDate(33) });
    attendanceToInsert.push({ student_id: cId, class_id: class1.id, status: "absent", date: getPastDate(26) });
    attendanceToInsert.push({ student_id: cId, class_id: class1.id, status: "present", date: getPastDate(19) });
    attendanceToInsert.push({ student_id: cId, class_id: class1.id, status: "present", date: getPastDate(12) });

    // Package 2: 4 Present (Class 1 -> Class 2 mid-package)
    attendanceToInsert.push({ student_id: cId, class_id: class1.id, status: "present", date: getPastDate(10) });
    attendanceToInsert.push({ student_id: cId, class_id: class1.id, status: "present", date: getPastDate(8) });
    // Switch to class 2
    attendanceToInsert.push({ student_id: cId, class_id: class2.id, status: "medical", date: getPastDate(6) });
    attendanceToInsert.push({ student_id: cId, class_id: class2.id, status: "present", date: getPastDate(4) });
    attendanceToInsert.push({ student_id: cId, class_id: class2.id, status: "present", date: getPastDate(3) });

    // Package 3 (Incomplete): 2 Present (Class 2)
    attendanceToInsert.push({ student_id: cId, class_id: class2.id, status: "present", date: getPastDate(2) });
    attendanceToInsert.push({ student_id: cId, class_id: class2.id, status: "present", date: getPastDate(1) });
  }

  // Insert records
  const { data, error } = await supabase
    .from("attendance")
    .insert(attendanceToInsert)
    .select();

  if (error) {
    console.error("Error inserting attendance:", error);
  } else {
    console.log(`Successfully generated ${data.length} attendance records across ${children.length} children.`);
    
    // Update session_count for children to match (each has exactly 10 present sessions in this script)
    for (const child of children) {
      await supabase
        .from("students")
        .update({ session_count: 10, class_id: class2.id }) // They ended up in class2
        .eq("id", child.id);
    }
    console.log("Updated session_counts to 10.");
  }
}

generatePackages();
