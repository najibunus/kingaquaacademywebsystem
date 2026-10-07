import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Finding test parent...');
  
  // Try to find the auth user first
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) throw authErr;
  
  const testParentAuth = authUsers.users.find(u => u.email === 'testparent@kingaqua.test');
  
  let parentRow;
  if (testParentAuth) {
    const { data } = await supabase.from('users').select('*').eq('auth_id', testParentAuth.id).single();
    parentRow = data;
  }
  
  if (!parentRow) {
    console.log('testparent@kingaqua.test not found, falling back to first parent...');
    const { data } = await supabase.from('users').select('*').eq('role', 'parent').limit(1);
    parentRow = data[0];
  }
  
  console.log('Using parent ID: ' + parentRow.id);

  // Setup standard class
  let { data: stdClass } = await supabase.from('classes').select('*').eq('type', 'standard').limit(1).single();
  if (!stdClass) {
    const { data: newClass } = await supabase.from('classes').insert({ name: 'Standard Demo', type: 'standard', status: 'active', coach_id: null }).select().single();
    stdClass = newClass;
  }

  // Setup ADV01 class
  let { data: advClass } = await supabase.from('classes').select('*').eq('type', 'ADV01').limit(1).single();
  if (!advClass) {
    const { data: newClass } = await supabase.from('classes').insert({ name: 'Advance Demo', type: 'ADV01', status: 'active', coach_id: null }).select().single();
    advClass = newClass;
  }

  // Setup Demo Student
  let { data: demoStudent } = await supabase.from('students').select('*').eq('parent_id', parentRow.id).ilike('name', '%Demo Student%').limit(1).single();
  if (!demoStudent) {
    const { data: newStu } = await supabase.from('students').insert({ name: 'Demo Student', parent_id: parentRow.id, class_id: stdClass.id, status: 'active' }).select().single();
    demoStudent = newStu;
  } else {
    // Ensure assigned to standard
    await supabase.from('students').update({ class_id: stdClass.id }).eq('id', demoStudent.id);
  }

  // Setup Test Child One
  let { data: childOne } = await supabase.from('students').select('*').eq('parent_id', parentRow.id).ilike('name', '%Test Child One%').limit(1).single();
  if (!childOne) {
    const { data: newStu } = await supabase.from('students').insert({ name: 'Test Child One', parent_id: parentRow.id, class_id: advClass.id, status: 'active' }).select().single();
    childOne = newStu;
  } else {
    // Ensure assigned to advance
    await supabase.from('students').update({ class_id: advClass.id }).eq('id', childOne.id);
  }

  console.log('Clearing old attendances for these two students...');
  await supabase.from('attendance').delete().in('student_id', [demoStudent.id, childOne.id]);

  console.log('Inserting 5 attendances for Demo Student (Standard)...');
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  
  // 5 dates
  const stdDates = [1, 3, 5, 7, 9].map(d => new Date(y, m, d).toISOString());
  const stdAttendances = stdDates.map(date => ({
    student_id: demoStudent.id,
    class_id: stdClass.id,
    date: date,
    status: 'present',
    recorded_by: parentRow.id
  }));
  await supabase.from('attendance').insert(stdAttendances);
  await supabase.from('students').update({ session_count: 5 }).eq('id', demoStudent.id);

  console.log('Inserting 7 attendances for Test Child One (Advance)...');
  // 7 dates
  const advDates = [1, 2, 4, 6, 8, 9, 10].map(d => new Date(y, m, d).toISOString());
  const advAttendances = advDates.map(date => ({
    student_id: childOne.id,
    class_id: advClass.id,
    date: date,
    status: 'present',
    recorded_by: parentRow.id
  }));
  await supabase.from('attendance').insert(advAttendances);
  // Advance doesn't strictly need session_count, but we'll set it just in case
  await supabase.from('students').update({ session_count: 7 }).eq('id', childOne.id);

  console.log('Successfully injected attendances!');
}

run().catch(console.error);
