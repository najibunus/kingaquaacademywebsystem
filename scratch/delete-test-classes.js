import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const classIdsToDelete = [
  '573b7d0d-b040-4181-a3c8-d2a30d74d948', // Beginner Dolphins (Test)
  'ae490a07-7b89-4661-ad87-12c507cebd25', // Novice (test)
  '488f6627-a161-4cd5-b0a0-083eca1b25a7'  // Pro Swimmer (Advance)
];

const { data, error } = await supabase
  .from('classes')
  .delete()
  .in('id', classIdsToDelete)
  .select('name');

if (error) {
  console.error('❌ Error deleting classes:', error.message);
  process.exit(1);
}

console.log(`✅ Successfully deleted ${data.length} test classes:`);
data.forEach(c => console.log(`   - ${c.name}`));
