import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const email = 'testparent@kingaqua.test';

async function main() {
  // 1. Get auth user ID
  const { data: users, error: listUserErr } = await supabase.auth.admin.listUsers();
  if (listUserErr) {
    console.error('Error listing users:', listUserErr.message);
    process.exit(1);
  }
  
  const authUser = users.users.find(u => u.email === email);
  if (!authUser) {
    console.log(`❌ Parent user not found for email: ${email}`);
    process.exit(1);
  }

  // 2. Get public.users ID
  const { data: publicUser, error: pubUserErr } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single();

  if (pubUserErr || !publicUser) {
    console.log(`❌ Public user not found for auth ID: ${authUser.id}`);
    process.exit(1);
  }

  const parentId = publicUser.id;
  console.log(`✅ Found parent_id: ${parentId} for ${email}`);

  // 3. Get all active classes
  const { data: classes, error: classesErr } = await supabase
    .from('classes')
    .select('id, name');

  if (classesErr) {
    console.error('Error fetching classes:', classesErr.message);
    process.exit(1);
  }

  console.log(`Found ${classes.length} classes.`);

  // 4. Create students
  const studentsToInsert = classes.map(c => ({
    parent_id: parentId,
    class_id: c.id,
    name: `Test Student (${c.name.substring(0, 20)})`,
    status: 'active',
    session_count: 0
  }));

  const { data: insertedStudents, error: studentInsertErr } = await supabase
    .from('students')
    .insert(studentsToInsert)
    .select('id, class_id, name');

  if (studentInsertErr) {
    console.error('Error inserting students:', studentInsertErr.message);
    process.exit(1);
  }

  console.log(`✅ Inserted ${insertedStudents.length} students.`);

  // 5. Create attendance records (4 per student)
  const today = new Date();
  const attendanceRecords = [];

  insertedStudents.forEach(student => {
    for (let i = 4; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i); // past 4 days
      
      attendanceRecords.push({
        student_id: student.id,
        class_id: student.class_id,
        status: 'present',
        date: date.toISOString().split('T')[0],
      });
    }
  });

  const { error: attInsertErr } = await supabase
    .from('attendance')
    .insert(attendanceRecords);

  if (attInsertErr) {
    console.error('Error inserting attendance:', attInsertErr.message);
    process.exit(1);
  }

  console.log(`✅ Inserted ${attendanceRecords.length} attendance records (4 per student).`);
}

main();
