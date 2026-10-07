import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testOverflow() {
  console.log('--- STARTING OVERFLOW TEST ---');
  
  // 1. Find a student
  const { data: student } = await supabase.from('students').select('id, name, class_id').limit(1).single();
  if (!student) {
    console.log('No student found');
    return;
  }
  console.log(`Selected Student: ${student.name} (${student.id})`);

  // 2. Clear their existing data just in case
  await supabase.from('attendance').delete().eq('student_id', student.id);
  await supabase.from('invoices').delete().eq('student_id', student.id);
  await supabase.from('students').update({ session_count: 0 }).eq('id', student.id);

  // 3. Import the server action and run it
  // Since we are running via tsx in CLI, we can't easily invoke the Next.js server action directly 
  // because it uses next/cache (revalidatePath) and cookies. 
  // We will simulate what bulkLogAttendanceAction does.
  
  const dates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']; // 5 dates
  console.log(`Simulating bulk inserting ${dates.length} dates...`);
  
  const rows = dates.map(d => ({
    student_id: student.id,
    class_id: student.class_id,
    date: d,
    status: 'present',
    sessions_deducted: 1
  }));
  
  await supabase.from('attendance').insert(rows);
  
  // 4. Run the auto invoice logic
  // We will import it dynamically to avoid next/cache issues if possible, or just copy the logic test.
}

testOverflow();
