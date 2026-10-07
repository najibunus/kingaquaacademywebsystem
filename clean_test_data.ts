import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  // 1. Delete all invoice items
  const { error: e1 } = await supabase.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Invoice items:', e1 ? e1.message : 'Cleared');
  
  // 2. Delete all invoices
  const { error: e2 } = await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Invoices:', e2 ? e2.message : 'Cleared');
  
  // 3. Delete all attendance
  const { error: e3 } = await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Attendance:', e3 ? e3.message : 'Cleared');
  
  // 4. Reset session_count on all students
  const { error: e4 } = await supabase.from('students').update({ session_count: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Student session_count:', e4 ? e4.message : 'Reset to 0');
  
  console.log('Done! Ready for clean testing.');
}

run();
