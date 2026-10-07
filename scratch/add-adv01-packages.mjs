import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addAdvanceClassAndPackages() {
  // 1. Insert "Pro Swimmer (Advance)" class
  let { data: newClass, error: clsErr } = await supabase
    .from("classes")
    .insert({
      name: "Pro Swimmer (Advance)",
      type: "ADV01",
      description: "Elite tier testing",
      is_active: true
    })
    .select("id")
    .single();

  if (clsErr && clsErr.code !== '23505') { 
    console.error("Failed to create class:", clsErr);
    return;
  }

  if (!newClass) {
    const { data: existingClass } = await supabase.from("classes").select("id").eq("name", "Pro Swimmer (Advance)").single();
    newClass = existingClass;
  }
  
  if (!newClass) {
    console.error("Could not find or create Advance class");
    return;
  }

  // 2. Get the test children
  const { data: children, error: cErr } = await supabase
    .from("students")
    .select("id, name")
    .in("name", ["Test Child One"]); // Just do it for one child to show the difference

  if (cErr || !children || children.length === 0) {
    console.error("Failed to find children:", cErr);
    return;
  }

  const attendanceToInsert = [];

  // Helper to add days to current date.
  // We want them to be in the future so it sits firmly at the top (newest).
  const getFutureDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead); 
    return d.toISOString().split("T")[0];
  };

  for (const child of children) {
    const cId = child.id;
    
    // Let's add 6 sessions for this month to hit the RM 250 cap.
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getFutureDate(1) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getFutureDate(3) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getFutureDate(5) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getFutureDate(7) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getFutureDate(9) });
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "present", date: getFutureDate(11) });
    
    // Add 1 absence just to see it tracked
    attendanceToInsert.push({ student_id: cId, class_id: newClass.id, status: "absent", date: getFutureDate(13) });
  }

  // Insert records
  const { data, error } = await supabase
    .from("attendance")
    .insert(attendanceToInsert)
    .select();

  if (error) {
    console.error("Error inserting attendance:", error);
  } else {
    console.log(`Successfully generated ${data.length} ADV01 attendance records for Test Child One.`);
    
    // Update session_count for children to +6 (they had 18, now 24)
    for (const child of children) {
      await supabase
        .from("students")
        .update({ session_count: 24, class_id: newClass.id })
        .eq("id", child.id);
    }
    console.log("Updated session_counts to 24 and placed them in Pro Swimmer.");
  }
}

addAdvanceClassAndPackages();
