import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: child } = await supabase.from('students').select('id, parent_id, class_id').ilike('name', '%Test Child One%').limit(1).single();
  if (!child) return console.log('Child not found');
  
  await supabase.from('attendance').delete().eq('student_id', child.id);
  await supabase.from('invoices').delete().eq('student_id', child.id);
  
  const advDates = ['2026-09-02', '2026-09-04', '2026-09-06', '2026-09-08', '2026-09-10', '2026-09-12', '2026-09-14'];
  
  const advAttendances = advDates.map(date => ({
    student_id: child.id,
    class_id: child.class_id,
    date: date,
    status: 'present',
    recorded_by: child.parent_id
  }));
  
  await supabase.from('attendance').insert(advAttendances);
  console.log('Fixed Test Child One attendances!');
}
run().catch(console.error);
