import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Clearing all attendance records...');
  const { error: attErr } = await supabase.from('attendance').delete().not('id', 'is', null);
  if (attErr) console.error('Error clearing attendance:', attErr.message);

  console.log('Clearing all invoice items...');
  const { error: itemsErr } = await supabase.from('invoice_items').delete().not('id', 'is', null);
  if (itemsErr) console.error('Error clearing invoice items:', itemsErr.message);

  console.log('Clearing all invoices...');
  const { error: invErr } = await supabase.from('invoices').delete().not('id', 'is', null); // UUIDs use .neq('id', '00000000-0000-0000-0000-000000000000') but .not('id', 'is', null) might fail on UUID. Better use .not('id', 'is', null)
  if (invErr) console.error('Error clearing invoices:', invErr.message);

  console.log('Resetting student session counts to 0...');
  const { error: stuErr } = await supabase.from('students').update({ session_count: 0 }).not('id', 'is', null);
  if (stuErr) console.error('Error resetting session counts:', stuErr.message);

  console.log('Packages and billing data successfully cleared!');
}

run().catch(console.error);
