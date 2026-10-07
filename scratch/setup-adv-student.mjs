import { createClient } from '@supabase/supabase-js';



const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Finding test parent...');
  const { data: parents, error: pErr } = await supabase.from('users').select('*').eq('role', 'parent').limit(1); const parent = parents[0];
  if (pErr) throw pErr;

  console.log('Finding or creating ADV01 class...');
  let { data: advClass } = await supabase.from('classes').select('*').eq('type', 'ADV01').limit(1).single();
  if (!advClass) {
    const { data: newClass, error: cErr } = await supabase.from('classes').insert({ name: 'Pro Swimmers (Advance)', type: 'ADV01', status: 'active', coach_id: null }).select().single();
    if (cErr) throw cErr;
    advClass = newClass;
  }
  
  console.log('Finding or creating a student for parent...');
  let { data: student } = await supabase.from('students').select('*').eq('parent_id', parent.id).eq('class_id', advClass.id).limit(1).single();
  if (!student) {
    const { data: newStudent, error: sErr } = await supabase.from('students').insert({ name: 'Advance Demo Student', parent_id: parent.id, class_id: advClass.id, status: 'active' }).select().single();
    if (sErr) throw sErr;
    student = newStudent;
  }

  console.log('Deleting existing attendances for this student to start fresh...');
  await supabase.from('attendance').delete().eq('student_id', student.id);

  console.log('Inserting 6 present attendances for current month...');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); 
  
  // Create 6 dates in the current month
  const dates = [1, 5, 8, 12, 15, 19, 22].map(d => new Date(year, month, d).toISOString());
  
  const attendances = dates.map(date => ({
    student_id: student.id,
    class_id: advClass.id,
    date: date,
    status: 'present',
    recorded_by: parent.id // doesn't matter for this test
  }));

  const { error: attErr } = await supabase.from('attendance').insert(attendances);
  if (attErr) throw attErr;

  console.log('Successfully inserted 6 attendances for Advance Demo Student!');
}

run().catch(console.error);
