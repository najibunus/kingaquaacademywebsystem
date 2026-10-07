import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: classes, error } = await supabase
  .from('classes')
  .select('id, name, type, is_active')
  .order('created_at');

if (error) {
  console.error('Error:', error.message);
} else {
  console.log('\n=== EXISTING CLASSES ===\n');
  classes.forEach(c => {
    console.log(`[${c.is_active ? 'ACTIVE' : 'INACTIVE'}] ${c.name} (type: ${c.type}) — id: ${c.id}`);
  });
  console.log(`\nTotal: ${classes.length} classes`);
}
