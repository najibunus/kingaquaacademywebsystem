import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data: students, error: fetchError } = await supabase.from('students').select('id');
  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }
  
  if (!students || students.length === 0) {
    console.log("No students found.");
    return;
  }
  
  console.log(`Found ${students.length} students. Deleting...`);
  
  const { error: deleteError } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.error("Failed to delete students:", deleteError);
  } else {
    console.log(`Successfully deleted all ${students.length} students.`);
  }
}

run();
