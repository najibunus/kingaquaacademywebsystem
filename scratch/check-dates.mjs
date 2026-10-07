import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.from('attendance').select('id, date, students!inner(name)').ilike('students.name', '%Test Child One%').order('date');
  console.log(data);
}
run().catch(console.error);
